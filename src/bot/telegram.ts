// src/bot/telegram.ts

import type { BotService } from './types.js';
import type { TelegramConfig } from '../types/config.js';
import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import type { ProcessStatus, LogLine } from '../types/index.js';

export class TelegramBotService implements BotService {
  name = 'telegram' as const;
  enabled: boolean;
  private pollId?: NodeJS.Timeout;
  private offset = 0;

  constructor(
    private config: TelegramConfig,
    private monitor: OpenClawMonitor
  ) {
    this.enabled = config.enabled;
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log('Telegram Bot 服务已启动');
    this.poll();
  }

  stop(): void {
    if (this.pollId) {
      clearTimeout(this.pollId);
      this.pollId = undefined;
    }
  }

  private async poll(): Promise<void> {
    try {
      const updates = await fetch(
        `https://api.telegram.org/bot${this.config.botToken}/getUpdates?offset=${this.offset}&timeout=30`
      );

      const data: any = await updates.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      }

      this.pollId = setTimeout(() => this.poll(), 1000);
    } catch (error) {
      console.error('Telegram Bot 轮询错误:', error);
      this.pollId = setTimeout(() => this.poll(), 5000);
    }
  }

  private async handleUpdate(update: any): Promise<void> {
    const message = update.message || update.edited_message;
    if (!message) {
      return;
    }

    const text = message.text;
    if (!text) {
      return;
    }

    const chatId = message.chat.id.toString();

    // 验证 chatId
    if (chatId !== this.config.chatId) {
      await this.sendMessage(chatId, '抱歉，您没有权限使用此机器人。');
      return;
    }

    const command = text.split('@')[0].toLowerCase();

    switch (command) {
      case '/start':
        await this.sendMessage(chatId, this.getHelpMessage());
        break;

      case '/status':
        await this.handleStatus(chatId);
        break;

      case '/logs':
        await this.handleLogs(chatId);
        break;

      case '/restart':
        await this.handleRestart(chatId);
        break;

      case '/diagnose':
        await this.handleDiagnose(chatId);
        break;

      case '/help':
        await this.sendMessage(chatId, this.getHelpMessage());
        break;

      default:
        await this.sendMessage(chatId, `未知命令: ${text}\n\n使用 /help 查看可用命令`);
    }
  }

  private async handleStatus(chatId: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(chatId, '监控服务未启动');
      return;
    }

    const status = await this.monitor.getStatus();

    if (status.running) {
      await this.sendMessage(chatId,
        `*OpenClaw 状态* ✅\n` +
        `*PID*: ${status.pid}\n` +
        `*CPU*: ${status.cpuPercent.toFixed(1)}%\n` +
        `*内存*: ${status.memoryMB.toFixed(0)} MB\n` +
        `*运行时长*: ${this.formatUptime(status.uptime)}\n` +
        `*端口*: ${status.port || 'N/A'} ${status.portOpen ? '✓' : '✗'}\n` +
        `*最后检查*: ${status.lastCheck.toLocaleString('zh-CN')}`
      );
    } else {
      await this.sendMessage(chatId, '*OpenClaw 状态* ✗\n\n进程未运行');
    }
  }

  private async handleLogs(chatId: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(chatId, '监控服务未启动');
      return;
    }

    const logs = this.monitor.getRecentLines(10);

    if (logs.length === 0) {
      await this.sendMessage(chatId, '暂无日志');
      return;
    }

    const message = logs.slice(-5).map(log =>
      `[${new Date(log.timestamp).toLocaleTimeString('zh-CN')}] [${log.level}] ${log.message}`
    ).join('\n');

    await this.sendMessage(chatId, `*最近 5 条日志*:\n\n${message}`);
  }

  private async handleRestart(chatId: string): Promise<void> {
    await this.sendMessage(chatId,
      '⚠️ *确认重启*\n\nOpenClaw Monitor 暂不支持远程重启功能。\n\n请使用 restart_openclaw.sh 脚本手动重启。'
    );
  }

  private async handleDiagnose(chatId: string): Promise<void> {
    const errors = this.monitor.getErrorLogs(5);

    if (errors.length === 0) {
      await this.sendMessage(chatId, '*诊断结果* ✅\n\n未发现错误日志');
      return;
    }

    const message = errors.map(log =>
      `[${new Date(log.timestamp).toLocaleString('zh-CN')}] [${log.level}] ${log.message}`
    ).join('\n');

    await this.sendMessage(chatId, `*诊断结果* ⚠️\n\n发现 ${errors.length} 条错误日志:\n\n${message}\n\n建议：检查 OpenClaw 配置和日志文件`);
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error) {
      console.error('发送 Telegram 消息失败:', error);
    }
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
/status - 查看运行状态
/logs - 查看最近日志
/restart - 重启服务
/diagnose - 诊断问题
/help - 显示此帮助

监控 Web UI: http://your-server:37890`;
  }
}
