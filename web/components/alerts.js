// web/components/alerts.js

export class AlertsComponent {
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
    this.bindFilter();

    // 设置全局函数
    window.refreshAlerts = () => this.loadAlerts();
  }

  bindFilter() {
    const filter = document.getElementById('alertFilter');
    filter.addEventListener('change', () => {
      this.filter = filter.value;
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
          ${record.error ? `<span class="alert-error">错误: ${this.escapeHtml(record.error)}</span>` : ''}
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
