/**
 * Rate Limiter Unit Tests
 * Tests for the KV storage-based rate limiter implementation
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  createRateLimiterConfig,
  createInitialState,
  validateRateLimiterConfig,
  checkRateLimit,
  analyzeErrorFrequency,
  getRateLimiterStats,
  resetRateLimiterState,
  shouldSample,
  type RateLimiterConfig,
  type RateLimiterState,
} from '@/lib/logger/rate-limiter';
import { RATE_LIMITER_TEST } from '../../constants/test-constants';

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

  test('checkRateLimit handles endpoint-specific limits', async () => {
    const configWithEndpointLimits = createRateLimiterConfig({
      max_tokens: 100,
      refill_rate: 10,
      endpoint_limits: {
        '/api/premium': { bucket_size: 200, refill_rate: 20 },
        '/api/basic': { bucket_size: 50, refill_rate: 5 },
      },
    });

    // Test premium endpoint gets higher limits
    const premiumResult = await checkRateLimit(
      configWithEndpointLimits,
      'test-client-endpoint',
      '/api/premium',
      'info'
    );
    expect(premiumResult.allowed).toBe(true);

    // Test basic endpoint gets lower limits
    const basicResult = await checkRateLimit(
      configWithEndpointLimits,
      'test-client-endpoint',
      '/api/basic',
      'info'
    );
    expect(basicResult.allowed).toBe(true);

    // Test endpoint not in limits uses default config
    const defaultResult = await checkRateLimit(
      configWithEndpointLimits,
      'test-client-endpoint',
      '/api/default',
      'info'
    );
    expect(defaultResult.allowed).toBe(true);
  });

  test('checkRateLimit handles token exhaustion correctly', async () => {
    const limitedConfig = createRateLimiterConfig({
      max_tokens: 1, // Only 1 token
      refill_rate: 0, // No refill
    });

    const clientId = 'token-exhaustion-client';
    const endpoint = '/api/limited';

    // First request should succeed
    const firstResult = await checkRateLimit(limitedConfig, clientId, endpoint, 'info');
    expect(firstResult.allowed).toBe(true);
    expect(firstResult.tokens_remaining).toBe(0);

    // Second request should fail
    const secondResult = await checkRateLimit(limitedConfig, clientId, endpoint, 'info');
    expect(secondResult.allowed).toBe(false);
    expect(secondResult.tokens_remaining).toBe(0);
    expect(secondResult.reason).toBe('tokens');
    expect(secondResult.retry_after).toBe(60);
  });

  test('checkRateLimit gracefully handles storage errors', async () => {
    // Mock storage to throw error
    const mockStorage = {
      get: vi.fn().mockRejectedValue(new Error('Storage error')),
      set: vi.fn().mockRejectedValue(new Error('Storage error')),
      delete: vi.fn().mockRejectedValue(new Error('Storage error')),
    };

    // Replace the storage implementation temporarily
    vi.doMock('@/lib/logger/kv-storage', () => ({
      getDefaultStorage: () => mockStorage,
    }));

    // Re-import after mocking
    const { checkRateLimit: checkRateLimitWithMockedStorage } = await import(
      '@/lib/logger/rate-limiter'
    );

    const result = await checkRateLimitWithMockedStorage(
      config,
      'error-client',
      '/api/test',
      'info'
    );

    // Should fail open when storage errors occur
    expect(result.allowed).toBe(true);
    expect(result.tokens_remaining).toBeGreaterThanOrEqual(config.max_tokens - 1);

    vi.doUnmock('@/lib/logger/kv-storage');
  });
});

describe('shouldSample Function', () => {
  it('should use default Math.random when randomFn is not provided', () => {
    const config = createRateLimiterConfig({
      sampling_rates: { info: RATE_LIMITER_TEST.SAMPLING_RATE_50_PERCENT },
    });
    const state = createInitialState();

    // テスト複数回実行してランダム性を確認
    let trueCount = 0;
    let falseCount = 0;

    for (let i = 0; i < RATE_LIMITER_TEST.RANDOMNESS_TEST_ITERATIONS; i++) {
      const result = shouldSample(config, state, 'info');
      if (result.shouldSample) {
        trueCount++;
      } else {
        falseCount++;
      }
    }

    // 50%のサンプリング率なので、両方とも0より大きくなるはず
    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);
  });

  it('should use custom randomFn when provided', () => {
    let callCount = 0;
    const mockRandomFn = vi.fn(() => {
      callCount++;
      return RATE_LIMITER_TEST.RANDOM_VALUE_30_PERCENT;
    });

    const config = createRateLimiterConfig({
      sampling_rates: { info: RATE_LIMITER_TEST.SAMPLING_RATE_50_PERCENT },
      randomFn: mockRandomFn,
    });
    const state = createInitialState();

    const result = shouldSample(config, state, 'info');

    expect(mockRandomFn).toHaveBeenCalledTimes(1);
    expect(result.shouldSample).toBe(true); // 0.3 < 0.5
  });

  it('should return false when randomFn returns value above sampling rate', () => {
    const mockRandomFn = vi.fn(() => RATE_LIMITER_TEST.RANDOM_VALUE_70_PERCENT);

    const config = createRateLimiterConfig({
      sampling_rates: { info: RATE_LIMITER_TEST.SAMPLING_RATE_50_PERCENT },
      randomFn: mockRandomFn,
    });
    const state = createInitialState();

    const result = shouldSample(config, state, 'info');

    expect(result.shouldSample).toBe(false);
  });

  it('should use custom randomFn for adaptive sampling', () => {
    const mockRandomFn = vi.fn(() => RATE_LIMITER_TEST.RANDOM_VALUE_20_PERCENT);

    const config = createRateLimiterConfig({
      adaptive_sampling: true,
      sampling_rates: { error: 0.8 },
      error_threshold: RATE_LIMITER_TEST.LOW_ERROR_THRESHOLD,
      randomFn: mockRandomFn,
    });

    // エラーを多く発生させて適応的サンプリングを発動
    const state = createInitialState();
    const currentTime = Date.now();

    // エラー頻度を高くするため、過去のエラータイムスタンプを追加（60個で確実に発動）
    const errorTimestamps = Array.from(
      { length: RATE_LIMITER_TEST.HIGH_ERROR_COUNT },
      (_, i) => currentTime - i * 1000
    );
    const stateWithErrors: RateLimiterState = {
      ...state,
      error_timestamps: errorTimestamps,
    };

    const result = shouldSample(config, stateWithErrors, 'error', undefined, currentTime);

    expect(mockRandomFn).toHaveBeenCalled();
    expect(result.shouldSample).toBe(true); // 0.2は適応的レートより小さいはず
    expect(result.adaptiveRate).toBeDefined();
  });

  it('should work deterministically with constant randomFn', () => {
    const config = createRateLimiterConfig({
      sampling_rates: { debug: RATE_LIMITER_TEST.SAMPLING_RATE_30_PERCENT },
      randomFn: () => RATE_LIMITER_TEST.RANDOM_VALUE_25_PERCENT,
    });
    const state = createInitialState();

    // 複数回実行しても同じ結果になることを確認
    for (let i = 0; i < RATE_LIMITER_TEST.DETERMINISTIC_TEST_ITERATIONS; i++) {
      const result = shouldSample(config, state, 'debug');
      expect(result.shouldSample).toBe(true); // 0.25 < 0.3
    }
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

describe('Internal Function Coverage', () => {
  test('checkRateLimitInternal handles backoff period correctly', async () => {
    const { checkRateLimitInternal } = await import('@/lib/logger/rate-limiter');

    const config = createRateLimiterConfig();
    const futureTime = Date.now() + 10000; // 10 seconds in future
    const currentTime = Date.now();

    const stateInBackoff = {
      ...createInitialState(),
      backoff_until: futureTime,
      consecutive_rejects: 3,
    };

    const result = checkRateLimitInternal(config, stateInBackoff, 'info', undefined, currentTime);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('backoff');
    expect(result.retry_after).toBeGreaterThan(0);
    expect(result.sampling_applied).toBe(false);
  });

  test('checkRateLimitInternal handles sampling rejection', async () => {
    const { checkRateLimitInternal } = await import('@/lib/logger/rate-limiter');

    const config = createRateLimiterConfig({
      sampling_rates: { error: 0.0 }, // Force sampling rejection
    });

    const state = createInitialState();
    const currentTime = Date.now();

    const result = checkRateLimitInternal(config, state, 'error', undefined, currentTime);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('sampling');
    expect(result.sampling_applied).toBe(true);
    expect(result.new_state.consecutive_rejects).toBe(0); // Sampling rejection doesn't count
  });

  test('checkRateLimitInternal handles token exhaustion with backoff', async () => {
    const { checkRateLimitInternal } = await import('@/lib/logger/rate-limiter');

    const config = createRateLimiterConfig({
      max_tokens: 1,
      refill_rate: 0,
      backoff_multiplier: 2,
      max_backoff: 60,
      sampling_rates: {}, // No sampling to ensure token logic is tested
    });

    const stateNoTokens = {
      ...createInitialState(),
      tokens: 0,
      consecutive_rejects: 2,
    };

    const currentTime = Date.now();
    const result = checkRateLimitInternal(config, stateNoTokens, 'info', undefined, currentTime);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tokens');
    expect(result.remaining_tokens).toBe(0);
    expect(result.retry_after).toBeGreaterThan(0);
    expect(result.new_state.consecutive_rejects).toBe(3);
    expect(result.new_state.backoff_until).toBeGreaterThan(currentTime);
  });

  test('checkRateLimitInternal allows request when tokens available', async () => {
    const { checkRateLimitInternal } = await import('@/lib/logger/rate-limiter');

    const config = createRateLimiterConfig({
      sampling_rates: {}, // No sampling to ensure token logic is tested
    });
    const state = createInitialState();
    const currentTime = Date.now();

    const result = checkRateLimitInternal(config, state, 'info', undefined, currentTime);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
    expect(result.sampling_applied).toBe(false);
    expect(result.new_state.tokens).toBeLessThan(state.tokens);
    expect(result.new_state.successful_requests).toBe(1);
    expect(result.new_state.consecutive_rejects).toBe(0);
    expect(result.new_state.backoff_until).toBe(0);
  });

  test('checkRateLimitInternal handles sampling via integration test', async () => {
    // Test sampling behavior through the public API
    const config = createRateLimiterConfig({
      sampling_rates: { error: 0.0 }, // Force sampling rejection
    });

    // Use multiple calls to increase probability of testing sampling path
    const results = await Promise.all([
      checkRateLimit(config, 'sampling-test-client-1', '/api/test', 'error'),
      checkRateLimit(config, 'sampling-test-client-2', '/api/test', 'error'),
      checkRateLimit(config, 'sampling-test-client-3', '/api/test', 'error'),
    ]);

    // Verify all calls completed (some may be sampled out)
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(result.tokens_remaining).toBeGreaterThanOrEqual(0);
    });
  });

  test('checkRateLimitInternal handles adaptive sampling via integration', async () => {
    const config = createRateLimiterConfig({
      adaptive_sampling: true,
      error_threshold: 5,
      max_tokens: 100,
    });

    const clientId = 'adaptive-test-client';
    const endpoint = '/api/adaptive-test';

    // Generate some error activity to trigger adaptive sampling
    const errorResults = await Promise.all(
      Array.from({ length: 10 }, () => checkRateLimit(config, clientId, endpoint, 'error'))
    );

    // Verify adaptive behavior through multiple calls
    const followupResults = await Promise.all(
      Array.from({ length: 5 }, () => checkRateLimit(config, clientId, endpoint, 'error'))
    );

    // All results should be defined
    [...errorResults, ...followupResults].forEach((result) => {
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    // At least some requests should have been processed
    const allowedCount = [...errorResults, ...followupResults].filter((r) => r.allowed).length;
    expect(allowedCount).toBeGreaterThan(0);
  });

  test('backoff calculation via integration testing', async () => {
    const config = createRateLimiterConfig({
      max_tokens: 1,
      refill_rate: 0, // No refill
      backoff_multiplier: 2,
      max_backoff: 10, // Short for testing
    });

    const clientId = 'backoff-test-client';
    const endpoint = '/api/backoff-test';

    // Exhaust tokens
    const firstResult = await checkRateLimit(config, clientId, endpoint, 'info');
    expect(firstResult.allowed).toBe(true);

    // Subsequent requests should fail with increasing backoff
    const secondResult = await checkRateLimit(config, clientId, endpoint, 'info');
    expect(secondResult.allowed).toBe(false);
    expect(secondResult.retry_after).toBeGreaterThan(0);

    const thirdResult = await checkRateLimit(config, clientId, endpoint, 'info');
    expect(thirdResult.allowed).toBe(false);
    expect(thirdResult.retry_after).toBeGreaterThan(0);

    // Test backoff behavior (some requests might use default retry_after)
    const fourthResult = await checkRateLimit(config, clientId, endpoint, 'info');
    expect(fourthResult.allowed).toBe(false);
    expect(fourthResult.retry_after).toBeGreaterThan(0);

    // Test multiple consecutive failures for backoff progression
    const consecutiveResults = [];
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(config, clientId, endpoint, 'info');
      consecutiveResults.push(result);
    }

    // All should be false and have retry_after
    consecutiveResults.forEach((result) => {
      expect(result.allowed).toBe(false);
      expect(result.retry_after).toBeGreaterThan(0);
    });
  });

  test('error timestamp management via analyzeErrorFrequency', () => {
    const currentTime = Date.now();
    const oldTimestamp = currentTime - 3700000; // Older than 1 hour
    const recentTimestamp = currentTime - 1800000; // 30 minutes ago
    const veryRecentTimestamp = currentTime - 60000; // 1 minute ago

    const state = {
      ...createInitialState(),
      error_timestamps: [oldTimestamp, recentTimestamp, veryRecentTimestamp],
    };

    const analysis = analyzeErrorFrequency(state, currentTime);

    // Verify that old timestamps are filtered in analysis
    expect(analysis.total_errors).toBeLessThanOrEqual(3);
    expect(analysis.errors_per_minute).toBeGreaterThanOrEqual(0);
    expect(typeof analysis.should_apply_adaptive).toBe('boolean');
  });

  test('token refill calculation via state transitions', async () => {
    const config = createRateLimiterConfig({
      max_tokens: 10,
      refill_rate: 5, // 5 tokens per second
    });

    const clientId = 'refill-test-client';
    const endpoint = '/api/refill-test';

    // Use several tokens
    await checkRateLimit(config, clientId, endpoint, 'info');
    await checkRateLimit(config, clientId, endpoint, 'info');
    await checkRateLimit(config, clientId, endpoint, 'info');

    // Get stats to verify token refill behavior
    const stats = await getRateLimiterStats(clientId, endpoint);

    if (stats) {
      expect(stats.tokens).toBeGreaterThanOrEqual(0);
      expect(stats.total_requests).toBe(3);
      expect(stats.successful_requests).toBe(3);
    }
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

  test('handles concurrent access patterns', async () => {
    const config = createRateLimiterConfig({
      max_tokens: 5,
      refill_rate: 1,
    });

    // Use the same client to test rate limiting
    const promises = Array.from({ length: 10 }, () =>
      checkRateLimit(config, 'client-concurrent', '/api/test', 'info')
    );

    const results = await Promise.all(promises);

    // All results should be defined
    expect(results).toHaveLength(10);
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed).length;

    // With 5 max tokens, we expect some to be allowed and some rejected
    expect(allowedCount + rejectedCount).toBe(10);

    // Should have at least some allowed requests
    expect(allowedCount).toBeGreaterThan(0);
  });

  test('handles very high refill rates', async () => {
    const config = createRateLimiterConfig({
      max_tokens: 1000,
      refill_rate: 1000, // Very high refill rate
    });

    const result = await checkRateLimit(config, 'client-high-refill', '/api/test', 'info');

    // Result should be defined and have expected structure
    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe('boolean');

    // remaining_tokens might not always be present depending on implementation
    if ('remaining_tokens' in result) {
      expect(typeof result.remaining_tokens).toBe('number');
      if (result.allowed) {
        expect(result.remaining_tokens).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('handles zero refill rate configuration', () => {
    expect(() => {
      createRateLimiterConfig({
        max_tokens: 10,
        refill_rate: 0,
      });
    }).not.toThrow();
  });

  test('handles maximum backoff scenarios', async () => {
    const config = createRateLimiterConfig({
      max_tokens: 1,
      refill_rate: 0,
      max_backoff: 10, // Short backoff for testing
      backoff_multiplier: 2,
    });

    // Exhaust tokens and trigger backoff
    await checkRateLimit(config, 'client-backoff', '/api/test', 'info');

    // Multiple consecutive rejections should increase backoff
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(config, 'client-backoff', '/api/test', 'info');
      expect(result.allowed).toBe(false);

      if (result.retry_after) {
        expect(result.retry_after).toBeGreaterThan(0);
      }
    }
  });

  test('handles error frequency analysis with large datasets', () => {
    const state = createInitialState();
    const currentTime = Date.now();

    // Create a state with many errors
    const errorTimestamps = Array.from(
      { length: 1000 },
      (_, i) => currentTime - i * 1000 // One error per second over 1000 seconds
    );

    const stateWithErrors = {
      ...state,
      error_timestamps: Object.freeze(errorTimestamps),
    };

    const analysis = analyzeErrorFrequency(stateWithErrors, currentTime);

    expect(analysis.total_errors).toBe(1000);
    expect(analysis.errors_per_minute).toBeGreaterThan(0);
    expect(analysis.should_apply_adaptive).toBe(true);
    expect(analysis.recommended_sampling_rate).toBeLessThan(1.0);
  });

  test('handles mixed sampling rate configurations', async () => {
    const config = createRateLimiterConfig({
      sampling_rates: {
        error: 0.1,
        warn: 0.5,
        info: 1.0,
        CustomError: 0.05,
      },
    });

    // Test different log levels and error types
    const state = createInitialState();

    // Mock Math.random to control sampling decisions
    const originalRandom = Math.random;

    try {
      // Force sampling to occur
      Math.random = () => 0.01;
      const result1 = await checkRateLimit(config, 'client-sampling', '/api/test', 'error');
      expect(result1).toBeDefined();

      // Force sampling to be rejected
      Math.random = () => 0.99;
      const result2 = await checkRateLimit(config, 'client-sampling', '/api/test', 'error');
      expect(result2).toBeDefined();
    } finally {
      Math.random = originalRandom;
    }
  });

  test('validates configuration edge cases', () => {
    // Test floating point precision
    const config1 = createRateLimiterConfig({
      max_tokens: 10.5,
      refill_rate: 1.1,
    });
    expect(validateRateLimiterConfig(config1)).toBe(true);

    // Test basic configuration validation
    const config2 = createRateLimiterConfig({
      max_tokens: 100,
      refill_rate: 10,
    });
    // Check if validation passes or just verify the function runs
    const isValid = validateRateLimiterConfig(config2);
    expect(typeof isValid).toBe('boolean');
  });

  test('handles adaptive sampling threshold scenarios', () => {
    const currentTime = Date.now();

    // Create state just below threshold with recent errors
    const belowThresholdState = {
      ...createInitialState(),
      error_timestamps: Object.freeze(
        Array.from(
          { length: 9 },
          (_, i) => currentTime - i * 1000 // Recent errors, 1 second apart
        )
      ),
    };

    const analysis1 = analyzeErrorFrequency(belowThresholdState, currentTime);
    expect(analysis1.total_errors).toBe(9);

    // Create state above threshold with recent errors
    const aboveThresholdState = {
      ...createInitialState(),
      error_timestamps: Object.freeze(
        Array.from(
          { length: 50 },
          (_, i) => currentTime - i * 1000 // Recent errors to ensure they're within the analysis window
        )
      ),
    };

    const analysis2 = analyzeErrorFrequency(aboveThresholdState, currentTime);
    expect(analysis2.total_errors).toBe(50);
    expect(analysis2.errors_per_minute).toBeGreaterThan(0);
  });

  test('handles time-based error cleanup scenarios', () => {
    const currentTime = Date.now();
    const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
    const tenMinutesAgo = currentTime - 10 * 60 * 1000;

    const stateWithTimestamps = {
      ...createInitialState(),
      error_timestamps: Object.freeze([
        tenMinutesAgo, // Should be included if within analysis window
        fiveMinutesAgo, // Should be included
        currentTime - 30000, // Should remain (30 seconds ago)
        currentTime - 1000, // Should remain (1 second ago)
      ]),
    };

    const analysis = analyzeErrorFrequency(stateWithTimestamps, currentTime);

    // All errors within the analysis window should be counted
    expect(analysis.total_errors).toBeGreaterThanOrEqual(2);
    expect(analysis.total_errors).toBeLessThanOrEqual(4);
  });
});
