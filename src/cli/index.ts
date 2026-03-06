#!/usr/bin/env node
// src/cli/index.ts

import { OpenClawMonitor } from '../OpenClawMonitor.js';
import { existsSync, readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { spawn, execSync } from 'child_process';
import { tmpdir, homedir } from 'os';

const args = process.argv.slice(2);
const command = args[0];

// PID file path for daemon mode
const PID_FILE = resolve(tmpdir(), 'openclaw-monitor.pid');

function showHelp() {
  console.log(`
OpenClaw Gateway 监控工具 v1.0.0

用法: openclaw-monitor <command> [options]

命令:
  config init       初始化配置文件
  start             启动监控服务 (默认后台守护进程模式)
  stop              停止监控服务
  restart           重启监控服务 (默认后台守护进程模式)
  status            查看运行状态
  logs [-n 50]      查看最近日志
  diagnose [-n 20]  诊断问题
  service-install   安装系统服务 (macOS launchd / Linux systemd)
  service-uninstall 卸载系统服务
  help              显示此帮助

选项:
  -n, --lines       显示的日志/错误行数
  -f, --force       强制覆盖配置文件

示例:
  openclaw-monitor config init       # 创建配置文件 (~/.openclaw-monitor/)
  openclaw-monitor start             # 后台启动
  openclaw-monitor status            # 查看状态
  openclaw-monitor stop              # 停止服务
  openclaw-monitor restart           # 重启服务
  openclaw-monitor service-install   # 安装系统服务

配置文件位置: ~/.openclaw-monitor/config.json (跨平台通用)
  `);
}

async function cmdConfigInit(force = false) {
  const { homedir } = await import('os');
  const path = await import('path');

  // 全局配置路径（跨平台通用）
  const configPath = resolve(homedir(), '.openclaw-monitor', 'config.json');

  // 读取或生成示例配置
  let exampleConfig: any;

  // 1. 尝试从当前目录的 config.example.json 读取
  const localExamplePath = resolve(process.cwd(), 'config.example.json');
  if (existsSync(localExamplePath)) {
    const exampleContent = readFileSync(localExamplePath, 'utf-8');
    exampleConfig = JSON.parse(exampleContent);
  } else {
    // 2. 使用内置的默认配置
    exampleConfig = {
      monitoring: {
        enabled: true,
        interval: 5,
        logLines: 100,
        thresholds: {
          cpu: { warning: 80, critical: 95 },
          memory: { warning: 1024, critical: 2048 },
        },
      },
      openclaw: {
        autoDetect: true,
      },
      web: {
        enabled: true,
        port: 37890,
        host: '0.0.0.0',
      },
      alerts: {
        enabled: false,
        telegram: {
          enabled: false,
          botToken: '',
          chatId: '',
        },
        feishu: {
          enabled: false,
          webhookUrl: '',
        },
        lark: {
          enabled: false,
          appId: '',
          appSecret: '',
        },
      },
    };
  }

  // 移除 $comment 字段（如果存在）
  delete (exampleConfig as any).$comment;

  // 检查配置文件是否已存在
  if (existsSync(configPath)) {
    if (force) {
      console.log(`⚠️  强制覆盖现有配置文件: ${configPath}`);
    } else {
      console.log('❌ 配置文件已存在');
      console.log(`   位置: ${configPath}`);
      console.log('');
      console.log('如需重新生成，请使用:');
      console.log('  openclaw-monitor config init --force');
      process.exit(1);
    }
  }

  // 确保目录存在
  const configDir = path.dirname(configPath);
  if (!existsSync(configDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(configDir, { recursive: true });
  }

  // 写入配置文件
  writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2), 'utf-8');

  console.log('✅ 配置文件已创建');
  console.log('');
  console.log(`📁 位置: ${configPath}`);
  console.log(`🌍 类型: 全局配置（所有目录可用）`);
  console.log('');
  console.log('📝 下一步:');
  console.log('  1. 编辑配置文件，填写你的配置信息');
  console.log('  2. 至少配置一个告警渠道 (telegram/feishu/lark)');
  console.log('  3. 设置 alerts.enabled = true 启用告警');
  console.log('  4. 运行: openclaw-monitor start');
}

