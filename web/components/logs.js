// web/components/logs.js

export class LogsComponent {
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

    // 设置全局函数
    window.refreshLogs = () => this.loadLogs();
    window.searchLogs = () => this.search();
    window.showErrorLogs = () => this.showErrorOnly();

    // 绑定回车搜索
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
