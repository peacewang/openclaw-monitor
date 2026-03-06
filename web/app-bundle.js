// web/app-bundle.js - 合并版本，无需模块加载

// ============ Status Component ============
class StatusComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.chart = null;
    this.chartData = {
      labels: [],
      cpu: [],
      memory: [],
    };
    this.maxDataPoints = 50;
  }

  render() {
    return `
      <div class="status-page">
        <h2>状态监控</h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">状态</div>
            <div class="stat-value" id="status-running">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">PID</div>
            <div class="stat-value" id="status-pid">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">CPU</div>
            <div class="stat-value" id="status-cpu">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">内存</div>
            <div class="stat-value" id="status-memory">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">运行时长</div>
            <div class="stat-value" id="status-uptime">--</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">端口</div>
            <div class="stat-value" id="status-port">--</div>
          </div>
        </div>

        <div class="chart-container">
          <canvas id="trendChart"></canvas>
        </div>

        <div class="buttons">
          <button class="btn btn-primary" onclick="refreshStatus()">刷新状态</button>
        </div>
      </div>
    `;
  }

  async onMounted() {
    await this.refresh();
    this.initChart();
  }

  async refresh() {
    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      this.updateStatus(data);
      this.updateChart(data);
    } catch (error) {
      console.error('Failed to refresh status:', error);
      showToast('获取状态失败', 'error');
    }
  }

  updateStatus(data) {
    const updateElement = (id, text, color) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = text;
        if (color) el.style.color = color;
      }
    };

    if (data.running) {
      updateElement('status-running', '运行中', 'var(--success)');
      updateElement('status-pid', data.pid || '--');
      updateElement('status-cpu', (data.cpuPercent?.toFixed(1) || '--') + '%');
      updateElement('status-memory', (data.memoryMB?.toFixed(0) || '--') + ' MB');
      updateElement('status-uptime', this.formatUptime(data.uptime));
      updateElement('status-port', data.portOpen ? data.port || '--' : '关闭');
    } else {
      updateElement('status-running', '已停止', 'var(--error)');
      updateElement('status-pid', '--');
      updateElement('status-cpu', '--');
      updateElement('status-memory', '--');
      updateElement('status-uptime', '--');
      updateElement('status-port', '--');
    }
  }

  initChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas || typeof Chart === 'undefined') {
      setTimeout(() => this.initChart(), 100);
      return;
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.chartData.labels,
        datasets: [
          {
            label: 'CPU (%)',
            data: this.chartData.cpu,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: '内存 (MB)',
            data: this.chartData.memory,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8' },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: '#334155' },
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: '#334155' },
          },
        },
      },
    });
  }

  updateChart(data) {
    if (!data.running || !this.chart) return;

    const now = new Date().toLocaleTimeString();
    this.chartData.labels.push(now);
    this.chartData.cpu.push(data.cpuPercent || 0);
    this.chartData.memory.push(data.memoryMB || 0);

    if (this.chartData.labels.length > this.maxDataPoints) {
      this.chartData.labels.shift();
      this.chartData.cpu.shift();
      this.chartData.memory.shift();
    }

    this.chart.data.labels = this.chartData.labels;
    this.chart.data.datasets[0].data = this.chartData.cpu;
    this.chart.data.datasets[1].data = this.chartData.memory;
    this.chart.update('none');
  }

  formatUptime(seconds) {
    if (!seconds) return '--';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0 ? `${days}天${hours}小时` : `${hours}小时${minutes}分`;
  }
}

