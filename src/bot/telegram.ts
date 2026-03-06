// src/bot/telegram.ts

import type { BotService } from './types.js';
import type { TelegramConfig } from '../types/config.js';
import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import type { ProcessStatus, LogLine } from '../types/index.js';
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execAsync);

// 创建带代理的 fetch 函数
function createFetch(proxyUrl?: string): typeof fetch {
  if (!proxyUrl) {
    return fetch;
  }

  // 设置代理环境变量（undici 支持）
  const proxy = new URL(proxyUrl);
  process.env.HTTPS_PROXY = proxyUrl;
  process.env.HTTP_PROXY = proxyUrl;

  return fetch;
}

export class TelegramBotService implements BotService {
  name = 'telegram' as const;
  enabled: boolean;
  private pollId?: NodeJS.Timeout;
  private offset = 0;
  private fetchFn: typeof fetch;

  constructor(
    private config: TelegramConfig,
    private monitor: OpenClawMonitor
  ) {
    this.enabled = config.enabled;
    this.fetchFn = createFetch(config.proxy);

    if (config.proxy) {
      console.log(`[Telegram Bot] 使用代理: ${config.proxy}`);
    }
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log('[Telegram Bot] 正在启动 Bot 服务...');

    // 设置命令菜单（仅在需要时）
    await this.setupCommands();

    this.poll();
    console.log('[Telegram Bot] Bot 服务已启动');
  }

