// src/OpenClawMonitor.ts

import type { MonitorConfig } from './types/config.js';
import type { ProcessStatus, ProcessEvent } from './types/process.js';
import type { LogLine } from './types/log.js';
import type { AlertLevel } from './types/alert.js';
import { ConfigLoader } from './config/loader.js';
import { OpenClawEnvDetectorImpl } from './env/detector.js';
import { ProcessMonitorImpl } from './monitor/process.js';
import { LogCollectorImpl } from './monitor/log.js';
import { ApiServer } from './api/server.js';
import { AlertManager, AlertRecord } from './alert/manager.js';

export interface DevModeConfig {
  devMode?: boolean;
}

export class OpenClawMonitor {
  private config: MonitorConfig & DevModeConfig;
  private envDetector: OpenClawEnvDetectorImpl;
  private processMonitor?: ProcessMonitorImpl;
  private logCollector?: LogCollectorImpl;
  private alertManager?: AlertManager;
  private apiServer?: ApiServer;
  private started = false;

  constructor(config?: Partial<MonitorConfig & DevModeConfig>) {
    this.config = this.mergeConfig(config);
    this.envDetector = new OpenClawEnvDetectorImpl();
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Monitor already started');
    }

    const isDevMode = this.config.devMode ?? false;

    // 开发模式：跳过环境检测，只启动 Web API
    if (isDevMode) {
      console.log('🚀 开发模式已启用 - 跳过 OpenClaw 环境检测');
    } else {
      // 检测 OpenClaw 环境
      const env = await this.envDetector.detect();
      if (!env.installed) {
        throw new Error('OpenClaw not installed or not found\n\n提示: 使用 --dev 参数启动开发模式，无需 OpenClaw Gateway');
      }
    }

    // 加载配置
    const loader = new ConfigLoader();
    this.config = { ...(await loader.load()), ...this.config, devMode: isDevMode };

    // 启动进程监控
    if (!isDevMode) {
      this.processMonitor = new ProcessMonitorImpl(this.envDetector, this.config);
      await this.processMonitor.start();

      // 启动日志收集
      this.logCollector = new LogCollectorImpl(this.envDetector, this.config);
      await this.logCollector.start();
    }

    // 初始化告警管理器
    this.alertManager = new AlertManager(this.config);

    // 启动 Web API
    if (this.config.web?.enabled) {
      this.apiServer = new ApiServer(this, {
        host: this.config.web.host,
        port: this.config.web.port,
      });
      await this.apiServer.start();
    }

    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.processMonitor?.stop();
    this.logCollector?.stop();
    await this.apiServer?.stop();
    this.started = false;
  }

  async getStatus(): Promise<ProcessStatus> {
    if (!this.processMonitor) {
      // 开发模式返回模拟状态
      return this.createMockStatus();
    }
    return this.processMonitor.getStatus();
  }

  getRecentLines(n: number): LogLine[] {
    if (!this.logCollector) {
      return this.createMockLogs(n);
    }
    return this.logCollector.getRecentLines(n);
  }

  searchLogs(pattern: string, limit?: number): LogLine[] {
    if (!this.logCollector) {
      return this.createMockLogs(limit || 10);
    }
    return this.logCollector.search(pattern, limit);
  }

  getErrorLogs(limit?: number): LogLine[] {
    if (!this.logCollector) {
      return this.createMockLogs(limit || 10).filter(l => l.level === 'ERROR' || l.level === 'FATAL');
    }
    return this.logCollector.getErrors(limit);
  }

  onStatusChange(callback: (event: ProcessEvent) => void): () => void {
    if (!this.processMonitor) {
      // 开发模式：返回空订阅函数
      return () => {};
    }
    return this.processMonitor.subscribe(callback);
  }

  isStarted(): boolean {
    return this.started;
  }

  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...partial };

    // 深度合并嵌套对象
    if (partial.monitoring) {
      this.config.monitoring = { ...this.config.monitoring, ...partial.monitoring };
    }
    if (partial.web) {
      this.config.web = { ...this.config.web, ...partial.web };
    }
    if (partial.alerts) {
      this.config.alerts = { ...this.config.alerts, ...partial.alerts };
    }
    if (partial.openclaw) {
      this.config.openclaw = { ...this.config.openclaw, ...partial.openclaw };
    }

    // 如果告警配置变化，重新初始化告警管理器
    if (partial.alerts && this.alertManager) {
      this.alertManager = new AlertManager(this.config);
    }
  }

  getAlertHistory(level?: AlertLevel, limit = 100): AlertRecord[] {
    return this.alertManager?.getHistory(level, limit) ?? [];
  }

  getWebUrl(): string | null {
    return this.apiServer?.getAddress() || null;
  }

  private createMockStatus(): ProcessStatus {
    return {
      running: false,
      cpuPercent: 0,
      memoryMB: 0,
      restartCount: 0,
      portOpen: false,
      lastCheck: new Date(),
    };
  }

  private createMockLogs(count: number): LogLine[] {
    const logs: LogLine[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      logs.push({
        timestamp: new Date(now - i * 60000),
        level: 'INFO',
        message: `[开发模式] 模拟日志 ${i + 1} - 这是一个示例日志消息`,
        source: 'stdout',
        lineNum: i + 1,
      });
    }
    return logs;
  }

  private mergeConfig(userConfig?: Partial<MonitorConfig & DevModeConfig>): MonitorConfig & DevModeConfig {
    // 基础默认配置
    const base: MonitorConfig & DevModeConfig = {
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
      devMode: false,
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
      devMode: userConfig.devMode ?? base.devMode,
    };
  }
}