// Daemon相关函数
function getPid(): number | null {
  try {
    if (existsSync(PID_FILE)) {
      const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim());
      return isNaN(pid) ? null : pid;
    }
  } catch {
    return null;
  }
  return null;
}

function writePid(pid: number): void {
  writeFileSync(PID_FILE, pid.toString(), 'utf-8');
}

function removePid(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // 忽略删除错误
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // 信号0用于检查进程是否存在
    return true;
  } catch {
    return false;
  }
}

async function cmdStart(daemonMode = true) {
  // 如果是由守护进程启动的子进程，不进入守护进程模式
  const isDaemonChild = process.env.OPENCLAW_MONITOR_DAEMON === '1';

  // Daemon模式：使用跨平台的后台运行
  if (daemonMode && !isDaemonChild) {
    // 检查是否已有实例在运行
    const existingPid = getPid();
    if (existingPid && isProcessRunning(existingPid)) {
      console.log(`监控服务已在运行 (PID: ${existingPid})`);
      console.log('如需重启，请使用: openclaw-monitor restart');
      process.exit(1);
    }

    // 日志文件路径（全局配置目录）
    const { homedir } = await import('os');
    const { mkdirSync } = await import('fs');
    const logDir = resolve(homedir(), '.openclaw-monitor', 'logs');
    const logFile = resolve(logDir, 'openclaw-monitor.log');

    // 确保日志目录存在
    try {
      mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error('无法创建日志目录:', error);
      throw error;
    }

    // 强制使用 'start' 命令启动守护进程，避免 restart 递归
    const args = [process.argv[1], 'start'];

    try {
      // 打开日志文件用于写入
      const { openSync } = await import('fs');
      const logFd = openSync(logFile, 'a');

      // 使用跨平台的 Node.js 后台运行方式
      const child = spawn(process.argv[0], args, {
        detached: true,
        stdio: ['ignore', logFd, logFd], // stdout 和 stderr 写入日志文件
        env: { ...process.env, OPENCLAW_MONITOR_DAEMON: '1', OPENCLAW_MONITOR_LOG: logFile }
      });

      // 立即分离父进程
      child.unref();

      // 写入子进程PID（使用 child.pid 而不是执行 ps 命令）
      if (child.pid) {
        writePid(child.pid);
        console.log('====================================');
        console.log('OpenClaw Monitor 已启动');
        console.log('====================================');
        console.log(`PID: ${child.pid}`);
        console.log('模式: 守护进程 (后台运行)');
        console.log(`日志文件: ${logFile}`);
        console.log('使用 "openclaw-monitor status" 查看状态');
        console.log('使用 "openclaw-monitor stop" 停止服务');
      } else {
        console.error('启动守护进程失败: 无法获取进程PID');
        process.exit(1);
      }
    } catch (error) {
      console.error('启动守护进程失败:', error);
      process.exit(1);
    }
    return;
  }

  // 前台模式 - 检查是否已有实例在运行
  // 注意：由daemon启动的子进程跳过此检查
  const existingPid = getPid();

  if (!isDaemonChild && existingPid && isProcessRunning(existingPid)) {
    console.log(`监控服务已在运行 (PID: ${existingPid})`);
    console.log('如需重启，请使用: openclaw-monitor restart');
    process.exit(1);
  }

  // 前台模式
  const monitor = new OpenClawMonitor();

  // 写入PID文件
  writePid(process.pid);

  process.on('SIGINT', async () => {
    console.log('\n正在停止监控服务...');
    removePid();
    await monitor.stop();
    console.log('监控服务已停止');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n正在停止监控服务...');
    removePid();
    await monitor.stop();
    process.exit(0);
  });

  try {
    await monitor.start();

    const webUrl = monitor.getWebUrl();
    console.log('====================================');
    console.log('OpenClaw Monitor 已启动');
    console.log('====================================');
    console.log(`PID: ${process.pid}`);
    console.log(`Web UI: ${webUrl || 'N/A'}`);
    console.log('按 Ctrl+C 停止服务');
  } catch (error) {
    removePid();
    console.error('启动失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function cmdStatus() {
  const monitorPid = getPid();

  console.log('====================================');
  console.log('OpenClaw Monitor 状态');
  console.log('====================================');

  if (monitorPid && isProcessRunning(monitorPid)) {
    console.log(`状态: 运行中 ✓`);
    console.log(`PID: ${monitorPid}`);
    console.log(`运行模式: 守护进程 (后台运行)`);

    // 通过 Web API 获取状态，而不是启动新实例
    try {
      const response = await fetch('http://127.0.0.1:37890/api/status');
      if (response.ok) {
        const data = await response.json() as { running?: boolean; pid?: number; cpuPercent?: number; memoryMB?: number; port?: number; portOpen?: boolean };
        console.log(`OpenClaw Gateway: ${data.running ? '运行中 ✓' : '已停止 ✗'}`);
        if (data.running) {
          console.log(`  PID: ${data.pid || 'N/A'}`);
          console.log(`  CPU: ${data.cpuPercent?.toFixed(1) || 'N/A'}%`);
          console.log(`  内存: ${data.memoryMB?.toFixed(0) || 'N/A'} MB`);
          console.log(`  端口: ${data.port || 'N/A'} ${data.portOpen ? '✓' : '✗'}`);
        }
      } else {
        console.log('OpenClaw Gateway: 无法获取状态 (API 返回错误)');
      }
    } catch {
      console.log('OpenClaw Gateway: Web API 未就绪或无法访问');
    }
  } else {
    console.log(`状态: 未运行 ✗`);
    if (monitorPid) {
      console.log(`(PID文件存在但进程未运行，正在清理...)`);
      removePid();
    }
  }
}

async function cmdStop(excludePid?: number) {
  const monitorPid = getPid();

  // 强制查找并停止所有 openclaw-monitor 进程（跨平台）
  try {
    
    let pids: number[] = [];

    if (process.platform === 'win32') {
      // Windows: 使用 tasklist 命令
      try {
        const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf-8' });
        const lines = output.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const match = line.match(/"(\d+)"/);
          if (match) {
            const pid = parseInt(match[1], 10);
            // 验证是否是 openclaw-monitor 进程
            try {
              const cmd = execSync(`wmic process where ProcessId=${pid} get CommandLine /VALUE`, { encoding: 'utf-8' });
              if (cmd.toLowerCase().includes('openclaw-monitor')) {
                pids.push(pid);
              }
            } catch {
              // 忽略验证失败
            }
          }
        }
      } catch {
        // 没有找到进程
      }
    } else {
      // Unix/Linux/macOS: 使用 ps 命令
      try {
        const output = execSync('ps aux | grep "openclaw-monitor" | grep -v grep', { encoding: 'utf-8' });
        const lines = output.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1]);
          if (!isNaN(pid)) {
            pids.push(pid);
          }
        }
      } catch {
        // 没有找到进程
      }
    }

    // 排除当前进程（避免 restart 命令被自己杀掉）
    if (excludePid) {
      pids = pids.filter(pid => pid !== excludePid);
    }

    if (pids.length === 0) {
      console.log('监控服务未运行');
      removePid();
      return;
    }

    console.log(`发现 ${pids.length} 个 openclaw-monitor 进程，正在停止...`);

    // 停止所有找到的进程
    for (const pid of pids) {
      try {
        console.log(`  停止进程 ${pid}...`);
        process.kill(pid, 'SIGTERM');
      } catch {
        // 进程可能已结束
      }
    }

    // 等待进程结束
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 强制清理仍在运行的进程
    let remainingPids: number[] = [];

    if (process.platform === 'win32') {
      // Windows: 重新检查
      try {
        const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { encoding: 'utf-8' });
        const lines = output.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const match = line.match(/"(\d+)"/);
          if (match) {
            const pid = parseInt(match[1], 10);
            try {
              const cmd = execSync(`wmic process where ProcessId=${pid} get CommandLine /VALUE`, { encoding: 'utf-8' });
              if (cmd.toLowerCase().includes('openclaw-monitor')) {
                remainingPids.push(pid);
              }
            } catch {
              // 进程可能已结束
            }
          }
        }
      } catch {
        // 没有剩余进程了
      }
    } else {
      // Unix: 重新检查
      try {
        const remainingOutput = execSync('ps aux | grep "openclaw-monitor" | grep -v grep', { encoding: 'utf-8' });
        const remainingLines = remainingOutput.trim().split('\n').filter(Boolean);
        for (const line of remainingLines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1]);
          if (!isNaN(pid)) {
            remainingPids.push(pid);
          }
        }
      } catch {
        // 没有剩余进程了
      }
    }

    // 排除当前进程
    if (excludePid) {
      remainingPids = remainingPids.filter(pid => pid !== excludePid);
    }

    // 强制杀掉剩余进程
    for (const pid of remainingPids) {
      try {
        console.log(`  强制停止进程 ${pid}...`);
        process.kill(pid, 'SIGKILL');
      } catch {
        // 进程可能已结束
      }
    }

    // 再等待一下确保端口释放
    await new Promise(resolve => setTimeout(resolve, 1000));

    removePid();
    console.log('监控服务已停止');
  } catch (error) {
    removePid();
    console.log('监控服务已停止');
  }
}

