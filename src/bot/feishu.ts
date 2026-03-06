// src/bot/feishu.ts

import type { BotService } from './types.js';
import type { FeishuConfig } from '../types/config.js';
import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import Lark from '@larksuiteoapi/node-sdk';
import { addUserOpenId, getUserOpenIds, setFeishuClient } from '../alert/channels/feishu.js';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execAsync);

// 飞书用户 ID 列表文件（全局配置路径）
const USER_IDS_FILE = resolve(homedir(), '.openclaw-monitor', 'feishu_users.json');

async function loadUserIds(): Promise<string[]> {
  try {
    const data = await readFile(USER_IDS_FILE, 'utf-8');
    const ids = JSON.parse(data);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function saveUserId(openId: string): Promise<void> {
  const ids = await loadUserIds();
  if (!ids.includes(openId)) {
    ids.push(openId);

    // 确保目录存在
    const { mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    await mkdir(dirname(USER_IDS_FILE), { recursive: true });

    await writeFile(USER_IDS_FILE, JSON.stringify(ids, null, 2));
  }
}

export class FeishuBotService implements BotService {
  name = 'feishu' as const;
  enabled: boolean;
  private wsClient?: Lark.WSClient;
  private client?: Lark.Client;

  constructor(
    private config: FeishuConfig,
    private monitor: OpenClawMonitor
  ) {
    this.enabled = config.enabled;
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (!this.config.app_id || !this.config.app_secret) {
      console.error('[Feishu Bot] Missing app_id or app_secret in config');
      this.enabled = false;
      return;
    }

    console.log('[Feishu Bot] 正在启动 WebSocket 长连接模式...');

    this.client = new Lark.Client({
      appId: this.config.app_id,
      appSecret: this.config.app_secret,
    });

    setFeishuClient(this.client);

    // 加载已保存的用户 ID
    const savedIds = await loadUserIds();
    for (const id of savedIds) {
      addUserOpenId(id);
    }
    if (savedIds.length > 0) {
      console.log(`[Feishu Bot] 已加载 ${savedIds.length} 个已保存的用户`);
    }

    const eventDispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data: any) => {
        await this.handleMessageReceive(data);
      },
    });

    this.wsClient = new Lark.WSClient({
      appId: this.config.app_id,
      appSecret: this.config.app_secret,
      loggerLevel: Lark.LoggerLevel.warn,
    });

    this.wsClient.start({
      eventDispatcher,
    });

    console.log('[Feishu Bot] WebSocket 长连接已启动');
  }

  stop(): void {
    this.enabled = false;
    this.wsClient?.close();
    console.log('[Feishu Bot] 服务已停止');
  }

  private async handleMessageReceive(data: any): Promise<void> {
    try {
      let eventData = data;
      if (data.event) {
        eventData = data.event;
      } else if (data.data && data.data.event) {
        eventData = data.data.event;
      }

      const sender = eventData?.sender || eventData;
      const senderId = sender?.sender_id?.open_id || sender?.sender_id?.user_id || sender?.open_id;

      if (senderId) {
        addUserOpenId(senderId);
        await saveUserId(senderId);
      }

      const message = eventData?.message || eventData;
      const contentStr = message?.content || eventData?.content || '';

      let contentText = '';
      try {
        if (typeof contentStr === 'string') {
          const content = JSON.parse(contentStr);
          contentText = content.text || contentStr;
        } else {
          contentText = JSON.stringify(contentStr);
        }
      } catch {
        contentText = contentStr;
      }

      const text = contentText.trim();
      if (!text || !senderId) {
        return;
      }

      await this.handleCommand(text, senderId);
    } catch (error) {
      console.error('[Feishu Bot] 处理消息失败:', (error as Error).message);
    }
  }

  private async handleCommand(text: string, senderId: string): Promise<void> {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/start':
      case '帮助':
      case '/help':
        await this.sendMessage(senderId, this.getHelpMessage());
        break;

      case '/status':
      case '状态':
        await this.handleStatus(senderId);
        break;

      case '/logs':
      case '日志':
        await this.handleLogs(senderId, args);
        break;

      case '/doctor':
      case '/diagnose':
      case '诊断':
        await this.handleDoctor(senderId, args);
        break;

      case '/restart':
      case '重启':
        await this.handleRestart(senderId);
        break;

      default:
        await this.sendMessage(senderId, `未知命令: ${text}\n\n使用 /help 查看可用命令`);
    }
  }

  private async handleStatus(senderId: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(senderId, '监控服务未启动');
      return;
    }

    const status = await this.monitor.getStatus();

    if (status.running) {
      await this.sendMessage(senderId,
        `**OpenClaw 状态** ✅\n` +
        `**PID**: ${status.pid}\n` +
        `**CPU**: ${status.cpuPercent.toFixed(1)}%\n` +
        `**内存**: ${status.memoryMB.toFixed(0)} MB\n` +
        `**运行时长**: ${this.formatUptime(status.uptime)}\n` +
        `**端口**: ${status.port || 'N/A'} ${status.portOpen ? '✓' : '✗'}\n` +
        `**最后检查**: ${status.lastCheck.toLocaleString('zh-CN')}`
      );
    } else {
      await this.sendMessage(senderId, '**OpenClaw 状态** ✗\n\n进程未运行');
    }
  }

  private async handleLogs(senderId: string, args: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(senderId, '监控服务未启动');
      return;
    }

    // 解析行数参数
    const lines = args ? parseInt(args, 10) : 5;
    const count = isNaN(lines) || lines < 1 ? 5 : Math.min(lines, 20);

    const logs = this.monitor.getRecentLines(count);

    if (logs.length === 0) {
      await this.sendMessage(senderId, '暂无日志');
      return;
    }

    const displayLogs = logs.slice(-count);
    const message = displayLogs.map(log =>
      `[${new Date(log.timestamp).toLocaleTimeString('zh-CN')}] [${log.level}] ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}`
    ).join('\n');

    await this.sendMessage(senderId, `**最近 ${displayLogs.length} 条日志**:\n\n${message}`);
  }

  private async handleDoctor(senderId: string, args: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(senderId, '监控服务未启动');
      return;
    }

    const status = await this.monitor.getStatus();
    const logs = this.monitor.getRecentLines(50);
    const errors = logs.filter(l => l.level === 'ERROR' || l.level === 'FATAL');

    let diagnosis: string[] = [];

    // 1. 进程状态检查
    if (!status.running) {
      diagnosis.push('🔴 **进程状态**: OpenClaw Gateway 未运行');
    } else {
      diagnosis.push(`✅ **进程状态**: 运行中 (PID: ${status.pid})`);
    }

    // 2. 资源使用检查
    if (status.running) {
      if (status.cpuPercent > 80) {
        diagnosis.push(`⚠️ **CPU 使用**: ${status.cpuPercent.toFixed(1)}% (偏高)`);
      } else {
        diagnosis.push(`✅ **CPU 使用**: ${status.cpuPercent.toFixed(1)}%`);
      }

      if (status.memoryMB > 1024) {
        diagnosis.push(`⚠️ **内存使用**: ${status.memoryMB.toFixed(0)} MB (偏高)`);
      } else {
        diagnosis.push(`✅ **内存使用**: ${status.memoryMB.toFixed(0)} MB`);
      }
    }

    // 3. 端口检查
    if (status.port && !status.portOpen) {
      diagnosis.push(`🔴 **端口状态**: ${status.port} 端口未监听`);
    } else if (status.port) {
      diagnosis.push(`✅ **端口状态**: ${status.port} 正常监听`);
    }

    // 4. 错误日志统计
    if (errors.length > 0) {
      diagnosis.push(`⚠️ **错误日志**: 最近发现 ${errors.length} 条错误`);
      // 显示最近 3 条错误
      const recentErrors = errors.slice(-3).map(e =>
        `[${new Date(e.timestamp).toLocaleTimeString('zh-CN')}] ${e.message.substring(0, 80)}`
      ).join('\n');
      diagnosis.push(`最近错误:\n${recentErrors}`);
    } else {
      diagnosis.push(`✅ **错误日志**: 未发现错误`);
    }

    // 处理 fix 参数
    if (args === 'fix') {
      diagnosis.push('\n🔧 **自动修复**');
      diagnosis.push('抱歉，自动修复功能尚未实现。');
      diagnosis.push('建议操作：');
      if (!status.running) {
        diagnosis.push('- 手动启动 OpenClaw Gateway');
      }
      if (errors.length > 0) {
        diagnosis.push('- 检查 OpenClaw 配置文件');
        diagnosis.push('- 查看完整日志排查问题');
      }
    }

    const result = diagnosis.join('\n');
    await this.sendMessage(senderId, `**诊断报告**\n\n${result}`);
  }

  private async handleRestart(senderId: string): Promise<void> {
    const status = await this.monitor.getStatus();

    try {
      // 检查是否已安装服务
      const { stdout: statusOutput } = await exec('openclaw gateway status', { timeout: 10000 }).catch(() => ({ stdout: '' }));
      const serviceInstalled = statusOutput.includes('loaded') || statusOutput.includes('running');

      if (!serviceInstalled) {
        // 服务未安装，引导用户安装
        await this.sendMessage(senderId,
          '⚠️ **需要先安装服务**\n\n' +
          'OpenClaw Gateway 服务未安装。\n\n' +
          '请先执行以下命令安装服务：\n' +
          '`openclaw gateway install`\n\n' +
          '安装后再次发送"重启"命令即可。'
        );
        return;
      }

      if (status.running) {
        await this.sendMessage(senderId, '⏳ **正在重启 OpenClaw Gateway**...\n\n请稍候');
      } else {
        await this.sendMessage(senderId, '⏳ **正在启动 OpenClaw Gateway**...\n\n请稍候');
      }

      // 根据状态选择执行 start 或 restart 命令
      const command = status.running ? 'openclaw gateway restart' : 'openclaw gateway start';
      const { stdout, stderr } = await exec(command, { timeout: 30000 });

      // 等待一段时间让进程启动
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 检查新状态
      const newStatus = await this.monitor.getStatus();

      if (newStatus.running) {
        await this.sendMessage(senderId,
          '✅ **操作成功**\n\n' +
          `OpenClaw Gateway 已成功${status.running ? '重启' : '启动'}！\n` +
          `PID: ${newStatus.pid}\n` +
          `端口: ${newStatus.port || 'N/A'}`
        );
      } else {
        await this.sendMessage(senderId,
          '⚠️ **操作结果未知**\n\n' +
          '命令已执行，但无法确认 Gateway 是否成功启动。\n' +
          '请稍后使用 /status 命令检查状态。\n\n' +
          `命令输出: ${stdout || stderr || '无输出'}`
        );
      }
    } catch (error: any) {
      await this.sendMessage(senderId,
        '❌ **操作失败**\n\n' +
        `无法${status.running ? '重启' : '启动'} OpenClaw Gateway：\n` +
        `${error.message}\n\n` +
        '请尝试手动操作：\n' +
        `• ${status.running ? 'openclaw gateway restart' : 'openclaw gateway start'}`
      );
    }
  }

  private async sendMessage(senderId: string, text: string): Promise<void> {
    if (!this.client) {
      console.error('[Feishu Bot] API 客户端未初始化');
      return;
    }

    try {
      await this.client.im.v1.message.create({
        params: { receive_id_type: 'open_id' },
        data: {
          receive_id: senderId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        },
      });
    } catch (error) {
      console.error('[Feishu Bot] 发送消息失败:', (error as Error).message);
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
    return `**OpenClaw Monitor Bot** 🛡️

**可用命令:**
/status 或 状态 - 查看 OpenClaw 运行状态
/logs 或 日志 [数量] - 查看最近日志 (默认5条，最多20条)
/doctor 或 诊断 - 诊断系统问题
/doctor fix - 尝试自动修复问题
/restart 或 重启 - 重启 OpenClaw
/help 或 帮助 - 显示此帮助

**Web UI**: http://localhost:37890`;
  }
}
