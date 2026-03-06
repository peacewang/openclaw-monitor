// src/env/types.ts

export interface OpenClawEnv {
  installed: boolean;
  version?: string;
  configPath?: string;
  config?: OpenClawConfig;
  gatewayPort?: number;
  logDir?: string;
  executablePath?: string;
  dataDir?: string;
}

export interface OpenClawConfig {
  gateway?: {
    port?: number;
    host?: string;
  };
  logging?: {
    level?: string;
    file?: string;
    dir?: string;
  };
}

export interface OpenClawEnvDetector {
  detect(): Promise<OpenClawEnv>;
  getConfigPath(): string;
  readConfig(path: string): Promise<OpenClawConfig>;
  getLogPaths(): Promise<string[]>;
}
