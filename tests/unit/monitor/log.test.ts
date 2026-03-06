// tests/unit/monitor/log.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogCollectorImpl } from '../../../src/monitor/log.js';
import type { MonitorConfig } from '../../../src/types/config.js';

describe('LogCollector', () => {
  let collector: LogCollectorImpl;
  let mockEnvDetector: any;
  let config: MonitorConfig;

  beforeEach(() => {
    mockEnvDetector = {
      detect: vi.fn().mockResolvedValue({
        installed: true,
        logPath: '/test/logs',
      }),
      getLogPaths: vi.fn().mockResolvedValue(['/test/logs']),
    };
    config = {
      monitoring: {
        enabled: true,
        interval: 5,
        logLines: 100,
      },
      openclaw: { autoDetect: true },
      web: { enabled: true, host: '0.0.0.0', port: 37890 },
    };
    collector = new LogCollectorImpl(mockEnvDetector, config);
  });

  it('should be instantiable', () => {
    expect(collector).toBeDefined();
  });

  it('should return empty lines initially', () => {
    const lines = collector.getRecentLines(10);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBe(0);
  });

  it('should return empty errors initially', () => {
    const errors = collector.getErrors(10);
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(0);
  });

  it('should return empty search results initially', () => {
    const results = collector.search('error', 10);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should stop without error', () => {
    expect(() => collector.stop()).not.toThrow();
  });
});
