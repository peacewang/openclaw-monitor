// web/app.js

import { StatusComponent } from './components/status.js';
import { LogsComponent } from './components/logs.js';
import { ConfigComponent } from './components/config.js';
import { AlertsComponent } from './components/alerts.js';

const API_BASE = '/api';

class App {
  constructor() {
    this.currentPage = 'status';
    this.components = {
      status: new StatusComponent(API_BASE),
      logs: new LogsComponent(API_BASE),
      config: new ConfigComponent(API_BASE),
      alerts: new AlertsComponent(API_BASE),
    };
  }

  async init() {
    this.bindNavigation();
    await this.navigate('status');
    this.startPeriodicRefresh();
  }

  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-items button');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) {
          this.navigate(page);
        }
      });
    });
  }

  async navigate(page) {
    this.currentPage = page;

    // 更新导航状态
    const navButtons = document.querySelectorAll('.nav-items button');
    navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // 渲染页面
    const content = document.getElementById('page-content');
    const component = this.components[page];

    if (component) {
      content.innerHTML = component.render();
      await component.onMounted();
    }
  }

  startPeriodicRefresh() {
    // 每 30 秒刷新一次数据
    setInterval(async () => {
      const component = this.components[this.currentPage];
      if (component && component.refresh) {
        await component.refresh();
      }
    }, 30000);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// 导出供 HTML 使用
window.App = App;
window.showToast = (message, type) => {
  if (window.appInstance) {
    window.appInstance.showToast(message, type);
  }
};
