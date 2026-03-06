// src/env/detector.ts

import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OpenClawEnv, OpenClawEnvDetector, OpenClawConfig } from './types.js';
import { OpenClawPaths } from './paths.js';

const execAsync = promisify(exec);

export class OpenClawEnvDetectorImpl implements OpenClawEnvDetector {
  async detect(): Promise<OpenClawEnv> {
    // 1. 命令检测
    const byCommand = await this.detectByCommand();
    if (byCommand) return byCommand;

    // 2. 路径检测
    const byPath = await this.detectByPath();
    if (byPath) return byPath;

    // 3. 配置文件检测
    const byConfig = await this.detectByConfig();
    if (byConfig) return byConfig;

    return { installed: false };
  }

  private async detectByCommand(): Promise<OpenClawEnv | null> {
    try {
      const { stdout } = await execAsync('openclaw --version');
      return {
        installed: true,
        version: stdout.trim(),
        configPath: this.getConfigPath(),
      };
    } catch {
      return null;
    }
  }

  private async detectByPath(): Promise<OpenClawEnv | null> {
    const paths = OpenClawPaths.getExecutablePaths();

    for (const exePath of paths) {
      try {
        await fs.access(exePath, fs.constants.X_OK);
        return {
          installed: true,
          executablePath: exePath,
          configPath: this.getConfigPath(),
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  private async detectByConfig(): Promise<OpenClawEnv | null> {
    const configPath = this.getConfigPath();
    try {
      await fs.access(configPath);
      return {
        installed: true,
        configPath,
      };
    } catch {
      return null;
    }
  }

  getConfigPath(): string {
    const paths = OpenClawPaths.getConfigPaths();
    return paths[0] || '';
  }

  async readConfig(filePath: string): Promise<OpenClawConfig> {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);
    return config as OpenClawConfig;
  }

  async getLogPaths(): Promise<string[]> {
    const paths = OpenClawPaths.getLogPaths();
    const existing: string[] = [];

    for (const logPath of paths) {
      try {
        await fs.access(logPath);
        existing.push(logPath);
      } catch {
        // 跳过不存在的路径
      }
    }

    return existing;
  }
}
