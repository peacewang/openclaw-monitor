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
  thresholds?: ResourceThresholds;
}

export interface ResourceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
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
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  proxy?: string;
}

export interface FeishuConfig {
  enabled: boolean;
  app_id: string;
  app_secret: string;
}
