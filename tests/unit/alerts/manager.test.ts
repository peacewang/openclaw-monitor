// tests/unit/alerts/manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertManager } from '../../../src/alert/manager.js';
import type { MonitorConfig } from '../../../src/types/config.js';
import type { AlertChannel } from '../../../src/types/alert.js';

describe('AlertManager', () => {
  let manager: AlertManager;
  let mockChannel: AlertChannel;
  let config: MonitorConfig;

  beforeEach(() => {
    mockChannel = {
      name: 'mock',
      enabled: true,
      send: vi.fn().mockResolvedValue(undefined),
    };

    config = {
      monitoring: { enabled: true, interval: 5, logLines: 100 },
      openclaw: { autoDetect: true },
      web: { enabled: true, host: '0.0.0.0', port: 37890 },
      alerts: {
        enabled: true,
        telegram: {
          botToken: 'test-token',
          chatId: 'test-chat',
        },
      },
    };

    // Mock channels
    vi.spyOn(AlertManager.prototype as any, 'initializeChannels').mockReturnValue(undefined);
    (AlertManager.prototype as any).channels = [mockChannel];

    manager = new AlertManager(config);
  });

  it('should be instantiable', () => {
    expect(manager).toBeDefined();
  });

  it('should return empty history initially', () => {
    const history = manager.getHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it('should return limited history', () => {
    const history = manager.getHistory(undefined, 10);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('should filter history by level', () => {
    const history = manager.getHistory('ERROR', 10);
    expect(Array.isArray(history)).toBe(true);
  });
});
