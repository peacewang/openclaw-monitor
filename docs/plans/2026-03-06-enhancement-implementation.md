# OpenClaw Monitor 增强实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 对 openclaw-monitor v1.0 进行 Web UI 增强、测试补充和文档编写

**架构:** 按顺序执行三个任务：1) Web UI 功能+视觉升级，2) 测试用例补充，3) 完整文档编写。每个任务独立可验证。

**技术栈:** TypeScript, Fastify, Vitest, Chart.js, Markdown

---

## 前置准备

### Step 0: 安装新增依赖

```bash
npm install --save-dev chart.js memfs @types/memfs
```

验证:
```bash
npm list chart.js memfs
```

Commit:
```bash
git add package.json package-lock.json
git commit -m "chore: add chart.js and memfs dev dependencies"
```

---

## 任务 1: Web UI 增强

### 1.1 创建 API 端点 - 配置管理

**Files:**
- Modify: `src/api/routes.ts`
- Test: `tests/integration/api.test.ts`

**Step 1: 添加配置 POST 路由**

在 `src/api/routes.ts` 的 `routes` 函数中，在 `// 获取配置` 路由后添加:

```typescript
// 更新配置
fastify.post('/config', async (request, reply) => {
  const monitor = fastify.monitor as OpenClawMonitor;
  if (!monitor) {
    return reply.code(503).send({ error: 'Monitor not available' });
  }

  try {
    const newConfig = request.body as Partial<Config>;
    monitor.updateConfig(newConfig);
    return { success: true, config: monitor.getConfig() };
  } catch (error) {
    return reply.code(400).send({ error: (error as Error).message });
  }
});
```

**Step 2: 在 OpenClawMonitor 中添加 updateConfig 方法**

**File:** Modify `src/OpenClawMonitor.ts`

在 `OpenClawMonitor` 类中添加:

```typescript
updateConfig(partial: Partial<Config>): void {
  this.config = { ...this.config, ...partial };

  // 如果告警配置变化，重新初始化告警管理器
  if (partial.alerts && this.alertManager) {
    this.alertManager.updateConfig(this.config.alerts);
  }
}
```

**Step 3: 为 AlertManager 添加 updateConfig 方法**

**File:** Create `src/alert/manager.ts` (如果不存在) 或修改

添加方法:
```typescript
updateConfig(config: AlertsConfig): void {
  this.config = { ...this.config, ...config };
  // 重新初始化通道
  this.initializeChannels();
}
```

**Step 4: 添加测试**

**File:** Create `tests/integration/api-config.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawMonitor } from '../../src/index.js';

describe('API - Config', () => {
  let monitor: OpenClawMonitor;

  beforeAll(async () => {
    monitor = new OpenClawMonitor();
    await monitor.start();
  });

  afterAll(async () => {
    await monitor.stop();
  });

  it('should update config via POST /api/config', async () => {
    // 实现测试逻辑
  });
});
```

**Step 5: Commit**

```bash
git add src/api/routes.ts src/OpenClawMonitor.ts src/alert/manager.ts tests/integration/api-config.test.ts
git commit -m "feat: add config update API endpoint"
```

---

### 1.2 创建 API 端点 - 告警历史

**Files:**
- Modify: `src/api/routes.ts`
- Modify: `src/alert/manager.ts`

**Step 1: 在 AlertManager 中添加历史记录**

**File:** Modify `src/alert/manager.ts`

添加属性:
```typescript
private history: Alert[] = [];
private maxHistory = 1000;
```

修改 `send` 方法:
```typescript
async send(alert: Alert): Promise<void> {
  // 记录历史
  this.history.unshift({ ...alert, timestamp: alert.timestamp || new Date() });
  if (this.history.length > this.maxHistory) {
    this.history.pop();
  }

  // 原有的发送逻辑...
}
```

添加方法:
```typescript
getHistory(level?: AlertLevel, limit = 100): Alert[] {
  let filtered = this.history;
  if (level) {
    filtered = filtered.filter(a => a.level === level);
  }
  return filtered.slice(0, limit);
}
```

**Step 2: 添加告警历史 API 路由**

**File:** Modify `src/api/routes.ts`

