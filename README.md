# OpenClaw Monitor

OpenClaw Gateway 监控工具 - 实时监控进程状态、日志收集、告警通知。

## 功能特性

- **实时监控**: CPU、内存、运行状态
- **日志收集**: 自动收集、搜索、筛选
- **告警通知**: Telegram、飞书多通道
- **Web UI**: 可视化监控面板
- **Bot 交互**: Telegram/飞书命令查询
- **自动告警**: 进程停止、资源超限自动通知

---

## 安装与运行

### 方式一：从 GitHub 直接安装（推荐）

```bash
# 全局安装（从 GitHub 仓库）
npm install -g <your-username>/openclaw-monitor

# 安装后启动
openclaw-monitor start
```

> 将 `<your-username>` 替换为实际的 GitHub 用户名/组织名。

**npm 支持的 GitHub 安装格式**：

```bash
npm install -g username/repo          # 默认分支
npm install -g username/repo#main     # 指定分支
npm install -g github:username/repo   # 完整格式
```

### 方式二：克隆后运行

```bash
# 1. 克隆项目
git clone <repository-url>
cd openclaw-monitor

# 2. 安装依赖
npm install

# 3. 构建
npm run build

# 4. 启动
npm run start
```

---

## 快速开始

### 1. 初始化配置

```bash
openclaw-monitor config init
```

此命令会创建 `config.json` 文件，包含默认配置模板。

**防覆盖保护**：如果 `config.json` 已存在，命令会提示不会覆盖。如需重新生成，使用：

```bash
openclaw-monitor config init --force
```

### 2. 编辑配置文件

打开 `config.json`，填写你的配置信息：

```json
{
  "alerts": {
    "enabled": true,              // 设置为 true 启用告警
    "telegram": {
      "enabled": true,            // 启用 Telegram
      "botToken": "你的_BOT_TOKEN",
      "chatId": "你的_CHAT_ID"
    },
    "feishu": {
      "enabled": true,            // 启用飞书
      "app_id": "你的_APP_ID",
      "app_secret": "你的_APP_SECRET"
    }
  }
}
```

至少配置一个告警渠道（telegram 或 feishu）。

### 3. 启动服务

```bash
openclaw-monitor start
```

访问 http://localhost:37890 查看 Web UI。

---

## 配置说明

### 完整配置示例

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
  "openclaw": {
    "autoDetect": true
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
      "botToken": "从_BotFather_获取的_Token",
      "chatId": "你的_Chat_ID",
      "proxy": ""
    },
    "feishu": {
      "enabled": false,
      "app_id": "飞书应用的_App_ID",
      "app_secret": "飞书应用的_App_Secret"
    }
  }
}
```

### 配置项说明

#### monitoring（监控配置）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | true | 是否启用监控 |
| interval | number | 5 | 检测间隔（秒） |
| logLines | number | 100 | 保留日志行数 |
| thresholds | object | - | 告警阈值 |

#### thresholds（告警阈值）

```json
{
  "cpu": { "warning": 80, "critical": 95 },
  "memory": { "warning": 1024, "critical": 2048 }
}
```

#### web（Web UI 配置）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | true | 是否启用 Web UI |
| port | number | 37890 | Web 服务端口 |
| host | string | 0.0.0.0 | 监听地址 |

#### alerts（告警配置）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | false | 是否启用告警 |
| telegram | object | - | Telegram Bot 配置 |
| feishu | object | - | 飞书 Bot 配置 |

---

## 飞书 Bot 配置（详细步骤）

### 1. 创建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录后进入「开发者后台」
3. 点击「创建企业自建应用」
4. 填写应用名称（如：OpenClaw Monitor），选择所属企业
5. 创建后记录 `App ID` 和 `App Secret`（在「凭证与基础信息」页面）

### 2. 申请权限

在应用的「权限管理」页面，申请以下权限：

| 权限名称 | 权限值 | 说明 |
|----------|--------|------|
| 获取与发送单条消息 | `im:message` | 接收用户消息 |
| 发送单条消息 | `im:message:send_as_bot` | 主动发送消息给用户 |

> 点击「申请权限」，选择「全员可访问」或指定成员

### 3. 发布应用

1. 进入「版本管理与发布」
2. 点击「创建版本」
3. 填写版本号和更新说明
4. 点击「申请发布」
5. **审核通过后**，在「可用范围」中选择「全员可用」或指定成员

### 4. 配置事件订阅（重要！）

1. **先启动 openclaw-monitor 服务**：
   ```bash
   openclaw-monitor start
   ```
   等待看到日志：`[Feishu Bot] WebSocket 长连接已启动`

2. **进入飞书开放平台**，找到你的应用
3. 进入「事件与回调」→「添加事件」
4. 搜索并勾选 `im.message.receive_v1`（接收消息）
5. **先点击「确定」**（此时会提示未检测到应用连接信息，这是正常的）

6. **在「订阅方式」中选择**：
   - ❌ 不选择「通过 HTTPS 回调接收事件」
   - ✅ **选择「使用长连接接收事件/回调」**

7. **确认长连接已建立**：
   - 在 openclaw-monitor 控制台应该看到：`[info]: [ 'ws client ready' ]`
   - 这时再点击「保存变更」

> ⚠️ **重要**：必须先启动服务建立长连接，再保存事件订阅配置！否则飞书无法推送事件到你的服务。

### 5. 填写配置

将 `App ID` 和 `App Secret` 填入 `config.json`：

```json
{
  "alerts": {
    "enabled": true,
    "feishu": {
      "enabled": true,
      "app_id": "cli_a123456789",
      "app_secret": "your_app_secret_here"
    }
  }
}
```

### 6. 测试

1. 重启 openclaw-monitor
2. 在飞书中搜索你的应用名称
3. 发送「帮助」或 `/help`
4. 应该收到帮助消息

---

## Telegram Bot 配置

1. 给 [@BotFather](https://t.me/botfather) 发送 `/newbot` 创建 Bot
2. 获取 `botToken`
3. 给你的 Bot 发送一条消息
4. 访问 `https://api.telegram.org/bot<token>/getUpdates` 获取 `chatId`

