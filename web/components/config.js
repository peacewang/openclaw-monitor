// web/components/config.js

export class ConfigComponent {
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
              <input type="number" name="monitoring.interval" class="form-input" min="1" max="300" />
              <small class="form-hint">系统状态检查间隔，建议 5-10 秒</small>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">CPU 警告阈值 (%)</label>
                <input type="number" name="monitoring.thresholds.cpu.warning" class="form-input" min="0" max="100" />
              </div>
              <div class="form-group">
                <label class="form-label">CPU 严重阈值 (%)</label>
                <input type="number" name="monitoring.thresholds.cpu.critical" class="form-input" min="0" max="100" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">内存警告阈值 (MB)</label>
                <input type="number" name="monitoring.thresholds.memory.warning" class="form-input" min="0" />
              </div>
              <div class="form-group">
                <label class="form-label">内存严重阈值 (MB)</label>
                <input type="number" name="monitoring.thresholds.memory.critical" class="form-input" min="0" />
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>告警配置</h3>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" name="alerts.enabled" />
                启用告警功能
              </label>
              <small class="form-hint">启用后将根据阈值自动发送告警通知</small>
            </div>

            <div class="alert-channels">
              <h4>告警渠道</h4>

              <label class="channel-toggle">
                <input type="checkbox" name="alerts.telegram.enabled" />
                <span class="channel-name">Telegram 机器人</span>
                <span class="channel-status" id="telegram-status"></span>
              </label>

              <label class="channel-toggle">
                <input type="checkbox" name="alerts.feishu.enabled" />
                <span class="channel-name">飞书机器人</span>
                <span class="channel-status" id="feishu-status"></span>
              </label>

              <small class="form-hint">
                告警渠道配置请直接编辑配置文件：<br>
                <code>~/.openclaw-monitor/config.json</code>
              </small>
            </div>
          </div>

          <div class="buttons">
            <button type="submit" class="btn btn-primary">💾 保存配置</button>
            <button type="button" class="btn btn-secondary" onclick="refreshConfig()">↻ 重置</button>
          </div>
        </form>
      </div>
    `;
  }

  async onMounted() {
    await this.loadConfig();
    this.bindForm();

    // 设置全局函数
    window.refreshConfig = () => this.loadConfig();
  }

  async loadConfig() {
    try {
      const res = await fetch(`${this.apiBase}/config`);
      if (!res.ok) return;
      this.config = await res.json();
      this.populateForm();
    } catch (error) {
      console.error('Failed to load config:', error);
      showToast('加载配置失败', 'error');
    }
  }

  populateForm() {
    const form = document.getElementById('configForm');

    // 监控配置
    if (this.config.monitoring) {
      this.setFieldValue(form, 'monitoring.interval', this.config.monitoring.interval);
      if (this.config.monitoring.thresholds) {
        this.setFieldValue(form, 'monitoring.thresholds.cpu.warning', this.config.monitoring.thresholds.cpu?.warning);
        this.setFieldValue(form, 'monitoring.thresholds.cpu.critical', this.config.monitoring.thresholds.cpu?.critical);
        this.setFieldValue(form, 'monitoring.thresholds.memory.warning', this.config.monitoring.thresholds.memory?.warning);
        this.setFieldValue(form, 'monitoring.thresholds.memory.critical', this.config.monitoring.thresholds.memory?.critical);
      }
    }

    // 告警配置
    if (this.config.alerts) {
      this.setFieldValue(form, 'alerts.enabled', this.config.alerts.enabled);

      // Telegram
      if (this.config.alerts.telegram) {
        this.setFieldValue(form, 'alerts.telegram.enabled', this.config.alerts.telegram.enabled);
        this.updateChannelStatus('telegram', this.config.alerts.telegram);
      }

      // Feishu
      if (this.config.alerts.feishu) {
        this.setFieldValue(form, 'alerts.feishu.enabled', this.config.alerts.feishu.enabled);
        this.updateChannelStatus('feishu', this.config.alerts.feishu);
      }
    }
  }

  setFieldValue(form, name, value) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;

    if (input.type === 'checkbox') {
      input.checked = !!value;
    } else {
      input.value = value ?? '';
    }
  }

  updateChannelStatus(channel, config) {
    const statusEl = document.getElementById(`${channel}-status`);
    if (!statusEl) return;

    const isEnabled = config?.enabled;
    const hasConfig = this.isChannelConfigured(channel, config);

    if (isEnabled && hasConfig) {
      statusEl.textContent = '✓ 已启用';
      statusEl.className = 'channel-status enabled';
    } else if (hasConfig) {
      statusEl.textContent = '○ 已配置';
      statusEl.className = 'channel-status configured';
    } else {
      statusEl.textContent = '✗ 未配置';
      statusEl.className = 'channel-status not-configured';
    }
  }

  isChannelConfigured(channel, config) {
    switch (channel) {
      case 'telegram':
        return !!(config?.botToken && config?.chatId);
      case 'feishu':
        return !!(config?.app_id && config?.app_secret);
      default:
        return false;
    }
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
    const changes = {};

    // 收集监控配置
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
          warning: cpuWarning?.value ? parseInt(cpuWarning.value) : undefined,
          critical: cpuCritical?.value ? parseInt(cpuCritical.value) : undefined,
        },
        memory: {
          warning: memWarning?.value ? parseInt(memWarning.value) : undefined,
          critical: memCritical?.value ? parseInt(memCritical.value) : undefined,
        },
      };
    }

    if (Object.keys(monitoring).length > 0) {
      changes.monitoring = monitoring;
    }

    // 收集告警配置（只保存开关状态）
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        throw new Error('Failed to save config');
      }

      showToast('配置已保存', 'success');
      await this.loadConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('保存配置失败', 'error');
    }
  }
}
