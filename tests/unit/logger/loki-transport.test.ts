/**
 * Loki Transport Unit Tests
 * Lokiトランスポートレイヤーの単体テスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LokiTransport,
  initializeLokiTransport,
  getLokiTransport,
  shutdownLokiTransport,
  createLokiConfigFromEnv,
} from '@/lib/logger/loki-transport';
import { createLoggerContextConfig, runWithLoggerContext } from '@/lib/logger/context';

import type { Logger, LogLevel, LogArgument } from '@/lib/logger/types';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger for testing
const createMockLogger = (): Logger => ({
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
});

describe('LokiTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      clone: vi.fn(() => ({ ok: true, status: 204 })),
      json: vi.fn(() => Promise.resolve({})),
      text: vi.fn(() => Promise.resolve('')),
    });
  });

  afterEach(async () => {
    await shutdownLokiTransport();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    test('should create transport with default config', () => {
      const transport = new LokiTransport();
      const config = transport.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.minLevel).toBe('info');
      expect(config.excludePatterns).toEqual([]);
    });

    test('should create transport with custom config', () => {
      const transport = new LokiTransport({
        enabled: false,
        minLevel: 'warn',
        url: 'http://custom-loki:3100',
        excludePatterns: [/test/i],
      });

      const config = transport.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.minLevel).toBe('warn');
      expect(config.url).toBe('http://custom-loki:3100');
      expect(config.excludePatterns).toHaveLength(1);
    });
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
      });

      await expect(transport.initialize()).resolves.toBeUndefined();

      const stats = transport.getStats();
      expect(stats.enabled).toBe(true);
    });

    test('should skip initialization when disabled', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const transport = new LokiTransport({
        enabled: false,
      });

      await transport.initialize();

      expect(consoleInfoSpy).toHaveBeenCalledWith('LokiTransport is disabled');
      consoleInfoSpy.mockRestore();
    });

    test('should handle initialization errors', async () => {
      const transport = new LokiTransport({
        url: 'invalid-url',
      });

      await expect(transport.initialize()).rejects.toThrow();
    });
  });

  describe('wrapLogger', () => {
    test('should wrap logger and maintain interface', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        batchSize: 1,
      });
      await transport.initialize();

      const mockLogger = createMockLogger();
      const wrappedLogger = transport.wrapLogger(mockLogger);

      // Test that original logger methods are called
      wrappedLogger.info('Test message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test message');

      // Test that isLevelEnabled is forwarded
      expect(wrappedLogger.isLevelEnabled('info')).toBe(true);

      await transport.shutdown();
    });
  });

  describe('log level filtering', () => {
    test('should respect minLevel setting', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        minLevel: 'warn',
        batchSize: 1,
      });
      await transport.initialize();

      expect(transport.shouldSendLevel('trace')).toBe(false);
      expect(transport.shouldSendLevel('debug')).toBe(false);
      expect(transport.shouldSendLevel('info')).toBe(false);
      expect(transport.shouldSendLevel('warn')).toBe(true);
      expect(transport.shouldSendLevel('error')).toBe(true);
      expect(transport.shouldSendLevel('fatal')).toBe(true);

      await transport.shutdown();
    });

    test('should exclude logs below minLevel', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        minLevel: 'warn',
        batchSize: 1,
      });
      await transport.initialize();

      // Send logs at different levels
      await transport.sendLog('info', 'This should be excluded');
      await transport.sendLog('warn', 'This should be sent');

      const stats = transport.getStats();
      expect(stats.excludedLogs).toBe(1);
      expect(stats.successfulLogs).toBe(1);
      expect(stats.totalLogs).toBe(2);

      await transport.shutdown();
    });
  });

  describe('error handling', () => {
    test('should handle Loki errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Loki is down'));

      const errorHandler = vi.fn();
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        batchSize: 1,
        maxRetries: 0,
        onError: errorHandler,
      });
      await transport.initialize();

      await transport.sendLog('info', 'Test message');

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'info',
          message: 'Test message',
        })
      );

      const stats = transport.getStats();
      expect(stats.failedLogs).toBe(1);
      expect(stats.lastError).toContain('Loki is down');

      await transport.shutdown();
    });
  });

  describe('statistics', () => {
    test('should track basic statistics', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        minLevel: 'warn',
        batchSize: 1,
      });
      await transport.initialize();

      // Send logs at different levels
      await transport.sendLog('info', 'Below min level'); // excluded
      await transport.sendLog('error', 'Real error'); // sent

      const stats = transport.getStats();
      expect(stats.totalLogs).toBeGreaterThanOrEqual(2);
      expect(stats.excludedLogs).toBeGreaterThanOrEqual(1);
      expect(stats.successfulLogs).toBeGreaterThanOrEqual(1);

      await transport.shutdown();
    });
  });

  describe('shutdown', () => {
    test('should shutdown gracefully', async () => {
      const transport = new LokiTransport({
        url: 'http://localhost:3100',
        batchSize: 10,
      });
      await transport.initialize();

      await transport.sendLog('info', 'Test message');
      await transport.shutdown();

      // Should not throw errors
      expect(transport.getStats().enabled).toBe(true);
    });
  });
});

describe('Global transport management', () => {
  afterEach(async () => {
    await shutdownLokiTransport();
  });

  test('should initialize global transport', async () => {
    const transport = await initializeLokiTransport({
      url: 'http://localhost:3100',
    });

    expect(transport).toBeInstanceOf(LokiTransport);
    expect(getLokiTransport()).toBe(transport);
  });

  test('should return existing transport on second init', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const transport1 = await initializeLokiTransport({
      url: 'http://localhost:3100',
    });
    const transport2 = await initializeLokiTransport({
      url: 'http://other:3100',
    });

    expect(transport1).toBe(transport2);
    expect(consoleWarnSpy).toHaveBeenCalledWith('LokiTransport is already initialized');

    consoleWarnSpy.mockRestore();
  });

  test('should shutdown global transport', async () => {
    await initializeLokiTransport({
      url: 'http://localhost:3100',
    });

    expect(getLokiTransport()).not.toBeNull();

    await shutdownLokiTransport();

    expect(getLokiTransport()).toBeNull();
  });
});

describe('createLokiConfigFromEnv', () => {
  test('should create config from environment variables', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      LOKI_ENABLED: 'true',
      LOKI_URL: 'http://loki:3100',
      LOKI_TENANT_ID: 'tenant-123',
      LOKI_API_KEY: 'api-key-456',
      LOKI_MIN_LEVEL: 'warn',
      LOKI_BATCH_SIZE: '50',
      LOKI_FLUSH_INTERVAL: '3000',
      LOKI_TIMEOUT: '8000',
      LOKI_MAX_RETRIES: '5',
      LOKI_USERNAME: 'lokiuser',
      LOKI_PASSWORD: 'lokipass',
    };

    const config = createLokiConfigFromEnv();

    expect(config.enabled).toBe(true);
    expect(config.url).toBe('http://loki:3100');
    expect(config.tenantId).toBe('tenant-123');
    expect(config.apiKey).toBe('api-key-456');
    expect(config.minLevel).toBe('warn');
    expect(config.batchSize).toBe(50);
    expect(config.flushInterval).toBe(3000);
    expect(config.timeout).toBe(8000);
    expect(config.maxRetries).toBe(5);
    expect(config.auth).toEqual({
      username: 'lokiuser',
      password: 'lokipass',
    });

    process.env = originalEnv;
  });

  test('should use defaults when env vars not set', () => {
    const originalEnv = process.env;
    process.env = {
      NODE_ENV: 'test',
    };

    const config = createLokiConfigFromEnv();

    expect(config.enabled).toBe(true);
    expect(config.url).toBe('http://localhost:3100');
    expect(config.minLevel).toBe('info');
    expect(config.auth).toBeUndefined();

    process.env = originalEnv;
  });

  test('should handle LOKI_ENABLED=false', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      LOKI_ENABLED: 'false',
    };

    const config = createLokiConfigFromEnv();

    expect(config.enabled).toBe(false);

    process.env = originalEnv;
  });
});
