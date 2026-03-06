// tests/unit/config.test.ts

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';

describe('Config', () => {
  it('should have default values', () => {
    expect(DEFAULT_CONFIG.monitoring.enabled).toBe(true);
    expect(DEFAULT_CONFIG.monitoring.interval).toBe(5);
    expect(DEFAULT_CONFIG.monitoring.logLines).toBe(100);
    expect(DEFAULT_CONFIG.openclaw.autoDetect).toBe(true);
    expect(DEFAULT_CONFIG.web?.port).toBe(37890);
    expect(DEFAULT_CONFIG.alerts?.enabled).toBe(false);
  });
});
