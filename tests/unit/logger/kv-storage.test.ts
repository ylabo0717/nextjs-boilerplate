/**
 * KV Storage Unit Tests
 * Tests for the key-value storage abstraction layer
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createStorageConfig,
  validateStorageConfig,
  createKVStorage,
  checkStorageHealth,
  MemoryStorage,
  getDefaultStorage,
  resetDefaultStorage,
  type StorageConfig,
  type KVStorage,
} from '@/lib/logger/kv-storage';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  resetDefaultStorage();
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe('createStorageConfig', () => {
  test('creates default memory storage config when no environment variables set', () => {
    delete process.env.REDIS_URL;
    delete process.env.KV_CONNECTION_STRING;
    delete process.env.EDGE_CONFIG_ID;

    const config = createStorageConfig();

    expect(config.type).toBe('memory');
    expect(config.ttl_default).toBe(3600);
    expect(config.max_retries).toBe(3);
    expect(config.timeout_ms).toBe(5000);
    expect(config.fallback_enabled).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
  });

  test('detects Redis when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const config = createStorageConfig();

    expect(config.type).toBe('redis');
    expect(config.connection_string).toBe('redis://localhost:6379');
  });

  test('detects Redis when KV_CONNECTION_STRING is set', () => {
    process.env.KV_CONNECTION_STRING = 'redis://localhost:6379';

    const config = createStorageConfig();

    expect(config.type).toBe('redis');
    expect(config.connection_string).toBe('redis://localhost:6379');
  });

  test('detects Edge Config when environment variables are set', () => {
    process.env.EDGE_CONFIG_ID = 'test-config-id';
    process.env.EDGE_CONFIG_TOKEN = 'test-token';

    const config = createStorageConfig();

    expect(config.type).toBe('edge-config');
  });

  test('respects custom environment configuration', () => {
    process.env.KV_TTL_DEFAULT = '7200';
    process.env.KV_MAX_RETRIES = '5';
    process.env.KV_TIMEOUT_MS = '10000';
    process.env.KV_FALLBACK_ENABLED = 'false';

    const config = createStorageConfig();

    expect(config.ttl_default).toBe(7200);
    expect(config.max_retries).toBe(5);
    expect(config.timeout_ms).toBe(10000);
    expect(config.fallback_enabled).toBe(false);
  });
});

describe('validateStorageConfig', () => {
  test('validates correct memory storage config', () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config)).toBe(true);
  });

  test('validates correct Redis storage config', () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config)).toBe(true);
  });

  test('rejects null or undefined config', () => {
    expect(validateStorageConfig(null as any)).toBe(false);
    expect(validateStorageConfig(undefined as any)).toBe(false);
  });

  test('rejects config with invalid type', () => {
    const config = {
      type: 'invalid',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config as any)).toBe(false);
  });

  test('rejects Redis config without connection string', () => {
    const config: StorageConfig = {
      type: 'redis',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config)).toBe(false);
  });

  test('rejects config with invalid numeric values', () => {
    const config = {
      type: 'memory',
      ttl_default: 0,
      max_retries: -1,
      timeout_ms: -1000,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config as any)).toBe(false);
  });
});

describe('MemoryStorage', () => {
  let storage: MemoryStorage;
  let config: StorageConfig;

  beforeEach(() => {
    config = {
      type: 'memory',
      ttl_default: 10, // 10 seconds for testing
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };
    storage = new MemoryStorage(config);
  });

  test('stores and retrieves values', async () => {
    await storage.set('test-key', 'test-value');
    const value = await storage.get('test-key');

    expect(value).toBe('test-value');
  });

  test('returns null for non-existent keys', async () => {
    const value = await storage.get('non-existent-key');

    expect(value).toBeNull();
  });

  test('respects TTL expiration', async () => {
    await storage.set('ttl-key', 'ttl-value', 1); // 1 second TTL

    let value = await storage.get('ttl-key');
    expect(value).toBe('ttl-value');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    value = await storage.get('ttl-key');
    expect(value).toBeNull();
  });

  test('uses default TTL when not specified', async () => {
    const mockDate = new Date('2025-08-14T10:00:00.000Z');
    vi.setSystemTime(mockDate);

    await storage.set('default-ttl-key', 'default-ttl-value');

    // Advance time by 5 seconds (less than default TTL)
    vi.setSystemTime(new Date('2025-08-14T10:00:05.000Z'));

    let value = await storage.get('default-ttl-key');
    expect(value).toBe('default-ttl-value');

    // Advance time past default TTL
    vi.setSystemTime(new Date('2025-08-14T10:00:15.000Z'));

    value = await storage.get('default-ttl-key');
    expect(value).toBeNull();
  });

  test('deletes keys correctly', async () => {
    await storage.set('delete-key', 'delete-value');

    let exists = await storage.exists('delete-key');
    expect(exists).toBe(true);

    await storage.delete('delete-key');

    exists = await storage.exists('delete-key');
    expect(exists).toBe(false);
  });

  test('checks existence correctly', async () => {
    expect(await storage.exists('non-existent')).toBe(false);

    await storage.set('exists-key', 'exists-value');
    expect(await storage.exists('exists-key')).toBe(true);

    await storage.delete('exists-key');
    expect(await storage.exists('exists-key')).toBe(false);
  });

  test('has correct type property', () => {
    expect(storage.type).toBe('memory');
  });
});

describe('createKVStorage', () => {
  test('creates memory storage by default', () => {
    delete process.env.REDIS_URL;
    delete process.env.KV_CONNECTION_STRING;
    delete process.env.EDGE_CONFIG_ID;

    const storage = createKVStorage();

    expect(storage.type).toBe('memory');
  });

  test('creates memory storage with custom config', () => {
    const customConfig: StorageConfig = {
      type: 'memory',
      ttl_default: 7200,
      max_retries: 5,
      timeout_ms: 10000,
      fallback_enabled: false,
    };

    const storage = createKVStorage(customConfig);

    expect(storage.type).toBe('memory');
  });

  test('falls back to memory storage for invalid config', () => {
    const invalidConfig = {
      type: 'invalid',
      ttl_default: -1,
      max_retries: -1,
      timeout_ms: -1,
      fallback_enabled: true,
    };

    const storage = createKVStorage(invalidConfig as any);

    expect(storage.type).toBe('memory');
  });
});

describe('checkStorageHealth', () => {
  let storage: KVStorage;

  beforeEach(() => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };
    storage = new MemoryStorage(config);
  });

  test('passes health check for working storage', async () => {
    const result = await checkStorageHealth(storage);

    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('detects storage failures', async () => {
    // Mock storage to fail operations
    const mockStorage: KVStorage = {
      type: 'memory',
      get: vi.fn().mockRejectedValue(new Error('Storage failure')),
      set: vi.fn().mockRejectedValue(new Error('Storage failure')),
      delete: vi.fn().mockRejectedValue(new Error('Storage failure')),
      exists: vi.fn().mockRejectedValue(new Error('Storage failure')),
    };

    const result = await checkStorageHealth(mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Storage failure');
  });

  test('detects inconsistent read operations', async () => {
    // Mock storage that writes but reads wrong value
    const mockStorage: KVStorage = {
      type: 'memory',
      get: vi.fn().mockResolvedValue('wrong_value'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
    };

    const result = await checkStorageHealth(mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Read operation returned unexpected value');
  });

  test('detects failed delete operations', async () => {
    // Mock storage that doesn't actually delete
    const mockStorage: KVStorage = {
      type: 'memory',
      get: vi
        .fn()
        .mockResolvedValueOnce('health_check_value') // First call during read test
        .mockResolvedValueOnce('health_check_value'), // Second call might not happen due to early success
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi
        .fn()
        .mockResolvedValueOnce(true) // exists check before delete
        .mockResolvedValueOnce(true), // exists check after delete (should be false)
    };

    const result = await checkStorageHealth(mockStorage);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Delete operation failed');
  });
});

describe('Default Storage Singleton', () => {
  test('getDefaultStorage returns same instance', () => {
    const storage1 = getDefaultStorage();
    const storage2 = getDefaultStorage();

    expect(storage1).toBe(storage2);
  });

  test('resetDefaultStorage clears singleton', () => {
    const storage1 = getDefaultStorage();
    resetDefaultStorage();
    const storage2 = getDefaultStorage();

    expect(storage1).not.toBe(storage2);
  });
});

describe('Error Handling and Resilience', () => {
  test('memory storage handles concurrent operations', async () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };
    const storage = new MemoryStorage(config);

    // Perform multiple concurrent operations
    const operations = Array.from({ length: 100 }, (_, i) => storage.set(`key-${i}`, `value-${i}`));

    await Promise.all(operations);

    // Verify all values are stored correctly
    for (let i = 0; i < 100; i++) {
      const value = await storage.get(`key-${i}`);
      expect(value).toBe(`value-${i}`);
    }
  });

  test('memory storage handles edge cases', async () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    };
    const storage = new MemoryStorage(config);

    // Test empty string value
    await storage.set('empty', '');
    expect(await storage.get('empty')).toBe('');

    // Test special characters
    const specialValue = 'Special chars: 日本語 🚀 \n\t\r';
    await storage.set('special', specialValue);
    expect(await storage.get('special')).toBe(specialValue);

    // Test large value
    const largeValue = 'x'.repeat(10000);
    await storage.set('large', largeValue);
    expect(await storage.get('large')).toBe(largeValue);
  });
});
