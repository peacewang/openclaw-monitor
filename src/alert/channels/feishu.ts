// src/alert/channels/feishu.ts

import * as crypto from 'crypto';
import type { AlertChannel, Alert } from '../../types/alert.js';
import type { FeishuConfig } from '../../types/config.js';

export class FeishuChannel implements AlertChannel {
  name = 'feishu' as const;
  enabled: boolean;

  constructor(private config: FeishuConfig) {
    this.enabled = config.enabled;
  }

  async send(alert: Alert): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const card = this.buildCard(alert);
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
      msg_type: 'interactive',
      card,
      timestamp,
      sign: this.config.secret ? this.generateSign(timestamp) : undefined,
    };

    try {
      const response = await fetch(this.config.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Feishu API error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send Feishu alert:', error);
      throw error;
    }
  }

  private buildCard(alert: Alert) {
    const emoji = this.getEmoji(alert.level);
    const color = this.getColor(alert.level);

    return {
      header: {
        title: {
          tag: 'plain_text',
          content: `${emoji} OpenClaw Monitor 告警`,
        },
        template: color,
      },
      elements: [
        {
          tag: 'div',
          fields: [
            {
              is_short: false,
              text: {
                tag: 'lark_md',
                content: `**级别**: ${alert.level}\n**标题**: ${alert.title}`,
              },
            },
            {
              is_short: false,
              text: {
                tag: 'plain_text',
                content: alert.message,
              },
            },
          ],
        },
        {
          tag: 'div',
          text: {
            tag: 'plain_text',
            content: `时间: ${alert.timestamp?.toLocaleString('zh-CN') || new Date().toLocaleString('zh-CN')}`,
          },
        },
      ],
    };
  }

  private generateSign(timestamp: number): string {
    if (!this.config.secret) {
      return '';
    }

    const stringToSign = `${timestamp}\n${this.config.secret}`;
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(stringToSign)
      .digest('base64');
  }

  private getColor(level: string): string {
    const colors: Record<string, string> = {
      INFO: 'blue',
      WARNING: 'yellow',
      ERROR: 'red',
      CRITICAL: 'red',
    };
    return colors[level] || 'blue';
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
}
