// tests/integration/monitor.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawMonitor } from '../../src/index.js';

describe('OpenClawMonitor Integration', () => {
  let monitor: OpenClawMonitor;

  beforeEach(() => {
    monitor = new OpenClawMonitor();
  });

  afterEach(async () => {
    if (monitor.isStarted()) {
      await monitor.stop();
    }
  });

  it('should be instantiable', () => {
    expect(monitor).toBeDefined();
    expect(monitor.isStarted()).toBe(false);
  });

  it('should get config', () => {
    const config = monitor.getConfig();
    expect(config).toBeDefined();
    expect(config.monitoring.enabled).toBe(true);
  });
});
