// src/utils/platform.ts

import * as os from 'os';

export class PlatformUtils {
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  static isMacOS(): boolean {
    return os.platform() === 'darwin';
  }

  static isLinux(): boolean {
    return os.platform() === 'linux';
  }

  static getPlatform(): NodeJS.Platform {
    return os.platform();
  }
}
