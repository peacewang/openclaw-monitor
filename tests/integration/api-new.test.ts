// tests/integration/api-new.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawMonitor } from '../../src/index.js';

describe('API Integration Tests', () => {
  let monitor: OpenClawMonitor;

  beforeAll(async () => {
    monitor = new OpenClawMonitor({
      web: { host: '127.0.0.1', port: 0 }, // 随机端口
    });
    // 注意：由于需要真实的 OpenClaw 环境，这里不启动 monitor
  });

  afterAll(async () => {
    // if (monitor.isStarted()) {
    //   await monitor.stop();
    // }
  });

  it('should be instantiable', () => {
    expect(monitor).toBeDefined();
    expect(monitor.isStarted()).toBe(false);
  });

  it('should get config', () => {
    const config = monitor.getConfig();
    expect(config).toBeDefined();
    expect(config.monitoring.enabled).toBe(true);
    expect(config.web?.port).toBe(0);
  });

  it('should update config', () => {
    monitor.updateConfig({
      monitoring: { interval: 10, enabled: true, logLines: 100 },
    });

    const config = monitor.getConfig();
    expect(config.monitoring.interval).toBe(10);
  });

  it('should get alert history (empty)', () => {
    const alerts = monitor.getAlertHistory();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should get alert history with limit', () => {
    const alerts = monitor.getAlertHistory(undefined, 50);
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should get alert history with level filter', () => {
    const alerts = monitor.getAlertHistory('ERROR', 10);
    expect(Array.isArray(alerts)).toBe(true);
  });
});
