// src/bot/feishu.ts

import type { BotService } from './types.js';
import type { FeishuConfig } from '../types/config.js';
import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import type { ProcessStatus } from '../types/index.js';
import * as crypto from 'crypto';

interface FeishuEvent {
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
  };
  event: {
    v2_user_id: {
      user_id: string;
    };
    content: string;
  };
}

export class FeishuBotService implements BotService {
  name = 'feishu' as const;
  enabled: boolean;
  private verifyToken?: string;
  private encryptKey?: string;

  constructor(
    private config: FeishuConfig,
    private monitor: OpenClawMonitor
  ) {
    this.enabled = config.enabled;
    // 从 webhook URL 解析 verify_token 和 encrypt_key
    const url = new URL(config.webhook);
    this.verifyToken = url.searchParams.get('verify_token') || undefined;
    this.encryptKey = url.searchParams.get('encrypt_key') || undefined;
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log('飞书 Bot 服务已启动（使用 Webhook 模式）');
  }

  stop(): void {
    // Webhook 模式，无需停止轮询
  }

  async handleEvent(event: FeishuEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // 验证请求
    if (!this.verifySignature(event)) {
      console.error('飞书事件签名验证失败');
      return;
    }

    const text = event.event.content.trim();
    const userId = event.event.v2_user_id.user_id;

    await this.handleCommand(text, userId);
  }

  private async handleCommand(text: string, userId: string): Promise<void> {
    const command = text.split(' ')[0].toLowerCase();

    switch (command) {
      case '/help':
      case '帮助':
        await this.sendMessage(this.getHelpMessage());
        break;

      case '/status':
      case '状态':
        await this.handleStatus();
        break;

      case '/logs':
      case '日志':
        await this.handleLogs();
        break;

      case '/diagnose':
      case '诊断':
        await this.handleDiagnose();
        break;

      default:
        await this.sendMessage(`未知命令: ${text}\n\n使用 /help 查看可用命令`);
    }
  }

  private async handleStatus(): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage('监控服务未启动');
      return;
    }

    const status = await this.monitor.getStatus();

    if (status.running) {
      await this.sendMessage(
        `*OpenClaw 状态* ✅\n` +
        `*PID*: ${status.pid}\n` +
        `*CPU*: ${status.cpuPercent.toFixed(1)}%\n` +
        `*内存*: ${status.memoryMB.toFixed(0)} MB\n` +
        `*运行时长*: ${this.formatUptime(status.uptime)}\n` +
        `*端口*: ${status.port || 'N/A'} ${status.portOpen ? '✓' : '✗'}\n` +
        `*最后检查*: ${status.lastCheck.toLocaleString('zh-CN')}`
      );
    } else {
      await this.sendMessage('*OpenClaw 状态* ✗\n\n进程未运行');
    }
  }

  private async handleLogs(): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage('监控服务未启动');
      return;
    }

    const logs = this.monitor.getRecentLines(10);

    if (logs.length === 0) {
      await this.sendMessage('暂无日志');
      return;
    }

    const message = logs.slice(-5).map(log =>
      `[${new Date(log.timestamp).toLocaleTimeString('zh-CN')}] [${log.level}] ${log.message}`
    ).join('\n');

    await this.sendMessage(`*最近 5 条日志*:\n\n${message}`);
  }

  private async handleDiagnose(): Promise<void> {
    const errors = this.monitor.getErrorLogs(5);

    if (errors.length === 0) {
      await this.sendMessage('*诊断结果* ✅\n\n未发现错误日志');
      return;
    }

    const message = errors.map(log =>
      `[${new Date(log.timestamp).toLocaleString('zh-CN')}] [${log.level}] ${log.message}`
    ).join('\n');

    await this.sendMessage(`*诊断结果* ⚠️\n\n发现 ${errors.length} 条错误日志:\n\n${message}\n\n建议：检查 OpenClaw 配置和日志文件`);
  }

  private async sendMessage(text: string): Promise<void> {
    if (!this.config.webhook) {
      return;
    }

    try {
      await fetch(this.config.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: {
            text,
          },
        }),
      });
    } catch (error) {
      console.error('发送飞书消息失败:', error);
    }
  }

  private verifySignature(event: FeishuEvent): boolean {
    if (!this.encryptKey) {
      return true; // 未配置加密则跳过验证
    }

    // TODO: 实现飞书签名验证
    return true;
  }

  private formatUptime(seconds?: number): string {
    if (!seconds) return '--';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}天${hours}小时` : `${hours}小时${minutes}分`;
  }

  private getHelpMessage(): string {
    return `*OpenClaw Monitor Bot* 🛡️

可用命令:
/help 或 帮助 - 显示此帮助
/status 或 状态 - 查看运行状态
/logs 或 日志 - 查看最近日志
/diagnose 或 诊断 - 诊断问题

监控 Web UI: http://your-server:37890`;
  }
}
