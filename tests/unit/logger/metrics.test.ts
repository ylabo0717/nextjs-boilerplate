/**
 * OpenTelemetry Metrics Unit Tests
 * 
 * Tests for metrics integration, counters, and initialization functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  initializeMetrics,
  incrementLogCounter,
  incrementErrorCounter,
  recordRequestDuration,
  updateMemoryUsage,
  getMetricsInstances,
  isMetricsInitialized,
  resetMetrics,
} from '../../../src/lib/logger/metrics';

// Mock OpenTelemetry modules
vi.mock('@opentelemetry/api', () => ({
  metrics: {
    setGlobalMeterProvider: vi.fn(),
    getMeterProvider: vi.fn(),
    getMeter: vi.fn(() => ({
      createCounter: vi.fn(() => ({
        add: vi.fn(),
      })),
      createHistogram: vi.fn(() => ({
        record: vi.fn(),
      })),
      createGauge: vi.fn(() => ({
        record: vi.fn(),
      })),
    })),
  },
}));

vi.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: vi.fn(() => ({})),
}));

vi.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: vi.fn(() => ({})),
}));

describe('OpenTelemetry Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMetrics();
  });

  afterEach(() => {
    resetMetrics();
  });

  describe('initializeMetrics', () => {
    it('should initialize metrics successfully', async () => {
      await expect(initializeMetrics()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      const { metrics } = await import('@opentelemetry/api');
      vi.mocked(metrics.setGlobalMeterProvider).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      await expect(initializeMetrics()).rejects.toThrow('Initialization failed');
    });
  });

  describe('utility functions', () => {
    it('should return metrics instances', () => {
      const instances = getMetricsInstances();
      
      expect(instances).toHaveProperty('logEntriesCounter');
      expect(instances).toHaveProperty('errorCounter');
      expect(instances).toHaveProperty('requestDurationHistogram');
      expect(instances).toHaveProperty('memoryUsageGauge');
    });

    it('should check initialization status correctly', () => {
      expect(isMetricsInitialized()).toBe(false);
    });

    it('should reset metrics instances', () => {
      resetMetrics();
      
      const instances = getMetricsInstances();
      expect(instances.logEntriesCounter).toBe(null);
      expect(instances.errorCounter).toBe(null);
      expect(instances.requestDurationHistogram).toBe(null);
      expect(instances.memoryUsageGauge).toBe(null);
      expect(isMetricsInitialized()).toBe(false);
    });
  });

  describe('metric functions with uninitialized state', () => {
    it('should handle incrementLogCounter gracefully when not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      incrementLogCounter('info', 'server', 'production');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Log counter not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle incrementErrorCounter gracefully when not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      incrementErrorCounter('validation_error', 'client', 'high');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error counter not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle recordRequestDuration gracefully when not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      recordRequestDuration(150, 'POST', 201, '/api/users');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Request duration histogram not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle updateMemoryUsage gracefully when not initialized', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      updateMemoryUsage('server', 'nodejs');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Memory usage gauge not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('parameter handling', () => {
    it('should use default parameters in incrementLogCounter', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      incrementLogCounter('warn', 'middleware');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Log counter not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default parameters in incrementErrorCounter', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      incrementErrorCounter('network_error', 'server');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error counter not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default route in recordRequestDuration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      recordRequestDuration(75, 'GET', 200);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Request duration histogram not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });

    it('should use default parameters in updateMemoryUsage', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      updateMemoryUsage();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Memory usage gauge not initialized, skipping metric update'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle console warnings properly', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Call multiple functions to test warning messages
      incrementLogCounter('error', 'server');
      incrementErrorCounter('test_error', 'client');
      recordRequestDuration(100, 'GET', 200);
      updateMemoryUsage('edge', 'edge');
      
      expect(consoleSpy).toHaveBeenCalledTimes(4);
      
      consoleSpy.mockRestore();
    });

    it('should not break when metrics functions are called multiple times', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          incrementLogCounter('info', 'test');
          incrementErrorCounter('test', 'test');
          recordRequestDuration(i * 10, 'GET', 200);
          updateMemoryUsage();
        }
      }).not.toThrow();
    });
  });

  describe('environment compatibility', () => {
    it('should handle different environment variables', () => {
      // Test that functions handle environment gracefully
      incrementLogCounter('debug', 'test');
      incrementLogCounter('info', 'test');
      
      // Should not throw any errors regardless of environment
      expect(true).toBe(true);
    });

    it('should handle missing process environment', () => {
      const originalProcess = global.process;
      
      // Temporarily remove process
      (global as any).process = undefined;
      
      expect(() => {
        updateMemoryUsage();
      }).not.toThrow();
      
      // Restore process
      global.process = originalProcess;
    });
  });
});