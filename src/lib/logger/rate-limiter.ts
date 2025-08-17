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
 * レート制限設定インターフェース（不変）
 *
 * Token Bucket + Exponential Backoff + Adaptive Sampling アルゴリズムの設定を定義します。
 *
 * @public
 */
export interface RateLimiterConfig {
  /** 最大トークン数（バケットサイズ） */
  readonly max_tokens: number;
  /** max_tokensのエイリアス（互換性のため） */
  readonly bucket_size?: number;
  /** トークン補充レート（トークン/秒） */
  readonly refill_rate: number;
  /** 補充間隔（ミリ秒）（互換性のため） */
  readonly refill_interval_ms?: number;
  /** バースト許容量 */
  readonly burst_capacity: number;
  /** バックオフ乗数 */
  readonly backoff_multiplier: number;
  /** 最大バックオフ時間（秒） */
  readonly max_backoff: number;
  /** ログレベル別サンプリング率 */
  readonly sampling_rates: Readonly<Record<string, number>>;
  /** 適応的サンプリングの有効化 */
  readonly adaptive_sampling: boolean;
  /** 適応的サンプリング発動しきい値（エラー数/分） */
  readonly error_threshold: number;
  /** 指数バックオフ有効化（互換性のため） */
  readonly enable_exponential_backoff?: boolean;
  /** エンドポイント別制限設定 */
  readonly endpoint_limits?: Record<string, { bucket_size?: number; refill_rate?: number }>;
  /** テスト用のカスタム乱数生成関数 */
  readonly randomFn?: () => number;
}

/**
 * レート制限状態インターフェース（関数型アプローチ）
 *
 * レートリミッターの現在状態を表す不変オブジェクトです。
 *
 * @public
 */
export interface RateLimiterState {
  /** 現在のトークン数 */
  readonly tokens: number;
  /** 最後のトークン補充時刻 */
  readonly last_refill: number;
  /** 連続拒否回数 */
  readonly consecutive_rejects: number;
  /** バックオフ解除時刻 */
  readonly backoff_until: number;
  /** エラータイプ別カウント */
  readonly error_counts: Readonly<Record<string, number>>;
  /** エラー発生時刻の履歴 */
  readonly error_timestamps: readonly number[];
  /** 総リクエスト数 */
  readonly total_requests: number;
  /** 成功リクエスト数 */
  readonly successful_requests: number;
}

/**
 * レート制限判定結果
 *
 * レートリミッターによる制限判定の結果を表します。
 *
 * @public
 */
export interface RateLimitResult {
  /** リクエストが許可されたかどうか */
  readonly allowed: boolean;
  /** 残りトークン数 */
  readonly remaining_tokens: number;
  /** リトライまでの待機時間（秒） */
  readonly retry_after?: number;
  /** サンプリングが適用されたかどうか */
  readonly sampling_applied: boolean;
  /** 判定理由 */
  readonly reason: 'allowed' | 'tokens' | 'backoff' | 'sampling';
  /** 更新後の状態 */
  readonly new_state: RateLimiterState;
  /** 適応的サンプリング率 */
  readonly adaptive_rate?: number;
}

/**
 * エラー頻度分析結果
 *
 * エラー発生頻度の分析と適応的サンプリングの推奨設定を提供します。
 *
 * @public
 */
export interface ErrorFrequencyAnalysis {
  /** 総エラー数 */
  readonly total_errors: number;
  /** 分あたりエラー数 */
  readonly errors_per_minute: number;
  /** 上位エラータイプ */
  readonly top_error_types: readonly { type: string; count: number }[];
  /** 適応的サンプリングの適用推奨 */
  readonly should_apply_adaptive: boolean;
  /** 推奨サンプリング率 */
  readonly recommended_sampling_rate: number;
}

/**
 * レートリミッター設定オプション
 *
 * レートリミッターの設定をカスタマイズするためのオプションインターフェースです。
 * プロダクション環境では環境変数から設定され、テスト環境ではこのオプションで上書きできます。
 *
 * @public
 */
