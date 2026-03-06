// src/alert/manager.ts

import type { AlertChannel, Alert, AlertLevel } from '../types/alert.js';
import type { AlertConfig, MonitorConfig } from '../types/config.js';
import type { ProcessStatus } from '../types/process.js';
import { TelegramChannel } from './channels/telegram.js';
import { FeishuChannel } from './channels/feishu.js';
import { LarkChannel } from './channels/lark.js';

export interface AlertRecord {
  id: string;
  alert: Alert;
  sentAt: Date;
  channel: string;
  success: boolean;
  error?: string;
}

export class AlertManager {
  private channels: AlertChannel[] = [];
  private history: AlertRecord[] = [];
  private lastAlertTime = new Map<string, number>();
  private maxHistory = 1000;

  constructor(private config: MonitorConfig) {
    this.initializeChannels();
  }

  async sendAlert(alert: Alert): Promise<void> {
    if (!this.config.alerts?.enabled) {
      return;
    }

    // 防止重复告警（5分钟内相同级别不重复）
    const key = `${alert.level}:${alert.title}`;
    const now = Date.now();
    const lastTime = this.lastAlertTime.get(key);

    if (lastTime && now - lastTime < 5 * 60 * 1000) {
      return;
    }

    this.lastAlertTime.set(key, now);

    // 发送到所有启用的渠道
    const promises = this.channels
      .filter((ch) => ch.enabled)
      .map(async (channel) => {
        try {
          await channel.send(alert);
          this.addToHistory(alert, channel.name, true);
        } catch (error) {
          this.addToHistory(alert, channel.name, false, String(error));
        }
      });

    await Promise.all(promises);
  }

  async sendTest(channel: 'telegram' | 'feishu' | 'lark' | 'all'): Promise<void> {
    const testAlert: Alert = {
      level: 'INFO',
      title: '测试告警',
      message: '这是一条测试消息，如果你收到此消息，说明告警配置正确！',
      timestamp: new Date(),
    };

    if (channel === 'all') {
      await this.sendAlert(testAlert);
    } else {
      const targetChannel = this.channels.find((ch) => ch.name === channel);
      if (targetChannel) {
        await targetChannel.send(testAlert);
      }
    }
  }

  getHistory(level?: AlertLevel, limit = 100): AlertRecord[] {
    let filtered = this.history;

    if (level) {
      filtered = filtered.filter((record) => record.alert.level === level);
    }

    return filtered.slice(-limit).reverse();
  }

  async sendProcessAlert(status: ProcessStatus): Promise<void> {
    if (status.running) {
      return; // 进程正常不发送告警
    }

    await this.sendAlert({
      level: 'CRITICAL',
      title: 'OpenClaw Gateway 已停止',
      message: 'OpenClaw Gateway 进程已停止运行，请检查',
      timestamp: new Date(),
      metadata: {
        pid: status.pid,
        lastCheck: status.lastCheck.toISOString(),
      },
    });
  }

  async sendResourceAlert(type: 'cpu' | 'memory', value: number, threshold: number): Promise<void> {
    await this.sendAlert({
      level: 'WARNING',
      title: `OpenClaw Gateway 资源使用告警`,
      message: `${type.toUpperCase()} 使用率过高: ${value.toFixed(1)}%，阈值: ${threshold}%`,
      timestamp: new Date(),
      metadata: {
        type,
        value,
        threshold,
      },
    });
  }

  private initializeChannels(): void {
    const alertConfig = this.config.alerts;
    if (!alertConfig) {
      return;
    }

    if (alertConfig.telegram) {
      this.channels.push(new TelegramChannel(alertConfig.telegram));
    }

    if (alertConfig.feishu) {
      this.channels.push(new FeishuChannel(alertConfig.feishu));
    }

    if (alertConfig.lark) {
      this.channels.push(new LarkChannel(alertConfig.lark));
    }
  }

  private addToHistory(alert: Alert, channel: string, success: boolean, error?: string): void {
    const record: AlertRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alert,
      sentAt: new Date(),
      channel,
      success,
      error,
    };

    this.history.unshift(record);

    // 保留最近 maxHistory 条记录
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }
}
