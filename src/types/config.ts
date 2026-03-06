// src/types/config.ts

export interface MonitorConfig {
  monitoring: MonitoringConfig;
  openclaw: OpenClawDetectConfig;
  web?: WebConfig;
  alerts?: AlertConfig;
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  logLines: number;
}

export interface OpenClawDetectConfig {
  autoDetect: boolean;
  configPaths?: string[];
  logPaths?: string[];
}

export interface WebConfig {
  enabled: boolean;
  port: number;
  host: string;
}

export interface AlertConfig {
  enabled: boolean;
  telegram?: TelegramConfig;
  feishu?: FeishuConfig;
  lark?: LarkConfig;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface FeishuConfig {
  enabled: boolean;
  webhook: string;
  secret?: string;
}

export interface LarkConfig {
  enabled: boolean;
  webhook: string;
  secret?: string;
}
