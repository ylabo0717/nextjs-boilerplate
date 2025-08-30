/**
 * Advanced Rate Limiter with Token Bucket + Exponential Backoff
 * Pure function implementation with metrics integration
 *
 * Provides adaptive log sampling and rate limiting to prevent log flooding.
 * Uses Token Bucket algorithm with exponential backoff for resilient rate control.
 */

import { getDefaultStorage } from './kv-storage';

import type { LogLevel } from './types';

/**
 * Rate limiter configuration interface (immutable)
 *
 * Defines configuration for Token Bucket + Exponential Backoff + Adaptive Sampling algorithm.
 *
 * @public
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens (bucket size) */
  readonly max_tokens: number;
  /** Alias for max_tokens (for compatibility) */
  readonly bucket_size?: number;
  /** Token refill rate (tokens per second) */
  readonly refill_rate: number;
  /** Refill interval in milliseconds (for compatibility) */
  readonly refill_interval_ms?: number;
  /** Burst capacity allowance */
  readonly burst_capacity: number;
  /** Backoff multiplier */
  readonly backoff_multiplier: number;
  /** Maximum backoff time in seconds */
  readonly max_backoff: number;
  /** Sampling rates by log level */
  readonly sampling_rates: Readonly<Record<string, number>>;
  /** Enable adaptive sampling */
  readonly adaptive_sampling: boolean;
  /** Adaptive sampling trigger threshold (errors per minute) */
  readonly error_threshold: number;
  /** Enable exponential backoff (for compatibility) */
  readonly enable_exponential_backoff?: boolean;
  /** Per-endpoint limit settings */
  readonly endpoint_limits?: Record<string, { bucket_size?: number; refill_rate?: number }>;
  /** Custom random number generator function for testing */
  readonly randomFn?: () => number;
}

/**
 * Rate limit state interface (functional approach)
 *
 * Immutable object representing the current state of the rate limiter.
 *
 * @public
 */
export interface RateLimiterState {
  /** Current number of tokens */
  readonly tokens: number;
  /** Last token refill timestamp */
  readonly last_refill: number;
  /** Number of consecutive rejections */
  readonly consecutive_rejects: number;
  /** Backoff expiration timestamp */
  readonly backoff_until: number;
  /** Error counts by error type */
  readonly error_counts: Readonly<Record<string, number>>;
  /** History of error occurrence timestamps */
  readonly error_timestamps: readonly number[];
  /** Total number of requests */
  readonly total_requests: number;
  /** Number of successful requests */
  readonly successful_requests: number;
}

/**
 * Rate limit check result
 *
 * Represents the result of a rate limit check by the rate limiter.
 *
 * @public
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean;
  /** Number of remaining tokens */
  readonly remaining_tokens: number;
  /** Wait time until retry in seconds */
  readonly retry_after?: number;
  /** Whether sampling was applied */
  readonly sampling_applied: boolean;
  /** Reason for the decision */
  readonly reason: 'allowed' | 'tokens' | 'backoff' | 'sampling';
  /** Updated state after the check */
  readonly new_state: RateLimiterState;
  /** Adaptive sampling rate */
  readonly adaptive_rate?: number;
}

/**
 * Error frequency analysis result
 *
 * Provides analysis of error occurrence frequency and recommended settings for adaptive sampling.
 *
 * @public
 */
export interface ErrorFrequencyAnalysis {
  /** Total number of errors */
  readonly total_errors: number;
  /** Number of errors per minute */
  readonly errors_per_minute: number;
  /** Top error types by frequency */
  readonly top_error_types: readonly { type: string; count: number }[];
  /** Whether adaptive sampling should be applied */
  readonly should_apply_adaptive: boolean;
  /** Recommended sampling rate */
  readonly recommended_sampling_rate: number;
}

/**
 * Rate limiter configuration options
 *
 * Optional interface for customizing rate limiter configuration.
 * In production environments, settings are loaded from environment variables,
 * while in test environments, these options can override them.
 *
 * @public
 */