async function cmdRestart(daemonMode = true) {
  console.log('正在重启监控服务...');

  // 先停止所有 openclaw-monitor 进程（排除当前 restart 进程）
  await cmdStop(process.pid);

  // 等待端口释放
  console.log('等待端口释放...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 检查端口是否仍被占用，并且强制清理（跨平台）
  try {
    
    let attempts = 0;
    while (attempts < 5) {
      try {
        let portPids: number[] = [];

        if (process.platform === 'win32') {
          // Windows: 使用 netstat 查找占用端口的进程
          try {
            const output = execSync(`netstat -ano | findstr :37890 | findstr LISTENING`, { encoding: 'utf-8' });
            const lines = output.trim().split('\n').filter(Boolean);
            const pids = new Set<string>();
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length > 4) {
                pids.add(parts[parts.length - 1]);
              }
            }
            portPids = Array.from(pids).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
          } catch {
            // 端口未占用
          }
        } else {
          // Unix/Linux/macOS: 使用 lsof
          try {
            const portCheck = execSync('lsof -ti:37890 2>/dev/null', { encoding: 'utf-8' });
            portPids = portCheck.trim().split('\n')
              .map((p: string) => parseInt(p, 10))
              .filter((p: number) => !isNaN(p));
          } catch {
            // 端口未占用
          }
        }

        if (portPids.length === 0) {
          console.log('端口已释放');
          break;
        }

        console.log(`端口仍被占用，第 ${attempts + 1} 次尝试清理...`);
        for (const pidNum of portPids) {
          try {
            // 检查是否是 node 进程
            let isNodeProcess = false;
            if (process.platform === 'win32') {
              const cmd = execSync(`wmic process where ProcessId=${pidNum} get CommandLine /VALUE`, { encoding: 'utf-8' });
              isNodeProcess = cmd.toLowerCase().includes('node') && cmd.toLowerCase().includes('openclaw-monitor');
            } else {
              const cmd = execSync(`ps -p ${pidNum} -o command=`, { encoding: 'utf-8' });
              isNodeProcess = cmd.includes('node') && cmd.includes('openclaw-monitor');
            }

            if (isNodeProcess) {
              console.log(`  强制停止进程 ${pidNum}...`);
              process.kill(pidNum, 'SIGKILL');
            }
          } catch {
            // 进程可能已结束
          }
        }

        // 等待端口释放
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch {
        // 端口检查命令失败，说明端口已释放
        console.log('端口已释放');
        break;
      }
    }

    if (attempts >= 5) {
      console.log('警告: 端口可能仍被占用，尝试启动...');
    }
  } catch {
    // 忽略端口检查错误
  }

  console.log('启动监控服务...');
  await cmdStart(daemonMode);
}