export interface RateLimiterConfigOptions {
  /** バケットサイズ（max_tokensのエイリアス） */
  readonly bucket_size?: number;
  /** 最大トークン数 */
  readonly max_tokens?: number;
  /** トークン補充レート（トークン/秒） */
  readonly refill_rate?: number;
  /** 補充間隔（ミリ秒）（互換性のため） */
  readonly refill_interval_ms?: number;
  /** バースト許容量 */
  readonly burst_capacity?: number;
  /** バックオフ乗数 */
  readonly backoff_multiplier?: number;
  /** 最大バックオフ時間（秒） */
  readonly max_backoff?: number;
  /** 指数バックオフ有効化 */
  readonly enable_exponential_backoff?: boolean;
  /** ログレベル別サンプリング率 */
  readonly sampling_rates?: Record<string, number>;
  /** 適応的サンプリングの有効化 */
  readonly adaptive_sampling?: boolean;
  /** 適応的サンプリング発動しきい値（エラー数/分） */
  readonly error_threshold?: number;
  /** エンドポイント別制限設定 */
  readonly endpoint_limits?: Record<string, { bucket_size?: number; refill_rate?: number }>;
  /** テスト用のカスタム乱数生成関数 */
  readonly randomFn?: () => number;
}

/**
 * レートリミッター設定を作成する純粋関数
 *
 * 環境変数や指定されたオプションに基づいて、レートリミット設定を作成します。
 * Token Bucketアルゴリズム、指数バックオフ、アダプティブサンプリングの設定が含まれます。
 *
 * @param options - オプション設定（オプション）
 * @returns 不変のRateLimiterConfigオブジェクト
 *
 * @example
 * ```typescript
 * // デフォルト設定で作成
 * const config = createRateLimiterConfig();
 *
 * // カスタム設定で作成
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
 * レートリミッターの初期状態を作成する純粋関数
 *
 * トークンバケットの初期状態を作成します。初期トークン数、タイムスタンプ、
 * エラーカウントなどが含まれます。全てのフィールドは不変です。
 *
 * @returns 初期化された不変のRateLimiterStateオブジェクト
 *
 * @example
 * ```typescript
 * const initialState = createInitialState();
 * // {
 * //   tokens: 100,
 * //   last_refill: 現在時刻,
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
 * レートリミッター設定の有効性を検証する純粋関数
 *
 * 設定値の範囲、サンプリングレートの値などをチェックし、
 * 設定が正しいかどうかを判定します。不正な設定はレートリミットの誤動作を引き起こす可能性があります。
 *
 * @param config - 検証するレートリミッター設定
 * @returns 設定が有効な場合 true、無効な場合 false
 *
 * @example
 * ```typescript
 * const config = createRateLimiterConfig();
 * if (validateRateLimiterConfig(config)) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('設定にエラーがあります');
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
 * 特定のクライアントとエンドポイントのレートリミット統計を取得する関数
 *
 * KVストレージからレートリミッターの現在の状態を取得し、統計情報を返します。
 * デバッグや監視目的で現在のトークン数やリクエスト数を確認できます。
 *
 * @param clientId - クライアント識別子
 * @param endpoint - 対象エンドポイント
 * @returns レートリミット統計オブジェクトまたはnull（データが存在しない場合）
 *
 * @example
 * ```typescript
 * const stats = await getRateLimiterStats('client123', '/api/logs');
 * if (stats) {
 *   console.log(`現在のトークン数: ${stats.tokens}`);
 *   console.log(`総リクエスト数: ${stats.total_requests}`);
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
 * アダプティブサンプリングのためのエラー頻度を分析する純粋関数
 *
 * 直近のエラー発生頻度を分析し、アダプティブサンプリングを適用すべきかどうかを判定します。
 * エラー頻度が高い場合は、推奨サンプリングレートを低く設定してログ量を抑制します。
 *
 * @param state - 分析対象のレートリミッター状態
 * @param currentTime - 現在のタイムスタンプ（ミリ秒）
 * @returns エラー頻度分析結果
 *
 * @example
 * ```typescript
 * const analysis = analyzeErrorFrequency(state, Date.now());
 * if (analysis.should_apply_adaptive) {
 *   console.log(`アダプティブサンプリングを適用: ${analysis.recommended_sampling_rate}`);
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
 * 統合テスト用の高レベルレートリミットチェック関数
 *
 * クライアントIDとエンドポイントに基づいて状態を自動管理し、レートリミットチェックを実行します。
 * KVストレージから状態を読み込み、更新し、結果を返します。
 * エンドポイント固有の制限やストレージエラーのハンドリングも含まれます。
 *
 * @param config - レートリミッター設定
 * @param clientId - クライアント識別子
 * @param endpoint - 対象エンドポイント
 * @param _logLevel - ログレベル（現在未使用）
 * @returns レートリミットチェック結果
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(config, 'client123', '/api/logs', 'info');
 * if (result.allowed) {
 *   console.log(`リクエスト許可。残りトークン: ${result.tokens_remaining}`);
 * } else {
 *   console.log(`リクエスト拒否。理由: ${result.reason}`);
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
