// src/env/paths.ts

import * as path from 'path';
import * as os from 'os';
import { PathUtils } from '../utils/path.js';

export class OpenClawPaths {
  static getConfigPaths(): string[] {
    const platform = os.platform();
    const paths: string[] = [];

    switch (platform) {
      case 'win32':
        paths.push(
          path.join(process.env.APPDATA || '', 'openclaw', 'config.json'),
          path.join(PathUtils.getConfigDir(), 'openclaw', 'config.json'),
        );
        break;
      case 'darwin':
        paths.push(
          path.join(os.homedir(), '.openclaw', 'config.json'),
          path.join(PathUtils.getConfigDir(), 'openclaw', 'config.json'),
        );
        break;
      case 'linux':
        paths.push(
          path.join(os.homedir(), '.config', 'openclaw', 'config.json'),
          path.join(os.homedir(), '.openclaw', 'config.json'),
        );
        break;
    }

    return paths;
  }

  static getLogPaths(): string[] {
    const platform = os.platform();
    const paths: string[] = [];

    switch (platform) {
      case 'win32':
        paths.push(
          path.join(process.env.APPDATA || '', 'openclaw', 'logs'),
          path.join(PathUtils.getUserDataDir(), 'openclaw', 'logs'),
        );
        break;
      case 'darwin':
      case 'linux':
        // 通用配置目录 ~/.openclaw/logs（跨平台）
        paths.push(
          path.join(os.homedir(), '.openclaw', 'logs'),
        );
        // macOS 特定路径
        if (platform === 'darwin') {
          paths.push(
            path.join(os.homedir(), 'Library', 'Logs', 'openclaw'),
            path.join(PathUtils.getUserDataDir(), 'openclaw', 'logs'),
          );
        }
        // Linux 特定路径
        if (platform === 'linux') {
          paths.push(
            path.join(os.homedir(), '.local', 'share', 'openclaw', 'logs'),
            path.join(os.homedir(), '.config', 'openclaw', 'logs'),
            path.join(PathUtils.getUserDataDir(), 'openclaw', 'logs'),
          );
        }
        break;
    }

    return paths;
  }

  static getExecutablePaths(): string[] {
    const platform = os.platform();
    const paths: string[] = [];

    switch (platform) {
      case 'win32':
        paths.push(
          path.join(process.env.LOCALAPPDATA || '', 'npm', 'openclaw.cmd'),
          path.join(process.env.APPDATA || '', 'npm', 'openclaw.cmd'),
        );
        break;
      case 'darwin':
      case 'linux':
        paths.push(
          path.join(os.homedir(), '.npm-global', 'bin', 'openclaw'),
          '/usr/local/bin/openclaw',
        );
        break;
    }

    return paths;
  }

  static getDataDir(): string {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return path.join(process.env.LOCALAPPDATA || '', 'openclaw');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', 'openclaw');
      case 'linux':
        return path.join(os.homedir(), '.local', 'share', 'openclaw');
      default:
        return path.join(os.homedir(), '.openclaw');
    }
  }
}
