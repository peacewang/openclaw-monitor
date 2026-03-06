// src/manager/gateway.ts

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { OpenClawEnvDetectorImpl } from '../env/detector.js';

const execAsync = promisify(exec);

export interface GatewayManagerOptions {
  workspace?: string;
  maxRetries?: number;
}

export class GatewayManager {
  private detector: OpenClawEnvDetectorImpl;
  private workspace?: string;
  private maxRetries: number;

  constructor(options: GatewayManagerOptions = {}) {
    this.detector = new OpenClawEnvDetectorImpl();
    this.workspace = options.workspace;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * 获取 Gateway PID
   */
  async getPid(): Promise<number | null> {
    const env = await this.detector.detect();
    if (!env.installed) {
      return null;
    }

    // 读取配置获取端口，然后查找进程
    const config = env.config;
    const port = config?.gateway?.port || env.gatewayPort;

    if (port) {
      return this.findProcessByPort(port);
    }

    // 通过进程名查找
    return this.findProcessByName('node');
  }

  /**
   * 重启 Gateway
   */
  async restart(): Promise<{ success: boolean; message: string }> {
    const pid = await this.getPid();

    if (!pid) {
      return {
        success: false,
        message: '未找到运行中的 Gateway 进程',
      };
    }

    try {
      // 终止进程
      process.kill(pid, 'SIGTERM');

      // 等待进程结束
      await this.waitForProcessEnd(pid, 5000);

      // 重新启动
      await this.start();

      return {
        success: true,
        message: `Gateway 已重启 (PID: ${pid})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `重启失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 启动 Gateway
   */
  async start(): Promise<{ success: boolean; message: string }> {
    try {
      const env = await this.detector.detect();
      const execPath = env.executablePath;

      if (!execPath) {
        return {
          success: false,
          message: '未找到 Gateway 可执行文件',
        };
      }

      // 启动 gateway (使用 spawn 以支持 detached 模式)
      const child = spawn('node', [execPath], {
        cwd: this.workspace || process.cwd(),
        detached: true,
        stdio: 'ignore',
        shell: true,
      });
      child.unref();

      // 等待启动
      await this.delay(2000);

      return {
        success: true,
        message: 'Gateway 已启动',
      };
    } catch (error) {
      return {
        success: false,
        message: `启动失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 停止 Gateway
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    const pid = await this.getPid();

    if (!pid) {
      return {
        success: true,
        message: 'Gateway 未运行',
      };
    }

    try {
      process.kill(pid, 'SIGTERM');
      return {
        success: true,
        message: `Gateway 已停止 (PID: ${pid})`,
      };
    } catch (error) {
      return {
        success: false,
        message: `停止失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 诊断 Gateway
   */
  async doctor(): Promise<{
    success: boolean;
    issues: DoctorIssue[];
    fixes: DoctorFix[];
  }> {
    const issues: DoctorIssue[] = [];
    const fixes: DoctorFix[] = [];

    const env = await this.detector.detect();

    // 检查是否安装
    if (!env.installed) {
      issues.push({
        level: 'critical',
        category: 'installation',
        message: 'OpenClaw 未安装或找不到',
        fix: '请确保 OpenClaw Gateway 已正确安装',
      });
      return { success: false, issues, fixes };
    }

    // 检查进程状态
    const pid = await this.getPid();
    if (!pid) {
      issues.push({
        level: 'warning',
        category: 'process',
        message: 'Gateway 进程未运行',
        fix: '运行 "openclaw-monitor gateway start" 启动 Gateway',
      });
    } else {
      // 检查进程健康度
      const isHealthy = await this.checkProcessHealth(pid);
      if (!isHealthy) {
        issues.push({
          level: 'warning',
          category: 'health',
          message: 'Gateway 进程可能无响应',
          fix: '运行 "openclaw-monitor gateway restart" 重启',
        });
      }
    }

    // 检查日志目录
    if (!env.logDir) {
      issues.push({
        level: 'info',
        category: 'configuration',
        message: '日志目录未配置',
        fix: '在配置中设置 openclaw.logDir',
      });
    }

    // 检查端口
    const port = env.config?.gateway?.port || env.gatewayPort;
    if (port) {
      const portOpen = await this.isPortOpen(port);
      if (!portOpen && pid) {
        issues.push({
          level: 'warning',
          category: 'network',
          message: `端口 ${port} 未监听`,
          fix: '检查 gateway 配置或重启服务',
        });
      }
    }

    // 检查磁盘空间
    const diskSpace = await this.checkDiskSpace();
    if (!diskSpace.ok) {
      issues.push({
        level: 'warning',
        category: 'system',
        message: `磁盘空间不足: ${diskSpace.available} 可用`,
        fix: '清理日志文件或扩展磁盘',
      });
    }

    return {
      success: issues.length === 0 || issues.every(i => i.level === 'info'),
      issues,
      fixes: [],
    };
  }

  /**
   * 自动修复
   */
  async doctorFix(): Promise<{
    success: boolean;
    applied: DoctorFix[];
    remaining: DoctorIssue[];
  }> {
    const diagnosis = await this.doctor();
    const applied: DoctorFix[] = [];
    const remaining = [...diagnosis.issues];

    // 尝试自动修复问题
    for (const issue of diagnosis.issues) {
      if (issue.level === 'critical' || issue.level === 'warning') {
        const fix = await this.applyFix(issue);
        if (fix) {
          applied.push(fix);
          // 从剩余问题中移除已修复的
          const index = remaining.findIndex(i => i === issue);
          if (index >= 0) remaining.splice(index, 1);
        }
      }
    }

    return {
      success: remaining.length === 0,
      applied,
      remaining,
    };
  }

  /**
   * 获取 Gateway 信息
   */
  async getInfo(): Promise<GatewayInfo> {
    const env = await this.detector.detect();
    const pid = await this.getPid();

    return {
      installed: env.installed,
      version: env.version,
      pid: pid,
      port: env.config?.gateway?.port || env.gatewayPort,
      configPath: env.configPath,
      logDir: env.logDir,
      executablePath: env.executablePath,
      dataDir: env.dataDir,
      running: pid !== null,
    };
  }

  // ============ Private Methods ============

  private async findProcessByPort(port: number): Promise<number | null> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
        const match = stdout.trim().match(/\s+(\d+)\s+/);
        return match ? parseInt(match[1], 10) : null;
      } else {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        return stdout.trim() ? parseInt(stdout.trim(), 10) : null;
      }
    } catch {
      return null;
    }
  }

  private async findProcessByName(name: string): Promise<number | null> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes('gateway') || line.toLowerCase().includes('openclaw')) {
            const match = line.match(/"(\d+)"/);
            return match ? parseInt(match[1], 10) : null;
          }
        }
      } else {
        const { stdout } = await execAsync('pgrep -f "gateway|openclaw"');
        const pids = stdout.trim().split('\n').filter(Boolean);
        if (pids.length > 0) {
          return parseInt(pids[0], 10);
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private async waitForProcessEnd(pid: number, timeout: number): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        process.kill(pid, 0); // 检查进程是否存在
        await this.delay(100);
      } catch {
        return true; // 进程已结束
      }
    }

    return false;
  }

