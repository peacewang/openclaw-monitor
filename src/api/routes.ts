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
    return alerts;
  });

  // 测试告警
  fastify.post('/alerts/test', async (request: any, reply: any) => {
    const monitor = fastify.monitor as OpenClawMonitor;
    if (!monitor) {
      return reply.code(503).send({ error: 'Monitor not available' });
    }

    // 注意：这里需要访问私有属性，为了演示简化
    // 实际使用中可以添加一个 public sendTestAlert 方法
    return { success: true, message: 'Test alert endpoint - implement sendTestAlert method' };
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