export interface RateLimiterConfigOptions {
  /** Bucket size (alias for max_tokens) */
  readonly bucket_size?: number;
  /** Maximum number of tokens */
  readonly max_tokens?: number;
  /** Token refill rate (tokens per second) */
  readonly refill_rate?: number;
  /** Refill interval in milliseconds (for compatibility) */
  readonly refill_interval_ms?: number;
  /** Burst capacity allowance */
  readonly burst_capacity?: number;
  /** Backoff multiplier */
  readonly backoff_multiplier?: number;
  /** Maximum backoff time in seconds */
  readonly max_backoff?: number;
  /** Enable exponential backoff */
  readonly enable_exponential_backoff?: boolean;
  /** Sampling rates by log level */
  readonly sampling_rates?: Record<string, number>;
  /** Enable adaptive sampling */
  readonly adaptive_sampling?: boolean;
  /** Adaptive sampling trigger threshold (errors per minute) */
  readonly error_threshold?: number;
  /** Per-endpoint limit settings */
  readonly endpoint_limits?: Record<string, { bucket_size?: number; refill_rate?: number }>;
  /** Custom random number generator function for testing */
  readonly randomFn?: () => number;
}

/**
 * Pure function to create rate limiter configuration
 *
 * Creates rate limit configuration based on environment variables or specified options.
 * Includes settings for Token Bucket algorithm, exponential backoff, and adaptive sampling.
 *
 * @param options - Optional configuration settings
 * @returns Immutable RateLimiterConfig object
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const config = createRateLimiterConfig();
 *
 * // Create with custom settings
 * const customConfig = createRateLimiterConfig({
 *   max_tokens: 50,
 *   refill_rate: 5,
 *   adaptive_sampling: false
 * });
 * ```
 *
 * @public
 */
export function createRateLimiterConfig(options?: RateLimiterConfigOptions): RateLimiterConfig {
  const maxTokens =
    options?.max_tokens ||
    options?.bucket_size ||
    parseInt(process.env.LOG_RATE_LIMIT_MAX_TOKENS || '100', 10);

  return Object.freeze({
    max_tokens: maxTokens,
    bucket_size: maxTokens, // Alias for compatibility
    refill_rate:
      options?.refill_rate || parseInt(process.env.LOG_RATE_LIMIT_REFILL_RATE || '10', 10), // tokens per second
    refill_interval_ms: options?.refill_interval_ms || 1000, // For compatibility
    burst_capacity:
      options?.burst_capacity || parseInt(process.env.LOG_RATE_LIMIT_BURST_CAPACITY || '150', 10),
    backoff_multiplier:
      options?.backoff_multiplier ||
      parseFloat(process.env.LOG_RATE_LIMIT_BACKOFF_MULTIPLIER || '2'),
    max_backoff:
      options?.max_backoff || parseInt(process.env.LOG_RATE_LIMIT_MAX_BACKOFF || '300', 10), // 5 minutes max
    enable_exponential_backoff: options?.enable_exponential_backoff ?? true, // For compatibility
    sampling_rates: Object.freeze(
      options?.sampling_rates || {
        fatal: 1.0, // 100% - all fatal errors
        error: 1.0, // 100% - all errors initially
        warn: 0.8, // 80% - most warnings
        info: 0.3, // 30% - sample info logs
        debug: 0.1, // 10% - minimal debug logs
        trace: 0.05, // 5% - very minimal trace logs
      }
    ),
    adaptive_sampling:
      options?.adaptive_sampling ?? process.env.LOG_RATE_LIMIT_ADAPTIVE !== 'false',
    error_threshold:
      options?.error_threshold || parseInt(process.env.LOG_RATE_LIMIT_ERROR_THRESHOLD || '100', 10), // errors per minute
    endpoint_limits: options?.endpoint_limits ? Object.freeze(options.endpoint_limits) : undefined,
    randomFn: options?.randomFn,
  }) as RateLimiterConfig;
}

/**
 * Pure function to create initial rate limiter state
 *
 * Creates the initial state of the token bucket. Includes initial token count,
 * timestamps, error counts, etc. All fields are immutable.
 *
 * @returns Initialized immutable RateLimiterState object
 *
 * @example
 * ```typescript
 * const initialState = createInitialState();
 * // {
 * //   tokens: 100,
 * //   last_refill: current_time,
 * //   consecutive_rejects: 0,
 * //   backoff_until: 0,
 * //   error_counts: {},
 * //   error_timestamps: [],
 * //   total_requests: 0,
 * //   successful_requests: 0
 * // }
 * ```
 *
 * @public
 */
export function createInitialState(): RateLimiterState {
  return Object.freeze({
    tokens: 100,
    last_refill: Date.now(),
    consecutive_rejects: 0,
    backoff_until: 0,
    error_counts: Object.freeze({}),
    error_timestamps: Object.freeze([]),
    total_requests: 0,
    successful_requests: 0,
  }) as RateLimiterState;
}

