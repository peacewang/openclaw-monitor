// src/types/fastify.d.ts

// 临时类型声明，待安装 fastify 后移除
declare module 'fastify' {
  import { EventEmitter } from 'events';

  interface RouteOptions {
    method?: string;
    url: string;
    handler?: (request: any, reply: any) => any | Promise<any>;
    wsHandler?: (connection: any, request: any) => void;
  }

  interface FastifyInstance extends EventEmitter {
    get(options: string | RouteOptions, handler?: (request: any, reply: any) => any): FastifyInstance;
    post(options: string | RouteOptions, handler?: (request: any, reply: any) => any): FastifyInstance;
    register(plugin: any, options?: any): Promise<any>;
    listen(options: { host: string; port: number }): Promise<string>;
    close(): Promise<void>;
  }

  interface FastifyRequest {
    query: Record<string, string>;
    body: any;
    params: any;
    headers: Record<string, string>;
  }

  interface FastifyReply {
    code(statusCode: number): FastifyReply;
    send(payload: any): FastifyReply;
    type(contentType: string): FastifyReply;
  }

  interface FastifyPluginAsync {
    (instance: FastifyInstance, options?: any): Promise<void>;
  }
}

declare module '@fastify/websocket' {
  const ws: any;
  export { ws as default };
}

declare module '@fastify/static' {
  const stat: any;
  export { stat as default };
}
