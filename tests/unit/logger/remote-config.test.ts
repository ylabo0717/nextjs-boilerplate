/**
 * Remote Config Unit Tests
 *
 * Tests for remote configuration management
 * Focuses on validation and utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Remote Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration validation', () => {
    it('should validate remote config structure', async () => {
      const { validateRemoteConfig } = await import('../../../src/lib/logger/remote-config');

      const validConfig = {
        enabled: true,
        global_level: 'info',
        service_levels: {
          'test-service': 'debug',
        },
        rate_limits: {
          error_logs: 100,
          warn_logs: 500,
          info_logs: 1000,
          debug_logs: 50,
        },
        version: 1,
        last_updated: '2025-08-15T00:00:00.000Z',
      };

      const result = validateRemoteConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid config structure', async () => {
      const { validateRemoteConfig } = await import('../../../src/lib/logger/remote-config');

      const invalidConfig = {
        global_level: 'invalid-level',
        service_levels: 'not-object',
        rate_limits: null,
      };

      const result = validateRemoteConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject null config', async () => {
      const { validateRemoteConfig } = await import('../../../src/lib/logger/remote-config');

      const result = validateRemoteConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });
  });

  describe('Configuration merging', () => {
    it('should merge configurations correctly', async () => {
      const { mergeConfigurations } = await import('../../../src/lib/logger/remote-config');

      const baseConfig = {
        global_level: 'info' as const,
        service_levels: {
          service1: 'warn' as const,
        },
        rate_limits: {},
        last_updated: new Date().toISOString(),
        version: 1,
        enabled: true,
      };

      const overrideConfig = {
        global_level: 'debug' as const,
        service_levels: {
          service2: 'error' as const,
        },
        rate_limits: {},
        last_updated: new Date().toISOString(),
        version: 1,
        enabled: true,
      };

      const merged = mergeConfigurations(baseConfig, overrideConfig);

      expect(merged.global_level).toBe('debug');
      expect(merged.service_levels).toEqual({
        service1: 'warn',
        service2: 'error',
      });
    });
  });

  describe('Configuration utilities', () => {
    it('should get effective log level', async () => {
      const { getEffectiveLogLevel } = await import('../../../src/lib/logger/remote-config');

      const config = {
        enabled: true,
        global_level: 'info' as const,
        service_levels: {
          'specific-service': 'debug' as const,
        },
        rate_limits: {},
        last_updated: new Date().toISOString(),
        version: 1,
      };

      // Service with specific level should return that level
      expect(getEffectiveLogLevel(config, 'specific-service')).toBe('debug');
      // Service without specific level should return global level
      expect(getEffectiveLogLevel(config, 'other-service')).toBe('info');
    });

    it('should create default configuration', async () => {
      const { createDefaultConfig } = await import('../../../src/lib/logger/remote-config');

      const defaultConfig = createDefaultConfig();

      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.global_level).toBe('info');
      expect(defaultConfig.service_levels).toBeDefined();
      expect(defaultConfig.rate_limits).toBeDefined();
      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.version).toBe(1);
    });

    it('should handle configuration summary', async () => {
      const { getConfigSummary } = await import('../../../src/lib/logger/remote-config');

      const config = {
        enabled: true,
        global_level: 'info' as const,
        service_levels: {
          service1: 'debug' as const,
          service2: 'warn' as const,
        },
        rate_limits: {
          service1: 100,
        },
        version: 1,
        last_updated: '2025-08-15T00:00:00.000Z',
      };

      const summary = getConfigSummary(config);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('object');
      expect(summary.global_level).toBe('info');
      expect(summary.service_count).toBe(2);
      expect(summary.rate_limit_count).toBe(1);
      expect(summary.enabled).toBe(true);
    });
  });

  describe('Cache operations', () => {
    it('should manage cache operations', async () => {
      const { clearConfigCache } = await import('../../../src/lib/logger/remote-config');

      // Should not throw when clearing cache
      expect(() => clearConfigCache()).not.toThrow();
    });
  });
});