async function cmdLogs(lines = 50) {
  try {
    const response = await fetch(`http://127.0.0.1:37890/api/logs?n=${lines}`);
    if (!response.ok) {
      console.error('获取日志失败: API 返回错误');
      process.exit(1);
    }

    const logs = await response.json() as Array<{ timestamp: string; level: string; message: string }>;

    if (logs.length === 0) {
      console.log('暂无日志');
      return;
    }

    console.log(`最近 ${logs.length} 条日志:`);
    console.log('====================================');

    for (const log of logs) {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const level = log.level.padEnd(5);
      console.log(`[${timestamp}] [${level}] ${log.message}`);
    }
  } catch (error) {
    console.error('获取日志失败:', error instanceof Error ? error.message : String(error));
    console.error('提示: 请确保 openclaw-monitor 正在运行');
    process.exit(1);
  }
}

async function cmdDiagnose(lines = 20) {
  try {
    const response = await fetch(`http://127.0.0.1:37890/api/logs/errors?limit=${lines}`);
    if (!response.ok) {
      console.error('诊断失败: API 返回错误');
      process.exit(1);
    }

    const errors = await response.json() as Array<{ timestamp: string; level: string; message: string }>;

    if (errors.length === 0) {
      console.log('✓ 未发现错误日志');
      return;
    }

    console.log(`发现 ${errors.length} 条错误日志:`);
    console.log('====================================');

    for (const error of errors) {
      const timestamp = new Date(error.timestamp).toLocaleString('zh-CN');
      console.log(`[${timestamp}] [${error.level}] ${error.message}`);
    }

    console.log('');
    console.log('建议：检查 OpenClaw 配置和日志文件以获取更多信息');
  } catch (error) {
    console.error('诊断失败:', error instanceof Error ? error.message : String(error));
    console.error('提示: 请确保 openclaw-monitor 正在运行');
    process.exit(1);
  }
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '--';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days}天${hours}小时` : `${hours}小时${minutes}分`;
}

async function cmdServiceInstall() {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      await installLaunchdService();
    } else if (platform === 'linux') {
      await installSystemdService();
    } else {
      console.log('错误: 系统服务安装仅支持 macOS 和 Linux');
      process.exit(1);
    }
  } catch (error) {
    console.error('安装系统服务失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function cmdServiceUninstall() {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      await uninstallLaunchdService();
    } else if (platform === 'linux') {
      await uninstallSystemdService();
    } else {
      console.log('错误: 系统服务卸载仅支持 macOS 和 Linux');
      process.exit(1);
    }
  } catch (error) {
    console.error('卸载系统服务失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function installLaunchdService() {
  const plistPath = join(homedir(), 'Library', 'LaunchAgents', 'com.openclaw.monitor.plist');
  const executablePath = process.argv[1];

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.openclaw.monitor</string>
  <key>ProgramArguments</key>
  <array>
    <string>${executablePath}</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/openclaw-monitor.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/openclaw-monitor.err.log</string>
  <key>WorkingDirectory</key>
  <string>~</string>
</dict>
</plist>`;

  // 写入plist文件
  writeFileSync(plistPath, plistContent, 'utf-8');

  // 加载服务
  execSync(`launchctl load "${plistPath}"`, { stdio: 'inherit' });
  execSync(`launchctl start com.openclaw.monitor`, { stdio: 'inherit' });

  console.log('✓ macOS 系统服务已安装并启动');
  console.log(`  配置文件: ${plistPath}`);
  console.log('  使用以下命令管理服务:');
  console.log('    启动: launchctl start com.openclaw.monitor');
  console.log('    停止: launchctl stop com.openclaw.monitor');
  console.log('    卸载: openclaw-monitor service-uninstall');
}

