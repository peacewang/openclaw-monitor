# 架构设计

## 整体架构

```
┌─────────────────────────────────────────────┐
│              OpenClawMonitor                 │
│  ┌─────────────┬─────────────┬─────────────┐│
│  │  Monitor    │   Alert     │     API     ││
│  │  Core       │   System    │    Server   ││
│  └──────┬──────┴──────┬──────┴──────┬──────┘│
└─────────┼─────────────┼─────────────┼───────┘
          │             │             │
    ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
    │ Process   │ │  Alert  │ │   Fastify   │
    │ Monitor   │ │Channels │ │   + WS      │
    └─────┬─────┘ └────┬────┘ └──────┬──────┘
          │            │              │
    ┌─────▼─────┐ ┌───▼──────────┐  │
    │  pidusage │ │ Telegram/Feishu│ │
    └───────────┘ └───────────────┘  │
                    │                  │
            ┌───────▼──────────────────▼────┐
            │     OpenClaw Gateway          │
            └───────────────────────────────┘
```

## 模块说明

### OpenClawMonitor

主类，协调所有模块。

**职责**:
- 初始化和启动所有子模块
- 提供统一的 API 接口
- 管理配置和生命周期

### 监控模块

**ProcessMonitor** (`src/monitor/process.ts`):
- 进程状态检测
- CPU/内存 监控
- 端口检查

**LogCollector** (`src/monitor/log.ts`):
- 日志文件读取
- 日志解析和搜索
- 错误日志筛选

**EnvDetector** (`src/env/detector.ts`):
- OpenClaw 环境检测
- 日志路径发现
- 配置文件解析

### 告警模块

**AlertManager** (`src/alert/manager.ts`):
- 告警管理和分发
- 去重和级别过滤
- 历史记录

**AlertChannel** (`src/alert/channels/`):
- Telegram: 机器人通知
- Feishu: 飞书群机器人
- Bark: iOS 推送

### API 模块

**ApiServer** (`src/api/server.ts`):
- Fastify 服务器
- 静态文件服务

**Routes** (`src/api/routes.ts`):
- REST API 端点
- WebSocket 实时推送

## 数据流

```
1. 定时检查
   └─> ProcessMonitor.getStats()
       └─> 检查阈值
           └─> 超阈值?
               ├─> 是 → AlertManager.send()
               └─> 否 → 记录状态

2. 日志收集
   └─> LogCollector.collect()
       └─> 解析日志
           └─> 存储到内存

3. API 请求
   └─> Fastify 路由
       └─> 调用 Monitor 方法
           └─> 返回 JSON

4. WebSocket
   └─> 客户端连接
       └─> 订阅状态变更
           └─> 实时推送
```

## 类型系统

```
types/
├── config.ts     # 配置类型
├── process.ts    # 进程状态类型
├── log.ts        # 日志类型
└── alert.ts      # 告警类型
```
