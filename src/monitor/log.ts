// src/monitor/log.ts

import * as fs from 'fs/promises';
import * as readline from 'readline';
import { createReadStream } from 'fs';
import type { LogCollector, LogLine, LogLevel } from '../types/log.js';
import type { MonitorConfig } from '../types/config.js';
import type { OpenClawEnvDetector } from '../env/types.js';
import { OpenClawPaths } from '../env/paths.js';

export class LogCollectorImpl implements LogCollector {
  private logLines: LogLine[] = [];
  private watcher?: NodeJS.Timeout;
  private currentLogFile = '';

  constructor(
    private envDetector: OpenClawEnvDetector,
    private config: MonitorConfig,
  ) {}

  async start(): Promise<void> {
    const logPath = await this.resolveLogPath();

    if (!logPath) {
      console.warn('No log file found');
      return;
    }

    this.currentLogFile = logPath;
    await this.loadExistingLogs(logPath);
    this.startWatching(logPath);
  }

  stop(): void {
    if (this.watcher) {
      clearInterval(this.watcher);
      this.watcher = undefined;
    }
  }

  getRecentLines(n: number): LogLine[] {
    return this.logLines.slice(-n);
  }

  search(pattern: string, limit?: number): LogLine[] {
    const regex = new RegExp(pattern, 'i');
    const results = this.logLines.filter((line) => regex.test(line.message));
    return limit ? results.slice(-limit) : results;
  }

  getErrors(limit?: number): LogLine[] {
    const errors = this.logLines.filter((line) =>
      line.level === 'ERROR' || line.level === 'FATAL'
    );
    return limit ? errors.slice(-limit) : errors;
  }

  private async resolveLogPath(): Promise<string | null> {
    // 1. 从配置获取
    if (this.config.openclaw.logPaths && this.config.openclaw.logPaths.length > 0) {
      for (const logPath of this.config.openclaw.logPaths) {
        try {
          await fs.access(logPath);
          return logPath;
        } catch {
          continue;
        }
      }
    }

    // 2. 从环境检测获取
    const logPaths = await this.envDetector.getLogPaths();
    for (const logDir of logPaths) {
      const possibleFiles = ['gateway.log', 'openclaw.log', 'output.log', 'error.log'];
      for (const file of possibleFiles) {
        const fullPath = `${logDir}/${file}`;
        try {
          await fs.access(fullPath);
          return fullPath;
        } catch {
          continue;
        }
      }
    }

    // 3. 尝试默认路径
    const defaultPaths = OpenClawPaths.getLogPaths();
    for (const dir of defaultPaths) {
      const logFile = `${dir}/gateway.log`;
      try {
        await fs.access(logFile);
        return logFile;
      } catch {
        continue;
      }
    }

    return null;
  }

  private async loadExistingLogs(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      let lineNum = 1;
      for (const line of lines) {
        if (line.trim()) {
          const parsed = this.parseLogLine(line, lineNum++);
          if (parsed) {
            this.addLogLine(parsed);
          }
        }
      }

      // 保留最近的 N 行
      if (this.logLines.length > this.config.monitoring.logLines) {
        this.logLines = this.logLines.slice(-this.config.monitoring.logLines);
      }
    } catch (error) {
      console.error('Failed to load existing logs:', error);
    }
  }

  private startWatching(filePath: string): void {
    // Windows 文件锁定处理：使用轮询
    if (process.platform === 'win32') {
      this.watchWithPolling(filePath);
    } else {
      this.watchWithFsWatch(filePath);
    }
  }

  private watchWithPolling(filePath: string): void {
    let lastSize = 0;
    const interval = 1000;

    const checkFile = async () => {
      try {
        const stats = await fs.stat(filePath);

        if (stats.size > lastSize) {
          const stream = createReadStream(filePath, {
            start: lastSize,
            encoding: 'utf-8',
          });

          const rl = readline.createInterface({ input: stream });

          rl.on('line', (line: string) => {
            if (line.trim()) {
              const parsed = this.parseLogLine(line, this.logLines.length + 1);
              if (parsed) {
                this.addLogLine(parsed);
              }
            }
          });

          rl.on('close', () => {
            lastSize = stats.size;
          });
        }
      } catch {
        // 文件可能被临时锁定
      }
    };

    this.watcher = setInterval(checkFile, interval);
  }

  private watchWithFsWatch(filePath: string): void {
    // Unix 系统使用轮询（简化实现）
    this.watchWithPolling(filePath);
  }

  private parseLogLine(line: string, lineNum: number): LogLine | null {
    // 尝试解析常见日志格式
    // 格式1: [2024-03-05 14:20:00] [INFO] Message
    const format1 = line.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
    if (format1) {
      return {
        timestamp: new Date(format1[1]),
        level: this.parseLogLevel(format1[2]),
        message: format1[3],
        source: 'stdout',
        lineNum,
      };
    }

    // 格式2: 2024-03-05 14:20:00 INFO Message
    const format2 = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.*)$/);
    if (format2) {
      return {
        timestamp: new Date(format2[1]),
        level: this.parseLogLevel(format2[2]),
        message: format2[3],
        source: 'stdout',
        lineNum,
      };
    }

    // 默认：按普通行处理
    return {
      timestamp: new Date(),
      level: 'INFO',
      message: line,
      source: 'stdout',
      lineNum,
    };
  }

  private parseLogLevel(level: string): LogLevel {
    const upper = level.toUpperCase();
    if (['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(upper)) {
      return upper as LogLevel;
    }
    return 'INFO';
  }

  private addLogLine(line: LogLine): void {
    this.logLines.push(line);

    // 保持缓存大小
    if (this.logLines.length > this.config.monitoring.logLines) {
      this.logLines.shift();
    }
  }
}
