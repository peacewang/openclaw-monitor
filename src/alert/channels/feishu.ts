// src/alert/channels/feishu.ts

import * as crypto from 'crypto';
import type { AlertChannel, Alert } from '../../types/alert.js';
import type { FeishuConfig } from '../../types/config.js';
import Lark from '@larksuiteoapi/node-sdk';

// 使用全局变量共享用户 ID 和 client
const globalUserOpenIds = (global as any).__feishuUserOpenIds || ((global as any).__feishuUserOpenIds = new Set<string>());

export function setFeishuClient(client: Lark.Client) {
  (global as any).__feishuClient = client;
}

export function addUserOpenId(openId: string) {
  globalUserOpenIds.add(openId);
  console.log(`[Feishu Alert] 已添加用户 ID: ${openId}, 当前用户数: ${globalUserOpenIds.size}`);
}

export function getUserOpenIds(): string[] {
  return Array.from(globalUserOpenIds);
}

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

    // 如果配置了 webhook，使用 webhook 方式
    if (this.config.webhook) {
      await this.sendViaWebhook(alert);
      return;
    }

    // 使用 Bot API 方式
    await this.sendViaBotApi(alert);
  }

  private async sendViaWebhook(alert: Alert): Promise<void> {
    const card = this.buildCard(alert);
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = {
      msg_type: 'interactive',
      card,
      timestamp,
      sign: this.config.secret ? this.generateSign(timestamp) : undefined,
    };

    try {
      const response = await fetch(this.config.webhook!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Feishu webhook error: ${error}`);
      }
    } catch (error) {
      console.error('[Feishu Alert] Failed to send via webhook:', error);
      throw error;
    }
  }

  private async sendViaBotApi(alert: Alert): Promise<void> {
    if (!this.config.app_id || !this.config.app_secret) {
      console.error('[Feishu Alert] Bot API 模式需要 app_id 和 app_secret');
      return;
    }

    // 获取或创建 client
    let client = (global as any).__feishuClient;
    if (!client) {
      client = new Lark.Client({
        appId: this.config.app_id,
        appSecret: this.config.app_secret,
      });
      setFeishuClient(client);
    }

    const message = this.buildTextMessage(alert);
    console.log('[Feishu Alert] 准备发送告警:', message);

    // 获取已知的用户 ID
    const openIds = getUserOpenIds();
    if (openIds.length === 0) {
      console.log('[Feishu Alert] 没有已知的用户 ID，请先在飞书中与 Bot 交互（发送任意命令）');
      return;
    }

    console.log(`[Feishu Alert] 向 ${openIds.length} 个用户发送告警`);

    for (const openId of openIds) {
      try {
        const result = await client.im.v1.message.create({
          params: { receive_id_type: 'open_id' },
          data: {
            receive_id: openId,
            msg_type: 'text',
            content: JSON.stringify({ text: message }),
          },
        });
        console.log(`[Feishu Alert] 已发送给 ${openId}`);
      } catch (error) {
        console.error(`[Feishu Alert] 发送给 ${openId} 失败:`, (error as Error).message);
      }
    }
  }

  private buildTextMessage(alert: Alert): string {
    const emoji = this.getEmoji(alert.level);
    const time = alert.timestamp?.toLocaleString('zh-CN') || new Date().toLocaleString('zh-CN');
    return `${emoji} ${alert.title}\n级别: ${alert.level}\n${alert.message}\n时间: ${time}`;
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
