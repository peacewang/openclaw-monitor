// tests/unit/env.test.ts

import { describe, it, expect } from 'vitest';
import { OpenClawPaths } from '../../src/env/paths.js';

describe('OpenClawEnv', () => {
  it('should return config paths', () => {
    const paths = OpenClawPaths.getConfigPaths();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should return log paths', () => {
    const paths = OpenClawPaths.getLogPaths();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should return executable paths', () => {
    const paths = OpenClawPaths.getExecutablePaths();
    expect(Array.isArray(paths)).toBe(true);
  });
});
