"use strict";(()=>{var l=class{constructor(t){this.apiBase=t,this.chart=null,this.chartData={labels:[],cpu:[],memory:[]},this.maxDataPoints=60,this.currentStatus=null}render(){return`
      <div class="status-page">
        <!-- \u9876\u90E8\u72B6\u6001\u6A2A\u5E45 -->
        <div class="status-banner" id="statusBanner">
          <div class="status-banner-icon" id="statusIcon">\u23F3</div>
          <div class="status-banner-content">
            <div class="status-banner-title" id="statusTitle">\u52A0\u8F7D\u4E2D...</div>
            <div class="status-banner-subtitle" id="statusSubtitle">\u6B63\u5728\u83B7\u53D6 OpenClaw Gateway \u72B6\u6001</div>
          </div>
          <div class="status-banner-actions">
            <button class="icon-btn" id="btnQuickRefresh" title="\u5237\u65B0\u72B6\u6001">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
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
            <div class="metric-icon">\u{1F522}</div>
            <div class="metric-content">
              <div class="metric-label">\u8FDB\u7A0B ID</div>
              <div class="metric-value large" id="metricPid">--</div>
            </div>
          </div>

          <div class="metric-card metric-warning">
            <div class="metric-icon">\u{1F310}</div>
            <div class="metric-content">
              <div class="metric-label">\u670D\u52A1\u7AEF\u53E3</div>
              <div class="metric-value large" id="metricPort">--</div>
              <div class="metric-status" id="metricPortStatus">--</div>
            </div>
          </div>
        </div>

        <!-- \u8BE6\u7EC6\u4FE1\u606F\u884C -->
        <div class="info-row">
          <div class="info-card">
            <div class="info-label">\u8FD0\u884C\u65F6\u957F</div>
            <div class="info-value" id="infoUptime">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">\u6700\u540E\u68C0\u67E5</div>
            <div class="info-value" id="infoLastCheck">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">\u91CD\u542F\u6B21\u6570</div>
            <div class="info-value" id="infoRestarts">--</div>
          </div>
          <div class="info-card">
            <div class="info-label">\u68C0\u67E5\u95F4\u9694</div>
            <div class="info-value">5 \u79D2</div>
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

        <!-- \u63A7\u5236\u9762\u677F -->
        <div class="control-panel">
          <div class="control-panel-header">
            <h3>Gateway \u63A7\u5236</h3>
            <span class="control-hint">\u64CD\u4F5C\u4EC5\u5728\u975E\u5F00\u53D1\u6A21\u5F0F\u4E0B\u53EF\u7528</span>
          </div>
          <div class="control-buttons">
            <button class="control-btn control-btn-primary" id="btnRestart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              \u91CD\u542F Gateway
            </button>
            <button class="control-btn control-btn-danger" id="btnStop">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              \u505C\u6B62 Gateway
            </button>
            <button class="control-btn control-btn-success" id="btnStart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              \u542F\u52A8 Gateway
            </button>
            <button class="control-btn control-btn-info" id="btnDiagnose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              \u8FD0\u884C\u8BCA\u65AD
            </button>
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

          /* \u4FE1\u606F\u884C */
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

          /* \u63A7\u5236\u9762\u677F */
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

          /* \u54CD\u5E94\u5F0F */
          @media (max-width: 768px) {
            .metrics-grid,
            .info-row {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>
      </div>
    `}async onMounted(){await this.refresh(),this.initChart(),this.bindEvents(),this.refreshInterval=setInterval(()=>this.refresh(),5e3)}bindEvents(){document.getElementById("btnQuickRefresh")?.addEventListener("click",()=>this.refresh()),document.getElementById("btnRestart")?.addEventListener("click",()=>this.handleRestart()),document.getElementById("btnStop")?.addEventListener("click",()=>this.handleStop()),document.getElementById("btnStart")?.addEventListener("click",()=>this.handleStart()),document.getElementById("btnDiagnose")?.addEventListener("click",()=>this.handleDiagnose())}async refresh(){try{let t=await fetch(`${this.apiBase}/status`);if(!t.ok)throw new Error("Failed to fetch status");let e=await t.json();this.currentStatus=e,this.updateUI(e),this.updateChart(e)}catch(t){console.error("Failed to refresh status:",t),this.showError()}}updateUI(t){let e=document.getElementById("statusBanner"),s=document.getElementById("statusIcon"),n=document.getElementById("statusTitle"),i=document.getElementById("statusSubtitle");t.running?(e.className="status-banner running",s.textContent="\u2705",n.textContent="OpenClaw Gateway \u8FD0\u884C\u4E2D",i.textContent=`PID: ${t.pid||"N/A"} | \u7AEF\u53E3: ${t.port||"N/A"}`):(e.className="status-banner stopped",s.textContent="\u274C",n.textContent="OpenClaw Gateway \u5DF2\u505C\u6B62",i.textContent="\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u542F\u52A8\u670D\u52A1"),document.getElementById("metricCpu").textContent=(t.cpuPercent?.toFixed(1)||"0")+"%",document.getElementById("metricCpuBar").style.width=Math.min(t.cpuPercent||0,100)+"%",document.getElementById("metricMemory").textContent=(t.memoryMB?.toFixed(0)||"0")+" MB",document.getElementById("metricMemoryBar").style.width=Math.min((t.memoryMB||0)/20,100)+"%",document.getElementById("metricPid").textContent=t.pid||"--",document.getElementById("metricPort").textContent=t.port||"--",document.getElementById("metricPortStatus").textContent=t.portOpen?"\u2713 \u76D1\u542C\u4E2D":"\u2717 \u672A\u76D1\u542C",document.getElementById("infoUptime").textContent=this.formatUptime(t.uptime),document.getElementById("infoLastCheck").textContent=new Date(t.lastCheck).toLocaleTimeString("zh-CN"),document.getElementById("infoRestarts").textContent=t.restartCount||0}showError(){let t=document.getElementById("statusBanner");t&&(t.className="status-banner stopped",document.getElementById("statusIcon").textContent="\u26A0\uFE0F",document.getElementById("statusTitle").textContent="\u65E0\u6CD5\u83B7\u53D6\u72B6\u6001",document.getElementById("statusSubtitle").textContent="\u8BF7\u68C0\u67E5\u670D\u52A1\u662F\u5426\u6B63\u5E38\u8FD0\u884C")}initChart(){let t=document.getElementById("trendChart");if(t){if(typeof Chart>"u"){setTimeout(()=>this.initChart(),100);return}this.chart=new Chart(t,{type:"line",data:{labels:this.chartData.labels,datasets:[{label:"CPU (%)",data:this.chartData.cpu,borderColor:"#3b82f6",backgroundColor:"rgba(59, 130, 246, 0.1)",tension:.4,fill:!0,pointRadius:0},{label:"\u5185\u5B58 (MB)",data:this.chartData.memory,borderColor:"#10b981",backgroundColor:"rgba(16, 185, 129, 0.1)",tension:.4,fill:!0,pointRadius:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{x:{display:!1},y:{ticks:{color:"#64748b",font:{size:10}},grid:{color:"#334155"}}},interaction:{intersect:!1,mode:"index"}}})}}updateChart(t){if(!t.running||!this.chart)return;let e=new Date().toLocaleTimeString();this.chartData.labels.push(e),this.chartData.cpu.push(t.cpuPercent||0),this.chartData.memory.push(t.memoryMB||0),this.chartData.labels.length>this.maxDataPoints&&(this.chartData.labels.shift(),this.chartData.cpu.shift(),this.chartData.memory.shift()),this.chart.data.labels=this.chartData.labels,this.chart.data.datasets[0].data=this.chartData.cpu,this.chart.data.datasets[1].data=this.chartData.memory,this.chart.update("none")}async handleRestart(){confirm("\u786E\u8BA4\u8981\u91CD\u542F OpenClaw Gateway \u5417\uFF1F")&&await this.doAction("/api/gateway/restart","\u91CD\u542F")}async handleStop(){confirm("\u786E\u8BA4\u8981\u505C\u6B62 OpenClaw Gateway \u5417\uFF1F")&&await this.doAction("/api/gateway/stop","\u505C\u6B62")}async handleStart(){await this.doAction("/api/gateway/start","\u542F\u52A8")}async handleDiagnose(){try{let e=await(await fetch(`${this.apiBase}/logs/errors?limit=10`)).json();e.length===0?alert("\u2705 \u672A\u53D1\u73B0\u9519\u8BEF"):alert(`\u53D1\u73B0 ${e.length} \u6761\u9519\u8BEF\uFF0C\u8BF7\u67E5\u770B\u65E5\u5FD7\u9875\u9762`)}catch(t){alert("\u8BCA\u65AD\u5931\u8D25: "+t.message)}}async doAction(t,e){showToast(`\u6B63\u5728${e} Gateway...`,"info");try{let s=await fetch(t,{method:"POST"});if(!s.ok)throw new Error(`HTTP ${s.status}`);let n=await s.json();showToast(n.message||`${e}\u547D\u4EE4\u5DF2\u53D1\u9001`,"success"),await this.refresh()}catch(s){showToast(`${e}\u5931\u8D25: `+s.message,"error")}}formatUptime(t){if(!t)return"--";let e=Math.floor(t/86400),s=Math.floor(t%86400/3600),n=Math.floor(t%3600/60);return e>0?`${e}\u5929 ${s}\u5C0F\u65F6`:s>0?`${s}\u5C0F\u65F6 ${n}\u5206\u949F`:`${n}\u5206\u949F`}async refreshPage(){this.refreshInterval&&clearInterval(this.refreshInterval),await this.onMounted()}};var c=class{constructor(t){this.apiBase=t}render(){return`
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
    `}async onMounted(){await this.loadLogs(),window.refreshLogs=()=>this.loadLogs(),window.searchLogs=()=>this.search(),window.showErrorLogs=()=>this.showErrorOnly(),document.getElementById("logSearch").addEventListener("keypress",t=>{t.key==="Enter"&&this.search()})}async loadLogs(){try{let t=await fetch(`${this.apiBase}/logs?n=100`);if(!t.ok)return;let e=await t.json();this.renderLogs(e)}catch(t){console.error("Failed to load logs:",t)}}async search(){let t=document.getElementById("logSearch").value.trim();if(!t)return this.loadLogs();try{let e=await fetch(`${this.apiBase}/logs/search?q=${encodeURIComponent(t)}&limit=100`);if(!e.ok)return;let s=await e.json();this.renderLogs(s)}catch(e){console.error("Failed to search logs:",e)}}async showErrorOnly(){try{let t=await fetch(`${this.apiBase}/logs/errors?limit=100`);if(!t.ok)return;let e=await t.json();this.renderLogs(e)}catch(t){console.error("Failed to load error logs:",t)}}renderLogs(t){let e=document.getElementById("logs-list");if(!t||t.length===0){e.innerHTML='<div class="empty-state">\u6682\u65E0\u65E5\u5FD7</div>';return}e.innerHTML=t.map(s=>`
      <div class="log-line">
        <span class="log-timestamp">[${new Date(s.timestamp).toLocaleTimeString("zh-CN")}]</span>
        <span class="log-level ${s.level}">[${s.level}]</span>
        <span class="log-message">${this.escapeHtml(s.message)}</span>
      </div>
    `).join("")}escapeHtml(t){let e=document.createElement("div");return e.textContent=t,e.innerHTML}};var d=class{constructor(t){this.apiBase=t,this.config=null}render(){return`
      <div class="config-page">
        <h2>\u914D\u7F6E\u7BA1\u7406</h2>

        <form id="configForm">
          <div class="config-section">
            <h3>\u76D1\u63A7\u914D\u7F6E</h3>
            <div class="form-group">
              <label class="form-label">\u68C0\u67E5\u95F4\u9694 (\u79D2)</label>
              <input type="number" name="monitoring.interval" class="form-input" min="1" max="300" />
            </div>
            <div class="form-group">
              <label class="form-label">CPU \u9608\u503C (%)</label>
              <input type="number" name="monitoring.cpuThreshold" class="form-input" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">\u5185\u5B58\u9608\u503C (MB)</label>
              <input type="number" name="monitoring.memoryThreshold" class="form-input" min="0" />
            </div>
          </div>

          <div class="config-section">
            <h3>\u544A\u8B66\u914D\u7F6E</h3>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" name="alerts.enabled" />
                \u542F\u7528\u544A\u8B66
              </label>
            </div>
          </div>

          <div class="buttons">
            <button type="submit" class="btn btn-primary">\u4FDD\u5B58\u914D\u7F6E</button>
            <button type="button" class="btn btn-secondary" onclick="refreshConfig()">\u91CD\u7F6E</button>
          </div>
        </form>
      </div>
    `}async onMounted(){await this.loadConfig(),this.bindForm(),window.refreshConfig=()=>this.loadConfig()}async loadConfig(){try{let t=await fetch(`${this.apiBase}/config`);if(!t.ok)return;this.config=await t.json(),this.populateForm()}catch(t){console.error("Failed to load config:",t),showToast("\u52A0\u8F7D\u914D\u7F6E\u5931\u8D25","error")}}populateForm(){let t=document.getElementById("configForm");this.config.monitoring&&(this.setFieldValue(t,"monitoring.interval",this.config.monitoring.interval),this.setFieldValue(t,"monitoring.cpuThreshold",this.config.monitoring.cpuThreshold),this.setFieldValue(t,"monitoring.memoryThreshold",this.config.monitoring.memoryThreshold)),this.config.alerts&&this.setFieldValue(t,"alerts.enabled",this.config.alerts.enabled)}setFieldValue(t,e,s){let n=t.querySelector(`[name="${e}"]`);n&&(n.type==="checkbox"?n.checked=!!s:n.value=s??"")}bindForm(){document.getElementById("configForm").addEventListener("submit",async e=>{e.preventDefault(),await this.saveConfig()})}async saveConfig(){let t=document.getElementById("configForm"),e=new FormData(t),s={},n={};t.querySelectorAll('[name^="monitoring."]').forEach(a=>{let o=a.name.replace("monitoring.","");a.type==="checkbox"?n[o]=a.checked:a.value&&(n[o]=parseInt(a.value)||a.value)}),Object.keys(n).length>0&&(s.monitoring=n);let i={};t.querySelectorAll('[name^="alerts."]').forEach(a=>{let o=a.name.replace("alerts.","");a.type==="checkbox"?i[o]=a.checked:a.value&&(i[o]=a.value)}),Object.keys(i).length>0&&(s.alerts=i);try{if(!(await fetch(`${this.apiBase}/config`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)})).ok)throw new Error("Failed to save config");showToast("\u914D\u7F6E\u5DF2\u4FDD\u5B58","success"),await this.loadConfig()}catch(a){console.error("Failed to save config:",a),showToast("\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25","error")}}};var h=class{constructor(t){this.apiBase=t,this.alerts=[],this.filter="ALL"}render(){return`
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
    `}async onMounted(){await this.loadAlerts(),this.bindFilter(),window.refreshAlerts=()=>this.loadAlerts(),window.testAlert=t=>this.testAlert(t)}bindFilter(){let t=document.getElementById("alertFilter");t.addEventListener("change",()=>{this.filter=t.value,this.renderAlerts()})}async loadAlerts(){try{let t=await fetch(`${this.apiBase}/alerts?limit=100`);if(!t.ok)return;this.alerts=await t.json(),this.renderAlerts()}catch(t){console.error("Failed to load alerts:",t)}}async testAlert(t){let e={info:"\u2139\uFE0F \u4FE1\u606F\u6D4B\u8BD5",warning:"\u26A0\uFE0F \u8B66\u544A\u6D4B\u8BD5",critical:"\u{1F6A8} \u4E25\u91CD\u6D4B\u8BD5",test:"\u{1F4CB} \u901A\u7528\u6D4B\u8BD5"}[t]||"\u6D4B\u8BD5\u544A\u8B66";try{showToast(`\u6B63\u5728\u53D1\u9001${e}...`,"info");let s=await fetch(`${this.apiBase}/alerts/test`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:t})});if(!s.ok)throw new Error(`HTTP ${s.status}`);let n=await s.json();showToast(`${e}\u5DF2\u53D1\u9001\uFF01\u8BF7\u68C0\u67E5\u98DE\u4E66/Telegram`,"success"),setTimeout(()=>this.loadAlerts(),1e3)}catch(s){console.error("Failed to send test alert:",s),showToast(`\u53D1\u9001\u5931\u8D25: ${s.message}`,"error")}}renderAlerts(){let t=document.getElementById("alerts-list"),e=this.alerts;if(this.filter!=="ALL"&&(e=this.alerts.filter(s=>s.alert.level===this.filter)),!e||e.length===0){t.innerHTML='<div class="empty-state">\u6682\u65E0\u544A\u8B66\u8BB0\u5F55</div>';return}t.innerHTML=e.map(s=>`
      <div class="alert-item ${s.alert.level}">
        <div class="alert-header">
          <span class="alert-level">[${s.alert.level}]</span>
          <span class="alert-title">${this.escapeHtml(s.alert.title)}</span>
          <span class="alert-time">${new Date(s.sentAt).toLocaleString("zh-CN")}</span>
        </div>
        <div class="alert-message">${this.escapeHtml(s.alert.message)}</div>
        <div class="alert-meta">
          <span class="alert-channel">\u6E20\u9053: ${s.channel}</span>
          <span class="alert-status ${s.success?"success":"failed"}">
            ${s.success?"\u2713 \u53D1\u9001\u6210\u529F":"\u2717 \u53D1\u9001\u5931\u8D25"}
          </span>
          ${s.error?`<span class="alert-error">\u9519\u8BEF: ${this.escapeHtml(s.error)}</span>`:""}
        </div>
      </div>
    `).join("")}escapeHtml(t){let e=document.createElement("div");return e.textContent=t,e.innerHTML}};var m="/api",u=class{constructor(){this.currentPage="status",this.components={status:new l(m),logs:new c(m),config:new d(m),alerts:new h(m)}}async init(){this.bindNavigation(),await this.navigate("status"),this.startPeriodicRefresh()}bindNavigation(){document.querySelectorAll(".nav-items button").forEach(e=>{e.addEventListener("click",()=>{let s=e.dataset.page;s&&this.navigate(s)})})}async navigate(t){this.currentPage=t,document.querySelectorAll(".nav-items button").forEach(i=>{i.classList.toggle("active",i.dataset.page===t)});let s=document.getElementById("page-content"),n=this.components[t];n&&(s.innerHTML=n.render(),await n.onMounted())}startPeriodicRefresh(){setInterval(async()=>{let t=this.components[this.currentPage];t&&t.refresh&&await t.refresh()},3e4)}showToast(t,e="info"){let s=document.getElementById("toast-container"),n=document.createElement("div");n.className=`toast toast-${e}`,n.textContent=t,s.appendChild(n),setTimeout(()=>{n.remove()},3e3)}};window.App=u;window.showToast=(r,t)=>{window.appInstance&&window.appInstance.showToast(r,t)};})();
