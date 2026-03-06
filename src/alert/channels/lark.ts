// src/alert/channels/lark.ts

import * as crypto from 'crypto';
import type { AlertChannel, Alert } from '../../types/alert.js';
import type { LarkConfig } from '../../types/config.js';

// Lark 使用不同的 API 域名，但 API 结构与 Feishu 相同
export class LarkChannel implements AlertChannel {
  name = 'lark' as const;
  enabled: boolean;
  private webhook: string;
  private secret?: string;

  constructor(config: LarkConfig) {
    this.enabled = config.enabled;
    // 转换 webhook URL 为 Lark 域名
    this.webhook = config.webhook.replace('https://open.feishu.cn', 'https://open.larksuite.com');
    this.secret = config.secret;
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
      sign: this.secret ? this.generateSign(timestamp) : undefined,
    };

    try {
      const response = await fetch(this.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Lark API error: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send Lark alert:', error);
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
    if (!this.secret) {
      return '';
    }

    const stringToSign = `${timestamp}\n${this.secret}`;
    return crypto
      .createHmac('sha256', this.secret)
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