```typescript
// 获取告警历史
fastify.get('/alerts', async (request, reply) => {
  const monitor = fastify.monitor as OpenClawMonitor;
  if (!monitor) {
    return reply.code(503).send({ error: 'Monitor not available' });
  }

  const query = request.query as { level?: string; limit?: string };
  const limit = query.limit ? parseInt(query.limit) : 100;

  const alerts = monitor.getAlertHistory(query.level as AlertLevel, limit);
  return alerts;
});

// 测试告警
fastify.post('/alerts/test', async (request, reply) => {
  const monitor = fastify.monitor as OpenClawMonitor;
  if (!monitor || !monitor.alertManager) {
    return reply.code(503).send({ error: 'Alert manager not available' });
  }

  const testAlert: Alert = {
    level: 'INFO',
    title: '测试告警',
    message: '这是一条测试告警，请忽略',
    timestamp: new Date(),
  };

  await monitor.alertManager.send(testAlert);
  return { success: true };
});
```

**Step 3: 在 OpenClawMonitor 中添加 getAlertHistory 方法**

**File:** Modify `src/OpenClawMonitor.ts`

```typescript
getAlertHistory(level?: AlertLevel, limit = 100): Alert[] {
  return this.alertManager?.getHistory(level, limit) ?? [];
}
```

**Step 4: Commit**

```bash
git add src/alert/manager.ts src/api/routes.ts src/OpenClawMonitor.ts
git commit -m "feat: add alert history API"
```

---

### 1.3 创建 Web UI 组件结构

**Files:**
- Create: `web/app.js`
- Create: `web/components/status.js`
- Create: `web/components/logs.js`
- Create: `web/components/config.js`
- Create: `web/components/alerts.js`
- Create: `web/components/bots.js`

**Step 1: 创建应用主逻辑**

**File:** Create `web/app.js`

```javascript
// web/app.js
export class App {
  constructor() {
    this.currentPage = 'status';
    this.components = {};
  }

  async init() {
    await this.loadComponents();
    this.render();
    this.bindEvents();
  }

  async loadComponents() {
    // 动态加载组件
  }

  render() {
    // 渲染当前页面
  }

  navigate(page) {
    this.currentPage = page;
    this.render();
  }

  bindEvents() {
    // 绑定导航事件
  }
}
```

**Step 2: 创建状态卡片组件**

**File:** Create `web/components/status.js`

```javascript
// web/components/status.js
export class StatusComponent {
  constructor(api) {
    this.api = api;
    this.chartData = { cpu: [], memory: [], labels: [] };
  }

  render() {
    return `
      <div class="status-page">
        <div class="stats-grid">...</div>
        <div class="chart-container">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
    `;
  }

  update(data) {
    // 更新显示数据
    this.updateChart(data);
  }

  updateChart(data) {
    // 使用 Chart.js 更新图表
  }
}
```

**Step 3: 创建配置面板组件**

**File:** Create `web/components/config.js`

```javascript
// web/components/config.js
export class ConfigComponent {
  constructor(api) {
    this.api = api;
    this.config = null;
  }

  async load() {
    const res = await this.api.get('/config');
    this.config = await res.json();
  }

  render() {
    return `
      <div class="config-page">
        <form id="configForm">
          <!-- 配置表单 -->
        </form>
      </div>
    `;
  }

  async save(changes) {
    await this.api.post('/config', changes);
  }
}
```

**Step 4: 创建告警历史组件**

**File:** Create `web/components/alerts.js`

```javascript
// web/components/alerts.js
export class AlertsComponent {
  constructor(api) {
    this.api = api;
    this.alerts = [];
    this.filter = 'ALL';
  }

  async load() {
    const res = await this.api.get('/alerts?limit=100');
    this.alerts = await res.json();
  }

  render() {
    return `
      <div class="alerts-page">
        <div class="filter-bar">
          <select id="alertFilter">
            <option value="ALL">全部</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <div class="alerts-list"></div>
      </div>
    `;
  }
}
```

**Step 5: Commit**

```bash
git add web/app.js web/components/
git commit -m "feat: add web UI components structure"
```

---

### 1.4 更新主 HTML

