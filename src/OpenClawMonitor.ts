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
import { TelegramBotService } from './bot/telegram.js';
import { FeishuBotService } from './bot/feishu.js';
import type { BotService } from './bot/types.js';

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
  private botServices: BotService[] = [];
  private started = false;
  private unsubscribeStatusChange?: () => void;

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
    this.config = { ...this.config, ...(await loader.load()), devMode: isDevMode };

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

    // 订阅进程状态变化，触发自动告警
    if (this.processMonitor && this.config.alerts?.enabled) {
      this.unsubscribeStatusChange = this.onStatusChange(async (event) => {
        await this.handleStatusChangeEvent(event);
      });
      console.log('[Monitor] 自动告警已启用');
    }

    // 启动 Web API
    if (this.config.web?.enabled) {
      this.apiServer = new ApiServer(this, {
        host: this.config.web.host,
        port: this.config.web.port,
      });
      await this.apiServer.start();
    }

    // Initialize bot services
    this.initBotServices();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    // 取消状态变化订阅
    if (this.unsubscribeStatusChange) {
      this.unsubscribeStatusChange();
      this.unsubscribeStatusChange = undefined;
    }

    // Stop bot services
    for (const bot of this.botServices) {
      bot.stop();
    }
    this.botServices = [];

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

  async sendTestAlert(channel: 'telegram' | 'feishu' | 'lark' | 'all' = 'all'): Promise<void> {
    if (!this.alertManager) {
      throw new Error('Alert manager not initialized');
    }
    await this.alertManager.sendTest(channel);
  }

  async sendAlert(alert: { level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'; title: string; message: string; timestamp?: Date }): Promise<void> {
    if (!this.alertManager) {
      throw new Error('Alert manager not initialized');
    }
    await this.alertManager.sendAlert(alert);
  }

  getWebUrl(): string | null {
    return this.apiServer?.getAddress() || null;
  }

  private async handleStatusChangeEvent(event: ProcessEvent): Promise<void> {
    if (!this.alertManager || !event.status) {
      return;
    }

    const status = event.status;

    switch (event.type) {
      case 'stopped':
        // 进程停止时发送 CRITICAL 告警
        await this.alertManager.sendProcessAlert(status);
        console.log('[Monitor] 进程停止告警已发送');
        break;

      case 'started':
        // 进程启动时发送 INFO 通知
        await this.alertManager.sendAlert({
          level: 'INFO',
          title: 'OpenClaw Gateway 已启动',
          message: `PID: ${status.pid || 'N/A'}`,
          timestamp: new Date(),
        });
        console.log('[Monitor] 进程启动通知已发送');
        break;
    }

    // 检查资源使用情况
    if (status.running) {
      const thresholds = this.config.monitoring.thresholds || {
        cpu: { warning: 80, critical: 95 },
        memory: { warning: 1024, critical: 2048 }, // MB
      };

      // CPU 告警
      if (status.cpuPercent >= thresholds.cpu.critical) {
        await this.alertManager.sendResourceAlert('cpu', status.cpuPercent, thresholds.cpu.critical);
      }

      // 内存告警
      if (status.memoryMB >= thresholds.memory.critical) {
        await this.alertManager.sendResourceAlert('memory', status.memoryMB, thresholds.memory.critical);
      }
    }
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

  private initBotServices(): void {

    if (!this.config.alerts?.enabled) {
      return;
    }

    // Telegram Bot
    if (this.config.alerts.telegram?.enabled) {
      const bot = new TelegramBotService(this.config.alerts.telegram, this);
      this.botServices.push(bot);
      bot.start().catch(err => console.error("Telegram Bot start failed:", err));
    }

    // Feishu Bot
    if (this.config.alerts.feishu?.enabled) {
      const bot = new FeishuBotService(this.config.alerts.feishu, this);
      this.botServices.push(bot);
      bot.start().catch(err => console.error("Feishu Bot start failed:", err));
    }

    if (this.botServices.length > 0) {
      console.log(`Started ${this.botServices.length} bot service(s)`);
    }
  }
}
