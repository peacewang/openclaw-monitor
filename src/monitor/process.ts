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
      const gatewayPort = env.config?.gateway?.port || env.gatewayPort;

      return {
        pid,
        running: true,
        cpuPercent: stats.cpu || 0,
        memoryMB: (stats.memory || 0) / 1024 / 1024,
        startTime: stats.ctime ? new Date(stats.ctime) : undefined,
        uptime: stats.ctime ? Date.now() - stats.ctime : undefined,
        restartCount: this.currentStatus.restartCount,
        port: gatewayPort,
        portOpen: gatewayPort ? await this.checkPort(gatewayPort) : false,
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
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH'
      );

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('openclaw') || line.toLowerCase().includes('gateway')) {
          const match = line.match(/"(\d+)"/);
          return match ? parseInt(match[1], 10) : null;
        }
      }

      // 如果没找到，查找所有 node 进程
      for (const line of lines) {
        const match = line.match(/"(\d+)"/);
        if (match) {
          const pid = parseInt(match[1], 10);
          const isValid = await this.verifyOpenClawProcess(pid);
          if (isValid) return pid;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async findProcessUnix(): Promise<number | null> {
    try {
      // 首先尝试 pgrep
      try {
        const { stdout } = await execAsync('pgrep -f "openclaw"');
        const pids = stdout.trim().split('\n').filter(Boolean);
        if (pids.length > 0) {
          return parseInt(pids[0], 10);
        }
      } catch {
        // pgrep 未找到，继续使用 ps
      }

      // 使用 ps 命令
      const { stdout } = await execAsync('ps aux | grep -i openclaw | grep -v grep');
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 1) {
          return parseInt(parts[1], 10);
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async verifyOpenClawProcess(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /VALUE`);
      return stdout.toLowerCase().includes('openclaw') || stdout.toLowerCase().includes('gateway');
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
