"use strict";
(() => {
  // web/components/status.js
  var StatusComponent = class {
    constructor(apiBase) {
      this.apiBase = apiBase;
      this.chart = null;
      this.chartData = {
        labels: [],
        cpu: [],
        memory: []
      };
      this.maxDataPoints = 60;
      this.currentStatus = null;
    }
    render() {
      return `
      <div class="status-page">
        <!-- \u9876\u90E8\u72B6\u6001\u6A2A\u5E45 -->
        <div class="status-banner" id="statusBanner">
          <div class="status-banner-icon" id="statusIcon">\u23F3</div>
          <div class="status-banner-content">
            <div class="status-banner-title" id="statusTitle">\u52A0\u8F7D\u4E2D...</div>
            <div class="status-banner-subtitle" id="statusSubtitle">\u6B63\u5728\u83B7\u53D6 OpenClaw Gateway \u72B6\u6001</div>
          </div>
          <div class="status-banner-actions">
            <button class="restart-btn" id="btnQuickRestart" title="\u91CD\u542F Gateway">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              <span>\u91CD\u542F OpenClaw</span>
            </button>
          </div>
        </div>

        <!-- \u6307\u6807\u5361\u7247\u7F51\u683C -->
        <div class="metrics-grid">
          <div class="metric-card metric-primary">
            <div class="metric-icon">\u26A1</div>
            <div class="metric-content">
              <div class="metric-label">CPU \u4F7F\u7528\u7387</div>
              <div class="metric-value" id="metricCpu">--%</div>
              <div class="metric-bar-bg"><div class="metric-bar" id="metricCpuBar"></div></div>
            </div>
          </div>

          <div class="metric-card metric-success">
            <div class="metric-icon">\u{1F4BE}</div>
            <div class="metric-content">
              <div class="metric-label">\u5185\u5B58\u4F7F\u7528</div>
              <div class="metric-value" id="metricMemory">-- MB</div>
              <div class="metric-bar-bg"><div class="metric-bar" id="metricMemoryBar"></div></div>
            </div>
          </div>

          <div class="metric-card metric-info">
            <div class="metric-icon">\u23F1\uFE0F</div>
            <div class="metric-content">
              <div class="metric-label">\u8FD0\u884C\u65F6\u957F</div>
              <div class="metric-value" id="metricUptime">--</div>
            </div>
          </div>

          <div class="metric-card metric-warning">
            <div class="metric-icon">\u{1F550}</div>
            <div class="metric-content">
              <div class="metric-label">\u6700\u540E\u68C0\u67E5</div>
              <div class="metric-value small" id="metricLastCheck">--</div>
            </div>
          </div>
        </div>

        <!-- \u8D8B\u52BF\u56FE\u8868 -->
        <div class="chart-section">
          <div class="section-header">
            <h3>\u8D44\u6E90\u8D8B\u52BF</h3>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot cpu"></span>CPU</span>
              <span class="legend-item"><span class="legend-dot memory"></span>\u5185\u5B58</span>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="trendChart"></canvas>
          </div>
        </div>

        <!-- \u5185\u8054\u6837\u5F0F -->
        <style>
          .status-page {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          /* \u72B6\u6001\u6A2A\u5E45 */
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

          .restart-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #fff;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .restart-btn:hover {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          }

          .restart-btn svg {
            flex-shrink: 0;
          }

          /* \u6307\u6807\u7F51\u683C */
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

          .metric-value.small {
            font-size: 14px;
            font-weight: 500;
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

          /* \u56FE\u8868\u533A\u57DF */
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

          /* \u54CD\u5E94\u5F0F */
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
      this.refreshInterval = setInterval(() => this.refresh(), 5e3);
    }
    bindEvents() {
      document.getElementById("btnQuickRestart")?.addEventListener("click", () => this.handleRestart());
    }
    async refresh() {
      try {
        const res = await fetch(`${this.apiBase}/status`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        this.currentStatus = data;
        this.updateUI(data);
        this.updateChart(data);
      } catch (error) {
        console.error("Failed to refresh status:", error);
        this.showError();
      }
    }
    updateUI(data) {
      const banner = document.getElementById("statusBanner");
      const icon = document.getElementById("statusIcon");
      const title = document.getElementById("statusTitle");
      const subtitle = document.getElementById("statusSubtitle");
      if (data.running) {
        banner.className = "status-banner running";
        icon.textContent = "\u2705";
        title.textContent = "OpenClaw Gateway \u8FD0\u884C\u4E2D";
        subtitle.textContent = `PID: ${data.pid || "N/A"} | \u7AEF\u53E3: ${data.port || "N/A"}`;
      } else {
        banner.className = "status-banner stopped";
        icon.textContent = "\u274C";
        title.textContent = "OpenClaw Gateway \u5DF2\u505C\u6B62";
        subtitle.textContent = "\u70B9\u51FB\u91CD\u542F\u6309\u94AE\u542F\u52A8\u670D\u52A1";
      }
      document.getElementById("metricCpu").textContent = (data.cpuPercent?.toFixed(1) || "0") + "%";
      document.getElementById("metricCpuBar").style.width = Math.min(data.cpuPercent || 0, 100) + "%";
      document.getElementById("metricMemory").textContent = (data.memoryMB?.toFixed(0) || "0") + " MB";
      document.getElementById("metricMemoryBar").style.width = Math.min((data.memoryMB || 0) / 20, 100) + "%";
      document.getElementById("metricUptime").textContent = this.formatUptime(data.uptime);
      document.getElementById("metricLastCheck").textContent = new Date(data.lastCheck).toLocaleTimeString("zh-CN");
    }
    showError() {
      const banner = document.getElementById("statusBanner");
      if (banner) {
        banner.className = "status-banner stopped";
        document.getElementById("statusIcon").textContent = "\u26A0\uFE0F";
        document.getElementById("statusTitle").textContent = "\u65E0\u6CD5\u83B7\u53D6\u72B6\u6001";
        document.getElementById("statusSubtitle").textContent = "\u8BF7\u68C0\u67E5\u670D\u52A1\u662F\u5426\u6B63\u5E38\u8FD0\u884C";
      }
    }
    initChart() {
      const canvas = document.getElementById("trendChart");
      if (!canvas) return;
      if (typeof Chart === "undefined") {
        setTimeout(() => this.initChart(), 100);
        return;
      }
      this.chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: this.chartData.labels,
          datasets: [
            {
              label: "CPU (%)",
              data: this.chartData.cpu,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              fill: true,
              pointRadius: 0
            },
            {
              label: "\u5185\u5B58 (MB)",
              data: this.chartData.memory,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              fill: true,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              display: false
            },
            y: {
              ticks: { color: "#64748b", font: { size: 10 } },
              grid: { color: "#334155" }
            }
          },
          interaction: {
            intersect: false,
            mode: "index"
          }
        }
      });
    }
    updateChart(data) {
      if (!data.running || !this.chart) return;
      const now = (/* @__PURE__ */ new Date()).toLocaleTimeString();
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
      this.chart.update("none");
    }
    async handleRestart() {
      if (!confirm("\u786E\u8BA4\u8981\u91CD\u542F OpenClaw Gateway \u5417\uFF1F")) return;
      showToast("\u6B63\u5728\u91CD\u542F Gateway...", "info");
      try {
        const res = await fetch("/api/gateway/restart", { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        showToast(result.message || "\u91CD\u542F\u547D\u4EE4\u5DF2\u53D1\u9001", result.success ? "success" : "error");
        await new Promise((resolve) => setTimeout(resolve, 5e3));
        await this.refresh();
      } catch (error) {
        showToast("\u91CD\u542F\u5931\u8D25: " + error.message, "error");
      }
    }
    formatUptime(uptime) {
      if (!uptime) return "--";
      const seconds = Math.floor(uptime / 1e3);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor(seconds % 86400 / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      if (days > 0) return `${days}\u5929 ${hours}\u5C0F\u65F6`;
      if (hours > 0) return `${hours}\u5C0F\u65F6 ${minutes}\u5206\u949F`;
      if (minutes > 0) return `${minutes}\u5206\u949F`;
      return `${seconds}\u79D2`;
    }
    async refreshPage() {
      if (this.refreshInterval) clearInterval(this.refreshInterval);
      await this.onMounted();
    }
  };

  // web/components/logs.js
  var LogsComponent = class {
    constructor(apiBase) {
      this.apiBase = apiBase;
    }
    render() {
      return `
      <div class="logs-page">
        <h2>\u65E5\u5FD7\u67E5\u770B</h2>

        <div class="search-bar">
          <input type="text" id="logSearch" class="form-input" placeholder="\u641C\u7D22\u65E5\u5FD7..." />
          <button class="btn btn-primary" onclick="searchLogs()">\u641C\u7D22</button>
          <button class="btn btn-secondary" onclick="showErrorLogs()">\u4EC5\u9519\u8BEF</button>
        </div>

        <div class="logs-container">
          <div id="logs-list"></div>
        </div>

        <div class="buttons">
          <button class="btn btn-primary" onclick="refreshLogs()">\u5237\u65B0</button>
        </div>
      </div>
    `;
    }
    async onMounted() {
      await this.loadLogs();
      window.refreshLogs = () => this.loadLogs();
      window.searchLogs = () => this.search();
      window.showErrorLogs = () => this.showErrorOnly();
      document.getElementById("logSearch").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.search();
        }
      });
    }
    async loadLogs() {
      try {
        const res = await fetch(`${this.apiBase}/logs?n=100`);
        if (!res.ok) {
          this.renderLogs([]);
          return;
        }
        const logs = await res.json();
        this.renderLogs(logs || []);
      } catch (error) {
        console.error("Failed to load logs:", error);
        this.renderLogs([]);
      }
    }
    async search() {
      const query = document.getElementById("logSearch").value.trim();
      if (!query) {
        return this.loadLogs();
      }
      try {
        const res = await fetch(`${this.apiBase}/logs/search?q=${encodeURIComponent(query)}&limit=100`);
        if (!res.ok) return;
        const logs = await res.json();
        this.renderLogs(logs);
      } catch (error) {
        console.error("Failed to search logs:", error);
      }
    }
    async showErrorOnly() {
      try {
        const res = await fetch(`${this.apiBase}/logs/errors?limit=100`);
        if (!res.ok) return;
        const logs = await res.json();
        this.renderLogs(logs);
      } catch (error) {
        console.error("Failed to load error logs:", error);
      }
    }
    renderLogs(logs) {
      const container = document.getElementById("logs-list");
      if (!container) return;
      if (!logs || logs.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">\u{1F4CB}</div>
          <div class="empty-title">\u6682\u65E0\u65E5\u5FD7</div>
          <div class="empty-description">
            \u5F53\u524D\u6CA1\u6709\u53EF\u663E\u793A\u7684\u65E5\u5FD7\u3002\u8BF7\u786E\u4FDD OpenClaw Gateway \u6B63\u5728\u8FD0\u884C\u5E76\u4EA7\u751F\u65E5\u5FD7\u3002
          </div>
        </div>
      `;
        return;
      }
      const reversedLogs = [...logs].reverse();
      container.innerHTML = reversedLogs.map((log) => `
      <div class="log-line">
        <span class="log-timestamp">[${new Date(log.timestamp).toLocaleTimeString("zh-CN")}]</span>
        <span class="log-level ${log.level}">[${log.level}]</span>
        <span class="log-message">${this.escapeHtml(log.message)}</span>
      </div>
    `).join("");
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // web/components/config.js
  var ConfigComponent = class {
    constructor(apiBase) {
      this.apiBase = apiBase;
      this.config = null;
    }
    render() {
      return `
      <div class="config-page">
        <h2>\u914D\u7F6E\u7BA1\u7406</h2>

        <form id="configForm">
          <div class="config-section">
            <h3>\u76D1\u63A7\u914D\u7F6E</h3>
            <div class="form-group">
              <label class="form-label">\u68C0\u67E5\u95F4\u9694 (\u79D2)</label>
              <input type="number" name="monitoring.interval" class="form-input" min="1" max="300" />
              <small class="form-hint">\u7CFB\u7EDF\u72B6\u6001\u68C0\u67E5\u95F4\u9694\uFF0C\u5EFA\u8BAE 5-10 \u79D2</small>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">CPU \u8B66\u544A\u9608\u503C (%)</label>
                <input type="number" name="monitoring.thresholds.cpu.warning" class="form-input" min="0" max="100" />
              </div>
              <div class="form-group">
                <label class="form-label">CPU \u4E25\u91CD\u9608\u503C (%)</label>
                <input type="number" name="monitoring.thresholds.cpu.critical" class="form-input" min="0" max="100" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">\u5185\u5B58\u8B66\u544A\u9608\u503C (MB)</label>
                <input type="number" name="monitoring.thresholds.memory.warning" class="form-input" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">\u5185\u5B58\u4E25\u91CD\u9608\u503C (MB)</label>
                <input type="number" name="monitoring.thresholds.memory.critical" class="form-input" min="0" />
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>\u544A\u8B66\u914D\u7F6E</h3>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" name="alerts.enabled" />
                \u542F\u7528\u544A\u8B66\u529F\u80FD
              </label>
              <small class="form-hint">\u542F\u7528\u540E\u5C06\u6839\u636E\u9608\u503C\u81EA\u52A8\u53D1\u9001\u544A\u8B66\u901A\u77E5</small>
            </div>

            <div class="alert-channels">
              <h4>\u544A\u8B66\u6E20\u9053</h4>

              <label class="channel-toggle">
                <input type="checkbox" name="alerts.telegram.enabled" />
                <span class="channel-name">Telegram \u673A\u5668\u4EBA</span>
                <span class="channel-status" id="telegram-status"></span>
              </label>

              <label class="channel-toggle">
                <input type="checkbox" name="alerts.feishu.enabled" />
                <span class="channel-name">\u98DE\u4E66\u673A\u5668\u4EBA</span>
                <span class="channel-status" id="feishu-status"></span>
              </label>

              <small class="form-hint">
                \u544A\u8B66\u6E20\u9053\u914D\u7F6E\u8BF7\u76F4\u63A5\u7F16\u8F91\u914D\u7F6E\u6587\u4EF6\uFF1A<br>
                <code>~/.openclaw-monitor/config.json</code>
              </small>
            </div>
          </div>

          <div class="buttons">
            <button type="submit" class="btn btn-primary">\u{1F4BE} \u4FDD\u5B58\u914D\u7F6E</button>
            <button type="button" class="btn btn-secondary" onclick="refreshConfig()">\u21BB \u91CD\u7F6E</button>
          </div>
        </form>
      </div>
    `;
    }
    async onMounted() {
      await this.loadConfig();
      this.bindForm();
      window.refreshConfig = () => this.loadConfig();
    }
    async loadConfig() {
      try {
        const res = await fetch(`${this.apiBase}/config`);
        if (!res.ok) return;
        this.config = await res.json();
        this.populateForm();
      } catch (error) {
        console.error("Failed to load config:", error);
        showToast("\u52A0\u8F7D\u914D\u7F6E\u5931\u8D25", "error");
      }
    }
    populateForm() {
      const form = document.getElementById("configForm");
      if (this.config.monitoring) {
        this.setFieldValue(form, "monitoring.interval", this.config.monitoring.interval);
        if (this.config.monitoring.thresholds) {
          this.setFieldValue(form, "monitoring.thresholds.cpu.warning", this.config.monitoring.thresholds.cpu?.warning);
          this.setFieldValue(form, "monitoring.thresholds.cpu.critical", this.config.monitoring.thresholds.cpu?.critical);
          this.setFieldValue(form, "monitoring.thresholds.memory.warning", this.config.monitoring.thresholds.memory?.warning);
          this.setFieldValue(form, "monitoring.thresholds.memory.critical", this.config.monitoring.thresholds.memory?.critical);
        }
      }
      if (this.config.alerts) {
        this.setFieldValue(form, "alerts.enabled", this.config.alerts.enabled);
        if (this.config.alerts.telegram) {
          this.setFieldValue(form, "alerts.telegram.enabled", this.config.alerts.telegram.enabled);
          this.updateChannelStatus("telegram", this.config.alerts.telegram);
        }
        if (this.config.alerts.feishu) {
          this.setFieldValue(form, "alerts.feishu.enabled", this.config.alerts.feishu.enabled);
          this.updateChannelStatus("feishu", this.config.alerts.feishu);
        }
      }
    }
    setFieldValue(form, name, value) {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      if (input.type === "checkbox") {
        input.checked = !!value;
      } else {
        input.value = value ?? "";
      }
    }
    updateChannelStatus(channel, config) {
      const statusEl = document.getElementById(`${channel}-status`);
      if (!statusEl) return;
      const isEnabled = config?.enabled;
      const hasConfig = this.isChannelConfigured(channel, config);
      if (isEnabled && hasConfig) {
        statusEl.textContent = "\u2713 \u5DF2\u542F\u7528";
        statusEl.className = "channel-status enabled";
      } else if (hasConfig) {
        statusEl.textContent = "\u25CB \u5DF2\u914D\u7F6E";
        statusEl.className = "channel-status configured";
      } else {
        statusEl.textContent = "\u2717 \u672A\u914D\u7F6E";
        statusEl.className = "channel-status not-configured";
      }
    }
    isChannelConfigured(channel, config) {
      switch (channel) {
        case "telegram":
          return !!(config?.botToken && config?.chatId);
        case "feishu":
          return !!(config?.app_id && config?.app_secret);
        default:
          return false;
      }
    }
    bindForm() {
      const form = document.getElementById("configForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.saveConfig();
      });
    }
    async saveConfig() {
      const form = document.getElementById("configForm");
      const changes = {};
      const monitoring = {};
      const interval = form.querySelector('[name="monitoring.interval"]');
      if (interval?.value) monitoring.interval = parseInt(interval.value);
      const cpuWarning = form.querySelector('[name="monitoring.thresholds.cpu.warning"]');
      const cpuCritical = form.querySelector('[name="monitoring.thresholds.cpu.critical"]');
      const memWarning = form.querySelector('[name="monitoring.thresholds.memory.warning"]');
      const memCritical = form.querySelector('[name="monitoring.thresholds.memory.critical"]');
      if (cpuWarning?.value || cpuCritical?.value) {
        monitoring.thresholds = {
          cpu: {
            warning: cpuWarning?.value ? parseInt(cpuWarning.value) : void 0,
            critical: cpuCritical?.value ? parseInt(cpuCritical.value) : void 0
          },
          memory: {
            warning: memWarning?.value ? parseInt(memWarning.value) : void 0,
            critical: memCritical?.value ? parseInt(memCritical.value) : void 0
          }
        };
      }
      if (Object.keys(monitoring).length > 0) {
        changes.monitoring = monitoring;
      }
      const alertsEnabled = form.querySelector('[name="alerts.enabled"]');
      const tgEnabled = form.querySelector('[name="alerts.telegram.enabled"]');
      const fsEnabled = form.querySelector('[name="alerts.feishu.enabled"]');
      const alerts = { enabled: alertsEnabled?.checked ?? false };
      if (tgEnabled) {
        alerts.telegram = { enabled: tgEnabled.checked };
      }
      if (fsEnabled) {
        alerts.feishu = { enabled: fsEnabled.checked };
      }
      changes.alerts = alerts;
      try {
        const res = await fetch(`${this.apiBase}/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes)
        });
        if (!res.ok) {
          throw new Error("Failed to save config");
        }
        showToast("\u914D\u7F6E\u5DF2\u4FDD\u5B58", "success");
        await this.loadConfig();
      } catch (error) {
        console.error("Failed to save config:", error);
        showToast("\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25", "error");
      }
    }
  };

  // web/components/alerts.js
  var AlertsComponent = class {
    constructor(apiBase) {
      this.apiBase = apiBase;
      this.alerts = [];
      this.filter = "ALL";
    }
    render() {
      return `
      <div class="alerts-page">
        <h2>\u544A\u8B66\u5386\u53F2</h2>

        <div class="filter-bar">
          <select id="alertFilter" class="form-select">
            <option value="ALL">\u5168\u90E8</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <button class="btn btn-primary" onclick="refreshAlerts()">\u5237\u65B0</button>
        </div>

        <div class="test-section">
          <h3>\u6D4B\u8BD5\u544A\u8B66</h3>
          <p class="test-hint">\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u53D1\u9001\u6D4B\u8BD5\u544A\u8B66\u5230\u5DF2\u914D\u7F6E\u7684\u6E20\u9053\uFF08\u98DE\u4E66/Telegram\uFF09</p>
          <div class="test-buttons">
            <button class="btn btn-info" onclick="testAlert('info')">\u2139\uFE0F \u4FE1\u606F\u6D4B\u8BD5</button>
            <button class="btn btn-warning" onclick="testAlert('warning')">\u26A0\uFE0F \u8B66\u544A\u6D4B\u8BD5</button>
            <button class="btn btn-danger" onclick="testAlert('critical')">\u{1F6A8} \u4E25\u91CD\u6D4B\u8BD5</button>
            <button class="btn btn-primary" onclick="testAlert('test')">\u{1F4CB} \u901A\u7528\u6D4B\u8BD5</button>
          </div>
        </div>

        <div id="alerts-list" class="alerts-list"></div>
      </div>
    `;
    }
    async onMounted() {
      await this.loadAlerts();
      this.bindFilter();
      window.refreshAlerts = () => this.loadAlerts();
      window.testAlert = (type) => this.testAlert(type);
    }
    bindFilter() {
      const filter = document.getElementById("alertFilter");
      filter.addEventListener("change", () => {
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
        console.error("Failed to load alerts:", error);
      }
    }
    async testAlert(type) {
      const buttonText = {
        "info": "\u2139\uFE0F \u4FE1\u606F\u6D4B\u8BD5",
        "warning": "\u26A0\uFE0F \u8B66\u544A\u6D4B\u8BD5",
        "critical": "\u{1F6A8} \u4E25\u91CD\u6D4B\u8BD5",
        "test": "\u{1F4CB} \u901A\u7528\u6D4B\u8BD5"
      }[type] || "\u6D4B\u8BD5\u544A\u8B66";
      try {
        showToast(`\u6B63\u5728\u53D1\u9001${buttonText}...`, "info");
        const res = await fetch(`${this.apiBase}/alerts/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type })
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const result = await res.json();
        showToast(`${buttonText}\u5DF2\u53D1\u9001\uFF01\u8BF7\u68C0\u67E5\u98DE\u4E66/Telegram`, "success");
        setTimeout(() => this.loadAlerts(), 1e3);
      } catch (error) {
        console.error("Failed to send test alert:", error);
        showToast(`\u53D1\u9001\u5931\u8D25: ${error.message}`, "error");
      }
    }
    renderAlerts() {
      const container = document.getElementById("alerts-list");
      let filtered = this.alerts;
      if (this.filter !== "ALL") {
        filtered = this.alerts.filter((a) => a.alert.level === this.filter);
      }
      if (!filtered || filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">\u6682\u65E0\u544A\u8B66\u8BB0\u5F55</div>';
        return;
      }
      container.innerHTML = filtered.map((record) => `
      <div class="alert-item ${record.alert.level}">
        <div class="alert-header">
          <span class="alert-level">[${record.alert.level}]</span>
          <span class="alert-title">${this.escapeHtml(record.alert.title)}</span>
          <span class="alert-time">${new Date(record.sentAt).toLocaleString("zh-CN")}</span>
        </div>
        <div class="alert-message">${this.escapeHtml(record.alert.message)}</div>
        <div class="alert-meta">
          <span class="alert-channel">\u6E20\u9053: ${record.channel}</span>
          <span class="alert-status ${record.success ? "success" : "failed"}">
            ${record.success ? "\u2713 \u53D1\u9001\u6210\u529F" : "\u2717 \u53D1\u9001\u5931\u8D25"}
          </span>
          ${record.error ? `<span class="alert-error">\u9519\u8BEF: ${this.escapeHtml(record.error)}</span>` : ""}
        </div>
      </div>
    `).join("");
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // web/app.js
  var API_BASE = "/api";
  var App = class {
    constructor() {
      this.currentPage = "status";
      this.components = {
        status: new StatusComponent(API_BASE),
        logs: new LogsComponent(API_BASE),
        config: new ConfigComponent(API_BASE),
        alerts: new AlertsComponent(API_BASE)
      };
    }
    async init() {
      this.bindNavigation();
      await this.navigate("status");
      this.startPeriodicRefresh();
    }
    bindNavigation() {
      const navButtons = document.querySelectorAll(".nav-items button");
      navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const page = btn.dataset.page;
          if (page) {
            this.navigate(page);
          }
        });
      });
    }
    async navigate(page) {
      this.currentPage = page;
      const navButtons = document.querySelectorAll(".nav-items button");
      navButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.page === page);
      });
      const content = document.getElementById("page-content");
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
      }, 3e4);
    }
    showToast(message, type = "info") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3e3);
    }
  };
  window.App = App;
  window.showToast = (message, type) => {
    if (window.appInstance) {
      window.appInstance.showToast(message, type);
    }
  };
})();
