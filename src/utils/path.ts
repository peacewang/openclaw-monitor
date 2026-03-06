// src/utils/path.ts

import * as path from 'path';
import * as os from 'os';

export class PathUtils {
  static getUserDataDir(): string {
    switch (os.platform()) {
      case 'win32':
        return process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support');
      case 'linux':
        return process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
      default:
        return os.homedir();
    }
  }

  static getConfigDir(): string {
    switch (os.platform()) {
      case 'win32':
        return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support');
      case 'linux':
        return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
      default:
        return path.join(os.homedir(), '.config');
    }
  }

  static normalize(p: string): string {
    return path.normalize(p);
  }

  static expandEnv(p: string): string {
    return p.replace(/%([^%]+)%/g, (_, name) => process.env[name] || '');
  }
}
