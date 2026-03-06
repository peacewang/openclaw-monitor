// src/api/routes.ts

import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import type { ProcessStatus } from '../types/process.js';
import type { MonitorConfig } from '../types/config.js';
import type { AlertLevel } from '../types/alert.js';

export const routes = async function(fastify: any, options: { monitor: OpenClawMonitor }) {
  // 将 monitor 存储在 fastify 实例上
  fastify.monitor = options.monitor;

  // 获取状态
  fastify.get('/status', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    const status = await monitor.getStatus();
    return status;
  });

  // 获取最近日志
  fastify.get('/logs', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    const query = request.query as { n?: string };
    const n = query.n ? parseInt(query.n) : 100;

    const logs = monitor.getRecentLines(n);
    return logs;
  });

  // 搜索日志
  fastify.get('/logs/search', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    const query = request.query as { q?: string; limit?: string };
    if (!query.q) {
      return reply.code(400).send({ error: 'Missing search query' });
    }

    const limit = query.limit ? parseInt(query.limit) : undefined;
    const logs = monitor.searchLogs(query.q, limit);
    return logs;
  });

  // 获取错误日志
  fastify.get('/logs/errors', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit) : undefined;
    const logs = monitor.getErrorLogs(limit);
    return logs;
  });

  // 获取配置
  fastify.get('/config', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      return reply.code(503).send({ error: 'Monitor not available' });
    }
    return monitor.getConfig();
  });

  // 更新配置
  fastify.post('/config', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      return reply.code(503).send({ error: 'Monitor not available' });
    }

    try {
      const newConfig = request.body as Partial<MonitorConfig>;
      monitor.updateConfig(newConfig);
      return { success: true, config: monitor.getConfig() };
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  // 刷新状态
  fastify.post('/refresh', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    const status = await monitor.getStatus();
    return { success: true, status };
  });

  // 获取告警历史
  fastify.get('/alerts', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      return reply.code(503).send({ error: 'Monitor not available' });
    }

    const query = request.query as { level?: string; limit?: string };
    const limit = query.limit ? parseInt(query.limit) : 100;

    const alerts = monitor.getAlertHistory(query.level as AlertLevel, limit);

    // 手动序列化 Date 对象
    return alerts.map(record => ({
      ...record,
      sentAt: record.sentAt.toISOString(),
      alert: {
        ...record.alert,
        timestamp: record.alert.timestamp?.toISOString() || new Date().toISOString(),
      },
    }));
  });

  // 测试/触发告警
  fastify.post('/alerts/test', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      return reply.code(503).send({ error: 'Monitor not available' });
    }

    try {
      const body = request.body as { type?: 'test' | 'critical' | 'warning' | 'info' | 'process' };
      const type = body.type || 'test';

      switch (type) {
        case 'critical':
          await monitor.sendAlert({
            level: 'CRITICAL',
            title: '🚨 严重告警测试',
            message: '这是一条严重级别的测试告警！请立即检查！',
            timestamp: new Date(),
          });
          break;
        case 'warning':
          await monitor.sendAlert({
            level: 'WARNING',
            title: '⚠️ 警告测试',
            message: '这是一条警告级别的测试消息，请注意检查。',
            timestamp: new Date(),
          });
          break;
        case 'info':
          await monitor.sendAlert({
            level: 'INFO',
            title: 'ℹ️ 信息测试',
            message: '这是一条信息级别的测试消息。',
            timestamp: new Date(),
          });
          break;
        case 'process':
          await monitor.sendAlert({
            level: 'CRITICAL',
            title: '🔴 进程停止告警',
            message: 'OpenClaw Gateway 进程已停止运行！',
            timestamp: new Date(),
          });
          break;
        default:
          await monitor.sendTestAlert();
      }

      return { success: true, message: `Alert ${type} sent` };
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // Gateway 控制端点
  fastify.post('/gateway/restart', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    try {
      const status = await monitor.getStatus();

      // 检查是否已安装服务
      const { exec: execAsync } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(execAsync);

      let serviceInstalled = false;
      try {
        const { stdout: statusOutput } = await exec('openclaw gateway status', { timeout: 10000 });
        serviceInstalled = statusOutput.includes('loaded') || statusOutput.includes('running');
      } catch {
        // 服务可能未安装
      }

      if (!serviceInstalled) {
        return reply.code(400).send({
          success: false,
          message: 'OpenClaw Gateway 服务未安装。请先执行: openclaw gateway install',
        });
      }

      // 根据状态选择执行 start 或 restart 命令
      const command = status.running ? 'openclaw gateway restart' : 'openclaw gateway start';
      const { stdout, stderr } = await exec(command, { timeout: 30000 });

      // 等待一段时间让进程启动
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 检查新状态
      const newStatus = await monitor.getStatus();

      return {
        success: newStatus.running,
        message: newStatus.running
          ? `OpenClaw Gateway 已成功${status.running ? '重启' : '启动'}！`
          : '命令已执行，但无法确认 Gateway 是否成功启动',
        status: newStatus,
        output: stdout || stderr || '无输出',
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: `操作失败: ${(error as Error).message}`,
      });
    }
  });

  fastify.post('/gateway/start', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    try {
      const { exec: execAsync } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(execAsync);

      const { stdout, stderr } = await exec('openclaw gateway start', { timeout: 30000 });

      // 等待启动
      await new Promise(resolve => setTimeout(resolve, 5000));

      const newStatus = await monitor.getStatus();

      return {
        success: newStatus.running,
        message: newStatus.running ? 'OpenClaw Gateway 已启动！' : '命令已执行，但无法确认 Gateway 是否成功启动',
        status: newStatus,
        output: stdout || stderr || '无输出',
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: `启动失败: ${(error as Error).message}`,
      });
    }
  });

  fastify.post('/gateway/stop', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor || !monitor.isStarted()) {
      return reply.code(503).send({ error: 'Monitor not started' });
    }

    try {
      const { exec: execAsync } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(execAsync);

      const { stdout, stderr } = await exec('openclaw gateway stop', { timeout: 30000 });

      // 等待停止
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newStatus = await monitor.getStatus();

      return {
        success: !newStatus.running,
        message: !newStatus.running ? 'OpenClaw Gateway 已停止！' : '命令已执行，但 Gateway 似乎仍在运行',
        status: newStatus,
        output: stdout || stderr || '无输出',
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: `停止失败: ${(error as Error).message}`,
      });
    }
  });

  // WebSocket 实时更新
  fastify.get('/events', { websocket: true }, async (connection: any, req: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      connection.socket.send(JSON.stringify({ type: 'error', message: 'Monitor not available' }));
      connection.socket.close();
      return;
    }

    const sendEvent = (data: ProcessStatus) => {
      try {
        connection.socket.send(JSON.stringify({ type: 'status', data }));
      } catch {
        // 连接可能已关闭
      }
    };

    // 订阅状态变更
    const unsubscribe = monitor.onStatusChange((event) => {
      sendEvent(event.status as ProcessStatus);
    });

    // 发送当前状态
    if (monitor.isStarted()) {
      const status = await monitor.getStatus();
      sendEvent(status);
    }

    connection.socket.on('close', () => {
      unsubscribe();
    });
  });

};
