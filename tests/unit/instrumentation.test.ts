/**
 * Instrumentation Unit Tests
 *
 * Tests for Next.js instrumentation register function
 * Focuses on error handling and environment detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the imported modules before importing register
vi.mock('../../src/lib/logger/metrics', () => ({
  initializeMetrics: vi.fn(),
}));

vi.mock('../../src/lib/logger/enhanced-metrics', () => ({
  initializePhase3Metrics: vi.fn(),
}));

describe('instrumentation.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register function', () => {
    it('should initialize metrics successfully in nodejs environment', async () => {
      // Set up nodejs environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'nodejs';

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      // Mock successful initialization
      vi.mocked(initializeMetrics).mockResolvedValue(undefined);
      const mockEnhancedMetrics = {
        config_fetch_total: { add: vi.fn() },
        config_fetch_duration: { record: vi.fn() },
        config_cache_hits: { add: vi.fn() },
        config_validation_errors: { add: vi.fn() },
        rate_limit_decisions: { add: vi.fn() },
        rate_limit_tokens: { record: vi.fn() },
        rate_limit_backoff_time: { record: vi.fn() },
        rate_limit_sampling_rate: { record: vi.fn() },
        kv_operations_total: { add: vi.fn() },
        kv_operation_duration: { record: vi.fn() },
        kv_connection_status: { record: vi.fn() },
        kv_operation_errors: { add: vi.fn() },
        admin_api_requests: { add: vi.fn() },
        admin_api_auth_failures: { add: vi.fn() },
        admin_api_rate_limits: { add: vi.fn() },
      };
      vi.mocked(initializePhase3Metrics).mockReturnValue(mockEnhancedMetrics);

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      expect(initializeMetrics).toHaveBeenCalledOnce();
      expect(initializePhase3Metrics).toHaveBeenCalledOnce();
      expect(console.log).toHaveBeenCalledWith('✅ Logger metrics initialized successfully');

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should skip initialization in edge environment', async () => {
      // Set up edge environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'edge';

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      expect(initializeMetrics).not.toHaveBeenCalled();
      expect(initializePhase3Metrics).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should skip initialization when NEXT_RUNTIME is undefined', async () => {
      // Set up undefined environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      delete process.env.NEXT_RUNTIME;

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      expect(initializeMetrics).not.toHaveBeenCalled();
      expect(initializePhase3Metrics).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should handle initializeMetrics errors gracefully', async () => {
      // Set up nodejs environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'nodejs';

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      // Mock initializeMetrics to throw error
      const testError = new Error('Metrics initialization failed');
      vi.mocked(initializeMetrics).mockRejectedValue(testError);
      const mockEnhancedMetrics = {
        config_fetch_total: { add: vi.fn() },
        config_fetch_duration: { record: vi.fn() },
        config_cache_hits: { add: vi.fn() },
        config_validation_errors: { add: vi.fn() },
        rate_limit_decisions: { add: vi.fn() },
        rate_limit_tokens: { record: vi.fn() },
        rate_limit_backoff_time: { record: vi.fn() },
        rate_limit_sampling_rate: { record: vi.fn() },
        kv_operations_total: { add: vi.fn() },
        kv_operation_duration: { record: vi.fn() },
        kv_connection_status: { record: vi.fn() },
        kv_operation_errors: { add: vi.fn() },
        admin_api_requests: { add: vi.fn() },
        admin_api_auth_failures: { add: vi.fn() },
        admin_api_rate_limits: { add: vi.fn() },
      };
      vi.mocked(initializePhase3Metrics).mockReturnValue(mockEnhancedMetrics);

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      expect(initializeMetrics).toHaveBeenCalledOnce();
      // initializePhase3Metrics should not be called if initializeMetrics fails
      expect(initializePhase3Metrics).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('❌ Failed to initialize metrics:', testError);
      expect(console.log).not.toHaveBeenCalled();

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should handle initializePhase3Metrics errors gracefully', async () => {
      // Set up nodejs environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'nodejs';

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      // Mock successful initializeMetrics but failing initializePhase3Metrics
      vi.mocked(initializeMetrics).mockResolvedValue(undefined);
      const testError = new Error('Phase 3 metrics initialization failed');
      vi.mocked(initializePhase3Metrics).mockImplementation(() => {
        throw testError;
      });

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      expect(initializeMetrics).toHaveBeenCalledOnce();
      expect(initializePhase3Metrics).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledWith('❌ Failed to initialize metrics:', testError);
      expect(console.log).not.toHaveBeenCalled();

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });

    it('should handle edge runtime environment', async () => {
      // Set up edge environment
      const originalRuntime = process.env.NEXT_RUNTIME;
      process.env.NEXT_RUNTIME = 'edge';

      const { initializeMetrics } = await import('../../src/lib/logger/metrics');
      const { initializePhase3Metrics } = await import('../../src/lib/logger/enhanced-metrics');

      vi.clearAllMocks();

      // Import and call register
      const { register } = await import('../../instrumentation');
      await register();

      // Should not initialize in edge environment
      expect(initializeMetrics).not.toHaveBeenCalled();
      expect(initializePhase3Metrics).not.toHaveBeenCalled();

      // Restore environment
      process.env.NEXT_RUNTIME = originalRuntime;
    });
  });
});
