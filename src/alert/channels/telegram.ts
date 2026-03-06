// src/alert/channels/telegram.ts

import type { AlertChannel, Alert } from '../../types/alert.js';
import type { TelegramConfig } from '../../types/config.js';

export class TelegramChannel implements AlertChannel {
  name = 'telegram' as const;
  enabled: boolean;

  constructor(private config: TelegramConfig) {
    this.enabled = config.enabled;
  }

  async send(alert: Alert): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const message = this.formatMessage(alert);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: this.config.chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
      throw error;
    }
  }

  private formatMessage(alert: Alert): string {
    const emoji = this.getEmoji(alert.level);

    return `
${emoji} *OpenClaw Monitor*

*级别*: ${alert.level}
*标题*: ${alert.title}

${alert.message}
${alert.metadata ? this.formatMetadata(alert.metadata) : ''}

时间: ${alert.timestamp?.toLocaleString('zh-CN') || new Date().toLocaleString('zh-CN')}
    `.trim();
  }

  private getEmoji(level: string): string {
    const emojis: Record<string, string> = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌',
      CRITICAL: '🚨',
    };
    return emojis[level] || 'ℹ️';
  }

  private formatMetadata(metadata: Record<string, unknown>): string {
    const lines = Object.entries(metadata)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);

    return lines.length > 0 ? '\n*详情*:\n' + lines.map((l) => `  ${l}`).join('\n') : '';
  }
}
