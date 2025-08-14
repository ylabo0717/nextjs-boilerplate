/**
 * Enhanced Metrics Integration Tests
 *
 * Tests the enhanced metrics system with real OpenTelemetry integration,
 * metric collection, and monitoring scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  initializePhase3Metrics,
  isPhase3MetricsInitialized,
  getPhase3MetricsSnapshot,
  recordConfigFetchMetrics,
  recordConfigValidationError,
  recordRateLimitMetrics,
  recordKVMetrics,
  recordAdminAPIMetrics,
  resetPhase3Metrics,
} from '@/lib/logger/enhanced-metrics';

describe('Enhanced Metrics Integration Tests', () => {
  beforeEach(() => {
    resetPhase3Metrics();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetPhase3Metrics();
    vi.restoreAllMocks();
  });

  describe('Metrics Initialization Integration', () => {
    it('should initialize enhanced metrics correctly', () => {
      expect(isPhase3MetricsInitialized()).toBe(false);

      initializePhase3Metrics();

      expect(isPhase3MetricsInitialized()).toBe(true);
    });

    it('should handle multiple initialization calls safely', () => {
      initializePhase3Metrics();
      const firstSnapshot = getPhase3MetricsSnapshot();

      // Second initialization should not reset metrics
      initializePhase3Metrics();
      const secondSnapshot = getPhase3MetricsSnapshot();

      // Compare all properties except timestamp
      const { timestamp: firstTimestamp, ...firstData } = firstSnapshot;
      const { timestamp: secondTimestamp, ...secondData } = secondSnapshot;

      expect(secondData).toEqual(firstData);
    });

    it('should provide valid metrics snapshot after initialization', () => {
      initializePhase3Metrics();

      const snapshot = getPhase3MetricsSnapshot();

      expect(snapshot).toMatchObject({
        config_fetch_total: expect.any(Number),
        config_update_total: expect.any(Number),
        config_error_total: expect.any(Number),
        rate_limit_hits_total: expect.any(Number),
        rate_limit_resets_total: expect.any(Number),
        storage_operations_total: expect.any(Number),
        storage_errors_total: expect.any(Number),
        admin_api_calls_total: expect.any(Number),
        admin_api_errors_total: expect.any(Number),
        timestamp: expect.any(String),
      });

      // All metrics should start at 0
      expect(snapshot.config_fetch_total).toBe(0);
      expect(snapshot.config_update_total).toBe(0);
      expect(snapshot.config_error_total).toBe(0);
    });
  });

  describe('Configuration Metrics Integration', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should track configuration fetch operations', () => {
      // Record multiple fetches
      recordConfigFetchMetrics('remote', 'success', 50);
      recordConfigFetchMetrics('fallback', 'success', 25);
      recordConfigFetchMetrics('remote', 'success', 75);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.config_fetch_total).toBe(3);
    });

    it('should track configuration validation errors', () => {
      recordConfigValidationError('invalid_log_level', 'Invalid log level specified');
      recordConfigValidationError('missing_required_field', 'Missing enabled field');
      recordConfigValidationError('invalid_rate_limit', 'Rate limit must be positive');

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.config_error_total).toBe(3);
    });

    it('should handle real configuration lifecycle scenario', () => {
      // Simulate real configuration management flow

      // 1. Initial fetch from remote
      recordConfigFetchMetrics('remote', 'success', 45);

      // 2. Admin API call for update
      recordAdminAPIMetrics('POST', '/api/admin/log-level', 200, 150);

      // 3. Validation error during update
      recordConfigValidationError('validation_failed', 'Invalid service level');

      // 4. Fallback to previous config
      recordConfigFetchMetrics('fallback', 'success', 25);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.config_fetch_total).toBe(2);
      expect(snapshot.admin_api_calls_total).toBe(1);
      expect(snapshot.config_error_total).toBe(1);
    });
  });

  describe('Rate Limiting Metrics Integration', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should track rate limit hits and resets', () => {
      recordRateLimitMetrics('client-1', '/api/logs', 'hit', 'token_exhausted');
      recordRateLimitMetrics('client-2', '/api/metrics', 'hit', 'backoff_active');
      recordRateLimitMetrics('client-1', '/api/logs', 'reset', 'token_refill');

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.rate_limit_hits_total).toBe(2);
      expect(snapshot.rate_limit_resets_total).toBe(1);
    });

    it('should handle rate limiting burst scenario', () => {
      const clientId = 'burst-client';
      const endpoint = '/api/heavy-endpoint';

      // Simulate burst of requests hitting rate limit
      for (let i = 0; i < 10; i++) {
        recordRateLimitMetrics(clientId, endpoint, 'hit', 'token_exhausted');
      }

      // Then simulate reset and more requests
      recordRateLimitMetrics(clientId, endpoint, 'reset', 'token_refill');

      for (let i = 0; i < 5; i++) {
        recordRateLimitMetrics(clientId, endpoint, 'hit', 'token_exhausted');
      }

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.rate_limit_hits_total).toBe(15);
      expect(snapshot.rate_limit_resets_total).toBe(1);
    });
  });

  describe('Storage Metrics Integration', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should track storage operations and errors', () => {
      recordKVMetrics('redis', 'get', 'success', 50);
      recordKVMetrics('memory', 'set', 'success', 25);
      recordKVMetrics('edge-config', 'delete', 'success', 100);
      recordKVMetrics('redis', 'get', 'error', 200);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.storage_operations_total).toBe(4);
    });

    it('should handle storage backend failover scenario', () => {
      // Primary storage (Redis) fails
      recordKVMetrics('redis', 'get', 'error', 500);
      recordKVMetrics('redis', 'connection_timeout', 'error', 1000);

      // Fallback to Edge Config
      recordKVMetrics('edge-config', 'get', 'success', 150);
      recordKVMetrics('edge-config', 'set', 'success', 200);

      // Edge Config also fails
      recordKVMetrics('edge-config', 'set', 'error', 300);

      // Final fallback to memory
      recordKVMetrics('memory', 'get', 'success', 5);
      recordKVMetrics('memory', 'set', 'success', 3);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.storage_operations_total).toBe(7);
      expect(snapshot.storage_errors_total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Admin API Metrics Integration', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should track admin API calls and errors', () => {
      recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 50);
      recordAdminAPIMetrics('POST', '/api/admin/log-level', 200, 150);
      recordAdminAPIMetrics('PATCH', '/api/admin/log-level', 400, 100);
      recordAdminAPIMetrics('DELETE', '/api/admin/log-level', 401, 75);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.admin_api_calls_total).toBe(4);
    });

    it('should handle admin session with mixed success and errors', () => {
      // Admin authentication
      recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 45);

      // Failed update due to validation
      recordAdminAPIMetrics('POST', '/api/admin/log-level', 400, 120);

      // Successful partial update
      recordAdminAPIMetrics('PATCH', '/api/admin/log-level', 200, 120);

      // Rate limited subsequent request
      recordAdminAPIMetrics('GET', '/api/admin/log-level', 429, 50);

      // Successful reset after waiting
      recordAdminAPIMetrics('DELETE', '/api/admin/log-level', 200, 80);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.admin_api_calls_total).toBe(5);
    });
  });

  describe('Cross-Component Integration Scenarios', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should track end-to-end configuration update workflow', () => {
      // 1. Admin API receives configuration update
      recordAdminAPIMetrics('POST', '/api/admin/log-level', 200, 150);

      // 2. Configuration is validated and stored
      recordKVMetrics('redis', 'set', 'success', 75);

      // 3. Configuration cache is cleared
      recordKVMetrics('redis', 'delete', 'success', 30);

      // 4. Next log request fetches new config
      recordConfigFetchMetrics('remote', 'success', 45);
      recordKVMetrics('redis', 'get', 'success', 45);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.admin_api_calls_total).toBe(1);
      expect(snapshot.storage_operations_total).toBe(3);
      expect(snapshot.config_fetch_total).toBe(1);
    });

    it('should track rate limiting affecting multiple components', () => {
      const clientId = 'heavy-user';

      // 1. Rate limiting starts affecting admin API
      recordAdminAPIMetrics('POST', '/api/admin/log-level', 429, 100);
      recordRateLimitMetrics(clientId, '/api/admin/log-level', 'hit', 'burst_limit_exceeded');

      // 2. Rate limiting also affects metrics endpoint
      recordRateLimitMetrics(clientId, '/api/metrics', 'hit', 'token_exhausted');

      // 3. Storage operations slow down due to backoff
      recordKVMetrics('redis', 'get', 'success', 500); // Slow operation
      recordKVMetrics('redis', 'set', 'error', 1000); // Very slow, then fails

      // 4. Rate limits eventually reset
      recordRateLimitMetrics(clientId, '/api/admin/log-level', 'reset', 'backoff_expired');
      recordRateLimitMetrics(clientId, '/api/metrics', 'reset', 'token_refill');

      // 5. Normal operation resumes
      recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 50);
      recordKVMetrics('redis', 'get', 'success', 25);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.admin_api_calls_total).toBe(2);
      expect(snapshot.rate_limit_hits_total).toBe(2);
      expect(snapshot.rate_limit_resets_total).toBe(2);
      expect(snapshot.storage_operations_total).toBe(3); // Adjusted to actual count
    });
  });

  describe('Metrics Reset and Lifecycle', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should reset all metrics correctly', () => {
      // Record some metrics
      recordConfigFetchMetrics('remote', 'success', 50);
      recordKVMetrics('redis', 'get', 'success', 50);
      recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 75);
      recordRateLimitMetrics('client-1', '/api/test', 'hit', 'token_exhausted');

      const beforeReset = getPhase3MetricsSnapshot();
      expect(beforeReset.config_fetch_total).toBe(1);
      expect(beforeReset.storage_operations_total).toBe(1);
      expect(beforeReset.admin_api_calls_total).toBe(1);
      expect(beforeReset.rate_limit_hits_total).toBe(1);

      // Reset metrics
      resetPhase3Metrics();

      // Should need re-initialization
      expect(isPhase3MetricsInitialized()).toBe(false);

      // Re-initialize
      initializePhase3Metrics();

      const afterReset = getPhase3MetricsSnapshot();
      expect(afterReset.config_fetch_total).toBe(0);
      expect(afterReset.storage_operations_total).toBe(0);
      expect(afterReset.admin_api_calls_total).toBe(0);
      expect(afterReset.rate_limit_hits_total).toBe(0);
    });

    it('should handle metrics operations when not initialized', () => {
      resetPhase3Metrics();

      // These should not throw, but should be no-ops
      expect(() => {
        recordConfigFetchMetrics('remote', 'success', 50);
        recordKVMetrics('redis', 'get', 'success', 50);
        recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 75);
        recordRateLimitMetrics('client-1', '/api/test', 'hit', 'token_exhausted');
      }).not.toThrow();

      // Snapshot should return zeros or handle gracefully
      const snapshot = getPhase3MetricsSnapshot();
      expect(typeof snapshot.config_fetch_total).toBe('number');
      expect(typeof snapshot.timestamp).toBe('string');
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      initializePhase3Metrics();
    });

    it('should handle high-frequency metric recording efficiently', () => {
      const startTime = Date.now();

      // Record 1000 metrics rapidly
      for (let i = 0; i < 250; i++) {
        recordConfigFetchMetrics('remote', 'success', 25);
        recordKVMetrics('redis', 'get', 'success', 25);
        recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 50);
        recordRateLimitMetrics(`client-${i % 10}`, '/api/test', 'hit', 'token_exhausted');
      }

      const endTime = Date.now();

      // Should complete quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.config_fetch_total).toBe(250);
      expect(snapshot.storage_operations_total).toBe(250);
      expect(snapshot.admin_api_calls_total).toBe(250);
      expect(snapshot.rate_limit_hits_total).toBe(250);
    });

    it('should handle concurrent metric recording safely', async () => {
      // Create concurrent operations
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          Promise.resolve().then(() => {
            recordConfigFetchMetrics('remote', 'success', 25);
            recordKVMetrics('redis', 'get', 'success', 25);
          })
        );
      }

      await Promise.all(operations);

      const snapshot = getPhase3MetricsSnapshot();
      expect(snapshot.config_fetch_total).toBe(50);
      expect(snapshot.storage_operations_total).toBe(50);
    });
  });
});
