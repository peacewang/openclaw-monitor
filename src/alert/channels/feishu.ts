// src/alert/channels/feishu.ts

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

    // 使用 Bot API 方式
    await this.sendViaBotApi(alert);
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