async function uninstallLaunchdService() {
  const plistPath = join(homedir(), 'Library', 'LaunchAgents', 'com.openclaw.monitor.plist');

  try {
    // 停止服务
    execSync(`launchctl stop com.openclaw.monitor`, { stdio: 'inherit' });
  } catch {
    // 服务可能未运行
  }

  try {
    // 卸载服务
    execSync(`launchctl unload "${plistPath}"`, { stdio: 'inherit' });
  } catch {
    // 服务可能未加载
  }

  // 删除plist文件
  try {
    unlinkSync(plistPath);
  } catch {
    // 文件可能不存在
  }

  console.log('✓ macOS 系统服务已卸载');
}

async function installSystemdService() {
  

  const servicePath = '/etc/systemd/system/openclaw-monitor.service';
  const executablePath = process.argv[1];

  const serviceContent = `[Unit]
Description=OpenClaw Gateway Monitor
After=network.target

[Service]
Type=forking
ExecStart=${executablePath} start
Restart=always
RestartSec=10
User=${process.env.USER}
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target`;

  // 写入service文件 (需要sudo)
  try {
    execSync(`sudo tee ${servicePath} > /dev/null`, {
      input: serviceContent,
      stdio: 'inherit'
    });

    execSync('sudo systemctl daemon-reload', { stdio: 'inherit' });
    execSync('sudo systemctl enable openclaw-monitor.service', { stdio: 'inherit' });
    execSync('sudo systemctl start openclaw-monitor.service', { stdio: 'inherit' });

    console.log('✓ Linux 系统服务已安装并启动');
    console.log(`  配置文件: ${servicePath}`);
    console.log('  使用以下命令管理服务:');
    console.log('    启动: sudo systemctl start openclaw-monitor');
    console.log('    停止: sudo systemctl stop openclaw-monitor');
    console.log('    状态: sudo systemctl status openclaw-monitor');
    console.log('    卸载: openclaw-monitor service-uninstall');
  } catch (error) {
    console.error('需要sudo权限来安装系统服务');
    throw error;
  }
}

