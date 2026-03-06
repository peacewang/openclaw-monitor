// src/OpenClawMonitor.ts

import type { MonitorConfig } from './types/config.js';
import type { ProcessStatus, ProcessEvent } from './types/process.js';
import type { LogLine } from './types/log.js';
import { ConfigLoader } from './config/loader.js';
import { OpenClawEnvDetectorImpl } from './env/detector.js';
import { ProcessMonitorImpl } from './monitor/process.js';
import { LogCollectorImpl } from './monitor/log.js';

export class OpenClawMonitor {
  private config: MonitorConfig;
  private envDetector: OpenClawEnvDetectorImpl;
  private processMonitor?: ProcessMonitorImpl;
  private logCollector?: LogCollectorImpl;
  private started = false;

  constructor(config?: Partial<MonitorConfig>) {
    this.config = this.mergeConfig(config);
    this.envDetector = new OpenClawEnvDetectorImpl();
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Monitor already started');
    }

    // 检测 OpenClaw 环境
    const env = await this.envDetector.detect();
    if (!env.installed) {
      throw new Error('OpenClaw not installed or not found');
    }

    // 加载配置
    const loader = new ConfigLoader();
    this.config = await loader.load();

    // 启动进程监控
    this.processMonitor = new ProcessMonitorImpl(this.envDetector, this.config);
    await this.processMonitor.start();

    // 启动日志收集
    this.logCollector = new LogCollectorImpl(this.envDetector, this.config);
    await this.logCollector.start();

    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.processMonitor?.stop();
    this.logCollector?.stop();
    this.started = false;
  }

  async getStatus(): Promise<ProcessStatus> {
    if (!this.processMonitor) {
      throw new Error('Monitor not started');
    }
    return this.processMonitor.getStatus();
  }

  getRecentLogs(n: number): LogLine[] {
    if (!this.logCollector) {
      throw new Error('Monitor not started');
    }
    return this.logCollector.getRecentLines(n);
  }

  searchLogs(pattern: string, limit?: number): LogLine[] {
    if (!this.logCollector) {
      throw new Error('Monitor not started');
    }
    return this.logCollector.search(pattern, limit);
  }

  getErrorLogs(limit?: number): LogLine[] {
    if (!this.logCollector) {
      throw new Error('Monitor not started');
    }
    return this.logCollector.getErrors(limit);
  }

  onStatusChange(callback: (event: ProcessEvent) => void): () => void {
    if (!this.processMonitor) {
      throw new Error('Monitor not started');
    }
    return this.processMonitor.subscribe(callback);
  }

  isStarted(): boolean {
    return this.started;
  }

  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  private mergeConfig(userConfig?: Partial<MonitorConfig>): MonitorConfig {
    // 基础默认配置
    const base: MonitorConfig = {
      monitoring: {
        enabled: true,
        interval: 5,
        logLines: 100,
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
      },
    };

    if (!userConfig) {
      return base;
    }

    return {
      ...base,
      ...userConfig,
      monitoring: { ...base.monitoring, ...userConfig.monitoring },
      openclaw: { ...base.openclaw, ...userConfig.openclaw },
      web: userConfig.web ? { ...base.web, ...userConfig.web } : base.web,
      alerts: userConfig.alerts ? { ...base.alerts, ...userConfig.alerts } : base.alerts,
    };
  }
}
