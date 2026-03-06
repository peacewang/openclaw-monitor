# API 文档

## 基础 URL

```
http://localhost:37890/api
```

## REST 端点

### GET /status

获取监控状态。

**响应：**
```json
{
  "running": true,
  "pid": 12345,
  "cpuPercent": 12.5,
  "memoryMB": 256,
  "uptime": 9000,
  "port": 8789,
  "portOpen": true
}
```

### GET /logs

获取最近日志。

**参数：**
- `n`: 返回行数（默认 100）

**响应：**
```json
[
  {
    "timestamp": "2026-03-06T10:00:00Z",
    "level": "INFO",
    "message": "Server started",
    "source": "stdout",
    "lineNum": 1
  }
]
```

### GET /logs/search

搜索日志。

**参数：**
- `q`: 搜索关键词
- `limit`: 返回限制

**响应：** 与 `/logs` 相同

### GET /logs/errors

获取错误日志。

**参数：**
- `limit`: 返回限制

### GET /config

获取配置。

**响应：**
```json
{
  "monitoring": { "enabled": true, "interval": 5 },
  "web": { "port": 37890 },
  "alerts": { "enabled": false }
}
```

### POST /config

更新配置。

**请求体：** 部分配置对象

```json
{
  "monitoring": {
    "interval": 10
  }
}
```

**响应：**
```json
{
  "success": true,
  "config": { ... }
}
```

### POST /refresh

强制刷新状态。

**响应：**
```json
{
  "success": true,
  "status": { ... }
}
```

### GET /alerts

获取告警历史。

**参数：**
- `level`: 过滤级别 (INFO/WARNING/ERROR/CRITICAL)
- `limit`: 返回数量（默认 100）

**响应：**
```json
[
  {
    "id": "xxx",
    "alert": { "level": "WARNING", "title": "...", "message": "..." },
    "sentAt": "2026-03-06T10:00:00Z",
    "channel": "telegram",
    "success": true
  }
]
```

### POST /alerts/test

发送测试告警。

## WebSocket

### 连接

```
ws://localhost:37890/api/events
```

### 消息格式

```json
{
  "type": "status",
  "data": {
    "running": true,
    "cpuPercent": 12.5,
    "memoryMB": 256
  }
}
```

### 事件类型

| 类型 | 说明 |
|------|------|
| status | 状态更新 |
| error | 错误信息 |

## 错误码

| Code | 说明 |
|------|------|
| 503 | 服务未启动 |
| 400 | 请求参数错误 |
| 500 | 服务器错误 |
