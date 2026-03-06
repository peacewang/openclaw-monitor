// src/api/server.ts

import type { OpenClawMonitor } from '../OpenClawMonitor.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __dirname = dirname(fileURLToPath(import.meta.url));

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
      const fastifyModule = await import('fastify');
      const fastifyWebsocket = await import('@fastify/websocket');
      const fastifyStatic = await import('@fastify/static');

      this.server = fastifyModule.default({
        logger: false,
      });

      await this.server.register(fastifyWebsocket.default);

      // 注册路由
      await this.server.register((await import('./routes.js')).routes, {
        prefix: '/api',
        monitor: this.monitor,
      });

      // 静态文件服务（Web UI）- 使用绝对路径
      const webRoot = resolve(__dirname, '../../web');
      this.server.register(fastifyStatic.default, {
        root: webRoot,
        prefix: '/',
        decorateReply: false,
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
