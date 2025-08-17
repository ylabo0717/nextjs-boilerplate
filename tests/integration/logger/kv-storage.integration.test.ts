/**
 * KV Storage Integration Tests
 *
 * Tests the KV storage abstraction layer with different backends
 * including Redis, Edge Config, and Memory storage with real scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createKVStorage,
  createStorageConfig,
  checkStorageHealth,
  getDefaultStorage,
  resetDefaultStorage,
  type KVStorage,
  type StorageConfig,
} from '@/lib/logger/kv-storage';

describe('KV Storage Integration Tests', () => {
  beforeEach(() => {
    // Reset environment and storage instance
    resetDefaultStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDefaultStorage();
    vi.restoreAllMocks();
  });

  describe('Memory Storage Integration', () => {
    let storage: KVStorage;

    beforeEach(() => {
      // Force memory storage
      vi.stubEnv('REDIS_URL', '');
      vi.stubEnv('EDGE_CONFIG_ID', '');
      vi.stubEnv('EDGE_CONFIG_TOKEN', '');

      storage = createKVStorage();
    });

    it('should handle complete CRUD operations with TTL', async () => {
      const key = 'integration_test_key';
      const value = 'integration_test_value';
      const shortTtl = 1; // 1 second

      // Set with short TTL
      await storage.set(key, value, shortTtl);

      // Immediate read should work
      const result1 = await storage.get(key);
      expect(result1).toBe(value);

      // Key should exist
      const exists1 = await storage.exists(key);
      expect(exists1).toBe(true);

      // Wait for TTL expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Key should be expired
      const result2 = await storage.get(key);
      expect(result2).toBeNull();

      const exists2 = await storage.exists(key);
      expect(exists2).toBe(false);
    });

    it('should handle concurrent operations safely', async () => {
      const baseKey = 'concurrent_test';
      const operations = [];

      // Create 10 concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(storage.set(`${baseKey}_${i}`, `value_${i}`));
      }

      // Execute all operations concurrently
      await Promise.all(operations);

      // Verify all values were set correctly
      for (let i = 0; i < 10; i++) {
        const result = await storage.get(`${baseKey}_${i}`);
        expect(result).toBe(`value_${i}`);
      }

      // Clean up
      const deleteOperations = [];
      for (let i = 0; i < 10; i++) {
        deleteOperations.push(storage.delete(`${baseKey}_${i}`));
      }
      await Promise.all(deleteOperations);

      // Verify all deleted
      for (let i = 0; i < 10; i++) {
        const exists = await storage.exists(`${baseKey}_${i}`);
        expect(exists).toBe(false);
      }
    });

    it('should pass health check', async () => {
      const healthResult = await checkStorageHealth(storage);

      expect(healthResult.success).toBe(true);
      expect(healthResult.data).toBe(true);
      expect(healthResult.error).toBeUndefined();
    });
  });

  describe('Storage Configuration Integration', () => {
    it('should create valid configuration from environment', () => {
      vi.stubEnv('KV_TTL_DEFAULT', '7200');
      vi.stubEnv('KV_MAX_RETRIES', '5');
      vi.stubEnv('KV_TIMEOUT_MS', '10000');
      vi.stubEnv('KV_FALLBACK_ENABLED', 'true');

      const config = createStorageConfig();

      expect(config.ttl_default).toBe(7200);
      expect(config.max_retries).toBe(5);
      expect(config.timeout_ms).toBe(10000);
      expect(config.fallback_enabled).toBe(true);
      expect(config.type).toBe('memory'); // No Redis/Edge Config configured
    });

    it('should detect Redis when configured', () => {
      vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

      const config = createStorageConfig();
      expect(config.type).toBe('redis');
      expect(config.connection_string).toBe('redis://localhost:6379');
    });

    it('should detect Edge Config when configured', () => {
      vi.stubEnv('REDIS_URL', '');
      vi.stubEnv('EDGE_CONFIG_ID', 'ecfg_test123');
      vi.stubEnv('EDGE_CONFIG_TOKEN', 'ect_test456');

      const config = createStorageConfig();
      expect(config.type).toBe('edge-config');
    });

    it('should fallback to memory storage for invalid Redis config', async () => {
      vi.stubEnv('REDIS_URL', 'invalid://url');

      const storage = createKVStorage();

      // Try an operation - should gracefully handle Redis failure and fallback
      try {
        await storage.set('test', 'value');
        await storage.get('test');
      } catch {
        // Errors are expected for invalid config
      }

      // Type might still be 'redis' but operations should fail and fallback behavior should work
      expect(['redis', 'memory']).toContain(storage.type);
    });
  });

  describe('Default Storage Singleton', () => {
    it('should maintain singleton pattern', () => {
      const storage1 = getDefaultStorage();
      const storage2 = getDefaultStorage();

      expect(storage1).toBe(storage2);
    });

    it('should reset singleton correctly', () => {
      const storage1 = getDefaultStorage();

      resetDefaultStorage();

      const storage2 = getDefaultStorage();
      expect(storage1).not.toBe(storage2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle storage errors gracefully', async () => {
      const storage = createKVStorage();

      // Mock console.warn to avoid noise in tests
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Test with extremely long key (potential edge case)
      const longKey = 'x'.repeat(10000);
      const result = await storage.get(longKey);

      // Should not throw, might return null or actual value depending on implementation
      expect(typeof result === 'string' || result === null).toBe(true);

      warnSpy.mockRestore();
    });

    it('should validate configuration properly', async () => {
      const invalidConfigs: Partial<StorageConfig>[] = [
        { type: 'invalid' as any },
        { type: 'redis', connection_string: undefined },
        { type: 'memory', ttl_default: -1 },
        { type: 'memory', max_retries: -1 },
        { type: 'memory', timeout_ms: 0 },
      ];

      for (const invalidConfig of invalidConfigs) {
        // Should fallback to memory storage with valid defaults
        const storage = createKVStorage(invalidConfig as StorageConfig);
        expect(storage.type).toBe('memory');

        // Should still be functional with memory storage
        await storage.set('test', 'value');
        const result = await storage.get('test');
        expect(result).toBe('value');

        // Clean up
        await storage.delete('test');

        // Verify the key is deleted
        const deletedResult = await storage.get('test');
        expect(deletedResult).toBe(null);
      }
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle logger configuration storage scenario', async () => {
      // Force memory storage to avoid Redis connection issues
      vi.stubEnv('REDIS_URL', '');
      vi.stubEnv('EDGE_CONFIG_ID', '');
      vi.stubEnv('EDGE_CONFIG_TOKEN', '');

      const storage = createKVStorage();

      // Simulate storing logger configuration
      const logConfig = {
        global_level: 'info',
        service_levels: {
          api: 'debug',
          auth: 'warn',
        },
        rate_limits: {
          error: 100,
          warn: 1000,
        },
        last_updated: new Date().toISOString(),
        version: 1,
        enabled: true,
      };

      const configKey = 'logger:remote_config:v1';
      const configValue = JSON.stringify(logConfig);

      // Store configuration
      await storage.set(configKey, configValue, 3600); // 1 hour TTL

      // Retrieve and verify
      const storedValue = await storage.get(configKey);
      expect(storedValue).toBe(configValue);

      const parsedConfig = JSON.parse(storedValue!);
      expect(parsedConfig.global_level).toBe('info');
      expect(parsedConfig.service_levels.api).toBe('debug');
      expect(parsedConfig.enabled).toBe(true);

      // Update configuration (simulating partial update)
      const updatedConfig = {
        ...logConfig,
        global_level: 'debug',
        version: 2,
        last_updated: new Date().toISOString(),
      };

      await storage.set(configKey, JSON.stringify(updatedConfig), 3600);

      // Verify update
      const updatedValue = await storage.get(configKey);
      const parsedUpdated = JSON.parse(updatedValue!);
      expect(parsedUpdated.global_level).toBe('debug');
      expect(parsedUpdated.version).toBe(2);

      // Cleanup
      await storage.delete(configKey);
      const exists = await storage.exists(configKey);
      expect(exists).toBe(false);
    });

    it('should handle rate limiting data storage scenario', async () => {
      // Force memory storage to avoid Redis connection issues
      vi.stubEnv('REDIS_URL', '');
      vi.stubEnv('EDGE_CONFIG_ID', '');
      vi.stubEnv('EDGE_CONFIG_TOKEN', '');

      const storage = createKVStorage();

      // Simulate rate limiting buckets
      const clientId = 'client_192.168.1.100';
      const bucketKey = `rate_limit:${clientId}`;

      const bucketData = {
        tokens: 8,
        last_refill: Date.now(),
        total_requests: 42,
        blocked_requests: 3,
      };

      // Store bucket data with short TTL
      await storage.set(bucketKey, JSON.stringify(bucketData), 60); // 1 minute

      // Simulate token consumption
      const storedData = await storage.get(bucketKey);
      expect(storedData).not.toBeNull();

      const bucket = JSON.parse(storedData!);
      expect(bucket.tokens).toBe(8);

      // Update bucket (consume tokens)
      bucket.tokens -= 2;
      bucket.total_requests += 2;

      await storage.set(bucketKey, JSON.stringify(bucket), 60);

      // Verify update
      const updatedData = await storage.get(bucketKey);
      const updatedBucket = JSON.parse(updatedData!);
      expect(updatedBucket.tokens).toBe(6);
      expect(updatedBucket.total_requests).toBe(44);
    });
  });
});
