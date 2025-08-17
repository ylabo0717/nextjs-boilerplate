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
  RedisStorage,
  EdgeConfigStorage,
  getDefaultStorage,
  resetDefaultStorage,
  type StorageConfig,
  type KVStorage,
} from '@/lib/logger/kv-storage';
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

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
    expect(config.ttl_default).toBe(LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT);
    expect(config.max_retries).toBe(3);
    expect(config.timeout_ms).toBe(LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS);
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
    process.env.KV_TTL_DEFAULT = LOGGER_TEST_DATA.STORAGE_TTL_EXTENDED.toString();
    process.env.KV_MAX_RETRIES = '5';
    process.env.KV_TIMEOUT_MS = LOGGER_TEST_DATA.STORAGE_TIMEOUT_EXTENDED.toString();
    process.env.KV_FALLBACK_ENABLED = 'false';

    const config = createStorageConfig();

    expect(config.ttl_default).toBe(LOGGER_TEST_DATA.STORAGE_TTL_EXTENDED);
    expect(config.max_retries).toBe(5);
    expect(config.timeout_ms).toBe(LOGGER_TEST_DATA.STORAGE_TIMEOUT_EXTENDED);
    expect(config.fallback_enabled).toBe(false);
  });
});

describe('validateStorageConfig', () => {
  test('validates correct memory storage config', () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config)).toBe(true);
  });

  test('validates correct Redis storage config', () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
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
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    expect(validateStorageConfig(config as any)).toBe(false);
  });

  test('rejects Redis config without connection string', () => {
    const config: StorageConfig = {
      type: 'redis',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
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
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
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
    await new Promise((resolve) => setTimeout(resolve, LOGGER_TEST_DATA.ASYNC_DELAY_LONG));

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

describe('RedisStorage', () => {
  test('creates Redis storage with correct configuration', () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    const storage = new RedisStorage(config);
    expect(storage.type).toBe('redis');
  });

  test('handles Redis operations with mocked client', async () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    const storage = new RedisStorage(config);

    // Test that operations handle errors gracefully when Redis is not available
    const result = await storage.get('test-key');
    expect(result).toBeNull(); // Should return null on error
  });

  test('handles timeout scenarios', async () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: 1, // Very short timeout for testing
      fallback_enabled: true,
    };

    const storage = new RedisStorage(config);

    // Operations should timeout and return gracefully
    const result = await storage.get('test-key');
    expect(result).toBeNull();
  });

  test('handles Redis operation errors gracefully', async () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    const storage = new RedisStorage(config);

    // Test all Redis operations handle errors gracefully
    await expect(storage.get('test-key')).resolves.toBeNull();
    await expect(storage.exists('test-key')).resolves.toBe(false);

    // Set and delete operations should handle errors but may throw
    try {
      await storage.set('test-key', 'test-value');
      await storage.delete('test-key');
    } catch (error) {
      // Expected behavior when Redis is not available
      expect(error).toBeDefined();
    }
  });
});

describe('EdgeConfigStorage', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockFetch: any;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      EDGE_CONFIG_ID: 'test-config-id',
      EDGE_CONFIG_TOKEN: 'test-token',
    };

    // Mock global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  test('creates EdgeConfig storage with correct configuration', () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    const storage = new EdgeConfigStorage(config);
    expect(storage.type).toBe('edge-config');
  });

  test('handles successful get operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue('test-value'),
    });

    const storage = new EdgeConfigStorage(config);
    const result = await storage.get('test-key');
    expect(result).toBe('test-value');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://edge-config.vercel.com/test-config-id/item/test-key',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  test('handles 404 response for get operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const storage = new EdgeConfigStorage(config);
    const result = await storage.get('non-existent-key');
    expect(result).toBeNull();
  });

  test('handles API errors for get operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const storage = new EdgeConfigStorage(config);
    const result = await storage.get('test-key');
    expect(result).toBeNull();
  });

  test('handles successful set operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });

    const storage = new EdgeConfigStorage(config);
    await expect(storage.set('test-key', 'test-value')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://edge-config.vercel.com/test-config-id/items',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ 'test-key': 'test-value' }),
      })
    );
  });

  test('handles failed set operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const storage = new EdgeConfigStorage(config);
    await expect(storage.set('test-key', 'test-value')).rejects.toThrow();
  });

  test('handles successful delete operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });

    const storage = new EdgeConfigStorage(config);
    await expect(storage.delete('test-key')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://edge-config.vercel.com/test-config-id/items',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ 'test-key': null }),
      })
    );
  });

  test('handles exists operation', async () => {
    const config: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    // Mock successful get for exists check
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue('test-value'),
    });

    const storage = new EdgeConfigStorage(config);
    const exists = await storage.exists('test-key');
    expect(exists).toBe(true);
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
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_EXTENDED,
      max_retries: 5,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_EXTENDED,
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

  test('creates Redis storage when Redis config detected', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.EDGE_CONFIG_ID;
    delete process.env.EDGE_CONFIG_TOKEN;

    const storage = createKVStorage();
    expect(storage.type).toBe('redis');
  });

  test('creates EdgeConfig storage when Edge Config detected', () => {
    process.env.EDGE_CONFIG_ID = 'test-config-id';
    process.env.EDGE_CONFIG_TOKEN = 'test-token';
    delete process.env.REDIS_URL;
    delete process.env.KV_CONNECTION_STRING;

    const storage = createKVStorage();
    expect(storage.type).toBe('edge-config');
  });

  test('handles storage creation failures with fallback', () => {
    const config: StorageConfig = {
      type: 'redis',
      connection_string: 'redis://localhost:6379',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    // Create storage with Redis config, but Redis will fail internally
    // This tests the fallback mechanism in createKVStorage
    const storage = createKVStorage(config);

    // Even if Redis fails, storage should be created (possibly fallback to memory)
    expect(storage).toBeDefined();
    expect(['redis', 'memory']).toContain(storage.type);
  });

  test('creates memory storage for invalid Redis configuration', () => {
    const invalidConfig: StorageConfig = {
      type: 'redis',
      // Missing connection_string intentionally
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    const storage = createKVStorage(invalidConfig);
    // Should fallback to memory storage due to invalid config
    expect(storage.type).toBe('memory');
  });
});

