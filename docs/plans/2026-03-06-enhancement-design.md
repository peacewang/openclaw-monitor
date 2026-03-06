# OpenClaw Monitor 增强设计方案

**日期**: 2026-03-06
**版本**: v1.1
**状态**: 设计已确认

---

## 概述

对 openclaw-monitor v1.0 进行全面增强，包括 Web UI 升级、测试覆盖补充、完整文档编写。

---

## 1. Web UI 增强

### 1.1 目录结构

```
web/
├── index.html          # SPA 主入口
├── app.js              # 应用主逻辑
├── components/         # UI 组件
│   ├── status.js       # 状态卡片组件
│   ├── logs.js         # 日志查看器
│   ├── config.js       # 配置管理面板
│   ├── alerts.js       # 告警历史
│   └── bots.js         # Bot 控制面板
├── styles/
│   ├── base.css        # 基础样式
│   ├── components.css  # 组件样式
│   └── themes.css      # 主题定义
└── lib/
    └── chart.min.js    # 图表库（CDN 或本地）
```

### 1.2 功能模块

| 模块 | 描述 | API |
|------|------|-----|
| **配置管理** | 查看和修改配置，支持热重载 | `GET/POST /api/config` |
| **告警历史** | 分页展示告警，支持级别筛选 | `GET /api/alerts?page=1&level=ERROR` |
| **Bot 控制台** | 启用/禁用 Bot，测试发送 | `POST /api/bots/{type}/test` |
| **日志搜索** | 关键词搜索，错误日志筛选 | `GET /api/logs/search?q=keyword` |
| **实时图表** | CPU/内存趋势曲线 | WebSocket `/api/events` |

### 1.3 视觉增强

- **Tab 导航**: 状态、日志、配置、告警、Bots
- **Chart.js**: CPU/内存 历史趋势图（保留最近 100 个数据点）
- **Toast 通知**: 操作成功/失败提示
- **骨架屏**: 加载占位
- **响应式**: 移动端适配

---

## 2. 测试增强

### 2.1 测试结构

```
tests/
├── unit/
│   ├── monitor/
│   │   ├── process.test.ts   # 进程监控
│   │   └── log.test.ts       # 日志收集
│   ├── alerts/
│   │   ├── manager.test.ts   # 告警管理器
│   │   └── channels.test.ts  # 告警通道
│   └── env/
│       └── detector.test.ts  # 环境检测
├── integration/
│   ├── api.test.ts           # API 测试
│   ├── alerts.test.ts        # 告警集成
│   └── cli.test.ts           # CLI 测试
└── fixtures/
    └── mock-data.ts          # 测试数据
```

### 2.2 覆盖范围

**单元测试**:
- `ProcessMonitor`: 阈值判断、PID 检测
- `LogCollector`: 轮转、搜索、错误筛选
- `AlertManager`: 触发、去重、分发
- 告警通道: Mock fetch，验证调用

**集成测试**:
- 启动 Fastify 测试服务器，验证 API 响应
- CLI 子进程执行，验证输出
- 模拟进程异常，验证告警流程

### 2.3 Mock 策略

| 依赖 | Mock 方式 |
|------|----------|
| `pidusage` | 返回模拟 `{ cpu, memory, pid }` |
| `fetch` | vi.fn()，验证 URL 和 payload |
| `fs` | memfs，测试日志写入 |

---

## 3. 文档编写

### 3.1 文档结构

```
docs/
├── README.md                # 项目总览（补充）
├── user/
│   ├── installation.md      # 安装指南
│   ├── configuration.md     # 配置说明
│   └── usage.md             # 使用指南
├── development/
│   ├── architecture.md      # 架构设计
│   ├── api.md               # API 文档
│   └── contributing.md      # 贡献指南
├── deployment/
│   ├── docker.md            # Docker 部署
│   ├── production.md        # 生产环境配置
│   └── troubleshooting.md   # 故障排查
└── plans/
    └── 2026-03-06-enhancement-design.md
```

### 3.2 文档内容

| 文档 | 内容 |
|------|------|
| **installation.md** | npm 安装、全局安装、二进制分发 |
| **configuration.md** | 配置项说明、环境变量、示例 |
| **usage.md** | CLI 命令、Web UI、Bot 配置 |
| **architecture.md** | 模块关系、数据流、时序图 |
| **api.md** | REST 端点、WebSocket 协议、错误码 |
| **docker.md** | Dockerfile、docker-compose、健康检查 |
| **production.md** | PM2 部署、日志轮转、监控配置 |
| **troubleshooting.md** | 常见问题、调试技巧 |

---

## 4. 实施顺序

1. **Web UI 增强** (Task #20)
2. **测试补充** (Task #19)
3. **文档编写** (Task #18)

---

## 5. 需要新增的 API

```typescript
// 配置管理
GET    /api/config          // 获取配置
POST   /api/config          // 更新配置

// 告警
GET    /api/alerts          // 获取告警历史
POST   /api/alerts/test     // 测试告警

// Bot 测试
POST   /api/bots/telegram/test   // 测试 Telegram
POST   /api/bots/feishu/test     // 测试飞书
```

---

## 6. 依赖变更

```json
{
  "devDependencies": {
    "chart.js": "^4.4.0",
    "memfs": "^4.0.0"
  }
}
```
