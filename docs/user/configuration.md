# 配置说明

## 配置文件位置

配置文件按优先级从高到低：

1. 当前目录: `./openclaw.config.json`
2. 用户目录: `~/.openclaw/config.json`
3. 默认配置

## 配置项说明

### 监控配置

```json
{
  "monitoring": {
    "enabled": true,
    "interval": 5,
    "logLines": 100,
    "logPath": "/var/log/openclaw",
    "cpuThreshold": 80,
    "memoryThreshold": 1024
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| enabled | 是否启用监控 | true |
| interval | 检查间隔（秒） | 5 |
| logLines | 保留日志行数 | 100 |
| logPath | 日志文件路径 | 自动检测 |
| cpuThreshold | CPU 告警阈值（%） | 80 |
| memoryThreshold | 内存告警阈值（MB） | 1024 |

### Web 服务配置

```json
{
  "web": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 37890
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| enabled | 是否启用 Web 服务 | true |
| host | 监听地址 | 0.0.0.0 |
| port | 监听端口 | 37890 |

### 告警配置

```json
{
  "alerts": {
    "enabled": false,
    "minLevel": "WARNING",
    "channels": [
      {
        "type": "telegram",
        "enabled": true,
        "botToken": "your-bot-token",
        "chatId": "your-chat-id"
      }
    ]
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| enabled | 是否启用告警 | false |
| minLevel | 最低告警级别 | WARNING |
| channels | 告警通道配置 | - |

### Bot 配置

```json
{
  "bots": {
    "telegram": {
      "enabled": false,
      "botToken": "your-bot-token",
      "chatId": "your-chat-id"
    },
    "feishu": {
      "enabled": false,
      "webhookUrl": "https://open.feishu.cn/webhook/xxx"
    }
  }
}
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `OPENCLAW_CONFIG_PATH` | 指定配置文件路径 |
| `OPENCLAW_LOG_LEVEL` | 日志级别 (debug/info/warn/error) |
| `OPENCLAW_WEB_PORT` | Web 服务端口 |
| `OPENCLAW_WEB_HOST` | Web 服务监听地址 |

## 完整配置示例

```json
{
  "monitoring": {
    "enabled": true,
    "interval": 5,
    "logLines": 100,
    "cpuThreshold": 80,
    "memoryThreshold": 1024
  },
  "openclaw": {
    "autoDetect": true,
    "logPaths": []
  },
  "web": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 37890
  },
  "alerts": {
    "enabled": true,
    "minLevel": "WARNING"
  },
  "bots": {
    "telegram": {
      "enabled": false,
      "botToken": "",
      "chatId": ""
    },
    "feishu": {
      "enabled": false,
      "webhookUrl": ""
    }
  }
}
```
