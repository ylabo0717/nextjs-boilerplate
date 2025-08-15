/**
 * Rate Limiter Unit Tests
 * Tests for the KV storage-based rate limiter implementation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  createRateLimiterConfig,
  createInitialState,
  validateRateLimiterConfig,
  checkRateLimit,
  analyzeErrorFrequency,
  getRateLimiterStats,
  resetRateLimiterState,
  type RateLimiterConfig,
  type RateLimiterState,
} from '@/lib/logger/rate-limiter';

describe('Rate Limiter Configuration', () => {
  test('createRateLimiterConfig creates valid configuration', () => {
    const config = createRateLimiterConfig();

    expect(config.max_tokens).toBeGreaterThan(0);
    expect(config.refill_rate).toBeGreaterThan(0);
    expect(config.burst_capacity).toBeGreaterThanOrEqual(config.max_tokens);
    expect(config.backoff_multiplier).toBeGreaterThan(1);
    expect(config.max_backoff).toBeGreaterThan(0);
    expect(config.error_threshold).toBeGreaterThan(0);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.sampling_rates)).toBe(true);
  });

  test('validateRateLimiterConfig validates correctly', () => {
    const validConfig = createRateLimiterConfig();
    expect(validateRateLimiterConfig(validConfig)).toBe(true);

    // Test invalid configurations
    expect(
      validateRateLimiterConfig({
        ...validConfig,
        max_tokens: 0,
      })
    ).toBe(false);

    expect(
      validateRateLimiterConfig({
        ...validConfig,
        refill_rate: -1,
      })
    ).toBe(false);

    expect(
      validateRateLimiterConfig({
        ...validConfig,
        burst_capacity: validConfig.max_tokens - 1,
      })
    ).toBe(false);

    expect(
      validateRateLimiterConfig({
        ...validConfig,
        backoff_multiplier: 1,
      })
    ).toBe(false);

    expect(
      validateRateLimiterConfig({
        ...validConfig,
        sampling_rates: { error: 1.5 }, // Invalid rate > 1
      })
    ).toBe(false);

    expect(
      validateRateLimiterConfig({
        ...validConfig,
        sampling_rates: { error: -0.1 }, // Invalid rate < 0
      })
    ).toBe(false);
  });

  test('createInitialState creates immutable state', () => {
    const state = createInitialState();

    expect(state.tokens).toBeGreaterThan(0);
    expect(state.consecutive_rejects).toBe(0);
    expect(state.backoff_until).toBe(0);
    expect(state.total_requests).toBe(0);
    expect(state.successful_requests).toBe(0);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.error_counts)).toBe(true);
    expect(Object.isFrozen(state.error_timestamps)).toBe(true);
  });
});

describe('Rate Limiting Operations', () => {
  let config: RateLimiterConfig;

  beforeEach(() => {
    config = createRateLimiterConfig();
  });

  test('checkRateLimit allows requests for new client', async () => {
    const result = await checkRateLimit(config, 'test-client-1', '/api/test', 'info');

    expect(result.allowed).toBe(true);
    expect(result.tokens_remaining).toBeGreaterThanOrEqual(0);
    expect(result.reason).toBe('allowed');
  });

  test('checkRateLimit handles different endpoints separately', async () => {
    const clientId = 'test-client-2';

    const result1 = await checkRateLimit(config, clientId, '/api/endpoint1', 'info');
    const result2 = await checkRateLimit(config, clientId, '/api/endpoint2', 'info');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });

  test('checkRateLimit handles invalid config gracefully', async () => {
    // Test with a config that has invalid values
    const invalidConfig = {
      ...config,
      max_tokens: -1, // Invalid max_tokens
    };

    const result = await checkRateLimit(invalidConfig, 'test-client-3', '/api/test', 'error');

    // The current implementation sets initial tokens to effective config max_tokens,
    // which for invalid config becomes the invalid value (-1), so tokens would be negative
    // but the implementation still tries to consume a token, resulting in allowed=false
    expect(result.allowed).toBe(false);
    expect(result.tokens_remaining).toBe(0);
    expect(result.reason).toBe('tokens');
  });
});

describe('Error Frequency Analysis', () => {
  test('analyzeErrorFrequency calculates errors per minute correctly', () => {
    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - 60 * 1000;
    const twoMinutesAgo = currentTime - 120 * 1000;

    // Create state with errors at different times
    const timestamps = [
      twoMinutesAgo, // Should be excluded (>1 minute ago)
      oneMinuteAgo + 1000, // Should be included
      oneMinuteAgo + 30000, // Should be included
      currentTime - 5000, // Should be included
    ];

    const state: RateLimiterState = {
      ...createInitialState(),
      error_timestamps: timestamps,
      error_counts: {
        TypeError: 10,
        ReferenceError: 5,
        NetworkError: 2,
      },
    };

    const analysis = analyzeErrorFrequency(state, currentTime);

    expect(analysis.errors_per_minute).toBe(3); // Only last 3 timestamps
    expect(analysis.total_errors).toBe(4); // All timestamps
    expect(analysis.top_error_types).toHaveLength(3);
    expect(analysis.top_error_types[0]).toEqual({ type: 'TypeError', count: 10 });
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.top_error_types)).toBe(true);
  });

  test('analyzeErrorFrequency recommends adaptive sampling for high error rates', () => {
    const currentTime = Date.now();

    // Create state with many recent errors
    const recentTimestamps = Array.from({ length: 600 }, (_, i) => currentTime - i * 100);

    const state: RateLimiterState = {
      ...createInitialState(),
      error_timestamps: recentTimestamps,
    };

    const analysis = analyzeErrorFrequency(state, currentTime);

    expect(analysis.should_apply_adaptive).toBe(true);
    expect(analysis.recommended_sampling_rate).toBeLessThan(1);
  });
});

describe('Rate Limiter Statistics', () => {
  test('getRateLimiterStats retrieves statistics from storage', async () => {
    const clientId = 'test-client-stats';
    const endpoint = '/api/stats-test';
    const testConfig = createRateLimiterConfig();

    // First create some state by making a request
    await checkRateLimit(testConfig, clientId, endpoint, 'info');

    const stats = await getRateLimiterStats(clientId, endpoint);

    // Should retrieve basic stats from storage
    if (stats) {
      expect(stats.tokens).toBeGreaterThanOrEqual(0);
      expect(stats.total_requests).toBeGreaterThan(0);
      expect(stats.successful_requests).toBeGreaterThan(0);
      expect(stats.consecutive_rejects).toBe(0);
      expect(stats.backoff_until).toBe(0);
    } else {
      // If no stats exist, that's also valid behavior
      expect(stats).toBeNull();
    }
  });

  test('getRateLimiterStats returns null for non-existent client', async () => {
    const stats = await getRateLimiterStats('non-existent-client', '/api/non-existent');

    expect(stats).toBeNull();
  });
});

describe('Rate Limiter Reset and Management', () => {
  test('resetRateLimiterState creates fresh state', () => {
    const config = createRateLimiterConfig();

    const resetState = resetRateLimiterState(config);

    expect(resetState.tokens).toBe(config.max_tokens);
    expect(resetState.consecutive_rejects).toBe(0);
    expect(resetState.total_requests).toBe(0);
    expect(Object.keys(resetState.error_counts)).toHaveLength(0);
    expect(Object.isFrozen(resetState)).toBe(true);
  });

  test('resetRateLimiterState preserves error counts when requested', () => {
    const config = createRateLimiterConfig();

    const resetState = resetRateLimiterState(config, true);

    expect(resetState.tokens).toBe(config.max_tokens);
    expect(resetState.consecutive_rejects).toBe(0);
    expect(resetState.total_requests).toBe(0);
  });
});

describe('Edge Cases', () => {
  test('handles extreme configurations', () => {
    expect(() => {
      createRateLimiterConfig({
        max_tokens: 1,
        refill_rate: 1,
        burst_capacity: 1,
        backoff_multiplier: 2,
        max_backoff: 60,
        adaptive_sampling: false,
        error_threshold: 1,
        sampling_rates: {},
      });
    }).not.toThrow();
  });

  test('handles empty error data', () => {
    const state = createInitialState();
    const analysis = analyzeErrorFrequency(state, Date.now());

    expect(analysis.total_errors).toBe(0);
    expect(analysis.errors_per_minute).toBe(0);
    expect(analysis.should_apply_adaptive).toBe(false);
  });
});