```json
{
  "alerts": {
    "enabled": true,
    "telegram": {
      "enabled": true,
      "botToken": "123456:ABC-DEF...",
      "chatId": "123456789"
    }
  }
}
```

---

## 使用说明

### Web UI

启动后访问 http://localhost:37890

| 页面 | 功能 |
|------|------|
| 状态监控 | 实时查看进程状态、CPU、内存、控制 Gateway |
| 日志查看 | 搜索和筛选日志 |
| 配置管理 | 在线修改配置 |
| 告警历史 | 查看历史告警，发送测试告警 |

### Bot 命令

#### Telegram Bot

| 命令 | 说明 |
|------|------|
| `/status` | 查看运行状态 |
| `/logs [数量]` | 查看最近日志 (默认5条，最多20条) |
| `/doctor` | 诊断系统问题 |
| `/doctor fix` | 尝试自动修复问题 |
| `/restart` | 重启 OpenClaw |
| `/help` | 显示帮助 |

#### 飞书 Bot

飞书支持中英文命令：

| 命令 | 别名 |
|------|------|
| `/status` | `状态` |
| `/logs [数量]` | `日志` |
| `/doctor` | `诊断` |
| `/restart` | `重启` |
| `/help` | `帮助` |

### CLI 命令

```bash
# 初始化配置
openclaw-monitor config init

# 启动监控
openclaw-monitor start

# 查看状态
openclaw-monitor status

# 查看日志
openclaw-monitor logs -n 100

# 诊断问题
openclaw-monitor diagnose -n 20

# 显示帮助
openclaw-monitor help
```

---

## 监控与告警

### 监控内容

| 检测项 | 说明 |
|--------|------|
| 进程状态 | 检测 OpenClaw Gateway 是否运行 |
| CPU 使用率 | 实时获取进程 CPU 占用 |
| 内存使用 | 实时获取进程内存占用 |
| 端口状态 | 检测服务端口是否监听 |
| 日志收集 | 自动收集 OpenClaw 日志 |

### 告警规则

| 告警类型 | 触发条件 | 级别 |
|----------|----------|------|
| 进程停止 | OpenClaw 进程退出 | CRITICAL |
| 进程启动 | OpenClaw 进程启动 | INFO |
| CPU 过高 | CPU >= 95% | WARNING |
| 内存过高 | 内存 >= 2048 MB | WARNING |

> 注意：资源告警仅在进程运行时检测。

---

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test
```

---

## 故障排查

### 启动失败：OpenClaw not installed

**原因**: 未安装 OpenClaw Gateway

**解决方案**:
- 确认已安装 OpenClaw Gateway
- 检查 OpenClaw 是否在系统 PATH 中

### 飞书 Bot 无响应

1. **检查应用是否发布**：必须在「版本管理与发布」中发布应用
2. **检查权限**：确认已申请 `im:message` 和 `im:message:send_as_bot`
3. **检查事件订阅**：
   - 必须选择「使用长连接接收事件/回调」
   - 必须先启动服务再保存配置
4. **激活用户**：先给 Bot 发送一条消息，才能接收告警

### Telegram Bot 无响应

1. 检查 `botToken` 和 `chatId` 是否正确
2. 检查网络是否正常（可能需要代理）
3. 如需代理，在配置中添加：
   ```json
   { "proxy": "http://proxy:port" }
   ```

### 告警未收到

1. 检查 `alerts.enabled` 是否为 `true`
2. **对于飞书**：需要先给 Bot 发送一条消息以记录用户 ID
3. 检查告警历史：Web UI → 告警历史

### 飞书事件订阅提示「未检测到应用连接信息」

**这是正常的**。按照以下顺序操作：

1. 先启动 openclaw-monitor（建立长连接）
2. 在飞书开放平台选择「使用长连接接收事件/回调」
3. 点击「保存变更」

长连接建立后，飞书会自动推送事件到你的应用。

---

## License

MIT
