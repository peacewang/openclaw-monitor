// src/bot/types.ts

export interface BotService {
  name: string;
  enabled: boolean;
  start(): Promise<void>;
  stop(): void;
}
