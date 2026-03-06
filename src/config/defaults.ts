// src/config/defaults.ts

import type { MonitorConfig } from '../types/config.js';

export const DEFAULT_CONFIG: MonitorConfig = {
  monitoring: {
    enabled: true,
    interval: 5,
    logLines: 100,
  },
  openclaw: {
    autoDetect: true,
  },
  web: {
    enabled: true,
    port: 37890,
    host: '0.0.0.0',
  },
  alerts: {
    enabled: false,
  },
};
