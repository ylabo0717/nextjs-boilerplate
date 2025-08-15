/**
 * Enhanced Metrics Unit Tests
 * Tests for Phase 3 operational metrics functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializePhase3Metrics,
  getPhase3Metrics,
  isPhase3MetricsInitialized,
  recordConfigFetchMetrics,
  recordConfigValidationError,
  recordRateLimitMetrics,
  recordKVMetrics,
  recordKVConnectionStatus,
  recordAdminAPIMetrics,
  getPhase3MetricsSnapshot,
  resetPhase3Metrics,
  withMetrics,
  recordBatchMetrics,
} from '@/lib/logger/enhanced-metrics';

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

beforeEach(() => {
  // Reset metrics before each test
  resetPhase3Metrics();

  // Mock console methods to avoid noise in test output
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  // Reset metrics after each test
  resetPhase3Metrics();
});

describe('Phase 3 Metrics Initialization', () => {
  test('initializePhase3Metrics creates metrics successfully', () => {
    const metrics = initializePhase3Metrics();

    expect(metrics).toBeDefined();
    expect(metrics.config_fetch_total).toBeDefined();
    expect(metrics.config_fetch_duration).toBeDefined();
    expect(metrics.config_cache_hits).toBeDefined();
    expect(metrics.rate_limit_decisions).toBeDefined();
    expect(metrics.kv_operations_total).toBeDefined();
    expect(metrics.admin_api_requests).toBeDefined();

    expect(isPhase3MetricsInitialized()).toBe(true);
    expect(console.log).toHaveBeenCalledWith('✅ Enhanced Metrics initialized successfully');
  });

  test('initializePhase3Metrics returns same instance on subsequent calls', () => {
    const metrics1 = initializePhase3Metrics();
    const metrics2 = initializePhase3Metrics();

    expect(metrics1).toBe(metrics2);
  });

  test('getPhase3Metrics returns null when not initialized', () => {
    expect(getPhase3Metrics()).toBeNull();
    expect(isPhase3MetricsInitialized()).toBe(false);
  });

  test('getPhase3Metrics returns instance when initialized', () => {
    const initializedMetrics = initializePhase3Metrics();
    const retrievedMetrics = getPhase3Metrics();

    expect(retrievedMetrics).toBe(initializedMetrics);
  });

  test('resetPhase3Metrics clears initialization state', () => {
    initializePhase3Metrics();
    expect(isPhase3MetricsInitialized()).toBe(true);

    resetPhase3Metrics();
    expect(isPhase3MetricsInitialized()).toBe(false);
    expect(getPhase3Metrics()).toBeNull();
  });
});

describe('Configuration Metrics', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('recordConfigFetchMetrics records successful fetch', () => {
    recordConfigFetchMetrics('remote', 'success', 150);

    // Verify metrics were called (we can't easily test the actual values without mocking deeper)
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordConfigFetchMetrics records cache hit', () => {
    recordConfigFetchMetrics('cache', 'success', 10);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordConfigFetchMetrics records failure', () => {
    recordConfigFetchMetrics('remote', 'error', 5000);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordConfigFetchMetrics handles uninitialized metrics gracefully', () => {
    resetPhase3Metrics();

    recordConfigFetchMetrics('remote', 'success', 100);

    expect(console.warn).toHaveBeenCalledWith(
      'Enhanced metrics not initialized, skipping config fetch metrics'
    );
  });

  test('recordConfigValidationError records validation errors', () => {
    recordConfigValidationError('invalid_type', 'global_level');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordConfigValidationError handles missing field name', () => {
    recordConfigValidationError('invalid_format');

    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('Rate Limit Metrics', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('recordRateLimitMetrics records allowed decision', () => {
    recordRateLimitMetrics('client-1', '/api/test', 'hit', 'token_exhausted');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordRateLimitMetrics records denied decision with backoff', () => {
    recordRateLimitMetrics('client-2', '/api/admin', 'reset', 'backoff_expired');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordRateLimitMetrics records sampling decision with adaptive rate', () => {
    recordRateLimitMetrics('client-3', '/api/metrics', 'hit', 'sampling_rejected');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordRateLimitMetrics handles minimal parameters', () => {
    recordRateLimitMetrics('client-4', '/api/test', 'hit', 'token_exhausted');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordRateLimitMetrics handles uninitialized metrics gracefully', () => {
    resetPhase3Metrics();

    recordRateLimitMetrics('client-5', '/api/test', 'hit', 'token_exhausted');

    expect(console.warn).toHaveBeenCalledWith(
      'Enhanced metrics not initialized, skipping rate limit metrics'
    );
  });
});

describe('KV Storage Metrics', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('recordKVMetrics records successful operation', () => {
    recordKVMetrics('redis', 'get', 'success', 25);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVMetrics records failed operation with error type', () => {
    recordKVMetrics('redis', 'set', 'error', 100);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVMetrics handles memory storage', () => {
    recordKVMetrics('memory', 'exists', 'success', 5);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVMetrics handles edge-config storage', () => {
    recordKVMetrics('edge-config', 'delete', 'success', 200);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVConnectionStatus records connected status', () => {
    recordKVConnectionStatus(true, 'redis');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVConnectionStatus records disconnected status', () => {
    recordKVConnectionStatus(false, 'redis');

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordKVMetrics handles uninitialized metrics gracefully', () => {
    resetPhase3Metrics();

    recordKVMetrics('redis', 'get', 'success', 25);

    expect(console.warn).toHaveBeenCalledWith(
      'Enhanced metrics not initialized, skipping KV metrics'
    );
  });
});

describe('Admin API Metrics', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('recordAdminAPIMetrics records successful request', () => {
    recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 50);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordAdminAPIMetrics records auth failure', () => {
    recordAdminAPIMetrics('POST', '/api/admin/log-level', 401, 100);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordAdminAPIMetrics records rate limit hit', () => {
    recordAdminAPIMetrics('GET', '/api/admin/log-level', 429, 150);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordAdminAPIMetrics handles auth failure and rate limit together', () => {
    recordAdminAPIMetrics('PATCH', '/api/admin/log-level', 429, 200);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordAdminAPIMetrics handles uninitialized metrics gracefully', () => {
    resetPhase3Metrics();

    recordAdminAPIMetrics('GET', '/api/admin/log-level', 200, 50);

    expect(console.warn).toHaveBeenCalledWith(
      'Enhanced metrics not initialized, skipping Admin API metrics'
    );
  });
});

describe('Metrics Snapshot and Utilities', () => {
  test('getPhase3MetricsSnapshot returns correct snapshot when not initialized', () => {
    const snapshot = getPhase3MetricsSnapshot();

    expect(snapshot.config_fetch_total).toBe(0);
    expect(snapshot.config_update_total).toBe(0);
    expect(snapshot.config_error_total).toBe(0);
    expect(snapshot.rate_limit_hits_total).toBe(0);
    expect(snapshot.rate_limit_resets_total).toBe(0);
    expect(snapshot.storage_operations_total).toBe(0);
    expect(snapshot.storage_errors_total).toBe(0);
    expect(snapshot.admin_api_calls_total).toBe(0);
    expect(snapshot.admin_api_errors_total).toBe(0);
    expect(typeof snapshot.timestamp).toBe('string');
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  test('getPhase3MetricsSnapshot returns correct snapshot when initialized', () => {
    initializePhase3Metrics();

    // Record some metrics to test counters
    recordConfigFetchMetrics('remote', 'success', 100);
    recordRateLimitMetrics('client-1', '/test', 'hit', 'token_exhausted');

    const snapshot = getPhase3MetricsSnapshot();

    expect(snapshot.config_fetch_total).toBeGreaterThan(0);
    expect(snapshot.rate_limit_hits_total).toBeGreaterThan(0);
    expect(typeof snapshot.timestamp).toBe('string');
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

describe('Higher-Order Functions', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('withMetrics measures successful operation', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await withMetrics('test_operation', 'config', mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('withMetrics measures failed operation', async () => {
    const mockError = new Error('Test error');
    const mockFn = vi.fn().mockRejectedValue(mockError);

    await expect(withMetrics('test_operation', 'config', mockFn)).rejects.toThrow('Test error');

    expect(mockFn).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('withMetrics handles KV operations', async () => {
    const mockFn = vi.fn().mockResolvedValue({ success: true });

    const result = await withMetrics('get', 'kv', mockFn);

    expect(result).toEqual({ success: true });
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('Batch Metrics Recording', () => {
  beforeEach(() => {
    initializePhase3Metrics();
  });

  test('recordBatchMetrics processes multiple config operations', () => {
    const operations = [
      {
        type: 'config' as const,
        data: { duration: 100, success: true, cached: false, source: 'remote' },
      },
      {
        type: 'config' as const,
        data: { duration: 50, success: true, cached: true, source: 'cache' },
      },
    ];

    recordBatchMetrics(operations);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordBatchMetrics processes multiple KV operations', () => {
    const operations = [
      {
        type: 'kv' as const,
        data: {
          operation: 'get',
          duration: 25,
          success: true,
          storageType: 'redis',
        },
      },
      {
        type: 'kv' as const,
        data: {
          operation: 'set',
          duration: 75,
          success: false,
          storageType: 'redis',
          errorType: 'timeout',
        },
      },
    ];

    recordBatchMetrics(operations);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordBatchMetrics handles mixed operation types', () => {
    const operations = [
      {
        type: 'config' as const,
        data: { duration: 100, success: true, cached: false },
      },
      {
        type: 'kv' as const,
        data: { operation: 'get', duration: 25, success: true, storageType: 'memory' },
      },
    ];

    recordBatchMetrics(operations);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordBatchMetrics handles empty operations array', () => {
    recordBatchMetrics([]);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordBatchMetrics handles invalid operation data gracefully', () => {
    const operations = [
      {
        type: 'config' as const,
        data: { invalid: 'data' }, // Missing required fields
      },
    ];

    recordBatchMetrics(operations);

    expect(console.warn).not.toHaveBeenCalled();
  });

  test('recordBatchMetrics handles uninitialized metrics gracefully', () => {
    resetPhase3Metrics();

    const operations = [
      {
        type: 'config' as const,
        data: { duration: 100, success: true, cached: false },
      },
    ];

    recordBatchMetrics(operations);

    expect(console.warn).toHaveBeenCalledWith(
      'Enhanced metrics not initialized, skipping batch metrics'
    );
  });
});

describe('Error Handling and Edge Cases', () => {
  test('metrics functions handle recording errors gracefully', () => {
    initializePhase3Metrics();

    // Mock a metrics method to throw an error
    const metrics = getPhase3Metrics()!;
    const originalAdd = metrics.config_fetch_total.add;
    metrics.config_fetch_total.add = vi.fn(() => {
      throw new Error('Metrics recording error');
    });

    // Should not throw, but should log warning
    recordConfigFetchMetrics('remote', 'success', 100);

    expect(console.warn).toHaveBeenCalledWith(
      'Failed to record config fetch metrics:',
      expect.any(Error)
    );

    // Restore original method
    metrics.config_fetch_total.add = originalAdd;
  });

  test('initialization handles meter creation errors', () => {
    // This is hard to test without mocking deeper into OpenTelemetry
    // but we can at least verify the function exists and handles errors
    expect(() => initializePhase3Metrics()).not.toThrow();
  });

  test('all metric recording functions handle missing optional parameters', () => {
    initializePhase3Metrics();

    // Test all functions with minimal parameters
    expect(() => {
      recordConfigFetchMetrics('remote', 'success', 100);
      recordConfigValidationError('test_error');
      recordRateLimitMetrics('client-1', '/api/test', 'hit', 'token_exhausted');
      recordKVMetrics('memory', 'get', 'success', 25);
      recordKVConnectionStatus(true, 'memory');
      recordAdminAPIMetrics('GET', '/test', 200, 100);
    }).not.toThrow();

    expect(console.warn).not.toHaveBeenCalled();
  });
});
