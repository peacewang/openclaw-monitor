// src/types/log.ts

export interface LogLine {
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: 'stdout' | 'stderr';
  lineNum: number;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

// 日志收集器接口（供实现类使用）
export interface LogCollector {
  start(): Promise<void>;
  stop(): void;
  getRecentLines(n: number): LogLine[];
  search(pattern: string, limit?: number): LogLine[];
  getErrors(limit?: number): LogLine[];
}
