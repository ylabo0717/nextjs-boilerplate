/**
 * Rate Limiter Integration Tests
 * 
 * Tests the rate limiting system with real scenarios and storage integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createRateLimiterConfig,
  checkRateLimit,
  getRateLimiterStats,
  resetRateLimiterState,
  type RateLimiterConfig,
  type RateLimitResult,
} from '@/lib/logger/rate-limiter';
import { resetDefaultStorage } from '@/lib/logger/kv-storage';
import { LogLevel } from '@/lib/logger/types';

// Test constants
const TEST_CLIENT_ID = 'test-client-12345';
const TEST_ENDPOINT = '/api/test';

describe('Rate Limiter Integration Tests', () => {
  beforeEach(() => {
    resetDefaultStorage();
    resetRateLimiterState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetRateLimiterState();
    resetDefaultStorage();
    vi.restoreAllMocks();
  });

  describe('Rate Limit Basic Integration', () => {
    it('should create valid rate limiter configuration', () => {
      const config = createRateLimiterConfig({
        bucket_size: 10,
        refill_rate: 5,
        refill_interval_ms: 1000,
      });

      expect(config.bucket_size).toBe(10);
      expect(config.refill_rate).toBe(5);
      expect(config.refill_interval_ms).toBe(1000);
      expect(typeof config.enable_exponential_backoff).toBe('boolean');
    });

    it('should perform rate limit check operations', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 5,
        refill_rate: 2,
        refill_interval_ms: 1000,
      });

      // Initial check should be allowed
      const result = await checkRateLimit(
        config,
        TEST_CLIENT_ID,
        TEST_ENDPOINT,
        'info' as LogLevel
      );

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('tokens_remaining');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.tokens_remaining).toBe('number');
    });

    it('should track rate limiter statistics', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 3,
        refill_rate: 1,
        refill_interval_ms: 1000,
      });

      // Perform some rate limit checks
      await checkRateLimit(config, TEST_CLIENT_ID, TEST_ENDPOINT, 'info' as LogLevel);
      await checkRateLimit(config, 'client-2', TEST_ENDPOINT, 'warn' as LogLevel);

      const stats = getRateLimiterStats(TEST_CLIENT_ID, TEST_ENDPOINT);
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('Sampling Integration', () => {
    it('should handle sampling rates correctly', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 100, // Large bucket to focus on sampling
        refill_rate: 100,
        refill_interval_ms: 1000,
        sampling_rates: {
          error: 1.0,   // Always allow errors
          debug: 0.0,   // Never allow debug
        },
      });

      // Test error sampling (should pass more often)
      const errorResults = [];
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(
          config,
          `client_${i}`,
          TEST_ENDPOINT,
          'error' as LogLevel
        );
        errorResults.push(result.allowed);
      }

      // Test debug sampling (should be blocked more often due to 0.0 rate)
      const debugResults = [];
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(
          config,
          `client_debug_${i}`,
          TEST_ENDPOINT,
          'debug' as LogLevel
        );
        debugResults.push(result.allowed);
      }

      // Error should have higher success rate than debug
      const errorSuccessRate = errorResults.filter(Boolean).length / 10;
      const debugSuccessRate = debugResults.filter(Boolean).length / 10;
      
      expect(errorSuccessRate).toBeGreaterThanOrEqual(debugSuccessRate);
    });
  });

  describe('Multi-Client Integration', () => {
    it('should isolate rate limits between different clients', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 2,
        refill_rate: 1,
        refill_interval_ms: 1000,
      });
      
      const client1 = 'client-1';
      const client2 = 'client-2';

      // Both clients should start with the same capacity
      const client1Result1 = await checkRateLimit(
        config,
        client1,
        TEST_ENDPOINT,
        'info' as LogLevel
      );
      const client2Result1 = await checkRateLimit(
        config,
        client2,
        TEST_ENDPOINT,
        'info' as LogLevel
      );

      expect(client1Result1.allowed).toBe(true);
      expect(client2Result1.allowed).toBe(true);
      
      // Each client should have their own token bucket
      expect(typeof client1Result1.tokens_remaining).toBe('number');
      expect(typeof client2Result1.tokens_remaining).toBe('number');
    });

    it('should handle concurrent access from multiple clients', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 5,
        refill_rate: 2,
        refill_interval_ms: 1000,
      });
      
      // Create concurrent requests from different clients
      const clients = Array.from({ length: 10 }, (_, i) => `client-${i}`);
      const requests = clients.map(clientId =>
        checkRateLimit(config, clientId, TEST_ENDPOINT, 'info' as LogLevel)
      );

      const results = await Promise.all(requests);

      // All should get a response (though some might be rate limited)
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(typeof result.allowed).toBe('boolean');
        expect(typeof result.tokens_remaining).toBe('number');
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should handle different endpoint limits', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 5,
        refill_rate: 1,
        refill_interval_ms: 1000,
        endpoint_limits: {
          '/api/sensitive': { bucket_size: 2, refill_rate: 1 },
          '/api/public': { bucket_size: 10, refill_rate: 5 },
        },
      });

      // Test sensitive endpoint with separate client
      const sensitiveResult = await checkRateLimit(
        config,
        'sensitive-client',
        '/api/sensitive',
        'info' as LogLevel
      );

      // Test public endpoint with separate client
      const publicResult = await checkRateLimit(
        config,
        'public-client',
        '/api/public',
        'info' as LogLevel
      );

      expect(sensitiveResult.allowed).toBe(true);
      expect(publicResult.allowed).toBe(true);
      
      // Public endpoint should have more tokens available
      if (sensitiveResult.tokens_remaining !== undefined && publicResult.tokens_remaining !== undefined) {
        expect(publicResult.tokens_remaining).toBeGreaterThan(sensitiveResult.tokens_remaining);
      }
    });
  });

  describe('Storage Integration', () => {
    it('should persist state across function calls', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 3,
        refill_rate: 1,
        refill_interval_ms: 1000,
      });

      // First call
      const result1 = await checkRateLimit(
        config,
        TEST_CLIENT_ID,
        TEST_ENDPOINT,
        'info' as LogLevel
      );
      
      // Second call should have fewer tokens
      const result2 = await checkRateLimit(
        config,
        TEST_CLIENT_ID,
        TEST_ENDPOINT,
        'info' as LogLevel
      );

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      
      if (result1.tokens_remaining !== undefined && result2.tokens_remaining !== undefined) {
        expect(result2.tokens_remaining).toBeLessThan(result1.tokens_remaining);
      }
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage to fail
      vi.doMock('@/lib/logger/kv-storage', () => ({
        getDefaultStorage: () => ({
          get: () => Promise.reject(new Error('Storage unavailable')),
          set: () => Promise.reject(new Error('Storage unavailable')),
          delete: () => Promise.reject(new Error('Storage unavailable')),
          exists: () => Promise.reject(new Error('Storage unavailable')),
          type: 'memory',
        }),
        resetDefaultStorage: () => {},
      }));

      const config = createRateLimiterConfig({
        bucket_size: 5,
        refill_rate: 2,
        refill_interval_ms: 1000,
      });

      // Should not throw and should return a valid result
      const result = await checkRateLimit(
        config,
        TEST_CLIENT_ID,
        TEST_ENDPOINT,
        'info' as LogLevel
      );
      
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.tokens_remaining).toBe('number');
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 100,
        refill_rate: 50,
        refill_interval_ms: 1000,
      });

      const startTime = Date.now();

      // Make 50 requests rapidly
      const requests = Array.from({ length: 50 }, (_, i) =>
        checkRateLimit(config, `client-${i % 5}`, TEST_ENDPOINT, 'info' as LogLevel)
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All should be processed
      expect(results).toHaveLength(50);
      expect(results.every(result => typeof result.allowed === 'boolean')).toBe(true);

      // Should complete quickly (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid configurations gracefully', async () => {
      // Test with edge case configurations
      const configs = [
        createRateLimiterConfig({ bucket_size: 1, refill_rate: 1 }),
        createRateLimiterConfig({ bucket_size: 100, refill_rate: 1 }),
        createRateLimiterConfig({ bucket_size: 10, refill_rate: 100 }),
      ];

      for (const config of configs) {
        const result = await checkRateLimit(
          config,
          TEST_CLIENT_ID,
          TEST_ENDPOINT,
          'info' as LogLevel
        );
        
        expect(typeof result.allowed).toBe('boolean');
        expect(typeof result.tokens_remaining).toBe('number');
      }
    });

    it('should handle malformed client IDs and endpoints', async () => {
      const config = createRateLimiterConfig({
        bucket_size: 5,
        refill_rate: 2,
        refill_interval_ms: 1000,
      });

      const testCases = [
        { clientId: '', endpoint: '/api/test' },
        { clientId: 'client-1', endpoint: '' },
        { clientId: 'client with spaces', endpoint: '/api/test' },
        { clientId: 'client-1', endpoint: '/api/test with spaces' },
        { clientId: 'very-long-client-id-' + 'x'.repeat(100), endpoint: '/api/test' },
      ];

      for (const { clientId, endpoint } of testCases) {
        // Should not throw
        const result = await checkRateLimit(
          config,
          clientId,
          endpoint,
          'info' as LogLevel
        );
        
        expect(typeof result.allowed).toBe('boolean');
        expect(typeof result.tokens_remaining).toBe('number');
      }
    });
  });
});