// ============ Logs Component ============
class LogsComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
  }

  render() {
    return `
      <div class="logs-page">
        <h2>日志查看</h2>

        <div class="search-bar">
          <input type="text" id="logSearch" class="form-input" placeholder="搜索日志..." />
          <button class="btn btn-primary" onclick="searchLogs()">搜索</button>
          <button class="btn btn-secondary" onclick="showErrorLogs()">仅错误</button>
        </div>

        <div class="logs-container">
          <div id="logs-list"></div>
        </div>

        <div class="buttons">
          <button class="btn btn-primary" onclick="refreshLogs()">刷新</button>
        </div>
      </div>
    `;
  }

  async onMounted() {
    await this.loadLogs();

    // 绑定输入框回车搜索
    document.getElementById('logSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.search();
      }
    });
  }

  async loadLogs() {
    try {
      const res = await fetch(`${this.apiBase}/logs?n=100`);
      if (!res.ok) return;
      const logs = await res.json();
      this.renderLogs(logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  async search() {
    const query = document.getElementById('logSearch').value.trim();
    if (!query) {
      return this.loadLogs();
    }

    try {
      const res = await fetch(`${this.apiBase}/logs/search?q=${encodeURIComponent(query)}&limit=100`);
      if (!res.ok) return;
      const logs = await res.json();
      this.renderLogs(logs);
    } catch (error) {
      console.error('Failed to search logs:', error);
    }
  }

  async showErrorOnly() {
    try {
      const res = await fetch(`${this.apiBase}/logs/errors?limit=100`);
      if (!res.ok) return;
      const logs = await res.json();
      this.renderLogs(logs);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    }
  }

  renderLogs(logs) {
    const container = document.getElementById('logs-list');
    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无日志</div>';
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="log-line">
        <span class="log-timestamp">[${new Date(log.timestamp).toLocaleTimeString('zh-CN')}]</span>
        <span class="log-level ${log.level}">[${log.level}]</span>
        <span class="log-message">${this.escapeHtml(log.message)}</span>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============ Config Component ============
class ConfigComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.config = null;
  }

  render() {
    return `
      <div class="config-page">
        <h2>配置管理</h2>

        <form id="configForm">
          <div class="config-section">
            <h3>监控配置</h3>
            <div class="form-group">
              <label class="form-label">检查间隔 (秒)</label>
              <input type="number" name="monitoring.interval" class="form-input" min="1" max="300" value="5" />
            </div>
            <div class="form-group">
              <label class="form-label">CPU 阈值 (%)</label>
              <input type="number" name="monitoring.cpuThreshold" class="form-input" min="0" max="100" value="80" />
            </div>
            <div class="form-group">
              <label class="form-label">内存阈值 (MB)</label>
              <input type="number" name="monitoring.memoryThreshold" class="form-input" min="0" value="1024" />
            </div>
          </div>

          <div class="buttons">
            <button type="submit" class="btn btn-primary">保存配置</button>
            <button type="button" class="btn btn-secondary" onclick="refreshConfig()">重置</button>
          </div>
        </form>
      </div>
    `;
  }

  async onMounted() {
    await this.loadConfig();
    this.bindForm();
  }

  async loadConfig() {
    try {
      const res = await fetch(`${this.apiBase}/config`);
      if (!res.ok) return;
      this.config = await res.json();
      this.populateForm();
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  populateForm() {
    const form = document.getElementById('configForm');
    if (this.config.monitoring) {
      this.setFieldValue(form, 'monitoring.interval', this.config.monitoring.interval);
      this.setFieldValue(form, 'monitoring.cpuThreshold', this.config.monitoring.cpuThreshold);
      this.setFieldValue(form, 'monitoring.memoryThreshold', this.config.monitoring.memoryThreshold);
    }
  }

  setFieldValue(form, name, value) {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value ?? '';
  }

  bindForm() {
    const form = document.getElementById('configForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfig();
    });
  }

  async saveConfig() {
    const form = document.getElementById('configForm');
    const changes = {
      monitoring: {
        interval: parseInt(form.querySelector('[name="monitoring.interval"]').value),
        cpuThreshold: parseInt(form.querySelector('[name="monitoring.cpuThreshold"]').value),
        memoryThreshold: parseInt(form.querySelector('[name="monitoring.memoryThreshold"]').value),
      }
    };

    try {
      const res = await fetch(`${this.apiBase}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!res.ok) throw new Error('Failed to save config');

      showToast('配置已保存', 'success');
      await this.loadConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('保存配置失败', 'error');
    }
  }
}

// ============ Alerts Component ============
class AlertsComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.alerts = [];
    this.filter = 'ALL';
  }

  render() {
    return `
      <div class="alerts-page">
        <h2>告警历史</h2>

        <div class="filter-bar">
          <select id="alertFilter" class="form-select">
            <option value="ALL">全部</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <button class="btn btn-primary" onclick="refreshAlerts()">刷新</button>
        </div>

        <div id="alerts-list" class="alerts-list"></div>
      </div>
    `;
  }

  async onMounted() {
    await this.loadAlerts();
    document.getElementById('alertFilter').addEventListener('change', () => {
      this.filter = document.getElementById('alertFilter').value;
      this.renderAlerts();
    });
  }

  async loadAlerts() {
    try {
      const res = await fetch(`${this.apiBase}/alerts?limit=100`);
      if (!res.ok) return;
      this.alerts = await res.json();
      this.renderAlerts();
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  renderAlerts() {
    const container = document.getElementById('alerts-list');

    let filtered = this.alerts;
    if (this.filter !== 'ALL') {
      filtered = this.alerts.filter(a => a.alert.level === this.filter);
    }

    if (!filtered || filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无告警记录</div>';
      return;
    }

    container.innerHTML = filtered.map(record => `
      <div class="alert-item ${record.alert.level}">
        <div class="alert-header">
          <span class="alert-level">[${record.alert.level}]</span>
          <span class="alert-title">${this.escapeHtml(record.alert.title)}</span>
          <span class="alert-time">${new Date(record.sentAt).toLocaleString('zh-CN')}</span>
        </div>
        <div class="alert-message">${this.escapeHtml(record.alert.message)}</div>
        <div class="alert-meta">
          <span class="alert-channel">渠道: ${record.channel}</span>
          <span class="alert-status ${record.success ? 'success' : 'failed'}">
            ${record.success ? '✓ 发送成功' : '✗ 发送失败'}
          </span>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============ App Class ============
const API_BASE = '/api';

class App {
  constructor() {
    this.currentPage = 'status';
    this.components = {
      status: new StatusComponent(API_BASE),
      logs: new LogsComponent(API_BASE),
      config: new ConfigComponent(API_BASE),
      alerts: new AlertsComponent(API_BASE),
    };
  }

  async init() {
    this.bindNavigation();
    await this.navigate('status');
    this.startPeriodicRefresh();
  }

  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-items button');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) {
          this.navigate(page);
        }
      });
    });
  }

  async navigate(page) {
    this.currentPage = page;

    // 更新导航状态
    const navButtons = document.querySelectorAll('.nav-items button');
    navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // 渲染页面
    const content = document.getElementById('page-content');
    const component = this.components[page];

    if (component) {
      content.innerHTML = component.render();
      await component.onMounted();
    }
  }

  startPeriodicRefresh() {
    setInterval(async () => {
      const component = this.components[this.currentPage];
      if (component && component.refresh) {
        await component.refresh();
      }
    }, 30000);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// ============ Global Functions ============
window.refreshStatus = () => window.appInstance.components.status.refresh();
window.refreshLogs = () => window.appInstance.components.logs.loadLogs();
window.searchLogs = () => window.appInstance.components.logs.search();
window.showErrorLogs = () => window.appInstance.components.logs.showErrorOnly();
window.refreshAlerts = () => window.appInstance.components.alerts.loadAlerts();
window.refreshConfig = () => window.appInstance.components.config.loadConfig();
window.showToast = (msg, type) => window.appInstance.showToast(msg, type);

// ============ Initialize ============
const app = new App();
app.init().catch(console.error);
window.appInstance = app;
