// tests/unit/monitor/process.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessMonitorImpl } from '../../../src/monitor/process.js';
import type { MonitorConfig } from '../../../src/types/config.js';

describe('ProcessMonitor', () => {
  let config: MonitorConfig;

  beforeEach(() => {
    const mockEnvDetector = {
      detect: vi.fn().mockResolvedValue({
        installed: true,
        pid: 1234,
        port: 8789,
        gatewayPort: 8789,
        logPath: '/test/logs',
        config: { gateway: { port: 8789 } },
      }),
    };
    config = {
      monitoring: {
        enabled: true,
        interval: 5,
        logLines: 100,
        cpuThreshold: 80,
        memoryThreshold: 1024,
      },
      openclaw: { autoDetect: true },
      web: { enabled: true, host: '0.0.0.0', port: 37890 },
    };
  });

  it('should be instantiable', () => {
    const mockEnvDetector = {
      detect: vi.fn().mockResolvedValue({
        installed: true,
        pid: 1234,
        port: 8789,
        gatewayPort: 8789,
        logPath: '/test/logs',
        config: { gateway: { port: 8789 } },
      }),
    };
    const monitor = new ProcessMonitorImpl(mockEnvDetector, config);
    expect(monitor).toBeDefined();
  });

  it('should stop without error', () => {
    const mockEnvDetector = {
      detect: vi.fn().mockResolvedValue({
        installed: true,
        pid: 1234,
        port: 8789,
        gatewayPort: 8789,
        logPath: '/test/logs',
        config: { gateway: { port: 8789 } },
      }),
    };
    const monitor = new ProcessMonitorImpl(mockEnvDetector, config);
    expect(() => monitor.stop()).not.toThrow();
  });
});
