// src/config/loader.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { MonitorConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';

export class ConfigLoader {
  async load(): Promise<MonitorConfig> {
    const configPaths = this.getConfigPaths();

    for (const configPath of configPaths) {
            try {
        await fs.access(configPath);
        const userConfig = await this.readConfigFile(configPath);
                return this.mergeDefaults(userConfig);
      } catch {
        continue;
      }
    }

    
    return DEFAULT_CONFIG;
  }

  private getConfigPaths(): string[] {
    const platform = os.platform();
    const paths: string[] = [];

    switch (platform) {
      case 'win32':
        paths.push(
          path.join(process.env.LOCALAPPDATA || '', 'openclaw-monitor', 'config.json'),
          path.join(process.env.APPDATA || '', 'openclaw-monitor', 'config.json'),
        );
        break;
      case 'darwin':
        paths.push(
          path.join(os.homedir(), 'Library', 'Application Support', 'openclaw-monitor', 'config.json'),
          path.join(os.homedir(), '.openclaw-monitor', 'config.json'),
        );
        break;
      case 'linux':
        paths.push(
          path.join(os.homedir(), '.config', 'openclaw-monitor', 'config.json'),
          path.join(os.homedir(), '.openclaw-monitor', 'config.json'),
        );
        break;
    }

    // 当前目录
    paths.push(path.join(process.cwd(), 'config.json'));
    paths.push(path.join(process.cwd(), 'openclaw-monitor.config.json'));

    return paths;
  }

  private async readConfigFile(filePath: string): Promise<Partial<MonitorConfig>> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private mergeDefaults(userConfig: Partial<MonitorConfig>): MonitorConfig {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      monitoring: { ...DEFAULT_CONFIG.monitoring, ...userConfig.monitoring },
      openclaw: { ...DEFAULT_CONFIG.openclaw, ...userConfig.openclaw },
      web: userConfig.web ? { ...DEFAULT_CONFIG.web, ...userConfig.web } : DEFAULT_CONFIG.web,
      alerts: userConfig.alerts ? { ...DEFAULT_CONFIG.alerts, ...userConfig.alerts } : DEFAULT_CONFIG.alerts,
    };
  }
}
