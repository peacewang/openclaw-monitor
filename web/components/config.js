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

              <div class="channel-config">
                <div class="channel-header">
                  <label class="form-label">
                    <input type="checkbox" name="alerts.telegram.enabled" />
                    Telegram 机器人
                  </label>
                  <span class="channel-status" id="telegram-status">未配置</span>
                </div>
                <div class="channel-fields" id="telegram-fields">
                  <div class="form-group">
                    <label class="form-label">Bot Token</label>
                    <input type="text" name="alerts.telegram.botToken" class="form-input" placeholder="请输入 Telegram Bot Token" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Chat ID</label>
                    <input type="text" name="alerts.telegram.chatId" class="form-input" placeholder="请输入 Telegram Chat ID" />
                  </div>
                </div>
              </div>

              <div class="channel-config">
                <div class="channel-header">
                  <label class="form-label">
                    <input type="checkbox" name="alerts.feishu.enabled" />
                    飞书机器人
                  </label>
                  <span class="channel-status" id="feishu-status">未配置</span>
                </div>
                <div class="channel-fields" id="feishu-fields">
                  <div class="form-group">
                    <label class="form-label">Webhook URL</label>
                    <input type="text" name="alerts.feishu.webhookUrl" class="form-input" placeholder="请输入飞书机器人 Webhook URL" />
                  </div>
                </div>
              </div>

              <div class="channel-config">
                <div class="channel-header">
                  <label class="form-label">
                    <input type="checkbox" name="alerts.lark.enabled" />
                    Lark 机器人
                  </label>
                  <span class="channel-status" id="lark-status">未配置</span>
                </div>
                <div class="channel-fields" id="lark-fields">
                  <div class="form-group">
                    <label class="form-label">App ID</label>
                    <input type="text" name="alerts.lark.appId" class="form-input" placeholder="请输入 Lark App ID" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">App Secret</label>
                    <input type="text" name="alerts.lark.appSecret" class="form-input" placeholder="请输入 Lark App Secret" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>Web 配置</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">监听地址</label>
                <input type="text" name="web.host" class="form-input" placeholder="0.0.0.0" />
              </div>
              <div class="form-group">
                <label class="form-label">监听端口</label>
                <input type="number" name="web.port" class="form-input" min="1" max="65535" />
              </div>
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
        this.setFieldValue(form, 'alerts.telegram.botToken', this.config.alerts.telegram.botToken);
        this.setFieldValue(form, 'alerts.telegram.chatId', this.config.alerts.telegram.chatId);
        this.updateChannelStatus('telegram', this.config.alerts.telegram);
      }

      // Feishu
      if (this.config.alerts.feishu) {
        this.setFieldValue(form, 'alerts.feishu.enabled', this.config.alerts.feishu.enabled);
        this.setFieldValue(form, 'alerts.feishu.webhookUrl', this.config.alerts.feishu.webhookUrl);
        this.updateChannelStatus('feishu', this.config.alerts.feishu);
      }

      // Lark
      if (this.config.alerts.lark) {
        this.setFieldValue(form, 'alerts.lark.enabled', this.config.alerts.lark.enabled);
        this.setFieldValue(form, 'alerts.lark.appId', this.config.alerts.lark.appId);
        this.setFieldValue(form, 'alerts.lark.appSecret', this.config.alerts.lark.appSecret);
        this.updateChannelStatus('lark', this.config.alerts.lark);
      }
    }

    // Web 配置
    if (this.config.web) {
      this.setFieldValue(form, 'web.host', this.config.web.host);
      this.setFieldValue(form, 'web.port', this.config.web.port);
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
      statusEl.textContent = '○ 已配置，未启用';
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
        return !!config?.webhookUrl;
      case 'lark':
        return !!(config?.appId && config?.appSecret);
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
    const monitoring: any = {};
    const interval = form.querySelector('[name="monitoring.interval"]') as HTMLInputElement;
    if (interval?.value) monitoring.interval = parseInt(interval.value);

    const cpuWarning = form.querySelector('[name="monitoring.thresholds.cpu.warning"]') as HTMLInputElement;
    const cpuCritical = form.querySelector('[name="monitoring.thresholds.cpu.critical"]') as HTMLInputElement;
    const memWarning = form.querySelector('[name="monitoring.thresholds.memory.warning"]') as HTMLInputElement;
    const memCritical = form.querySelector('[name="monitoring.thresholds.memory.critical"]') as HTMLInputElement;

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

    // 收集告警配置
    const alertsEnabled = form.querySelector('[name="alerts.enabled"]') as HTMLInputElement;
    const alerts: any = { enabled: alertsEnabled?.checked ?? false };

    // Telegram
    const tgEnabled = form.querySelector('[name="alerts.telegram.enabled"]') as HTMLInputElement;
    const tgToken = form.querySelector('[name="alerts.telegram.botToken"]') as HTMLInputElement;
    const tgChatId = form.querySelector('[name="alerts.telegram.chatId"]') as HTMLInputElement;

    if (tgEnabled?.checked || tgToken?.value || tgChatId?.value) {
      alerts.telegram = {
        enabled: tgEnabled?.checked ?? false,
        botToken: tgToken?.value || undefined,
        chatId: tgChatId?.value || undefined,
      };
    }

    // Feishu
    const fsEnabled = form.querySelector('[name="alerts.feishu.enabled"]') as HTMLInputElement;
    const fsWebhook = form.querySelector('[name="alerts.feishu.webhookUrl"]') as HTMLInputElement;

    if (fsEnabled?.checked || fsWebhook?.value) {
      alerts.feishu = {
        enabled: fsEnabled?.checked ?? false,
        webhookUrl: fsWebhook?.value || undefined,
      };
    }

    // Lark
    const lkEnabled = form.querySelector('[name="alerts.lark.enabled"]') as HTMLInputElement;
    const lkAppId = form.querySelector('[name="alerts.lark.appId"]') as HTMLInputElement;
    const lkAppSecret = form.querySelector('[name="alerts.lark.appSecret"]') as HTMLInputElement;

    if (lkEnabled?.checked || lkAppId?.value || lkAppSecret?.value) {
      alerts.lark = {
        enabled: lkEnabled?.checked ?? false,
        appId: lkAppId?.value || undefined,
        appSecret: lkAppSecret?.value || undefined,
      };
    }

    changes.alerts = alerts;

    // 收集 Web 配置
    const webHost = form.querySelector('[name="web.host"]') as HTMLInputElement;
    const webPort = form.querySelector('[name="web.port"]') as HTMLInputElement;

    if (webHost?.value || webPort?.value) {
      changes.web = {
        host: webHost?.value || undefined,
        port: webPort?.value ? parseInt(webPort.value) : undefined,
      };
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