**File:** Modify `web/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Monitor</title>
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/components.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <div class="app-container">
    <nav class="sidebar">
      <div class="logo">OpenClaw</div>
      <div class="nav-items">
        <button data-page="status" class="active">状态监控</button>
        <button data-page="logs">日志查看</button>
        <button data-page="config">配置管理</button>
        <button data-page="alerts">告警历史</button>
        <button data-page="bots">Bot 控制</button>
      </div>
    </nav>
    <main class="main-content">
      <div id="page-content"></div>
    </main>
  </div>

  <div id="toast-container"></div>

  <script type="module">
    import { App } from './app.js';
    const app = new App();
    app.init();
  </script>
</body>
</html>
```

**Step 5: Commit**

```bash
git add web/index.html
git commit -m "feat: update web UI with navigation and layout"
```

---

### 1.5 样式文件

**Files:**
- Create: `web/styles/base.css`
- Create: `web/styles/components.css`

**Step 1: 创建基础样式**

**File:** Create `web/styles/base.css`

```css
/* web/styles/base.css */
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  --critical: #dc2626;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app-container {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: var(--bg-secondary);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 30px;
  color: var(--accent);
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-items button {
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-items button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-items button.active {
  background: var(--accent);
  color: white;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Toast 通知 */
#toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.toast {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

**Step 2: 创建组件样式**

**File:** Create `web/styles/components.css`

```css
/* web/styles/components.css */

/* 状态卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  margin-top: 8px;
}

/* 图表容器 */
.chart-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  height: 300px;
}

/* 告警列表 */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid var(--accent);
}

.alert-item.INFO { border-color: var(--accent); }
.alert-item.WARNING { border-color: var(--warning); }
.alert-item.ERROR { border-color: var(--error); }
.alert-item.CRITICAL { border-color: var(--critical); }

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent);
}

/* 按钮 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 日志行 */
.log-line {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  gap: 12px;
}

.log-timestamp {
  color: var(--text-secondary);
}

.log-level {
  font-weight: 500;
}

.log-level.INFO { color: var(--accent); }
.log-level.WARN { color: var(--warning); }
.log-level.ERROR { color: var(--error); }
```

**Step 3: 从 index.html 中移除内联样式**

**File:** Modify `web/index.html`

删除 `<style>` 标签内的所有 CSS，改为引入外部文件。

**Step 4: Commit**

```bash
git add web/styles/
git commit -m "feat: add modular CSS stylesheets"
```

---

## 任务 2: 测试补充

### 2.1 监控核心单元测试

**File:** Create `tests/unit/monitor/process.test.ts`

**Step 1: 编写测试**

```typescript
// tests/unit/monitor/process.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessMonitor } from '../../../src/monitor/process.js';

describe('ProcessMonitor', () => {
  let monitor: ProcessMonitor;

  beforeEach(() => {
    monitor = new ProcessMonitor({ pid: 1234, name: 'openclaw' });
  });

  it('should detect if process is running', async () => {
    const isRunning = await monitor.isProcessRunning();
    expect(typeof isRunning).toBe('boolean');
  });

  it('should get process stats', async () => {
    const stats = await monitor.getStats();
    expect(stats).toHaveProperty('cpuPercent');
    expect(stats).toHaveProperty('memoryMB');
    expect(stats).toHaveProperty('pid');
  });

  it('should check CPU threshold', async () => {
    const stats = await monitor.getStats();
    const exceeded = monitor.checkCpuThreshold(80);
    expect(typeof exceeded).toBe('boolean');
  });

  it('should check memory threshold', async () => {
    const stats = await monitor.getStats();
    const exceeded = monitor.checkMemoryThreshold(1024);
    expect(typeof exceeded).toBe('boolean');
  });
});
```

**Step 2: 运行测试**

```bash
npm test -- tests/unit/monitor/process.test.ts
```

**Step 3: Commit**

```bash
git add tests/unit/monitor/process.test.ts
git commit -m "test: add ProcessMonitor unit tests"
```

---

**File:** Create `tests/unit/monitor/log.test.ts`

```typescript
// tests/unit/monitor/log.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LogCollector } from '../../../src/monitor/log.js';
import { fs } from 'memfs';

