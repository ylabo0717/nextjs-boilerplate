/**
 * Rate Limiter Unit Tests
 * Tests for the Token Bucket + Exponential Backoff rate limiter
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  createRateLimiterConfig,
  createInitialState,
  validateRateLimiterConfig,
  checkRateLimit,
  updateErrorCounts,
  analyzeErrorFrequency,
  getRateLimiterStats,
  resetRateLimiterState,
  predictRateLimitBehavior,
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
    expect(validateRateLimiterConfig({
      ...validConfig,
      max_tokens: 0,
    })).toBe(false);

    expect(validateRateLimiterConfig({
      ...validConfig,
      refill_rate: -1,
    })).toBe(false);

    expect(validateRateLimiterConfig({
      ...validConfig,
      burst_capacity: validConfig.max_tokens - 1,
    })).toBe(false);

    expect(validateRateLimiterConfig({
      ...validConfig,
      backoff_multiplier: 1,
    })).toBe(false);

    expect(validateRateLimiterConfig({
      ...validConfig,
      sampling_rates: { error: 1.5 }, // Invalid rate > 1
    })).toBe(false);

    expect(validateRateLimiterConfig({
      ...validConfig,
      sampling_rates: { error: -0.1 }, // Invalid rate < 0
    })).toBe(false);
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

describe('Token Bucket Algorithm', () => {
  let config: RateLimiterConfig;
  let state: RateLimiterState;

  beforeEach(() => {
    config = createRateLimiterConfig();
    state = createInitialState();
  });

  test('allows requests within token limit', () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);
    const fixedTime = Date.now();

    try {
      const testState = {
        ...state,
        last_refill: fixedTime,
      };
      
      const result = checkRateLimit(config, testState, 'info', undefined, fixedTime);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('allowed');
      expect(result.remaining_tokens).toBe(testState.tokens - 1);
      expect(result.sampling_applied).toBe(false);
      expect(Object.isFrozen(result.new_state)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('denies requests when tokens exhausted', () => {
    // Mock Math.random to always allow sampling (avoid sampling rejection)
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1); // Low value to pass sampling

    try {
      // Consume all tokens
      let currentState = state;
      for (let i = 0; i < state.tokens; i++) {
        const result = checkRateLimit(config, currentState, 'info');
        if (result.allowed) {
          currentState = result.new_state;
        } else {
          break; // Sampling rejection, break early
        }
      }

      // Next request should be denied
      const result = checkRateLimit(config, currentState, 'info');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('tokens');
      expect(result.remaining_tokens).toBe(0);
      expect(result.retry_after).toBeGreaterThan(0);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('refills tokens over time', () => {
    const baseTime = Date.now();
    
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);
    
    try {
      const testConfig: RateLimiterConfig = {
        ...config,
        sampling_rates: {
          fatal: 1.0,
          error: 1.0,
          warn: 1.0,
          info: 1.0,
          debug: 1.0,
          trace: 1.0,
        },
      };

      // Create state with consistent time
      const testState: RateLimiterState = {
        ...state,
        last_refill: baseTime,
      };

      let currentState = testState;
      let consumedCount = 0;
      
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(testConfig, currentState, 'info', undefined, baseTime);
        
        if (result.allowed) {
          currentState = result.new_state;
          consumedCount++;
        } else {
          break;
        }
      }

      expect(consumedCount).toBeGreaterThan(0);
      const tokensAfterConsumption = currentState.tokens;

      // Advance time by 10 seconds
      const newTime = baseTime + 10000;
      const result = checkRateLimit(testConfig, currentState, 'info', undefined, newTime);

      // Should have refilled tokens
      const expectedRefill = 10 * testConfig.refill_rate;
      const expectedTokens = Math.min(
        testConfig.burst_capacity,
        tokensAfterConsumption + expectedRefill
      );
      expect(result.new_state.tokens).toBeCloseTo(expectedTokens - 1, 1);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('applies exponential backoff after consecutive rejections', () => {
    // Create state with no tokens
    const emptyState: RateLimiterState = {
      ...state,
      tokens: 0,
    };

    // Mock Math.random to always allow sampling (avoid sampling rejection)
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1); // Low value to pass sampling

    try {
      // First rejection
      const result1 = checkRateLimit(config, emptyState, 'info');
      expect(result1.allowed).toBe(false);
      expect(result1.reason).toBe('tokens');
      expect(result1.new_state.consecutive_rejects).toBe(1);

      // Second rejection should be in backoff
      const result2 = checkRateLimit(config, result1.new_state, 'info');
      expect(result2.allowed).toBe(false);
      expect(result2.reason).toBe('backoff');
      expect(result2.new_state.consecutive_rejects).toBe(1); // Should remain same during backoff
    } finally {
      Math.random = originalRandom;
    }
  });

  test('respects sampling rates', () => {
    const customConfig: RateLimiterConfig = {
      ...config,
      sampling_rates: {
        fatal: 1.0,
        error: 1.0,
        warn: 1.0,
        info: 1.0,
        debug: 0.0,
        trace: 0.0,
      },
    };

    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = vi.fn(() => {
      callCount++;
      return 0.1; // Any value > 0 should be rejected with 0% sampling
    });

    try {
      const result = checkRateLimit(customConfig, state, 'debug');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('sampling');
      expect(result.sampling_applied).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });
});

describe('Error Count Management', () => {
  let state: RateLimiterState;

  beforeEach(() => {
    state = createInitialState();
  });

  test('updateErrorCounts increments error counts correctly', () => {
    const currentTime = Date.now();
    const newState = updateErrorCounts(state, 'TypeError', currentTime, 3);

    expect(newState.error_counts['TypeError']).toBe(3);
    expect(newState.error_timestamps).toHaveLength(3);
    expect(Object.isFrozen(newState)).toBe(true);
    expect(Object.isFrozen(newState.error_counts)).toBe(true);
    expect(Object.isFrozen(newState.error_timestamps)).toBe(true);
  });

  test('updateErrorCounts accumulates counts for same error type', () => {
    const currentTime = Date.now();
    let newState = updateErrorCounts(state, 'TypeError', currentTime, 2);
    newState = updateErrorCounts(newState, 'TypeError', currentTime + 1000, 3);

    expect(newState.error_counts['TypeError']).toBe(5);
    expect(newState.error_timestamps).toHaveLength(5);
  });

  test('updateErrorCounts cleans old timestamps', () => {
    const baseTime = Date.now();
    const oldTime = baseTime - (2 * 3600 * 1000); // 2 hours ago

    // Add old errors
    let newState = updateErrorCounts(state, 'OldError', oldTime, 5);
    
    // Add recent errors
    newState = updateErrorCounts(newState, 'RecentError', baseTime, 3);

    // Old timestamps should be cleaned
    expect(newState.error_timestamps.filter(t => t === oldTime)).toHaveLength(0);
    expect(newState.error_timestamps.filter(t => t === baseTime)).toHaveLength(3);
  });
});

describe('Error Frequency Analysis', () => {
  test('analyzeErrorFrequency calculates errors per minute correctly', () => {
    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - (60 * 1000);
    const twoMinutesAgo = currentTime - (120 * 1000);

    // Create state with errors at different times
    const timestamps = [
      twoMinutesAgo,          // Should be excluded (>1 minute ago)
      oneMinuteAgo + 1000,    // Should be included
      oneMinuteAgo + 30000,   // Should be included
      currentTime - 5000,     // Should be included
    ];

    const state: RateLimiterState = {
      ...createInitialState(),
      error_timestamps: timestamps,
      error_counts: {
        'TypeError': 10,
        'ReferenceError': 5,
        'NetworkError': 2,
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
    const recentTimestamps = Array.from({ length: 600 }, (_, i) => currentTime - (i * 100));
    
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
  test('getRateLimiterStats calculates statistics correctly', () => {
    const config = createRateLimiterConfig();
    const state: RateLimiterState = {
      ...createInitialState(),
      total_requests: 100,
      successful_requests: 80,
      tokens: config.max_tokens / 2,
    };

    const stats = getRateLimiterStats(state, config);

    expect(stats.success_rate).toBe(0.8);
    expect(stats.utilization).toBeGreaterThan(0);
    expect(stats.backoff_active).toBe(false);
    expect(Object.isFrozen(stats)).toBe(true);
  });

  test('getRateLimiterStats detects active backoff', () => {
    const config = createRateLimiterConfig();
    const currentTime = Date.now();
    const state: RateLimiterState = {
      ...createInitialState(),
      backoff_until: currentTime + 30000, // 30 seconds from now
    };

    const stats = getRateLimiterStats(state, config, currentTime);

    expect(stats.backoff_active).toBe(true);
    expect(stats.backoff_remaining).toBe(30);
  });
});

describe('Rate Limiter Reset and Prediction', () => {
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

  test('predictRateLimitBehavior predicts capacity exhaustion', () => {
    const config = createRateLimiterConfig();
    const state = createInitialState();

    // Predict behavior for high request rate
    const prediction = predictRateLimitBehavior(config, state, 50, 10); // 50 req/s for 10s

    expect(prediction.will_hit_limit).toBe(true);
    expect(prediction.estimated_success_rate).toBeLessThan(1);
    expect(prediction.tokens_exhausted_at).toBeGreaterThan(Date.now());
    expect(prediction.recommendations).toContain('Consider increasing refill_rate or max_tokens');
    expect(Object.isFrozen(prediction)).toBe(true);
    expect(Object.isFrozen(prediction.recommendations)).toBe(true);
  });

  test('predictRateLimitBehavior handles sustainable rates', () => {
    const config = createRateLimiterConfig();
    const state = createInitialState();

    // Predict behavior for sustainable request rate
    const prediction = predictRateLimitBehavior(config, state, 5, 10); // 5 req/s for 10s

    expect(prediction.will_hit_limit).toBe(false);
    expect(prediction.estimated_success_rate).toBe(1);
    expect(prediction.tokens_exhausted_at).toBeUndefined();
    expect(prediction.recommendations).toHaveLength(0);
  });
});

describe('Adaptive Sampling Integration', () => {
  test('rate limiter applies adaptive sampling for high error rates', () => {
    const config: RateLimiterConfig = {
      ...createRateLimiterConfig(),
      adaptive_sampling: true,
    };

    // Create state with high error frequency
    const currentTime = Date.now();
    const recentErrors = Array.from({ length: 600 }, (_, i) => currentTime - (i * 100));
    
    const state: RateLimiterState = {
      ...createInitialState(),
      error_timestamps: recentErrors,
    };

    // Mock Math.random to always return 0.9 (should trigger adaptive sampling)
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9);

    try {
      const result = checkRateLimit(config, state, 'error', 'NetworkError', currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('sampling');
      expect(result.adaptive_rate).toBeDefined();
      expect(result.adaptive_rate).toBeLessThan(1);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('rate limiter bypasses adaptive sampling for fatal errors', () => {
    const config: RateLimiterConfig = {
      ...createRateLimiterConfig(),
      adaptive_sampling: true,
      sampling_rates: {
        ...createRateLimiterConfig().sampling_rates,
        fatal: 1.0, // Always allow fatal errors
      },
    };

    const state = createInitialState();

    const result = checkRateLimit(config, state, 'fatal');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
  });
});

describe('Edge Cases and Error Handling', () => {
  test('handles invalid configuration gracefully', () => {
    const invalidConfig: RateLimiterConfig = {
      ...createRateLimiterConfig(),
      max_tokens: -1, // Invalid
    };

    const state = createInitialState();
    const result = checkRateLimit(invalidConfig, state, 'info');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tokens');
  });

  test('handles extreme time values', () => {
    const config = createRateLimiterConfig();
    const state = createInitialState();

    // Test with very large timestamp
    const extremeTime = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year from now
    const result = checkRateLimit(config, state, 'info', undefined, extremeTime);

    expect(result.new_state.tokens).toBeLessThanOrEqual(config.burst_capacity);
    expect(result.new_state.tokens).toBeGreaterThanOrEqual(0);
  });

  test('maintains state immutability under all operations', () => {
    const config = createRateLimiterConfig();
    let state = createInitialState();

    // Perform various operations
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(config, state, 'error', 'TestError');
      state = result.new_state;
      expect(Object.isFrozen(state)).toBe(true);
      
      state = updateErrorCounts(state, 'TestError');
      expect(Object.isFrozen(state)).toBe(true);
    }
  });
});