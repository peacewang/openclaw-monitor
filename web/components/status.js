// web/components/status.js

export class StatusComponent {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.chart = null;
    this.chartData = {
      labels: [],
      cpu: [],
      memory: [],
    };
    this.maxDataPoints = 60;
    this.currentStatus = null;
  }

  render() {
    return `
      <div class="status-page">
        <!-- 顶部状态横幅 -->
        <div class="status-banner" id="statusBanner">
          <div class="status-banner-icon" id="statusIcon">⏳</div>
          <div class="status-banner-content">
            <div class="status-banner-title" id="statusTitle">加载中...</div>
            <div class="status-banner-subtitle" id="statusSubtitle">正在获取 OpenClaw Gateway 状态</div>
          </div>
          <div class="status-banner-actions">
            <button class="icon-btn" id="btnQuickRefresh" title="刷新状态">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 指标卡片网格 -->
        <div class="metrics-grid">
          <div class="metric-card metric-primary">
            <div class="metric-icon">⚡</div>
            <div class="metric-content">
              <div class="metric-label">CPU 使用率</div>
              <div class="metric-value" id="metricCpu">--%</div>
              <div class="metric-bar-bg"><div class="metric-bar" id="metricCpuBar"></div></div>
            </div>
          </div>

          <div class="metric-card metric-success">
            <div class="metric-icon">💾</div>
            <div class="metric-content">
              <div class="metric-label">内存使用</div>
              <div class="metric-value" id="metricMemory">-- MB</div>
              <div class="metric-bar-bg"><div class="metric-bar" id="metricMemoryBar"></div></div>
            </div>
          </div>

          <div class="metric-card metric-info">
            <div class="metric-icon">🔢</div>
            <div class="metric-content">
              <div class="metric-label">进程 ID</div>
              <div class="metric-value large" id="metricPid">--</div>
            </div>
          </div>

          <div class="metric-card metric-warning">
            <div class="metric-icon">🌐</div>
            <div class="metric-content">
              <div class="metric-label">服务端口</div>
              <div class="metric-value large" id="metricPort">--</div>
              <div class="metric-status" id="metricPortStatus">--</div>
            </div>
          </div>
        </div>

        <!-- 详细信息行 -->
        <div class="info-row">
          <div class="info-card">
            <div class="info-label">运行时长</div>
            <div class="info-value" id="infoUptime">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">最后检查</div>
            <div class="info-value" id="infoLastCheck">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">重启次数</div>
            <div class="info-value" id="infoRestarts">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">检查间隔</div>
            <div class="info-value">5 秒</div>
          </div>
        </div>

        <!-- 趋势图表 -->
        <div class="chart-section">
          <div class="section-header">
            <h3>资源趋势</h3>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot cpu"></span>CPU</span>
              <span class="legend-item"><span class="legend-dot memory"></span>内存</span>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="trendChart"></canvas>
          </div>
        </div>

        <!-- 控制面板 -->
        <div class="control-panel">
          <div class="control-panel-header">
            <h3>Gateway 控制</h3>
            <span class="control-hint">操作仅在非开发模式下可用</span>
          </div>
          <div class="control-buttons">
            <button class="control-btn control-btn-primary" id="btnRestart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              重启 Gateway
            </button>
            <button class="control-btn control-btn-danger" id="btnStop">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              停止 Gateway
            </button>
            <button class="control-btn control-btn-success" id="btnStart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              启动 Gateway
            </button>
            <button class="control-btn control-btn-info" id="btnDiagnose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              运行诊断
            </button>
          </div>
        </div>

        <!-- 内联样式 -->
        <style>
          .status-page {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          /* 状态横幅 */
          .status-banner {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            border-radius: 12px;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
            transition: all 0.3s ease;
          }

          .status-banner.running {
            background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
            border-color: #059669;
          }

          .status-banner.stopped {
            background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
            border-color: #dc2626;
          }

          .status-banner-icon {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
          }

          .status-banner-content {
            flex: 1;
          }

          .status-banner-title {
            font-size: 20px;
            font-weight: 600;
            color: #f1f5f9;
            margin-bottom: 4px;
          }

          .status-banner-subtitle {
            font-size: 14px;
            color: #94a3b8;
          }

          .status-banner-actions {
            display: flex;
            gap: 8px;
          }

          .icon-btn {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #f1f5f9;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .icon-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: scale(1.05);
          }

          /* 指标网格 */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .metric-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: 12px;
            background: #1e293b;
            border: 1px solid #334155;
            transition: all 0.2s ease;
          }

          .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          }

          .metric-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
          }

          .metric-content {
            flex: 1;
          }

          .metric-label {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #f1f5f9;
          }

          .metric-value.large {
            font-size: 28px;
          }

          .metric-bar-bg {
            height: 4px;
            background: #334155;
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
          }

          .metric-bar {
            height: 100%;
            border-radius: 2px;
            transition: width 0.5s ease;
          }

          .metric-status {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
          }

          /* 信息行 */
          .info-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .info-card {
            padding: 16px 20px;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 10px;
            text-align: center;
          }

          .info-label {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .info-value {
            font-size: 14px;
            color: #f1f5f9;
            font-weight: 500;
          }

          /* 图表区域 */
          .chart-section {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 20px;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .section-header h3 {
            font-size: 16px;
            color: #f1f5f9;
            margin: 0;
          }

          .chart-legend {
            display: flex;
            gap: 16px;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #94a3b8;
          }

          .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }

          .legend-dot.cpu {
            background: #3b82f6;
          }

          .legend-dot.memory {
            background: #10b981;
          }

          .chart-container {
            height: 200px;
          }

          /* 控制面板 */
          .control-panel {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 20px;
          }

          .control-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .control-panel-header h3 {
            font-size: 16px;
            color: #f1f5f9;
            margin: 0;
          }

          .control-hint {
            font-size: 12px;
            color: #64748b;
          }

          .control-buttons {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .control-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .control-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          .control-btn-primary {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #fff;
          }

          .control-btn-danger {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: #fff;
          }

          .control-btn-success {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #fff;
          }

          .control-btn-info {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
          }

          /* 响应式 */
          @media (max-width: 768px) {
            .metrics-grid,
            .info-row {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>
      </div>
    `;
  }

  async onMounted() {
    await this.refresh();
    this.initChart();
    this.bindEvents();

    // 自动刷新
    this.refreshInterval = setInterval(() => this.refresh(), 5000);
  }

  bindEvents() {
    document.getElementById('btnQuickRefresh')?.addEventListener('click', () => this.refresh());
    document.getElementById('btnRestart')?.addEventListener('click', () => this.handleRestart());
    document.getElementById('btnStop')?.addEventListener('click', () => this.handleStop());
    document.getElementById('btnStart')?.addEventListener('click', () => this.handleStart());
    document.getElementById('btnDiagnose')?.addEventListener('click', () => this.handleDiagnose());
  }

  async refresh() {
    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      this.currentStatus = data;
      this.updateUI(data);
      this.updateChart(data);
    } catch (error) {
      console.error('Failed to refresh status:', error);
      this.showError();
    }
  }

  updateUI(data) {
    const banner = document.getElementById('statusBanner');
    const icon = document.getElementById('statusIcon');
    const title = document.getElementById('statusTitle');
    const subtitle = document.getElementById('statusSubtitle');

    if (data.running) {
      banner.className = 'status-banner running';
      icon.textContent = '✅';
      title.textContent = 'OpenClaw Gateway 运行中';
      subtitle.textContent = `PID: ${data.pid || 'N/A'} | 端口: ${data.port || 'N/A'}`;
    } else {
      banner.className = 'status-banner stopped';
      icon.textContent = '❌';
      title.textContent = 'OpenClaw Gateway 已停止';
      subtitle.textContent = '点击下方按钮启动服务';
    }

    // 更新指标
    document.getElementById('metricCpu').textContent = (data.cpuPercent?.toFixed(1) || '0') + '%';
    document.getElementById('metricCpuBar').style.width = Math.min(data.cpuPercent || 0, 100) + '%';

    document.getElementById('metricMemory').textContent = (data.memoryMB?.toFixed(0) || '0') + ' MB';
    document.getElementById('metricMemoryBar').style.width = Math.min((data.memoryMB || 0) / 20, 100) + '%';

    document.getElementById('metricPid').textContent = data.pid || '--';
    document.getElementById('metricPort').textContent = data.port || '--';
    document.getElementById('metricPortStatus').textContent = data.portOpen ? '✓ 监听中' : '✗ 未监听';

    // 更新信息行
    document.getElementById('infoUptime').textContent = this.formatUptime(data.uptime);
    document.getElementById('infoLastCheck').textContent = new Date(data.lastCheck).toLocaleTimeString('zh-CN');
    document.getElementById('infoRestarts').textContent = data.restartCount || 0;
  }

  showError() {
    const banner = document.getElementById('statusBanner');
    if (banner) {
      banner.className = 'status-banner stopped';
      document.getElementById('statusIcon').textContent = '⚠️';
      document.getElementById('statusTitle').textContent = '无法获取状态';
      document.getElementById('statusSubtitle').textContent = '请检查服务是否正常运行';
    }
  }

  initChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
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
            pointRadius: 0,
          },
          {
            label: '内存 (MB)',
            data: this.chartData.memory,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { color: '#334155' },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
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

  async handleRestart() {
    if (!confirm('确认要重启 OpenClaw Gateway 吗？')) return;
    await this.doAction('/api/gateway/restart', '重启');
  }

  async handleStop() {
    if (!confirm('确认要停止 OpenClaw Gateway 吗？')) return;
    await this.doAction('/api/gateway/stop', '停止');
  }

  async handleStart() {
    await this.doAction('/api/gateway/start', '启动');
  }

  async handleDiagnose() {
    try {
      const res = await fetch(`${this.apiBase}/logs/errors?limit=10`);
      const errors = await res.json();
      if (errors.length === 0) {
        alert('✅ 未发现错误');
      } else {
        alert(`发现 ${errors.length} 条错误，请查看日志页面`);
      }
    } catch (error) {
      alert('诊断失败: ' + error.message);
    }
  }

  async doAction(url, name) {
    showToast(`正在${name} Gateway...`, 'info');
    try {
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      showToast(result.message || `${name}命令已发送`, 'success');
      await this.refresh();
    } catch (error) {
      showToast(`${name}失败: ` + error.message, 'error');
    }
  }

  formatUptime(uptime) {
    if (!uptime) return '--';
    // uptime is in milliseconds, convert to seconds
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${seconds}秒`;
  }

  async refreshPage() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    await this.onMounted();
  }
}
