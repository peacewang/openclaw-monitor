// src/monitor/process.ts

import pidusage from 'pidusage';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ProcessMonitor, ProcessStatus, ProcessEvent } from '../types/process.js';
import type { OpenClawEnvDetector } from '../env/types.js';
import type { MonitorConfig } from '../types/config.js';

const execAsync = promisify(exec);

export class ProcessMonitorImpl implements ProcessMonitor {
  private intervalId?: NodeJS.Timeout;
  private currentStatus: ProcessStatus;
  private subscribers: ((event: ProcessEvent) => void)[] = [];

  constructor(
    private envDetector: OpenClawEnvDetector,
    private config: MonitorConfig,
  ) {
    this.currentStatus = this.createInitialStatus();
  }

  async start(): Promise<void> {
    await this.updateStatus();

    this.intervalId = setInterval(async () => {
      await this.updateStatus();
    }, this.config.monitoring.interval * 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  async getStatus(): Promise<ProcessStatus> {
    await this.updateStatus();
    return { ...this.currentStatus };
  }

  subscribe(callback: (event: ProcessEvent) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private async updateStatus(): Promise<void> {
    const newStatus = await this.collectStatus();
    const wasRunning = this.currentStatus.running;
    const isRunning = newStatus.running;

    this.currentStatus = newStatus;

    if (wasRunning && !isRunning) {
      this.emit({ type: 'stopped', status: newStatus, timestamp: new Date() });
    } else if (!wasRunning && isRunning) {
      this.emit({ type: 'started', status: newStatus, timestamp: new Date() });
    }
  }

  private async collectStatus(): Promise<ProcessStatus> {
    const env = await this.envDetector.detect();

    if (!env.installed) {
      return this.createEmptyStatus();
    }

    const pid = await this.findOpenClawProcess();

    if (!pid) {
      return this.createEmptyStatus();
    }

    try {
      const stats = await pidusage(pid);
      const gatewayPort = env.config?.gateway?.port || env.gatewayPort || 18789; // OpenClaw Gateway default port

      return {
        pid,
        running: true,
        cpuPercent: stats.cpu || 0,
        memoryMB: (stats.memory || 0) / 1024 / 1024,
        startTime: stats.elapsed ? new Date(Date.now() - stats.elapsed) : undefined,
        uptime: stats.elapsed,
        restartCount: this.currentStatus.restartCount,
        port: gatewayPort,
        portOpen: await this.checkPort(gatewayPort),
        lastCheck: new Date(),
      };
    } catch {
      return this.createEmptyStatus();
    }
  }

  private async findOpenClawProcess(): Promise<number | null> {
    const platform = process.platform;

    try {
      if (platform === 'win32') {
        return await this.findProcessWindows();
      } else {
        return await this.findProcessUnix();
      }
    } catch {
      return null;
    }
  }

  private async findProcessWindows(): Promise<number | null> {
    try {
      const myPid = process.pid;
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH'
      );

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('openclaw') && !line.toLowerCase().includes('openclaw-monitor')) {
          const match = line.match(/"(\d+)"/);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (pid !== myPid) return pid;
          }
        }
      }

      // 如果没找到，查找所有 node 进程并验证
      for (const line of lines) {
        const match = line.match(/"(\d+)"/);
        if (match) {
          const pid = parseInt(match[1], 10);
          if (pid !== myPid && await this.verifyOpenClawProcess(pid)) {
            return pid;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async findProcessUnix(): Promise<number | null> {
    try {
      // 首先尝试 pgrep，排除 openclaw-monitor 自身
      try {
        const myPid = process.pid;
        const { stdout } = await execAsync('pgrep -f "openclaw"');
        const pids = stdout.trim().split('\n')
          .map(Number)
          .filter(pid => pid && pid !== myPid && !isNaN(pid));

        // 验证找到的进程确实是 OpenClaw Gateway
        for (const pid of pids) {
          const isValid = await this.isGatewayProcess(pid);
          if (isValid) return pid;
        }

        return null;
      } catch {
        // pgrep 未找到，继续使用 ps
      }

      // 使用 ps 命令，排除 openclaw-monitor
      const myPid = process.pid;
      const { stdout } = await execAsync('ps aux | grep -i "openclaw" | grep -v grep | grep -v "openclaw-monitor"');
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 1) {
          const pid = parseInt(parts[1], 10);
          if (pid && pid !== myPid) {
            return pid;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async isGatewayProcess(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
      const cmd = stdout.toLowerCase();
      // 排除 openclaw-monitor，只认 gateway 或 standalone 启动的 openclaw
      return cmd.includes('openclaw') &&
             !cmd.includes('openclaw-monitor') &&
             !cmd.includes('node.*openclaw-monitor');
    } catch {
      return false;
    }
  }

  private async verifyOpenClawProcess(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /VALUE`);
      const cmd = stdout.toLowerCase();
      // 排除 openclaw-monitor，只认 gateway
      return cmd.includes('openclaw') &&
             !cmd.includes('openclaw-monitor') &&
             (cmd.includes('gateway') || cmd.includes('openclaw start') || cmd.includes('standalone'));
    } catch {
      return false;
    }
  }

  private async checkPort(port: number): Promise<boolean> {
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

  private createInitialStatus(): ProcessStatus {
    return {
      running: false,
      cpuPercent: 0,
      memoryMB: 0,
      restartCount: 0,
      portOpen: false,
      lastCheck: new Date(),
    };
  }

  private createEmptyStatus(): ProcessStatus {
    return {
      running: false,
      cpuPercent: 0,
      memoryMB: 0,
      restartCount: this.currentStatus?.restartCount ?? 0,
      portOpen: false,
      lastCheck: new Date(),
    };
  }

  private emit(event: ProcessEvent): void {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch {
        // 忽略回调错误
      }
    }
  }
}
