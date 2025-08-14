/**
 * Advanced Rate Limiter with Token Bucket + Exponential Backoff
 * Pure function implementation with metrics integration
 * 
 * Provides adaptive log sampling and rate limiting to prevent log flooding.
 * Uses Token Bucket algorithm with exponential backoff for resilient rate control.
 */

import type { LogLevel } from './types';

/**
 * Rate limiter configuration (immutable)
 */
export interface RateLimiterConfig {
  readonly max_tokens: number;
  readonly refill_rate: number; // tokens per second
  readonly burst_capacity: number;
  readonly backoff_multiplier: number;
  readonly max_backoff: number; // seconds
  readonly sampling_rates: Readonly<Record<string, number>>;
  readonly adaptive_sampling: boolean;
  readonly error_threshold: number; // errors per minute to trigger adaptive sampling
}

/**
 * Rate limiter state (functional approach)
 */
export interface RateLimiterState {
  readonly tokens: number;
  readonly last_refill: number;
  readonly consecutive_rejects: number;
  readonly backoff_until: number;
  readonly error_counts: Readonly<Record<string, number>>;
  readonly error_timestamps: readonly number[];
  readonly total_requests: number;
  readonly successful_requests: number;
}

/**
 * Rate limiting decision result
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining_tokens: number;
  readonly retry_after?: number;
  readonly sampling_applied: boolean;
  readonly reason: 'allowed' | 'tokens' | 'backoff' | 'sampling';
  readonly new_state: RateLimiterState;
  readonly adaptive_rate?: number;
}

/**
 * Error frequency analysis result
 */
export interface ErrorFrequencyAnalysis {
  readonly total_errors: number;
  readonly errors_per_minute: number;
  readonly top_error_types: readonly { type: string; count: number }[];
  readonly should_apply_adaptive: boolean;
  readonly recommended_sampling_rate: number;
}

/**
 * Create default rate limiter configuration (pure function)
 */
export function createRateLimiterConfig(): RateLimiterConfig {
  return Object.freeze({
    max_tokens: parseInt(process.env.LOG_RATE_LIMIT_MAX_TOKENS || '100', 10),
    refill_rate: parseInt(process.env.LOG_RATE_LIMIT_REFILL_RATE || '10', 10), // 10 tokens per second
    burst_capacity: parseInt(process.env.LOG_RATE_LIMIT_BURST_CAPACITY || '150', 10),
    backoff_multiplier: parseFloat(process.env.LOG_RATE_LIMIT_BACKOFF_MULTIPLIER || '2'),
    max_backoff: parseInt(process.env.LOG_RATE_LIMIT_MAX_BACKOFF || '300', 10), // 5 minutes max
    sampling_rates: Object.freeze({
      'fatal': 1.0,      // 100% - all fatal errors
      'error': 1.0,      // 100% - all errors initially
      'warn': 0.8,       // 80% - most warnings
      'info': 0.3,       // 30% - sample info logs
      'debug': 0.1,      // 10% - minimal debug logs
      'trace': 0.05,     // 5% - very minimal trace logs
    }),
    adaptive_sampling: process.env.LOG_RATE_LIMIT_ADAPTIVE !== 'false',
    error_threshold: parseInt(process.env.LOG_RATE_LIMIT_ERROR_THRESHOLD || '100', 10), // errors per minute
  }) as RateLimiterConfig;
}

/**
 * Create initial rate limiter state (pure function)
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
 * Validate rate limiter configuration (pure function)
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
 * Calculate token refill (pure function)
 */
function calculateTokenRefill(
  config: RateLimiterConfig,
  state: RateLimiterState,
  currentTime: number
): number {
  const timeDelta = (currentTime - state.last_refill) / 1000; // seconds
  const tokensToAdd = timeDelta * config.refill_rate;
  
  return Math.min(
    config.burst_capacity,
    state.tokens + tokensToAdd
  );
}

/**
 * Calculate exponential backoff (pure function)
 */
function calculateBackoff(
  config: RateLimiterConfig,
  consecutiveRejects: number
): number {
  const backoffSeconds = Math.min(
    config.max_backoff,
    Math.pow(config.backoff_multiplier, consecutiveRejects)
  );
  
  return Date.now() + (backoffSeconds * 1000);
}

/**
 * Analyze error frequency for adaptive sampling (pure function)
 */
