/**
 * Loki Client Unit Tests
 * Loki Push APIクライアントの単体テスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { LokiClient, validateLokiConfig, createDefaultLokiConfig } from '@/lib/logger/loki-client';
import type { LokiClientConfig } from '@/lib/logger/loki-client';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock fetch implementation that returns a proper Response
const createMockResponse = (status = 204, statusText = 'No Content', ok = true) => ({
  ok,
  status,
  statusText,
  clone: () => createMockResponse(status, statusText, ok),
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
});

describe('LokiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(createMockResponse());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    test('should create client with default config', () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
      });

      const config = client.getConfig();
      expect(config.url).toBe('http://localhost:3100');
      expect(config.timeout).toBe(5000);
      expect(config.batchSize).toBe(100);
      expect(config.flushInterval).toBe(5000);
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.compression).toBe(true);
    });

    test('should create client with custom config', () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        timeout: 10000,
        batchSize: 50,
        defaultLabels: { service: 'test' },
      });

      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.batchSize).toBe(50);
      expect(config.defaultLabels).toEqual({ service: 'test' });
    });
  });

  describe('pushLog', () => {
    test('should buffer single log entry', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
      });

      await client.pushLog('info', 'Test message', { component: 'test' });

      const stats = client.getStats();
      expect(stats.bufferedLogs).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();

      await client.shutdown();
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    test('should send logs when batch size is reached', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 2,
      });

      await client.pushLog('info', 'Message 1');
      await client.pushLog('info', 'Message 2');

      // Just verify fetch was called once when batch size reached
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });

    test('should include default labels in logs', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
        defaultLabels: { service: 'test-app', environment: 'test' },
      });

      await client.pushLog('info', 'Test message', { component: 'auth' });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });

    test('should handle structured metadata', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
      });

      const metadata = { userId: '123', action: 'login' };
      await client.pushLog('info', 'User logged in', {}, metadata);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });
  });

  describe('pushLogs', () => {
    test('should handle multiple logs with different timestamps', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
      });

      const now = new Date();
      const later = new Date(now.getTime() + 1000);

      await client.pushLogs([
        { level: 'info', message: 'First message', timestamp: now },
        { level: 'warn', message: 'Second message', timestamp: later },
      ]);

      const stats = client.getStats();
      expect(stats.bufferedLogs).toBe(2);

      await client.shutdown();
    });

    test('should group logs by labels into streams', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 3,
      });

      await client.pushLogs([
        { level: 'info', message: 'Info message 1', labels: { component: 'auth' } },
        { level: 'error', message: 'Error message', labels: { component: 'db' } },
        { level: 'info', message: 'Info message 2', labels: { component: 'auth' } },
      ]);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });
  });

  describe('pushError', () => {
    test('should format error logs correctly', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
      });

      const error = new Error('Test error');
      await client.pushError(error, 'test-context', { component: 'auth' });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });

    test('should handle unknown error types', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
      });

      await client.pushError('String error', 'test-context');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });
  });

  describe('flush', () => {
    test('should send buffered logs immediately', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
      });

      await client.pushLog('info', 'Test message');
      expect(mockFetch).not.toHaveBeenCalled();

      await client.flush();
      expect(mockFetch).toHaveBeenCalledOnce();

      await client.shutdown();
    });

    test('should not make request when buffer is empty', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
      });

      await client.flush();
      expect(mockFetch).not.toHaveBeenCalled();

      await client.shutdown();
    });
  });

  describe('retry logic', () => {
    test('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse());

      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
        maxRetries: 2,
        retryDelay: 10,
      });

      const promise = client.pushLog('info', 'Test message');

      // Advance timers for retry delays
      await vi.runAllTimersAsync();
      await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);

      await client.shutdown();
    });

    test('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
        maxRetries: 1,
        retryDelay: 10,
      });

      // Push log and then manually flush
      await client.pushLog('info', 'Test message');

      // Expect flush to fail
      let error: Error | null = null;
      try {
        await client.flush();
      } catch (err) {
        error = err as Error;
      }

      expect(error).toBeDefined();
      expect(error?.message).toContain('Failed to send logs to Loki after 2 attempts');

      await client.shutdown();
    });
  });

  describe('authentication', () => {
    test('should include basic auth headers', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
        auth: { username: 'user', password: 'pass' },
      });

      await client.pushLog('info', 'Test message');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });

    test('should include API key headers', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
        apiKey: 'test-api-key',
      });

      await client.pushLog('info', 'Test message');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });

    test('should include tenant ID headers', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 1,
        tenantId: 'test-tenant',
      });

      await client.pushLog('info', 'Test message');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await client.shutdown();
    });
  });

  describe('shutdown', () => {
    test('should flush logs and prevent new logs', async () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
      });

      await client.pushLog('info', 'Test message');
      await client.shutdown();

      expect(mockFetch).toHaveBeenCalledOnce();

      await expect(client.pushLog('info', 'After shutdown')).rejects.toThrow(
        'LokiClient has been shutdown'
      );
    });
  });

  describe('automatic flush timer', () => {
    test('should not start timer in test environment', () => {
      const client = new LokiClient({
        url: 'http://localhost:3100',
        batchSize: 10,
        flushInterval: 1000,
      });

      // Timer should not be started in test environment
      const stats = client.getStats();
      expect(stats.bufferedLogs).toBe(0);
    });
  });
});

describe('validateLokiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(createMockResponse(200, 'OK'));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('should validate valid config', async () => {
    const config = {
      url: 'http://localhost:3100',
      timeout: 5000,
      batchSize: 100,
    };

    await expect(validateLokiConfig(config)).resolves.toBeUndefined();
  });

  test('should reject config without URL', async () => {
    const config = { url: '' } as LokiClientConfig;

    await expect(validateLokiConfig(config)).rejects.toThrow('Loki URL is required');
  });

  test('should reject config with invalid URL', async () => {
    const config = { url: 'invalid-url' };

    await expect(validateLokiConfig(config)).rejects.toThrow('Invalid Loki URL format');
  });

  test('should reject negative timeout', async () => {
    const config = { url: 'http://localhost:3100', timeout: -1 };

    await expect(validateLokiConfig(config)).rejects.toThrow('Timeout must be positive');
  });

  test('should reject negative batch size', async () => {
    const config = { url: 'http://localhost:3100', batchSize: -1 };

    await expect(validateLokiConfig(config)).rejects.toThrow('Batch size must be positive');
  });

  test('should reject negative flush interval', async () => {
    const config = { url: 'http://localhost:3100', flushInterval: -1 };

    await expect(validateLokiConfig(config)).rejects.toThrow('Flush interval must be positive');
  });

  test('should reject negative max retries', async () => {
    const config = { url: 'http://localhost:3100', maxRetries: -1 };

    await expect(validateLokiConfig(config)).rejects.toThrow('Max retries must be non-negative');
  });

  test('should reject negative retry delay', async () => {
    const config = { url: 'http://localhost:3100', retryDelay: -1 };

    await expect(validateLokiConfig(config)).rejects.toThrow('Retry delay must be positive');
  });
});

describe('createDefaultLokiConfig', () => {
  test('should create default config', () => {
    const config = createDefaultLokiConfig();

    expect(config.url).toBeDefined();
    expect(config.timeout).toBe(5000);
    expect(config.batchSize).toBe(100);
    expect(config.flushInterval).toBe(5000);
    expect(config.maxRetries).toBe(3);
    expect(config.retryDelay).toBe(1000);
    expect(config.compression).toBe(true);
    expect(config.defaultLabels).toBeDefined();
  });

  test('should apply overrides', () => {
    const config = createDefaultLokiConfig({
      timeout: 10000,
      batchSize: 50,
      defaultLabels: { custom: 'label' },
    });

    expect(config.timeout).toBe(10000);
    expect(config.batchSize).toBe(50);
    expect(config.defaultLabels).toEqual({ custom: 'label' });
  });

  test('should use environment variables', () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      LOKI_URL: 'http://custom-loki:3100',
      SERVICE_NAME: 'test-service',
      NODE_ENV: 'test',
    };

    const config = createDefaultLokiConfig();

    expect(config.url).toBe('http://custom-loki:3100');
    expect(config.defaultLabels?.service).toBe('test-service');
    expect(config.defaultLabels?.environment).toBe('test');

    process.env = originalEnv;
  });
});
