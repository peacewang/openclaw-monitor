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
            </div>
            <div class="form-group">
              <label class="form-label">CPU 阈值 (%)</label>
              <input type="number" name="monitoring.cpuThreshold" class="form-input" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">内存阈值 (MB)</label>
              <input type="number" name="monitoring.memoryThreshold" class="form-input" min="0" />
            </div>
          </div>

          <div class="config-section">
            <h3>告警配置</h3>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" name="alerts.enabled" />
                启用告警
              </label>
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
      this.setFieldValue(form, 'monitoring.cpuThreshold', this.config.monitoring.cpuThreshold);
      this.setFieldValue(form, 'monitoring.memoryThreshold', this.config.monitoring.memoryThreshold);
    }

    // 告警配置
    if (this.config.alerts) {
      this.setFieldValue(form, 'alerts.enabled', this.config.alerts.enabled);
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

  bindForm() {
    const form = document.getElementById('configForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveConfig();
    });
  }

  async saveConfig() {
    const form = document.getElementById('configForm');
    const formData = new FormData(form);
    const changes = {};

    // 收集监控配置
    const monitoring = {};
    form.querySelectorAll('[name^="monitoring."]').forEach(input => {
      const field = input.name.replace('monitoring.', '');
      if (input.type === 'checkbox') {
        monitoring[field] = input.checked;
      } else if (input.value) {
        monitoring[field] = parseInt(input.value) || input.value;
      }
    });
    if (Object.keys(monitoring).length > 0) {
      changes.monitoring = monitoring;
    }

    // 收集告警配置
    const alerts = {};
    form.querySelectorAll('[name^="alerts."]').forEach(input => {
      const field = input.name.replace('alerts.', '');
      if (input.type === 'checkbox') {
        alerts[field] = input.checked;
      } else if (input.value) {
        alerts[field] = input.value;
      }
    });
    if (Object.keys(alerts).length > 0) {
      changes.alerts = alerts;
    }

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