  private async setupCommands(): Promise<void> {
    try {
      // 先检查当前已设置的命令
      const checkResponse = await this.fetchFn(`https://api.telegram.org/bot${this.config.botToken}/getMyCommands`);
      const checkResult: any = await checkResponse.json();

      const expectedCommands = [
        { command: 'start', description: '开始使用监控服务' },
        { command: 'help', description: '显示帮助信息' },
        { command: 'status', description: '查看 OpenClaw 运行状态' },
        { command: 'logs', description: '查看最近日志' },
        { command: 'doctor', description: '诊断系统问题' },
        { command: 'restart', description: '重启 OpenClaw Gateway' },
      ];

      // 检查是否需要更新（命令数量或内容不同）
      let needsUpdate = !checkResult.ok ||
                        !checkResult.result ||
                        checkResult.result.length !== expectedCommands.length;

      if (!needsUpdate && checkResult.result) {
        for (const expected of expectedCommands) {
          const existing = checkResult.result.find((c: any) => c.command === expected.command);
          if (!existing || existing.description !== expected.description) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (!needsUpdate) {
        console.log('[Telegram Bot] 命令菜单已是最新，跳过设置');
        return;
      }

      // 需要更新命令
      const response = await this.fetchFn(`https://api.telegram.org/bot${this.config.botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: expectedCommands, language_code: 'zh' }),
      });

      const result: any = await response.json();
      if (result.ok) {
        console.log('[Telegram Bot] 命令菜单已更新');
      } else {
        console.error('[Telegram Bot] Failed to set commands:', result.description);
      }
    } catch (error) {
      console.error('[Telegram Bot] Failed to set commands:', error);
    }
  }

  stop(): void {
    if (this.pollId) {
      clearTimeout(this.pollId);
      this.pollId = undefined;
    }
  }

  private async poll(): Promise<void> {
    try {
      const updates = await this.fetchFn(
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
      const errorMsg = (error as Error).message;
      if (errorMsg.includes('ECONNRESET') || errorMsg.includes('TLS')) {
        console.error('[Telegram Bot] 网络连接失败，请检查代理设置');
      } else {
        console.error('[Telegram Bot] 轮询错误:', errorMsg);
      }
      this.pollId = setTimeout(() => this.poll(), 10000);
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
    const parts = text.split(' ');
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/start':
      case '帮助':
        await this.sendMessage(chatId, this.getHelpMessage());
        break;

      case '/help':
        await this.sendMessage(chatId, this.getHelpMessage());
        break;

      case '/status':
      case '状态':
        await this.handleStatus(chatId);
        break;

      case '/logs':
      case '日志':
        await this.handleLogs(chatId, args);
        break;

      case '/doctor':
      case '/diagnose':
      case '诊断':
        await this.handleDoctor(chatId, args);
        break;

      case '修复':
        await this.handleDoctor(chatId, 'fix');
        break;

      case '/restart':
      case '重启':
        await this.handleRestart(chatId);
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

  private async handleLogs(chatId: string, args: string): Promise<void> {
    if (!this.monitor.isStarted()) {
      await this.sendMessage(chatId, '监控服务未启动');
      return;
    }

    // 解析行数参数
    const lines = args ? parseInt(args, 10) : 5;
    const count = isNaN(lines) || lines < 1 ? 5 : Math.min(lines, 20);

    const logs = this.monitor.getRecentLines(count);

    if (logs.length === 0) {
      await this.sendMessage(chatId, '暂无日志');
      return;
    }

    const displayLogs = logs.slice(-count);
    const message = displayLogs.map(log =>
      `[${new Date(log.timestamp).toLocaleTimeString('zh-CN')}] [${log.level}] ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}`
    ).join('\n');

    await this.sendMessage(chatId, `*最近 ${displayLogs.length} 条日志*:\n\n${message}`);
  }

  private async handleDoctor(chatId: string, args: string): Promise<void> {
    const isFix = args === 'fix';
    console.log(`[Telegram Bot] handleDoctor 被调用，args="${args}", isFix=${isFix}`);
    const command = isFix ? 'openclaw doctor --fix' : 'openclaw doctor';
    console.log(`[Telegram Bot] 将执行命令: ${command}`);

    await this.sendMessage(chatId, `⏳ *正在${isFix ? '修复' : '诊断'} OpenClaw*...\n\n请稍候`);

    try {
      const { stdout, stderr } = await exec(command, { timeout: 60000 });
      console.log(`[Telegram Bot] 命令执行完成，stdout 长度: ${stdout.length}, stderr 长度: ${stderr.length}`);

      // 合并 stdout 和 stderr
      const output = [stdout, stderr].filter(Boolean).join('\n');

      if (!output.trim()) {
        await this.sendMessage(chatId, '*诊断结果*\n\n命令执行完成，但没有返回输出。');
        return;
      }

      // 清理输出，移除 ANSI 颜色代码
      let cleanOutput = output
        .replace(/\x1b\[[0-9;]*m/g, '') // 移除 ANSI 颜色代码
        .replace(/\[0m/g, '')           // 移除重置代码
        .replace(/\[2K/g, '')           // 移除清除行代码
        .replace(/\r\n?/g, '\n')         // 统一换行符
        .trim();

      // 移除多余的空行
      cleanOutput = cleanOutput.replace(/\n{3,}/g, '\n\n');

      await this.sendMessage(chatId, `*诊断报告*\n\n\`\`\`${cleanOutput}\`\`\``);
    } catch (error: any) {
      await this.sendMessage(chatId,
        '❌ *诊断失败*\n\n' +
        `执行命令时出错：${error.message}\n\n` +
        '请尝试手动执行：' +
        `\`${args === 'fix' ? 'openclaw doctor --fix' : 'openclaw doctor'}\``
      );
    }
  }

  private async handleRestart(chatId: string): Promise<void> {
    const status = await this.monitor.getStatus();

    try {
      // 检查是否已安装服务
      const { stdout: statusOutput } = await exec('openclaw gateway status', { timeout: 10000 }).catch(() => ({ stdout: '' }));
      const serviceInstalled = statusOutput.includes('loaded') || statusOutput.includes('running');

      if (!serviceInstalled) {
        // 服务未安装，引导用户安装
        await this.sendMessage(chatId,
          '⚠️ *需要先安装服务*\n\n' +
          'OpenClaw Gateway 服务未安装。\n\n' +
          '请先执行以下命令安装服务：\n' +
          '`openclaw gateway install`\n\n' +
          '安装后再次发送"重启"命令即可。'
        );
        return;
      }

      if (status.running) {
        await this.sendMessage(chatId, '⏳ *正在重启 OpenClaw Gateway*...\n\n请稍候');
      } else {
        await this.sendMessage(chatId, '⏳ *正在启动 OpenClaw Gateway*...\n\n请稍候');
      }

      // 根据状态选择执行 start 或 restart 命令
      const command = status.running ? 'openclaw gateway restart' : 'openclaw gateway start';
      const { stdout, stderr } = await exec(command, { timeout: 30000 });

      // 等待一段时间让进程启动
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 检查新状态
      const newStatus = await this.monitor.getStatus();

      if (newStatus.running) {
        await this.sendMessage(chatId,
          '✅ *操作成功*\n\n' +
          `OpenClaw Gateway 已成功${status.running ? '重启' : '启动'}！\n` +
          `PID: ${newStatus.pid}\n` +
          `端口: ${newStatus.port || 'N/A'}`
        );
      } else {
        await this.sendMessage(chatId,
          '⚠️ *操作结果未知*\n\n' +
          '命令已执行，但无法确认 Gateway 是否成功启动。\n' +
          '请稍后使用 /status 命令检查状态。\n\n' +
          `命令输出: ${stdout || stderr || '无输出'}`
        );
      }
    } catch (error: any) {
      await this.sendMessage(chatId,
        '❌ *操作失败*\n\n' +
        `无法${status.running ? '重启' : '启动'} OpenClaw Gateway：\n` +
        `${error.message}\n\n` +
        '请尝试手动操作：\n' +
        `• ${status.running ? 'openclaw gateway restart' : 'openclaw gateway start'}`
      );
    }
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      // Telegram 文本消息长度限制约 4096 字符，超过则分片发送
      const MAX_LENGTH = 3800; // 留一些余量
      const messages = this.splitMessage(text, MAX_LENGTH);

      for (const msg of messages) {
        await this.fetchFn(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: 'Markdown',
          }),
        });
        // 分片之间稍微延迟，避免触发频率限制
        if (messages.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('[Telegram Bot] 发送消息失败:', (error as Error).message);
    }
  }

  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    const lines = text.split('\n');
    let currentMessage = '';

    for (const line of lines) {
      // 如果单行就超过限制，需要强制分割
      if (line.length > maxLength) {
        // 先保存当前消息
        if (currentMessage) {
          messages.push(currentMessage);
          currentMessage = '';
        }
        // 按长度分割长行
        let remaining = line;
        while (remaining.length > 0) {
          messages.push(remaining.substring(0, maxLength));
          remaining = remaining.substring(maxLength);
        }
      } else {
        // 检查添加这行是否会超出限制
        if (currentMessage && currentMessage.length + line.length + 1 > maxLength) {
          messages.push(currentMessage);
          currentMessage = line;
        } else {
          if (currentMessage) {
            currentMessage += '\n' + line;
          } else {
            currentMessage = line;
          }
        }
      }
    }

    if (currentMessage) {
      messages.push(currentMessage);
    }

    return messages;
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

*可用命令:*
/status 或 状态 - 查看 OpenClaw 运行状态
/logs 或 日志 [数量] - 查看最近日志 (默认5条，最多20条)
/doctor 或 诊断 - 诊断系统问题
/doctor fix 或 修复 - 尝试自动修复问题
/restart 或 重启 - 重启 OpenClaw Gateway
/help 或 帮助 - 显示此帮助

*Web UI*: http://localhost:37890`;
  }
}
