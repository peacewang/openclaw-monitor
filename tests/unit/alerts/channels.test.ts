// tests/unit/alerts/channels.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramChannel } from '../../../src/alert/channels/telegram.js';
import { FeishuChannel } from '../../../src/alert/channels/feishu.js';
import { LarkChannel } from '../../../src/alert/channels/lark.js';

// Mock fetch
global.fetch = vi.fn();

describe('Alert Channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TelegramChannel', () => {
    it('should be instantiable', () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
        enabled: true,
      });
      expect(channel).toBeDefined();
      expect(channel.name).toBe('telegram');
      expect(channel.enabled).toBe(true);
    });

    it('should have correct name', () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
        enabled: true,
      });
      expect(channel.name).toBe('telegram');
    });

    it('should be enabled when config.enabled is true', () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
        enabled: true,
      });
      expect(channel.enabled).toBe(true);
    });

    it('should be disabled when config.enabled is false', () => {
      const channel = new TelegramChannel({
        botToken: 'test-token',
        chatId: 'test-chat',
        enabled: false,
      });
      expect(channel.enabled).toBe(false);
    });
  });

  describe('FeishuChannel', () => {
    it('should be instantiable', () => {
      const channel = new FeishuChannel({
        webhookUrl: 'https://open.feishu.cn/webhook/test',
        enabled: true,
      });
      expect(channel).toBeDefined();
      expect(channel.name).toBe('feishu');
      expect(channel.enabled).toBe(true);
    });

    it('should have correct name', () => {
      const channel = new FeishuChannel({
        webhookUrl: 'https://open.feishu.cn/webhook/test',
        enabled: true,
      });
      expect(channel.name).toBe('feishu');
    });
  });

  describe('LarkChannel', () => {
    it('should be instantiable', () => {
      const channel = new LarkChannel({
        webhook: 'https://open.feishu.cn/webhook/test',
        enabled: true,
      });
      expect(channel).toBeDefined();
      expect(channel.name).toBe('lark');
      expect(channel.enabled).toBe(true);
    });

    it('should have correct name', () => {
      const channel = new LarkChannel({
        webhook: 'https://open.feishu.cn/webhook/test',
        enabled: true,
      });
      expect(channel.name).toBe('lark');
    });
  });
});