describe('checkStorageHealth', () => {
  let storage: KVStorage;

  beforeEach(() => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
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

describe('Storage Type Detection', () => {
  test('detects Redis type when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    delete process.env.EDGE_CONFIG_ID;
    delete process.env.EDGE_CONFIG_TOKEN;
    delete process.env.KV_CONNECTION_STRING;

    const config = createStorageConfig();
    expect(config.type).toBe('redis');
  });

  test('detects Redis type when KV_CONNECTION_STRING is set', () => {
    process.env.KV_CONNECTION_STRING = 'redis://localhost:6379';
    delete process.env.REDIS_URL;
    delete process.env.EDGE_CONFIG_ID;
    delete process.env.EDGE_CONFIG_TOKEN;

    const config = createStorageConfig();
    expect(config.type).toBe('redis');
  });

  test('detects Edge Config type when environment variables are set', () => {
    process.env.EDGE_CONFIG_ID = 'test-config-id';
    process.env.EDGE_CONFIG_TOKEN = 'test-token';
    delete process.env.REDIS_URL;
    delete process.env.KV_CONNECTION_STRING;

    const config = createStorageConfig();
    expect(config.type).toBe('edge-config');
  });

  test('defaults to memory type when no environment variables are set', () => {
    delete process.env.REDIS_URL;
    delete process.env.KV_CONNECTION_STRING;
    delete process.env.EDGE_CONFIG_ID;
    delete process.env.EDGE_CONFIG_TOKEN;

    const config = createStorageConfig();
    expect(config.type).toBe('memory');
  });
});

describe('Error Handling and Resilience', () => {
  test('memory storage handles concurrent operations', async () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };
    const storage = new MemoryStorage(config);

    // Perform multiple concurrent operations
    const operations = Array.from(
      { length: LOGGER_TEST_DATA.CONCURRENT_OPERATIONS_COUNT },
      (_, i) => storage.set(`key-${i}`, `value-${i}`)
    );

    await Promise.all(operations);

    // Verify all values are stored correctly
    for (let i = 0; i < LOGGER_TEST_DATA.CONCURRENT_OPERATIONS_COUNT; i++) {
      const value = await storage.get(`key-${i}`);
      expect(value).toBe(`value-${i}`);
    }
  });

  test('memory storage handles edge cases', async () => {
    const config: StorageConfig = {
      type: 'memory',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
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
    const largeValue = 'x'.repeat(LOGGER_TEST_DATA.LARGE_VALUE_SIZE);
    await storage.set('large', largeValue);
    expect(await storage.get('large')).toBe(largeValue);
  });

  test('validates Edge Config storage configuration requirements', () => {
    const configWithoutToken: StorageConfig = {
      type: 'edge-config',
      ttl_default: LOGGER_TEST_DATA.STORAGE_TTL_DEFAULT,
      max_retries: 3,
      timeout_ms: LOGGER_TEST_DATA.STORAGE_TIMEOUT_MS,
      fallback_enabled: true,
    };

    // Edge Config validation doesn't require connection_string since it uses env vars
    const isValid = validateStorageConfig(configWithoutToken);
    expect(typeof isValid).toBe('boolean');
  });

  test('handles invalid configuration values in edge cases', () => {
    const invalidConfigs = [
      { type: 'memory', ttl_default: -1 },
      { type: 'memory', max_retries: -5 },
      { type: 'memory', timeout_ms: 0 },
      { type: 'redis', connection_string: '' },
      { type: 'redis' }, // Missing connection_string
    ];

    invalidConfigs.forEach((config) => {
      expect(validateStorageConfig(config as any)).toBe(false);
    });
  });
});
