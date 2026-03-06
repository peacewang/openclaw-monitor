# OpenClaw Monitor

<div align="center">

![License](https://img.shields.io/github/license/peacewang/openclaw-monitor?style=flat-square)
![Node](https://img.shields.io/node/v/openclaw-monitor?style=flat-square)

**OpenClaw Gateway 监控工具**

***当前处于开发调试中，请勿安装！！*

实时监控 · 智能告警 · 多端通知

[功能特性](#-功能特性) · [快速开始](#-快速开始) · [配置说明](#-配置说明) · [使用指南](#-使用指南)

</div>

---

## ✨ 功能特性

OpenClaw Monitor 是一个专为 OpenClaw Gateway 设计的监控和远程工具，帮助你：

- 🚨 **实时监控与告警** - 监控openclaw运行状态、CPU、内存占用，异常时自动通知到Bot
- 🤖 **远程管理** - 通过Bot远程查询openclaw运行状态、运行日志，并支持重启、诊断、修复操作
- ⚡ **即开即用** - 简单配置，几分钟内完成部署
- 💬 **多端通知** - Telegram、飞书

### 解决的问题

| 问题 | 解决方案 |
|------|----------|
| Gateway 悄悄崩溃，没人知道 | 进程停止立即 CRITICAL 告警 |
| 不知道资源占用情况 | 实时 CPU/内存监控，超限自动告警 |
| 查日志需要登录服务器 | Web 面板直接查看，支持搜索筛选 |
| 出问题不知从何排查 | Bot 诊断命令，一键获取错误日志 |
| 24/7 监控无人值守 | Telegram/飞书告警推送到手机 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- 需要和 **OpenClaw Gateway** 部署在同一台机器

### 安装

```bash
# 克隆仓库
git clone https://github.com/peacewang/openclaw-monitor.git
cd openclaw-monitor

# 安装依赖
npm install

# 构建
npm run build

# 全局链接
npm link
```

### 配置与启动

```bash
# 1. 初始化配置文件
> 初始化后位置在 你的用户目录/.openclaw-monitor/config.json
openclaw-monitor config init

# 2. 编辑 config.json，填写你的 Bot 信息
#    - Telegram Bot 或 飞书 Bot 二选一
#    - 设置 alerts.enabled = true

# 3. 启动服务
openclaw-monitor start/restart

# 4. 查看运行日志
你的用户目录/.openclaw-monitor/logs/openclaw-monitor.log

# 5. web ui
访问 http://localhost:37890 查看 Web 面板。
```
---

## ⚙️ 配置说明

### Telegram Bot 配置

```json
{
  "alerts": {
    "enabled": true,
    "telegram": {
      "enabled": true,
      "botToken": "你的_BOT_TOKEN",
      "chatId": "你的_CHAT_ID"
    }
  }
}
```

### 飞书 Bot 配置

```json
{
  "alerts": {
    "enabled": true,
    "feishu": {
      "enabled": true,
      "app_id": "cli_xxxxxxxxx",
      "app_secret": "xxxxxxxxxx"
    }
  }
}
```

<details>
<summary>完整配置选项</summary>

```json
{
  "monitoring": {
    "enabled": true,
    "interval": 5,
    "logLines": 100,
    "thresholds": {
      "cpu": { "warning": 80, "critical": 95 },
      "memory": { "warning": 1024, "critical": 2048 }
    }
  },
  "web": {
    "enabled": true,
    "port": 37890,
    "host": "0.0.0.0"
  },
  "alerts": {
    "enabled": true,
    "telegram": {
      "enabled": false,
      "botToken": "xxx",
      "chatId": "xxx",
      "proxy": ""
    },
    "feishu": {
      "enabled": false,
      "app_id": "xxx",
      "app_secret": "xxx"
    }
  }
}
```

</details>

---

## 📖 使用指南

### CLI 命令

```bash
openclaw-monitor config init      # 初始化配置
openclaw-monitor start            # 启动监控
openclaw-monitor status           # 查看状态
openclaw-monitor logs -n 100      # 查看日志
openclaw-monitor diagnose -n 20   # 诊断问题
```

### Bot 命令

#### Telegram / 飞书

| 命令 | 说明 |
|------|------|
| `/status` 或 `状态` | 查看运行状态 |
| `/logs [数量]` 或 `日志` | 查看最近日志 |
| `/doctor` 或 `诊断` | 诊断系统问题 |
| `/restart` 或 `重启` | 重启 Gateway |
| `/help` 或 `帮助` | 显示帮助 |

### Web 面板

- **状态监控** - 实时状态、资源趋势、控制按钮
- **日志查看** - 搜索筛选、实时更新
- **配置管理** - 在线修改配置
- **告警历史** - 历史记录、测试告警

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **运行时** | Node.js >= 18.0.0 |
| **语言** | TypeScript 5.x |
| **Web 框架** | Fastify |
| **WebSocket** | WS (飞书长连接) |
| **进程监控** | pidusage |
| **Bot SDK** | @larksuiteoapi/node-sdk (飞书) |
| **前端** | 原生 JavaScript + Chart.js |

---

## 📦 依赖项

### 运行时依赖

```json
{
  "fastify": "^5.3.0",
  "@fastify/static": "^6.0.0",
  "@fastify/websocket": "^11.0.0",
  "@larksuiteoapi/node-sdk": "^1.59.0",
  "pidusage": "^3.0.2"
}
```

---

## 🔧 飞书 Bot 配置详解

<details>
<summary>点击展开详细配置步骤</summary>

### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用，获取 `App ID` 和 `App Secret`

### 2. 申请权限

在「权限管理」中申请：
- `im:message` - 接收消息
- `im:message:send_as_bot` - 发送消息

### 3. 发布应用

在「版本管理与发布」中创建版本并发布

### 4. 配置事件订阅

**重要顺序**：
1. 先启动 `openclaw-monitor start`
2. 等待日志显示 `WebSocket 长连接已启动`
3. 在飞书平台选择「使用长连接接收事件/回调」
4. 添加 `im.message.receive_v1` 事件
5. 保存配置

### 5. 测试

在飞书中搜索应用，发送「帮助」测试

</details>

---

## 📸 界面预览

### Web 面板
等我截个图吧

---

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📋 待办事项

- [ ] 发布到 npm registry
- [ ] 告警规则自定义
- [ ] 更多告警渠道（钉钉、企业微信）
- [ ] 数据持久化与历史图表

---

## ❓ 常见问题

<details>
<summary>启动失败：OpenClaw not installed</summary>

请确认已安装 OpenClaw Gateway，并在系统 PATH 中可用。
</details>

<details>
<summary>飞书 Bot 无响应</summary>

1. 确认应用已发布
2. 确认已配置长连接事件订阅
3. 先给 Bot 发送一条消息激活
</details>

<details>
<summary>告警未收到</summary>

1. 检查 `alerts.enabled` 是否为 `true`
2. 飞书需先发送消息激活用户
3. 检查告警历史确认发送状态
</details>

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🔗 相关链接

- [OpenClaw Gateway](https://github.com/peacewang/openclaw)
- [问题反馈](https://github.com/peacewang/openclaw-monitor/issues)

---

<div align="center">

**Made with ❤️ by [peacewang](https://github.com/peacewang)**

[⭐ Star](https://github.com/peacewang/openclaw-monitor) · [🍴 Fork](https://github.com/peacewang/openclaw-monitor/fork) · [📢 Watch](https://github.com/peacewang/openclaw-monitor)

</div>