describe('LogCollector', () => {
  let collector: LogCollector;

  beforeEach(() => {
    collector = new LogCollector('/test/logs');
  });

  it('should collect logs', async () => {
    const logs = await collector.collect();
    expect(Array.isArray(logs)).toBe(true);
  });

  it('should search logs by keyword', async () => {
    await collector.collect();
    const results = collector.search('error');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should filter error logs', async () => {
    await collector.collect();
    const errors = collector.getErrorLogs(10);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('should get recent lines', async () => {
    await collector.collect();
    const recent = collector.getRecentLines(5);
    expect(recent.length).toBeLessThanOrEqual(5);
  });
});
```

**Commit:**

```bash
git add tests/unit/monitor/log.test.ts
git commit -m "test: add LogCollector unit tests"
```

---

### 2.2 告警系统单元测试

**File:** Create `tests/unit/alerts/manager.test.ts`

```typescript
// tests/unit/alerts/manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertManager } from '../../../src/alert/manager.js';
import type { AlertChannel } from '../../../src/types/alert.js';

describe('AlertManager', () => {
  let manager: AlertManager;
  let mockChannel: AlertChannel;

  beforeEach(() => {
    mockChannel = {
      name: 'mock',
      enabled: true,
      send: vi.fn().mockResolvedValue(undefined),
    };
    manager = new AlertManager({
      enabled: true,
      channels: [mockChannel],
    });
  });

  it('should send alert to enabled channels', async () => {
    const alert = {
      level: 'ERROR' as const,
      title: 'Test',
      message: 'Test alert',
    };

    await manager.send(alert);
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test' })
    );
  });

  it('should not send to disabled channels', async () => {
    mockChannel.enabled = false;
    const alert = {
      level: 'INFO' as const,
      title: 'Test',
      message: 'Test alert',
    };

    await manager.send(alert);
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  it('should respect minimum level', async () => {
    manager = new AlertManager({
      enabled: true,
      channels: [mockChannel],
      minLevel: 'WARNING',
    });

    await manager.send({
      level: 'INFO',
      title: 'Test',
      message: 'Below threshold',
    });

    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  it('should deduplicate alerts', async () => {
    manager = new AlertManager({
      enabled: true,
      channels: [mockChannel],
      deduplicate: true,
      deduplicateWindow: 60000,
    });

    const alert = {
      level: 'WARNING' as const,
      title: 'Test',
      message: 'Test alert',
    };

    await manager.send(alert);
    await manager.send(alert);

    expect(mockChannel.send).toHaveBeenCalledTimes(1);
  });
});
```

**Commit:**

```bash
git add tests/unit/alerts/manager.test.ts
git commit -m "test: add AlertManager unit tests"
```

---

**File:** Create `tests/unit/alerts/channels.test.ts`

```typescript
// tests/unit/alerts/channels.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramChannel } from '../../../src/alert/channels/telegram.js';
import { BarkChannel } from '../../../src/alert/channels/bark.js';
import { FeishuChannel } from '../../../src/alert/channels/feishu.js';

// Mock fetch
global.fetch = vi.fn();

describe('Alert Channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TelegramChannel', () => {
    it('should send to Telegram API', async () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await channel.send({
        level: 'INFO',
        title: 'Test',
        message: 'Test message',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('BarkChannel', () => {
    it('should send to Bark API', async () => {
      const channel = new BarkChannel({
        endpoint: 'https://api.day.app/test-key',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ code: 200 }),
      });

      await channel.send({
        level: 'ERROR',
        title: 'Error',
        message: 'Error message',
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('FeishuChannel', () => {
    it('should send to Feishu webhook', async () => {
      const channel = new FeishuChannel({
        webhookUrl: 'https://open.feishu.cn/webhook/test',
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ StatusCode: 0 }),
      });

      await channel.send({
        level: 'CRITICAL',
        title: 'Critical',
        message: 'Critical alert',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://open.feishu.cn/webhook/test',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
```

**Commit:**

```bash
git add tests/unit/alerts/channels.test.ts
git commit -m "test: add alert channels unit tests"
```

---

### 2.3 API 集成测试

**File:** Create `tests/integration/api.test.ts`

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawMonitor } from '../../src/index.js';
import { build } from 'fastify';

describe('API Integration Tests', () => {
  let monitor: OpenClawMonitor;
  let fastify: any;

  beforeAll(async () => {
    monitor = new OpenClawMonitor({
      web: { host: '127.0.0.1', port: 0 }, // 随机端口
    });
    await monitor.start();

    // 获取实际端口
    const server = monitor['apiServer']['server'];
    const address = server.addresses()[0];
    fastify = server;
  });

  afterAll(async () => {
    await monitor.stop();
  });

  it('GET /api/status should return status', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/status',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveProperty('running');
  });

  it('GET /api/logs should return logs', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/logs?n=10',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/config should return config', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/config',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveProperty('monitoring');
  });

  it('POST /api/refresh should refresh status', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/refresh',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.success).toBe(true);
  });

  it('GET /api/logs/search should search logs', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/logs/search?q=test',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/logs/errors should return error logs', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/logs/errors?limit=10',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

**Commit:**

```bash
git add tests/integration/api.test.ts
git commit -m "test: add API integration tests"
```

---

## 任务 3: 文档编写

### 3.1 用户文档

**File:** Create `docs/user/installation.md`

```markdown
# 安装指南

## 前置要求

- Node.js 18.0 或更高版本
- npm 或 yarn

## npm 安装

### 全局安装

\`\`\`bash
npm install -g openclaw-monitor
\`\`\`

安装后，可以直接在终端使用：

\`\`\`bash
openclaw-monitor start
\`\`\`

### 本地安装

\`\`\`bash
git clone https://github.com/your-repo/openclaw-monitor.git
cd openclaw-monitor
npm install
npm run build
npm link
\`\`\`

## 验证安装

\`\`\`bash
openclaw-monitor --version
openclaw-monitor help
\`\`\`
```

**Commit:**

```bash
git add docs/user/installation.md
git commit -m "docs: add installation guide"
```

---

**File:** Create `docs/user/configuration.md`

```markdown
# 配置说明

## 配置文件位置

配置文件按优先级从高到低：

1. 当前目录: `./openclaw.config.json`
2. 用户目录: `~/.openclaw/config.json`
3. 默认配置

## 配置项说明

### 监控配置

\`\`\`json
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
\`\`\`

| 参数 | 说明 | 默认值 |
|------|------|--------|
| enabled | 是否启用监控 | true |
| interval | 检查间隔（秒） | 5 |
| logLines | 保留日志行数 | 100 |
| logPath | 日志文件路径 | 自动检测 |
| cpuThreshold | CPU 告警阈值（%） | 80 |
| memoryThreshold | 内存告警阈值（MB） | 1024 |

### Web 服务配置

\`\`\`json
{
  "web": {
    "enabled": true,
    "host": "0.0.0.0",
    "port": 37890
  }
}
\`\`\`

### 告警配置

\`\`\`json
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
\`\`\`

### Bot 配置

\`\`\`json
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
\`\`\`

## 环境变量

\`\`\`bash
export OPENCLAW_CONFIG_PATH=/path/to/config.json
export OPENCLAW_LOG_LEVEL=debug
export OPENCLAW_WEB_PORT=37890
\`\`\`
```

**Commit:**

```bash
git add docs/user/configuration.md
git commit -m "docs: add configuration guide"
```

---

**File:** Create `docs/user/usage.md`

```markdown
# 使用指南

## CLI 命令

### 启动监控

\`\`\`bash
openclaw-monitor start
\`\`\`

### 查看状态

\`\`\`bash
openclaw-monitor status
\`\`\`

输出示例：
\`\`\`
OpenClaw Monitor Status
=======================
Running: Yes
PID: 12345
CPU: 12.5%
Memory: 256 MB
Uptime: 2h 30m
Port: 8789
\`\`\`

### 查看日志

\`\`\`bash
# 最近 50 条
openclaw-monitor logs

# 最近 100 条
openclaw-monitor logs 100
\`\`\`

### 诊断

\`\`\`bash
openclaw-monitor diagnose
\`\`\`

## Web UI

访问 http://localhost:37890 查看 Web 界面。

### 功能

- **状态监控**: 实时查看进程状态、CPU、内存
- **日志查看**: 搜索和筛选日志
- **配置管理**: 在线修改配置
- **告警历史**: 查看历史告警
- **Bot 控制**: 测试和管理 Bot

## Bot 使用

### Telegram Bot

1. 创建 Bot: 与 @BotFather 对话
2. 获取 Token 和 Chat ID
3. 配置到 config.json
4. 启用 Bot: `bots.telegram.enabled = true`

### 飞书 Bot

1. 创建群机器人
2. 复制 Webhook URL
3. 配置到 config.json

支持的命令：
- `/status` - 查看状态
- `/logs` - 查看日志
- `/config` - 查看配置
\`\`\`

---

**File:** Create `docs/development/architecture.md`

```markdown
# 架构设计

## 整体架构

\`\`\`
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
\`\`\`

## 模块说明

### OpenClawMonitor
主类，协调所有模块。

### 监控模块
- `ProcessMonitor`: 进程状态检测
- `LogCollector`: 日志收集和搜索
- `EnvDetector`: 环境自动检测

### 告警模块
- `AlertManager`: 告警管理和分发
- `AlertChannel`: 告警通道接口

### API 模块
- `ApiServer`: Fastify 服务器
- 路由: REST + WebSocket

## 数据流

\`\`\`
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
\`\`\`
```

**Commit:**

```bash
git add docs/development/architecture.md
git commit -m "docs: add architecture documentation"
```

---

**File:** Create `docs/development/api.md`

```markdown
# API 文档

## 基础 URL

\`\`\`
http://localhost:37890/api
\`\`\`

## REST 端点

### GET /status

获取监控状态。

**响应：**
\`\`\`json
{
  "running": true,
  "pid": 12345,
  "cpuPercent": 12.5,
  "memoryMB": 256,
  "uptime": 9000,
  "port": 8789,
  "portOpen": true
}
\`\`\`

### GET /logs

获取最近日志。

**参数：**
- `n`: 返回行数（默认 100）

**响应：**
\`\`\`json
[
  {
    "timestamp": "2026-03-06T10:00:00Z",
    "level": "INFO",
    "message": "Server started"
  }
]
\`\`\`

### GET /logs/search

搜索日志。

**参数：**
- `q`: 搜索关键词
- `limit`: 返回限制

### GET /logs/errors

获取错误日志。

**参数：**
- `limit`: 返回限制

### GET /config

获取配置。

**响应：**
\`\`\`json
{
  "monitoring": { "enabled": true, ... },
  "web": { "port": 37890 },
  "alerts": { "enabled": false }
}
\`\`\`

### POST /config

更新配置。

**请求体：** 部分配置对象

### POST /refresh

强制刷新状态。

## WebSocket

### 连接

\`\`\`
ws://localhost:37890/api/events
\`\`\`

### 消息格式

\`\`\`json
{
  "type": "status",
  "data": {
    "running": true,
    "cpuPercent": 12.5,
    ...
  }
}
\`\`\`

## 错误码

| Code | 说明 |
|------|------|
| 503 | 服务未启动 |
| 400 | 请求参数错误 |
| 500 | 服务器错误 |
```

**Commit:**

```bash
git add docs/development/api.md
git commit -m "docs: add API documentation"
```

---

**File:** Create `docs/deployment/docker.md`

```markdown
# Docker 部署

## Dockerfile

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 37890

CMD ["node", "dist/cli/index.js", "start"]
\`\`\`

## 构建

\`\`\`bash
docker build -t openclaw-monitor:latest .
\`\`\`

## 运行

\`\`\`bash
docker run -d \\
  --name openclaw-monitor \\
  -p 37890:37890 \\
  -v /path/to/logs:/var/log/openclaw \\
  -v /path/to/config:/config \\
  openclaw-monitor:latest
\`\`\`

## docker-compose

\`\`\`yaml
version: '3.8'

services:
  monitor:
    image: openclaw-monitor:latest
    container_name: openclaw-monitor
    restart: unless-stopped
    ports:
      - "37890:37890"
    volumes:
      - ./logs:/var/log/openclaw
      - ./config:/config
    environment:
      - NODE_ENV=production
      - OPENCLAW_CONFIG_PATH=/config/openclaw.json
\`\`\`

## 健康检查

\`\`\`bash
curl http://localhost:37890/api/status
\`\`\`
```

**Commit:**

```bash
git add docs/deployment/docker.md
git commit -m "docs: add Docker deployment guide"
```

---

**File:** Create `docs/deployment/production.md`

```markdown
# 生产环境部署

## PM2 部署

### 安装 PM2

\`\`\`bash
npm install -g pm2
\`\`\`

### 启动

\`\`\`bash
pm2 start dist/cli/index.js --name openclaw-monitor -- start
pm2 save
pm2 startup
\`\`\`

### 配置文件

ecosystem.config.js:

\`\`\`javascript
module.exports = {
  apps: [{
    name: 'openclaw-monitor',
    script: './dist/cli/index.js',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
\`\`\`

## 日志轮转

使用 logrotate:

\`\`\`
/var/log/openclaw/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 openclaw openclaw
}
\`\`\`

## 反向代理

### Nginx

\`\`\`nginx
location /openclaw/ {
    proxy_pass http://localhost:37890/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
\`\`\`

## 监控告警配置

1. 配置告警通道（参考 configuration.md）
2. 设置合理的阈值
3. 测试告警：`openclaw-monitor diagnose`
```

**Commit:**

```bash
git add docs/deployment/production.md
git commit -m "docs: add production deployment guide"
```

---

**File:** Create `docs/deployment/troubleshooting.md`

```markdown
# 故障排查

## 常见问题

### 监控未检测到进程

**症状**: status 显示 "已停止"

**排查**:
1. 检查配置中的进程名称/PID 是否正确
2. 运行 `diagnose` 查看详细日志
3. 检查日志路径是否正确

### 告警未发送

**症状**: 触发阈值但未收到告警

**排查**:
1. 检查 `alerts.enabled = true`
2. 检查通道配置（Token、URL）
3. 使用 `/api/alerts/test` 测试
4. 查看日志中的错误信息

### Web UI 无法访问

**症状**: 打开页面无响应

**排查**:
1. 检查端口是否被占用: `lsof -i :37890`
2. 检查防火墙设置
3. 查看服务日志

### CPU/内存显示为 0

**原因**: pidusage 无法获取信息

**解决**:
- Windows: 以管理员身份运行
- Linux: 确保有权限读取 /proc

## 调试模式

\`\`\`bash
OPENCLAW_LOG_LEVEL=debug openclaw-monitor start
\`\`\`

## 日志位置

- 系统日志: `/var/log/openclaw/`
- 控制台输出: 重定向到文件
```

**Commit:**

```bash
git add docs/deployment/troubleshooting.md
git commit -m "docs: add troubleshooting guide"
```

---

### 3.6 更新主 README

**File:** Modify `README.md`

```markdown
# OpenClaw Monitor

OpenClaw Gateway 监控工具 - 实时监控进程状态、日志收集、告警通知。

## 功能特性

- 📊 **实时监控**: CPU、内存、运行状态
- 📝 **日志收集**: 自动收集、搜索、筛选
- 🚨 **告警通知**: Telegram、飞书、Bark 多通道
- 🌐 **Web UI**: 可视化监控面板
- 🤖 **Bot 交互**: Telegram/飞书命令查询

## 快速开始

\`\`\`bash
# 安装
npm install -g openclaw-monitor

# 启动
openclaw-monitor start

# 查看状态
openclaw-monitor status

# Web UI
open http://localhost:37890
\`\`\`

## 文档

- [安装指南](docs/user/installation.md)
- [配置说明](docs/user/configuration.md)
- [使用指南](docs/user/usage.md)
- [架构设计](docs/development/architecture.md)
- [API 文档](docs/development/api.md)
- [Docker 部署](docs/deployment/docker.md)

## 配置示例

\`\`\`json
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
\`\`\`

## License

MIT
```

**Commit:**

```bash
git add README.md
git commit -m "docs: update README with comprehensive links"
```

---

## 验收标准

### Web UI
- [ ] 所有页面正常渲染
- [ ] Tab 导航工作正常
- [ ] 图表正确显示数据
- [ ] 配置保存成功
- [ ] Toast 通知正常

### 测试
- [ ] 所有单元测试通过
- [ ] 集成测试通过
- [ ] 覆盖率 > 70%

### 文档
- [ ] 所有文档文件已创建
- [ ] 示例代码可运行
- [ ] 链接正确

---

## 最终检查

运行完整测试套件：

\`\`\`bash
npm test
npm run build
npm run lint
\`\`\`

全部通过后，打标签发布：

\`\`\`bash
git tag v1.1.0
git push origin v1.1.0
\`\`\`