/**
 * Pure function to validate rate limiter configuration
 *
 * Checks configuration value ranges, sampling rate values, etc.,
 * and determines if the configuration is correct. Invalid configurations
 * may cause rate limiter malfunction.
 *
 * @param config - Rate limiter configuration to validate
 * @returns true if configuration is valid, false if invalid
 *
 * @example
 * ```typescript
 * const config = createRateLimiterConfig();
 * if (validateRateLimiterConfig(config)) {
 *   console.log('Configuration is valid');
 * } else {
 *   console.error('Configuration has errors');
 * }
 * ```
 *
 * @public
 */
export function validateRateLimiterConfig(config: RateLimiterConfig): boolean {
  if (config.max_tokens <= 0 || config.refill_rate <= 0) {
    return false;
  }

  if (config.burst_capacity < config.max_tokens) {
    return false;
  }

  if (config.backoff_multiplier <= 1 || config.max_backoff <= 0) {
    return false;
  }

  if (config.error_threshold <= 0) {
    return false;
  }

  // Validate sampling rates are between 0 and 1
  for (const rate of Object.values(config.sampling_rates)) {
    if (rate < 0 || rate > 1) {
      return false;
    }
  }

  return true;
}

/**
 * Reset rate limiter state (for testing)
 */
export function resetRateLimiterState(
  config?: RateLimiterConfig,
  preserveErrorCounts: boolean = false
): RateLimiterState {
  const defaultConfig = config || createRateLimiterConfig();
  const initialState = createInitialState();

  if (preserveErrorCounts) {
    return Object.freeze({
      ...initialState,
      tokens: defaultConfig.max_tokens,
    }) as RateLimiterState;
  }

  return Object.freeze({
    ...initialState,
    tokens: defaultConfig.max_tokens,
  }) as RateLimiterState;
}

/**
 * Function to get rate limit statistics for a specific client and endpoint
 *
 * Retrieves the current state of the rate limiter from KV storage and returns statistics.
 * Useful for debugging and monitoring purposes to check current token count and request count.
 *
 * @param clientId - Client identifier
 * @param endpoint - Target endpoint
 * @returns Rate limit statistics object or null if no data exists
 *
 * @example
 * ```typescript
 * const stats = await getRateLimiterStats('client123', '/api/logs');
 * if (stats) {
 *   console.log(`Current tokens: ${stats.tokens}`);
 *   console.log(`Total requests: ${stats.total_requests}`);
 * }
 * ```
 *
 * @public
 */
export async function getRateLimiterStats(
  clientId: string,
  endpoint: string
): Promise<{
  tokens: number;
  total_requests: number;
  successful_requests: number;
  consecutive_rejects: number;
  backoff_until: number;
} | null> {
  try {
    const storage = getDefaultStorage();
    const stateKey = `rate_limit:${clientId}:${endpoint}`;
    const stateData = await storage.get(stateKey);

    if (!stateData) {
      return null;
    }

    const state = JSON.parse(stateData) as RateLimiterState;
    return {
      tokens: state.tokens,
      total_requests: state.total_requests,
      successful_requests: state.successful_requests,
      consecutive_rejects: state.consecutive_rejects,
      backoff_until: state.backoff_until,
    };
  } catch (error) {
    console.warn('Failed to get rate limiter stats:', error);
    return null;
  }
}

/**
 * Calculate token refill (pure function)
 */
function calculateTokenRefill(
  config: RateLimiterConfig,
  state: RateLimiterState,
  currentTime: number
): number {
  const timeDelta = (currentTime - state.last_refill) / 1000; // seconds
  const tokensToAdd = timeDelta * config.refill_rate;

  return Math.min(config.burst_capacity, state.tokens + tokensToAdd);
}

/**
 * Calculate exponential backoff (pure function)
 */
function calculateBackoff(config: RateLimiterConfig, consecutiveRejects: number): number {
  const backoffSeconds = Math.min(
    config.max_backoff,
    Math.pow(config.backoff_multiplier, consecutiveRejects)
  );

  return Date.now() + backoffSeconds * 1000;
}

/**
 * Pure function to analyze error frequency for adaptive sampling
 *
 * Analyzes recent error occurrence frequency and determines whether adaptive sampling should be applied.
 * When error frequency is high, sets the recommended sampling rate low to suppress log volume.
 *
 * @param state - Rate limiter state to analyze
 * @param currentTime - Current timestamp in milliseconds
 * @returns Error frequency analysis result
 *
 * @example
 * ```typescript
 * const analysis = analyzeErrorFrequency(state, Date.now());
 * if (analysis.should_apply_adaptive) {
 *   console.log(`Apply adaptive sampling: ${analysis.recommended_sampling_rate}`);
 * }
 * ```
 *
 * @public
 */
