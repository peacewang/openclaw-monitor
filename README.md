# OpenClaw Monitor

OpenClaw Gateway 监控工具 - 实时监控进程状态、日志收集、告警通知。

## 功能特性

- 📊 **实时监控**: CPU、内存、运行状态
- 📝 **日志收集**: 自动收集、搜索、筛选
- 🚨 **告警通知**: Telegram、飞书、Bark 多通道
- 🌐 **Web UI**: 可视化监控面板
- 🤖 **Bot 交互**: Telegram/飞书命令查询
- 🔔 **实时推送**: WebSocket 实时状态更新

## 快速开始

```bash
# 安装
npm install -g openclaw-monitor

# 启动
openclaw-monitor start

# 查看状态
openclaw-monitor status

# Web UI
open http://localhost:37890
```

## 文档

- [安装指南](docs/user/installation.md)
- [配置说明](docs/user/configuration.md)
- [使用指南](docs/user/usage.md)
- [架构设计](docs/development/architecture.md)
- [API 文档](docs/development/api.md)
- [Docker 部署](docs/deployment/docker.md)
- [生产部署](docs/deployment/production.md)
- [故障排查](docs/deployment/troubleshooting.md)

## 配置示例

```json
{
  "monitoring": {
    "enabled": true,
    "interval": 5,
    "cpuThreshold": 80,
    "memoryThreshold": 1024
  },
  "web": {
    "port": 37890
  },
  "alerts": {
    "enabled": true,
    "channels": [
      {
        "type": "telegram",
        "botToken": "your-token",
        "chatId": "your-chat"
      }
    ]
  }
}
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `start` | 启动监控服务 |
| `status` | 查看运行状态 |
| `logs [n]` | 查看最近日志 |
| `diagnose` | 诊断问题 |
| `help` | 显示帮助 |

## Web UI

访问 http://localhost:37890 查看 Web 界面。

### 功能

- **状态监控**: 实时查看进程状态、CPU、内存
- **日志查看**: 搜索和筛选日志
- **配置管理**: 在线修改配置
- **告警历史**: 查看历史告警
- **Bot 控制**: 测试和管理 Bot

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-repo/openclaw-monitor.git
cd openclaw-monitor

# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test
```

## License

MIT
