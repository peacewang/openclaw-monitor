// src/api/server.ts

// @ts-nocheck - 等待 fastify 依赖安装后移除此行

import type { OpenClawMonitor } from '../OpenClawMonitor.js';

export interface ApiServerOptions {
  host: string;
  port: number;
}

export class ApiServer {
  private server?: any;

  constructor(
    private monitor: OpenClawMonitor,
    private options: ApiServerOptions
  ) {}

  async start(): Promise<void> {
    try {
      const fastify = await import('fastify');
      const fastifyWebsocket = await import('@fastify/websocket');

      this.server = fastify.default({
        logger: false,
      });

      await this.server.register(fastifyWebsocket.default);

      // 注册路由
      await this.server.register((await import('./routes.js')).routes, {
        prefix: '/api',
        monitor: this.monitor,
      });

      // 静态文件服务（Web UI）
      this.server.register((await import('@fastify/static')).default, {
        root: './web',
        prefix: '/',
      });

      // 启动服务器
      const address = await this.server.listen({
        host: this.options.host,
        port: this.options.port,
      });

      console.log(`Web UI available at http://${this.options.host}:${this.options.port}`);
    } catch (error) {
      console.error('Failed to start API server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
    }
  }

  getAddress(): string {
    return `http://${this.options.host}:${this.options.port}`;
  }
}
