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

    // 设置全局刷新函数
    window.refreshStatus = () => this.refresh();
  }

  async refresh() {
    try {
      const res = await fetch(`${this.apiBase}/status`);
      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await res.json();
      this.updateStatus(data);
      this.updateChart(data);
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  }

  updateStatus(data) {
    const runningEl = document.getElementById('status-running');
    const pidEl = document.getElementById('status-pid');
    const cpuEl = document.getElementById('status-cpu');
    const memoryEl = document.getElementById('status-memory');
    const uptimeEl = document.getElementById('status-uptime');
    const portEl = document.getElementById('status-port');

    if (data.running) {
      runningEl.textContent = '运行中';
      runningEl.style.color = 'var(--success)';
      pidEl.textContent = data.pid || '--';
      cpuEl.textContent = data.cpuPercent?.toFixed(1) + '%' || '--';
      memoryEl.textContent = data.memoryMB?.toFixed(0) + ' MB' || '--';
      uptimeEl.textContent = this.formatUptime(data.uptime);
      portEl.textContent = data.portOpen ? data.port || '--' : '关闭';
    } else {
      runningEl.textContent = '已停止';
      runningEl.style.color = 'var(--error)';
      pidEl.textContent = '--';
      cpuEl.textContent = '--';
      memoryEl.textContent = '--';
      uptimeEl.textContent = '--';
      portEl.textContent = '--';
    }
  }

  initChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    // 等待 Chart.js 加载
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

    // 限制数据点数量
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
