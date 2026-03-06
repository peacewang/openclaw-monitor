// web/components/gateway.js

export class GatewayComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.status = null;
  }

  render() {
    return `
      <div class="gateway-page">
        <h2>Gateway 管理</h2>

        <div class="gateway-status" id="gatewayStatus">
          <p class="loading">加载中...</p>
        </div>

        <div class="gateway-controls">
          <h3>控制操作</h3>
          <div class="control-buttons">
            <button id="btnRestart" class="btn btn-warning">🔄 重启 Gateway</button>
            <button id="btnStop" class="btn btn-danger">⏹ 停止 Gateway</button>
            <button id="btnStart" class="btn btn-success">▶ 启动 Gateway</button>
          </div>
          <p class="control-hint">注意：控制操作仅在非开发模式下可用</p>
        </div>

        <div class="gateway-actions">
          <h3>快捷操作</h3>
          <button id="btnRefresh" class="btn btn-primary">🔄 刷新状态</button>
          <button id="btnDiagnose" class="btn btn-info">🔍 运行诊断</button>
        </div>
      </div>
    `;
  }

  async onMounted() {
    await this.loadStatus();
    this.bindEvents();
  }

  bindEvents() {
    const btnRestart = document.getElementById('btnRestart');
    const btnStop = document.getElementById('btnStop');
    const btnStart = document.getElementById('btnStart');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnDiagnose = document.getElementById('btnDiagnose');

    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.handleRestart());
    }
    if (btnStop) {
      btnStop.addEventListener('click', () => this.handleStop());
    }
    if (btnStart) {
      btnStart.addEventListener('click', () => this.handleStart());
    }
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadStatus());
    }
    if (btnDiagnose) {
      btnDiagnose.addEventListener('click', () => this.handleDiagnose());
    }
  }

  async loadStatus() {
    const container = document.getElementById('gatewayStatus');
    if (!container) return;

    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this.status = await res.json();
      this.renderStatus(container);
    } catch (error) {
      container.innerHTML = `
        <div class="error-state">
          <p>❌ 无法获取状态</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    }
  }

  renderStatus(container) {
    if (!this.status) {
      container.innerHTML = '<p class="loading">加载中...</p>';
      return;
    }

    const { status } = this;

    const statusClass = status.running ? 'status-running' : 'status-stopped';
    const statusIcon = status.running ? '✅' : '❌';
    const statusText = status.running ? '运行中' : '已停止';

    container.innerHTML = `
      <div class="status-card ${statusClass}">
        <div class="status-header">
          <span class="status-icon">${statusIcon}</span>
          <span class="status-text">${statusText}</span>
        </div>
        <div class="status-details">
          <div class="detail-item">
            <span class="detail-label">PID:</span>
            <span class="detail-value">${status.pid || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">CPU:</span>
            <span class="detail-value">${status.cpuPercent?.toFixed(1) || 0}%</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">内存:</span>
            <span class="detail-value">${status.memoryMB?.toFixed(0) || 0} MB</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">端口:</span>
            <span class="detail-value">${status.port || 'N/A'} ${status.portOpen ? '✓' : '✗'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">最后检查:</span>
            <span class="detail-value">${new Date(status.lastCheck).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>
    `;
  }

  async handleRestart() {
    if (!confirm('确认要重启 OpenClaw Gateway 吗？')) {
      return;
    }

    showToast('正在重启 Gateway...', 'info');

    try {
      const res = await fetch(`${this.apiBase}/gateway/restart`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      showToast(result.message || '重启命令已发送', 'success');
      await this.loadStatus();
    } catch (error) {
      console.error('Restart failed:', error);
      showToast(`重启失败: ${error.message}`, 'error');
    }
  }

  async handleStop() {
    if (!confirm('确认要停止 OpenClaw Gateway 吗？')) {
      return;
    }

    showToast('正在停止 Gateway...', 'info');

    try {
      const res = await fetch(`${this.apiBase}/gateway/stop`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      showToast(result.message || '停止命令已发送', 'success');
      await this.loadStatus();
    } catch (error) {
      console.error('Stop failed:', error);
      showToast(`停止失败: ${error.message}`, 'error');
    }
  }

  async handleStart() {
    showToast('正在启动 Gateway...', 'info');

    try {
      const res = await fetch(`${this.apiBase}/gateway/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      showToast(result.message || '启动命令已发送', 'success');
      await this.loadStatus();
    } catch (error) {
      console.error('Start failed:', error);
      showToast(`启动失败: ${error.message}`, 'error');
    }
  }

  async handleDiagnose() {
    showToast('正在运行诊断...', 'info');

    try {
      const res = await fetch(`${this.apiBase}/logs/errors?limit=10`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const errors = await res.json();

      if (errors.length === 0) {
        showToast('✅ 未发现错误', 'success');
      } else {
        showToast(`发现 ${errors.length} 条错误，请查看日志页面`, 'warning');
      }
    } catch (error) {
      console.error('Diagnose failed:', error);
      showToast(`诊断失败: ${error.message}`, 'error');
    }
  }

  async refresh() {
    await this.loadStatus();
  }
}