async function uninstallSystemdService() {
  
  const servicePath = '/etc/systemd/system/openclaw-monitor.service';

  try {
    execSync('sudo systemctl stop openclaw-monitor.service', { stdio: 'inherit' });
    execSync('sudo systemctl disable openclaw-monitor.service', { stdio: 'inherit' });
  } catch {
    // 服务可能未运行
  }

  try {
    execSync(`sudo rm ${servicePath}`, { stdio: 'inherit' });
    execSync('sudo systemctl daemon-reload', { stdio: 'inherit' });
  } catch {
    // 文件可能不存在
  }

  console.log('✓ Linux 系统服务已卸载');
}

// 解析命令行参数
async function main() {
  const command = args[0]?.toLowerCase();
  const hasForceFlag = args.includes('--force') || args.includes('-f');

  switch (command) {
    case 'config':
      const subCommand = args[1]?.toLowerCase();
      if (subCommand === 'init') {
        await cmdConfigInit(hasForceFlag);
      } else {
        console.log(`未知命令: config ${subCommand}`);
        console.log('可用子命令: init');
        process.exit(1);
      }
      break;

    case 'start':
      await cmdStart();  // 默认 daemon 模式
      break;

    case 'stop':
      await cmdStop();
      break;

    case 'restart':
      await cmdRestart();  // 默认 daemon 模式
      break;

    case 'status':
      await cmdStatus();
      break;

    case 'logs':
      const logsIndex = args.indexOf('-n');
      const linesArg = logsIndex >= 0 ? args[logsIndex + 1] : '50';
      await cmdLogs(parseInt(linesArg) || 50);
      break;

    case 'diagnose':
      const diagnoseIndex = args.indexOf('-n');
      const diagnoseArg = diagnoseIndex >= 0 ? args[diagnoseIndex + 1] : '20';
      await cmdDiagnose(parseInt(diagnoseArg) || 20);
      break;

    case 'service-install':
      await cmdServiceInstall();
      break;

    case 'service-uninstall':
      await cmdServiceUninstall();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (command) {
        console.log(`未知命令: ${command}`);
      }
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});