  private async checkProcessHealth(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0); // 检查进程是否响应
      return true;
    } catch {
      return false;
    }
  }

  private async isPortOpen(port: number): Promise<boolean> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
        return stdout.trim().length > 0;
      } else {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        return stdout.trim().length > 0;
      }
    } catch {
      return false;
    }
  }

  private async checkDiskSpace(): Promise<{ ok: boolean; available: string }> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        const { stdout } = await execAsync('wmic logicaldisk get size');
        // 简化实现
        return { ok: true, available: 'unknown' };
      } else {
        const { stdout } = await execAsync('df -h .');
        const match = stdout.match(/(\d+)%/);
        if (match) {
          const percent = parseInt(match[1], 10);
          return {
            ok: percent < 90,
            available: `${100 - percent}%`,
          };
        }
      }
    } catch {
      return { ok: true, available: 'unknown' };
    }

    return { ok: true, available: 'unknown' };
  }

  private async applyFix(issue: DoctorIssue): Promise<DoctorFix | null> {
    if (issue.category === 'process' && issue.message.includes('未运行')) {
      // 尝试启动
      const result = await this.start();
      if (result.success) {
        return {
          action: 'start',
          description: '已启动 Gateway',
        };
      }
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============ Types ============

export interface GatewayInfo {
  installed: boolean;
  version?: string;
  pid: number | null;
  port?: number;
  configPath?: string;
  logDir?: string;
  executablePath?: string;
  dataDir?: string;
  running: boolean;
}

export interface DoctorIssue {
  level: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  fix: string;
}

export interface DoctorFix {
  action: string;
  description: string;
}