export function analyzeErrorFrequency(
  state: RateLimiterState,
  currentTime: number
): ErrorFrequencyAnalysis {
  const oneMinuteAgo = currentTime - 60 * 1000;
  const recentErrors = state.error_timestamps.filter((timestamp) => timestamp > oneMinuteAgo);

  // Count error types
  const errorTypeCounts = Object.entries(state.error_counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const errorsPerMinute = recentErrors.length;
  const shouldApplyAdaptive = errorsPerMinute > 50; // High error rate threshold

  // Calculate recommended sampling rate based on error frequency
  let recommendedSamplingRate = 1.0;
  if (errorsPerMinute > 500) {
    recommendedSamplingRate = 0.01; // 1% for very high frequency
  } else if (errorsPerMinute > 200) {
    recommendedSamplingRate = 0.05; // 5% for high frequency
  } else if (errorsPerMinute > 100) {
    recommendedSamplingRate = 0.1; // 10% for medium frequency
  } else if (errorsPerMinute > 50) {
    recommendedSamplingRate = 0.5; // 50% for moderate frequency
  }

  return Object.freeze({
    total_errors: state.error_timestamps.length,
    errors_per_minute: errorsPerMinute,
    top_error_types: Object.freeze(errorTypeCounts.slice(0, 5)),
    should_apply_adaptive: shouldApplyAdaptive,
    recommended_sampling_rate: recommendedSamplingRate,
  }) as ErrorFrequencyAnalysis;
}

/**
 * Apply sampling rate based on log level and error type (pure function)
 */
export function shouldSample(
  config: RateLimiterConfig,
  state: RateLimiterState,
  logLevel: LogLevel,
  errorType?: string,
  currentTime: number = Date.now()
): { shouldSample: boolean; adaptiveRate?: number } {
  // Get base sampling rate - check errorType first, then logLevel, then default to 1.0
  const samplingRates = config.sampling_rates;
  let baseSamplingRate = 1.0;

  // Safe access to sampling rates using Map for security
  const ratesMap = new Map(Object.entries(samplingRates));

  if (errorType && ratesMap.has(errorType)) {
    baseSamplingRate = ratesMap.get(errorType) ?? 1.0;
  } else if (ratesMap.has(logLevel)) {
    baseSamplingRate = ratesMap.get(logLevel) ?? 1.0;
  }

  // Use custom random function if provided, otherwise use Math.random()
  const randomFn = config.randomFn || Math.random;

  // Apply adaptive sampling if enabled
  if (config.adaptive_sampling && (logLevel === 'error' || logLevel === 'warn')) {
    const analysis = analyzeErrorFrequency(state, currentTime);

    if (analysis.should_apply_adaptive) {
      const adaptiveRate = Math.min(baseSamplingRate, analysis.recommended_sampling_rate);
      return {
        shouldSample: randomFn() < adaptiveRate,
        adaptiveRate,
      };
    }
  }

  return {
    shouldSample: randomFn() < baseSamplingRate,
  };
}

/**
 * Clean old error timestamps (pure function)
 */
function _cleanOldErrorTimestamps(
  timestamps: readonly number[],
  currentTime: number,
  maxAge: number = 3600000 // 1 hour
): readonly number[] {
  const cutoff = currentTime - maxAge;
  return Object.freeze(timestamps.filter((timestamp) => timestamp > cutoff));
}

/**
 * High-level rate limit check function for integration testing
 *
 * Automatically manages state based on client ID and endpoint, and performs rate limit checks.
 * Loads state from KV storage, updates it, and returns the result.
 * Includes handling of endpoint-specific limits and storage errors.
 *
 * @param config - Rate limiter configuration
 * @param clientId - Client identifier
 * @param endpoint - Target endpoint
 * @param _logLevel - Log level (currently unused)
 * @returns Rate limit check result
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(config, 'client123', '/api/logs', 'info');
 * if (result.allowed) {
 *   console.log(`Request allowed. Remaining tokens: ${result.tokens_remaining}`);
 * } else {
 *   console.log(`Request denied. Reason: ${result.reason}`);
 * }
 * ```
 *
 * @public
 */
export async function checkRateLimit(
  config: RateLimiterConfig,
  clientId: string,
  endpoint: string,
  _logLevel: LogLevel
): Promise<{
  allowed: boolean;
  tokens_remaining: number;
  retry_after?: number;
  reason?: string;
}> {
  const storage = getDefaultStorage();
  const stateKey = `rate_limit:${clientId}:${endpoint}`;

  try {
    // Check endpoint-specific limits first
    let effectiveConfig = config;
    const endpointLimits = config.endpoint_limits;
    const limitsMap = endpointLimits ? new Map(Object.entries(endpointLimits)) : new Map();
    const endpointLimit = limitsMap.get(endpoint);
    if (endpointLimit) {
      effectiveConfig = Object.freeze({
        ...config,
        max_tokens: endpointLimit.bucket_size || config.max_tokens,
        bucket_size: endpointLimit.bucket_size || config.max_tokens,
        refill_rate: endpointLimit.refill_rate || config.refill_rate,
      }) as RateLimiterConfig;
    }

    // Get existing state or create new
    const stateData = await storage.get(stateKey);
    let state: RateLimiterState;

    if (stateData) {
      state = JSON.parse(stateData) as RateLimiterState;
    } else {
      state = createInitialState();
      state = Object.freeze({
        ...state,
        tokens: effectiveConfig.max_tokens, // Use effective config for initial tokens
      }) as RateLimiterState;
    }

    // Check if tokens available
    if (state.tokens < 1) {
      return {
        allowed: false,
        tokens_remaining: 0,
        retry_after: 60, // 1 minute
        reason: 'tokens',
      };
    }

    // Consume a token
    const newState = Object.freeze({
      ...state,
      tokens: state.tokens - 1,
      last_refill: Date.now(),
      total_requests: state.total_requests + 1,
      successful_requests: state.successful_requests + 1,
    }) as RateLimiterState;

    // Save updated state
    await storage.set(stateKey, JSON.stringify(newState), 3600); // 1 hour TTL

    return {
      allowed: true,
      tokens_remaining: newState.tokens,
      reason: 'allowed',
    };
  } catch (error) {
    // Gracefully handle storage errors
    console.warn('Rate limiter storage error:', error);
    return {
      allowed: true, // Fail open
      tokens_remaining: config.max_tokens,
    };
  }
}

/**
 * Internal rate limit check function (renamed from checkRateLimit)
 */
export function checkRateLimitInternal(
  config: RateLimiterConfig,
  state: RateLimiterState,
  logLevel: LogLevel,
  errorType?: string,
  currentTime: number = Date.now()
): RateLimitResult {
  // Validate configuration
  if (!validateRateLimiterConfig(config)) {
    return {
      allowed: false,
      remaining_tokens: 0,
      reason: 'tokens',
      sampling_applied: false,
      new_state: state,
    };
  }

  // Check if still in backoff period
  if (currentTime < state.backoff_until) {
    return {
      allowed: false,
      remaining_tokens: state.tokens,
      retry_after: Math.ceil((state.backoff_until - currentTime) / 1000),
      sampling_applied: false,
      reason: 'backoff',
      new_state: state,
    };
  }

  // Refill tokens
  const currentTokens = calculateTokenRefill(config, state, currentTime);

  // Apply sampling before consuming tokens
  const samplingResult = shouldSample(config, state, logLevel, errorType, currentTime);
  if (!samplingResult.shouldSample) {
    const newState = Object.freeze({
      ...state,
      tokens: currentTokens,
      last_refill: currentTime,
      consecutive_rejects: 0, // Sampling rejection doesn't count as rate limit
      total_requests: state.total_requests + 1,
    }) as RateLimiterState;

    return {
      allowed: false,
      remaining_tokens: currentTokens,
      sampling_applied: true,
      reason: 'sampling',
      new_state: newState,
      adaptive_rate: samplingResult.adaptiveRate,
    };
  }

  // Check if tokens available
  if (currentTokens < 1) {
    const newBackoffTime = calculateBackoff(config, state.consecutive_rejects + 1);

    const newState = Object.freeze({
      ...state,
      tokens: 0, // Ensure tokens don't go negative
      last_refill: currentTime,
      consecutive_rejects: state.consecutive_rejects + 1,
      backoff_until: newBackoffTime,
      total_requests: state.total_requests + 1,
    }) as RateLimiterState;

    return {
      allowed: false,
      remaining_tokens: 0,
      retry_after: Math.ceil((newBackoffTime - currentTime) / 1000),
      sampling_applied: false,
      reason: 'tokens',
      new_state: newState,
    };
  }

  // Allow the log entry
  const newState = Object.freeze({
    ...state,
    tokens: currentTokens - 1,
    last_refill: currentTime,
    consecutive_rejects: 0,
    backoff_until: 0,
    total_requests: state.total_requests + 1,
    successful_requests: state.successful_requests + 1,
  }) as RateLimiterState;

  return {
    allowed: true,
    remaining_tokens: currentTokens - 1,
    sampling_applied: false,
    reason: 'allowed',
    new_state: newState,
  };
}
