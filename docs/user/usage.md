# 使用指南

## CLI 命令

### 启动监控

```bash
openclaw-monitor start
```

### 查看状态

```bash
openclaw-monitor status
```

输出示例：
```
OpenClaw Monitor Status
=======================
Running: Yes
PID: 12345
CPU: 12.5%
Memory: 256 MB
Uptime: 2h 30m
Port: 8789
```

### 查看日志

```bash
# 最近 50 条
openclaw-monitor logs

# 最近 100 条
openclaw-monitor logs 100
```

### 诊断

```bash
openclaw-monitor diagnose
```

显示系统信息和最近错误日志。

### 帮助

```bash
openclaw-monitor help
```

## Web UI

访问 **http://localhost:37890** 查看 Web 界面。

### 功能模块

- **状态监控**: 实时查看进程状态、CPU、内存
- **日志查看**: 搜索和筛选日志
- **配置管理**: 在线修改配置
- **告警历史**: 查看历史告警记录
- **实时图表**: CPU/内存 趋势图

## Bot 使用

### Telegram Bot

1. 创建 Bot: 与 [@BotFather](https://t.me/botfather) 对话
2. 获取 Token 和 Chat ID
3. 配置到 config.json:
   ```json
   {
     "bots": {
       "telegram": {
         "enabled": true,
         "botToken": "your-bot-token",
         "chatId": "your-chat-id"
       }
     }
   }
   ```

支持的命令：
- `/status` - 查看状态
- `/logs` - 查看日志
- `/config` - 查看配置

### 飞书 Bot

1. 创建机器人
2. 复制 Webhook URL
3. 配置到 config.json:
   ```json
   {
     "bots": {
       "feishu": {
         "enabled": true,
         "webhookUrl": "https://open.feishu.cn/webhook/xxx"
       }
     }
   }
   ```

## 告警配置

### 启用告警

编辑配置文件，设置 `alerts.enabled = true`：

```json
{
  "alerts": {
    "enabled": true,
    "minLevel": "WARNING"
  }
}
```

### 告警级别

| 级别 | 说明 |
|------|------|
| INFO | 信息 |
| WARNING | 警告 |
| ERROR | 错误 |
| CRITICAL | 严重 |

### 测试告警

通过 Web UI 的 `/api/alerts/test` 端点测试告警发送。