export function analyzeErrorFrequency(
  state: RateLimiterState,
  currentTime: number
): ErrorFrequencyAnalysis {
  const oneMinuteAgo = currentTime - (60 * 1000);
  const recentErrors = state.error_timestamps.filter(timestamp => timestamp > oneMinuteAgo);
  
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
    recommendedSamplingRate = 0.1;  // 10% for medium frequency
  } else if (errorsPerMinute > 50) {
    recommendedSamplingRate = 0.5;  // 50% for moderate frequency
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
function shouldSample(
  config: RateLimiterConfig,
  state: RateLimiterState,
  logLevel: LogLevel,
  errorType?: string,
  currentTime: number = Date.now()
): { shouldSample: boolean; adaptiveRate?: number } {
  // Get base sampling rate - check errorType first, then logLevel, then default to 1.0
  const baseSamplingRate = errorType 
    ? (config.sampling_rates[errorType] ?? config.sampling_rates[logLevel] ?? 1.0)
    : (config.sampling_rates[logLevel] ?? 1.0);
  
  // Apply adaptive sampling if enabled
  if (config.adaptive_sampling && (logLevel === 'error' || logLevel === 'warn')) {
    const analysis = analyzeErrorFrequency(state, currentTime);
    
    if (analysis.should_apply_adaptive) {
      const adaptiveRate = Math.min(baseSamplingRate, analysis.recommended_sampling_rate);
      return {
        shouldSample: Math.random() < adaptiveRate,
        adaptiveRate,
      };
    }
  }
  
  return {
    shouldSample: Math.random() < baseSamplingRate,
  };
}

/**
 * Clean old error timestamps (pure function)
 */
function cleanOldErrorTimestamps(
  timestamps: readonly number[],
  currentTime: number,
  maxAge: number = 3600000 // 1 hour
): readonly number[] {
  const cutoff = currentTime - maxAge;
  return Object.freeze(timestamps.filter(timestamp => timestamp > cutoff));
}

/**
 * Check rate limit with token bucket algorithm (pure function)
 */
export function checkRateLimit(
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

/**
 * Update error counts for adaptive sampling (pure function)
 */
export function updateErrorCounts(
  state: RateLimiterState,
  errorType: string,
  currentTime: number = Date.now(),
  increment: number = 1
): RateLimiterState {
  const currentCount = state.error_counts[errorType] || 0;
  const cleanedTimestamps = cleanOldErrorTimestamps(state.error_timestamps, currentTime);
  
  // Add new error timestamps
  const newTimestamps = [...cleanedTimestamps];
  for (let i = 0; i < increment; i++) {
    newTimestamps.push(currentTime);
  }
  
  return Object.freeze({
    ...state,
    error_counts: Object.freeze({
      ...state.error_counts,
      [errorType]: currentCount + increment,
    }),
    error_timestamps: Object.freeze(newTimestamps),
  }) as RateLimiterState;
}

/**
 * Get rate limiter statistics (pure function)
 */
export function getRateLimiterStats(
  state: RateLimiterState,
  config: RateLimiterConfig,
  currentTime: number = Date.now()
): {
  readonly tokens: number;
  readonly utilization: number;
  readonly success_rate: number;
  readonly backoff_active: boolean;
  readonly backoff_remaining?: number;
  readonly error_analysis: ErrorFrequencyAnalysis;
} {
  const currentTokens = calculateTokenRefill(config, state, currentTime);
  const utilization = 1 - (currentTokens / config.burst_capacity);
  const successRate = state.total_requests > 0 
    ? state.successful_requests / state.total_requests 
    : 1;
  
  const backoffActive = currentTime < state.backoff_until;
  const backoffRemaining = backoffActive 
    ? Math.ceil((state.backoff_until - currentTime) / 1000)
    : undefined;
  
  const errorAnalysis = analyzeErrorFrequency(state, currentTime);
  
  return Object.freeze({
    tokens: currentTokens,
    utilization,
    success_rate: successRate,
    backoff_active: backoffActive,
    backoff_remaining: backoffRemaining,
    error_analysis: errorAnalysis,
  });
}

/**
 * Reset rate limiter state (pure function)
 */
export function resetRateLimiterState(
  config: RateLimiterConfig,
  preserveErrorCounts: boolean = false
): RateLimiterState {
  const initialState = createInitialState();
  
  if (preserveErrorCounts) {
    return Object.freeze({
      ...initialState,
      tokens: config.max_tokens,
    }) as RateLimiterState;
  }
  
  return Object.freeze({
    ...initialState,
    tokens: config.max_tokens,
  }) as RateLimiterState;
}

/**
 * Predict rate limiter behavior (pure function)
 */
export function predictRateLimitBehavior(
  config: RateLimiterConfig,
  state: RateLimiterState,
  requestsPerSecond: number,
  durationSeconds: number
): {
  readonly will_hit_limit: boolean;
  readonly estimated_success_rate: number;
  readonly tokens_exhausted_at?: number;
  readonly recommendations: readonly string[];
} {
  const totalRequests = requestsPerSecond * durationSeconds;
  const tokensGenerated = config.refill_rate * durationSeconds;
  const availableTokens = state.tokens + tokensGenerated;
  
  const willHitLimit = totalRequests > availableTokens;
  const estimatedSuccessRate = willHitLimit 
    ? availableTokens / totalRequests 
    : 1;
  
  const tokensExhaustedAt = willHitLimit 
    ? (state.tokens / requestsPerSecond) * 1000 + Date.now()
    : undefined;
  
  const recommendations: string[] = [];
  
  if (willHitLimit) {
    recommendations.push('Consider increasing refill_rate or max_tokens');
    recommendations.push('Enable adaptive sampling for error logs');
  }
  
  if (estimatedSuccessRate < 0.5) {
    recommendations.push('Request rate significantly exceeds capacity');
    recommendations.push('Implement client-side backoff or queuing');
  }
  
  return Object.freeze({
    will_hit_limit: willHitLimit,
    estimated_success_rate: estimatedSuccessRate,
    tokens_exhausted_at: tokensExhaustedAt,
    recommendations: Object.freeze(recommendations),
  });
}