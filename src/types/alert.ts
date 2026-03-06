// src/types/alert.ts

export type AlertLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertChannel {
  name: string;
  enabled: boolean;
  send(alert: Alert): Promise<void>;
}
