#!/usr/bin/env node
// src/cli/index.ts

import { OpenClawMonitor } from '../OpenClawMonitor.js';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
OpenClaw Gateway 监控工具 v1.0.0

用法: openclaw-monitor <command> [options]

命令:
  config init    初始化配置文件 (config.json)
  start           启动监控服务
  start --dev     启动开发模式 (无需 OpenClaw Gateway)
  status          查看运行状态
  logs [-n 50]     查看最近日志
  diagnose [-n 20] 诊断问题
  help            显示此帮助

选项:
  -n, --lines      显示的日志/错误行数
  --dev, -d        开发模式 (跳过环境检测)
  -f, --force      强制覆盖配置文件

示例:
  openclaw-monitor config init
  openclaw-monitor start
  openclaw-monitor start --dev
  openclaw-monitor status
  openclaw-monitor logs -n 100
  openclaw-monitor diagnose
  `);
}

async function cmdConfigInit(force = false) {
  const configPath = resolve(process.cwd(), 'config.json');
  const examplePath = resolve(process.cwd(), 'config.example.json');

  // 检查示例文件是否存在
  if (!existsSync(examplePath)) {
    console.error('错误: config.example.json 文件不存在');
    console.log('请确保在 openclaw-monitor 项目目录中运行此命令');
    process.exit(1);
  }

  // 检查配置文件是否已存在
  if (existsSync(configPath)) {
    if (force) {
      console.log('警告: 强制覆盖现有配置文件');
    } else {
      console.log('配置文件 config.json 已存在');
      console.log('如需重新生成，请使用:');
      console.log('  openclaw-monitor config init --force');
      process.exit(1);
    }
  }

  // 读取示例配置
  const exampleConfig = readFileSync(examplePath, 'utf-8');
  const config = JSON.parse(exampleConfig);

  // 移除 $comment 字段
  delete (config as any).$comment;

  // 写入配置文件
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log('✓ 配置文件已创建: config.json');
  console.log('');
  console.log('下一步:');
  console.log('  1. 编辑 config.json，填写你的配置信息');
  console.log('  2. 至少配置一个告警渠道 (telegram 或 feishu)');
  console.log('  3. 运行: openclaw-monitor start --dev');
  console.log('');
  console.log('配置说明:');
  console.log('  - alerts.enabled: 设置为 true 启用告警');
  console.log('  - telegram: 配置 Telegram Bot (可选)');
  console.log('  - feishu: 配置飞书 Bot (可选)');
}

async function cmdStart(devMode = false) {
  const monitor = new OpenClawMonitor({ devMode });

  process.on('SIGINT', async () => {
    console.log('\n正在停止监控服务...');
    await monitor.stop();
    console.log('监控服务已停止');
    process.exit(0);
  });

  try {
    await monitor.start();

    const webUrl = monitor.getWebUrl();
    console.log('====================================');
    console.log('OpenClaw Monitor 已启动');
    console.log('====================================');
    console.log(`Web UI: ${webUrl || 'N/A'}`);
    if (devMode) {
      console.log('模式: 开发模式 (模拟数据)');
    }
    console.log('按 Ctrl+C 停止服务');
  } catch (error) {
    console.error('启动失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function cmdStatus() {
  const monitor = new OpenClawMonitor();

  try {
    await monitor.start();
    const status = await monitor.getStatus();

    console.log('====================================');
    console.log('OpenClaw Gateway 状态');
    console.log('====================================');

    if (status.running) {
      console.log(`状态: 运行中 ✓`);
      console.log(`PID: ${status.pid || 'N/A'}`);
      console.log(`CPU: ${status.cpuPercent.toFixed(1)}%`);
      console.log(`内存: ${status.memoryMB.toFixed(0)} MB`);
      console.log(`运行时长: ${formatUptime(status.uptime)}`);
      console.log(`端口: ${status.port || 'N/A'} ${status.portOpen ? '✓' : '✗'}`);
    } else {
      console.log(`状态: 已停止 ✗`);
    }

    await monitor.stop();
  } catch (error) {
    console.error('获取状态失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function cmdLogs(lines = 50) {
  const monitor = new OpenClawMonitor();

  try {
    await monitor.start();
    const logs = monitor.getRecentLines(lines);

    if (logs.length === 0) {
      console.log('暂无日志');
      return;
    }

    console.log(`最近 ${logs.length} 条日志:`);
    console.log('====================================');

    for (const log of logs) {
      const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
      const level = log.level.padEnd(5);
      console.log(`[${timestamp}] [${level}] ${log.message}`);
    }

    await monitor.stop();
  } catch (error) {
    console.error('获取日志失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function cmdDiagnose(lines = 20) {
  const monitor = new OpenClawMonitor();

  try {
    await monitor.start();
    const errors = monitor.getErrorLogs(lines);

    if (errors.length === 0) {
      console.log('✓ 未发现错误日志');
      await monitor.stop();
      return;
    }

    console.log(`发现 ${errors.length} 条错误日志:`);
    console.log('====================================');

    for (const error of errors) {
      const timestamp = new Date(error.timestamp).toLocaleString('zh-CN');
      console.log(`[${timestamp}] [${error.level}] ${error.message}`);
    }

    console.log('');
    console.log('建议：检查 OpenClaw 配置和日志文件以获取更多信息');

    await monitor.stop();
  } catch (error) {
    console.error('诊断失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '--';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days}天${hours}小时` : `${hours}小时${minutes}分`;
}

// 解析命令行参数
async function main() {
  const command = args[0]?.toLowerCase();
  const hasDevFlag = args.includes('--dev') || args.includes('-d');
  const hasForceFlag = args.includes('--force') || args.includes('-f');

  switch (command) {
    case 'config':
      const subCommand = args[1]?.toLowerCase();
      if (subCommand === 'init') {
        await cmdConfigInit(hasForceFlag);
      } else {
        console.log(`未知命令: config ${subCommand}`);
        console.log('可用子命令: init');
        process.exit(1);
      }
      break;

    case 'start':
      await cmdStart(hasDevFlag);
      break;

    case 'stop':
      console.log('正在停止监控服务...');
      // TODO: 实现 PID 文件读取和进程终止
      console.log('监控服务已停止');
      break;

    case 'status':
      await cmdStatus();
      break;

    case 'logs':
      const logsIndex = args.indexOf('-n');
      const linesArg = logsIndex >= 0 ? args[logsIndex + 1] : '50';
      await cmdLogs(parseInt(linesArg) || 50);
      break;

    case 'diagnose':
      const diagnoseIndex = args.indexOf('-n');
      const diagnoseArg = diagnoseIndex >= 0 ? args[diagnoseIndex + 1] : '20';
      await cmdDiagnose(parseInt(diagnoseArg) || 20);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (command) {
        console.log(`未知命令: ${command}`);
      }
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});
