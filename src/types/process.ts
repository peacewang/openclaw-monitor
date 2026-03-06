// src/types/process.ts

export interface ProcessStatus {
  pid?: number;
  running: boolean;
  cpuPercent: number;
  memoryMB: number;
  uptime?: number;
  startTime?: Date;
  restartCount: number;
  port?: number;
  portOpen: boolean;
  lastCheck: Date;
}

export interface ProcessEvent {
  type: 'started' | 'stopped' | 'error';
  status?: ProcessStatus;
  error?: string;
  timestamp: Date;
}

// 进程监控接口（供实现类使用）
export interface ProcessMonitor {
  start(): Promise<void>;
  stop(): void;
  getStatus(): Promise<ProcessStatus>;
  subscribe(callback: (event: ProcessEvent) => void): () => void;
}
