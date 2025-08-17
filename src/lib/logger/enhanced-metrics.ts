/**
 * Enhanced metrics for operational monitoring
 *
 * Provides comprehensive monitoring for remote configuration,
 * rate limiting, and KV storage operations.
 */

import { metrics } from '@opentelemetry/api';

/**
 * Enhanced Metrics インターフェース
 *
 * Phase Cで追加された高度なメトリクス収集機能を定義するインターフェースです。
 * OpenTelemetryメーターを使用してカウンター、ゲージ、ヒストグラムを管理します。
 *
 * @public
 */
export interface EnhancedMetrics {
  /** リモート設定の取得回数 */
  config_fetch_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** リモート設定取得の所要時間分布 */
  config_fetch_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** 設定キャッシュのヒット回数 */
  config_cache_hits: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** 設定バリデーションエラー回数 */
  config_validation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  /** レート制限の決定回数（許可/拒否） */
  rate_limit_decisions: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** レート制限の現在のトークン数 */
  rate_limit_tokens: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  /** レート制限のバックオフ時間分布 */
  rate_limit_backoff_time: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** レート制限の現在のサンプリング率 */
  rate_limit_sampling_rate: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;

  /** KVストレージの操作総数 */
  kv_operations_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** KVストレージ操作の所要時間分布 */
  kv_operation_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** KVストレージの接続状態（1=接続、0=切断） */
  kv_connection_status: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  /** KVストレージ操作のエラー回数 */
  kv_operation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  /** Admin APIへのリクエスト総数 */
  admin_api_requests: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Admin API認証失敗回数 */
  admin_api_auth_failures: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Admin APIレート制限ヒット回数 */
  admin_api_rate_limits: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
}

let enhancedMetricsInstance: EnhancedMetrics | null = null;
// Internal metrics counters
const metricsCounters = {
  config_fetch_total: 0,
  config_update_total: 0,
  config_error_total: 0,
  rate_limit_hits_total: 0,
  rate_limit_resets_total: 0,
  storage_operations_total: 0,
  storage_errors_total: 0,
  admin_api_calls_total: 0,
  admin_api_errors_total: 0,
};
let isInitialized = false;

/**
 * Phase 3 拡張メトリクスを初期化する関数
 *
 * リモート設定、レートリミット、KVストレージ、Admin APIの
 * 操作監視のための詳細なメトリクスを初期化します。
 * すでに初期化済みの場合は既存のインスタンスを返します。
 *
 * @returns 初期化されたEnhancedMetricsインスタンス
 * @throws Error - メトリクスの初期化に失敗した場合
 *
 * @example
 * ```typescript
 * const metrics = initializePhase3Metrics();
 * // コンソールに '✅ Enhanced Metrics initialized successfully' が表示される
 * ```
 *
 * @public
 */
export function initializePhase3Metrics(): EnhancedMetrics {
  if (enhancedMetricsInstance && isInitialized) {
    return enhancedMetricsInstance;
  }

  try {
    const meter = metrics.getMeter('nextjs-boilerplate-enhanced', '1.0.0');

    enhancedMetricsInstance = {
      // Remote configuration metrics
      config_fetch_total: meter.createCounter('config_fetch_total', {
        description: 'Total number of remote configuration fetch attempts',
        unit: 'operations',
      }),

      config_fetch_duration: meter.createHistogram('config_fetch_duration_ms', {
        description: 'Duration of remote configuration fetch operations',
        unit: 'ms',
      }),

      config_cache_hits: meter.createCounter('config_cache_hits_total', {
        description: 'Number of configuration cache hits vs misses',
        unit: 'operations',
      }),

      config_validation_errors: meter.createCounter('config_validation_errors_total', {
        description: 'Number of configuration validation errors',
        unit: 'errors',
      }),

      // Rate limiter metrics
      rate_limit_decisions: meter.createCounter('rate_limit_decisions_total', {
        description: 'Rate limiting decisions (allowed/denied)',
        unit: 'decisions',
      }),

      rate_limit_tokens: meter.createGauge('rate_limit_tokens_current', {
        description: 'Current number of available rate limit tokens',
        unit: 'tokens',
      }),

      rate_limit_backoff_time: meter.createHistogram('rate_limit_backoff_seconds', {
        description: 'Rate limit backoff duration',
        unit: 's',
      }),

      rate_limit_sampling_rate: meter.createGauge('rate_limit_sampling_rate', {
        description: 'Current adaptive sampling rate',
        unit: 'ratio',
      }),

      // KV storage metrics
      kv_operations_total: meter.createCounter('kv_operations_total', {
        description: 'Total KV storage operations',
        unit: 'operations',
      }),

      kv_operation_duration: meter.createHistogram('kv_operation_duration_ms', {
        description: 'Duration of KV storage operations',
        unit: 'ms',
      }),

      kv_connection_status: meter.createGauge('kv_connection_status', {
        description: 'KV storage connection status (1=connected, 0=disconnected)',
        unit: 'status',
      }),

      kv_operation_errors: meter.createCounter('kv_operation_errors_total', {
        description: 'Total KV storage operation errors',
        unit: 'errors',
      }),

      // Admin API metrics
      admin_api_requests: meter.createCounter('admin_api_requests_total', {
        description: 'Total admin API requests',
        unit: 'requests',
      }),

      admin_api_auth_failures: meter.createCounter('admin_api_auth_failures_total', {
        description: 'Total admin API authentication failures',
        unit: 'failures',
      }),

      admin_api_rate_limits: meter.createCounter('admin_api_rate_limits_total', {
        description: 'Total admin API rate limit hits',
        unit: 'hits',
      }),
    };

    isInitialized = true;
    console.log('✅ Enhanced Metrics initialized successfully');

    return enhancedMetricsInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Enhanced Metrics:', error);
    throw error;
  }
}

/**
 * 初期化済みのPhase 3メトリクスインスタンスを取得する関数
 *
 * @returns 初期化済みのEnhancedMetricsインスタンスまたはnull
 *
 * @example
 * ```typescript
 * const metrics = getPhase3Metrics();
 * if (metrics) {
 *   metrics.config_fetch_total.add(1, { result: 'success' });
 * }
 * ```
 *
 * @public
 */
export function getPhase3Metrics(): EnhancedMetrics | null {
  return enhancedMetricsInstance;
}

/**
 * Phase 3メトリクスが初期化済みかどうかをチェックする関数
 *
 * @returns 初期化済みの場合true、そうでない場合false
 *
 * @example
 * ```typescript
 * if (isPhase3MetricsInitialized()) {
 *   recordConfigFetchMetrics('remote', 'success', 150);
 * }
 * ```
 *
 * @public
 */
export function isPhase3MetricsInitialized(): boolean {
  return isInitialized && enhancedMetricsInstance !== null;
}

/**
 * リモート設定取得のメトリクスを記録する関数
 *
 * 設定取得のソース、結果、期間をメトリクスとして記録します。
 * 内部カウンターとOpenTelemetryメトリクスの両方を更新します。
 *
 * @param source - 設定の取得先（remote, cache, default, fallback）
 * @param result - 取得結果（success, error）
 * @param duration - 取得にかかった時間（ミリ秒）（オプション）
 *
 * @example
 * ```typescript
 * // 成功したリモート取得を記録
 * recordConfigFetchMetrics('remote', 'success', 150);
 *
 * // キャッシュヒットを記録
 * recordConfigFetchMetrics('cache', 'success', 5);
 * ```
 *
 * @public
 */
export function recordConfigFetchMetrics(
  source: 'remote' | 'cache' | 'default' | 'fallback',
  result: 'success' | 'error',
  duration?: number
): void {
  try {
    // Increment internal counter
    metricsCounters.config_fetch_total++;

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping config fetch metrics');
      return;
    }

    metrics.config_fetch_total.add(1, {
      result,
      source,
    });

    if (duration !== undefined) {
      metrics.config_fetch_duration.record(duration, {
        result,
        source,
      });
    }
  } catch (error) {
    console.warn('Failed to record config fetch metrics:', error);
  }
}

/**
 * 設定バリデーションエラーメトリクスを記録する関数
 *
 * @param errorType - エラーの種類
 * @param errorMessage - エラーメッセージ（オプション）
 * @public
 */
export function recordConfigValidationError(errorType: string, errorMessage?: string): void {
  try {
    // Increment internal counter
    metricsCounters.config_error_total++;

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping validation error metrics');
      return;
    }

    metrics.config_validation_errors.add(1, {
      error_type: errorType,
      has_message: errorMessage ? 'true' : 'false',
    });
  } catch (error) {
    console.warn('Failed to record config validation error metrics:', error);
  }
}

/**
 * 設定更新メトリクスを記録する関数
 *
 * @param source - 更新の発生源
 * @param oldVersion - 更新前のバージョン
 * @param newVersion - 更新後のバージョン
 * @public
 */
export function recordConfigUpdateMetrics(
  source: 'admin' | 'system',
  oldVersion: number,
  newVersion: number
): void {
  try {
    // Increment internal counter
    metricsCounters.config_update_total++;

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping config update metrics');
      return;
    }

    // Record on the config_fetch_total counter with update action
    metrics.config_fetch_total.add(1, {
      result: 'update',
      source,
      version_change: `${oldVersion}->${newVersion}`,
    });
  } catch (error) {
    console.warn('Failed to record config update metrics:', error);
  }
}

/**
 * レートリミットのメトリクスを記録する関数
 *
 * レートリミットのヒットやリセットをメトリクスとして記録します。
 * 内部カウンターとOpenTelemetryメトリクスの両方を更新します。
 *
 * @param clientId - クライアント識別子
 * @param endpoint - 対象エンドポイント
 * @param action - アクションタイプ（hit, reset）
 * @param reason - アクションの理由
 *
 * @example
 * ```typescript
 * // レートリミットヒットを記録
 * recordRateLimitMetrics('client123', '/api/logs', 'hit', 'token_exhausted');
 *
 * // レートリミットリセットを記録
 * recordRateLimitMetrics('client123', '/api/logs', 'reset', 'manual_reset');
 * ```
 *
 * @public
 */
export function recordRateLimitMetrics(
  clientId: string,
  endpoint: string,
  action: 'hit' | 'reset',
  reason: string
): void {
  try {
    // Increment internal counters
    if (action === 'hit') {
      metricsCounters.rate_limit_hits_total++;
    } else if (action === 'reset') {
      metricsCounters.rate_limit_resets_total++;
    }

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping rate limit metrics');
      return;
    }

    metrics.rate_limit_decisions.add(1, {
      action,
      reason,
      endpoint,
    });
  } catch (error) {
    console.warn('Failed to record rate limit metrics:', error);
  }
}

/**
 * KVストレージのメトリクスを記録する関数
 *
 * Redis、Edge Config、メモリストレージの操作をメトリクスとして記録します。
 * 操作の種類、結果、期間、エラー情報を追跡します。
 *
 * @param storageType - ストレージタイプ（redis, edge-config, memory）
 * @param operation - 操作名（get, set, deleteなど）
 * @param result - 操作結果（success, error）
 * @param duration - 操作にかかった時間（ミリ秒）（オプション）
 *
 * @example
 * ```typescript
 * // RedisのGET操作成功を記録
 * recordKVMetrics('redis', 'get', 'success', 25);
 *
 * // Edge Configのエラーを記録
 * recordKVMetrics('edge-config', 'set', 'error');
 * ```
 *
 * @public
 */
export function recordKVMetrics(
  storageType: 'redis' | 'edge-config' | 'memory',
  operation: string,
  result: 'success' | 'error',
  duration?: number
): void {
  try {
    // Increment internal counters
    metricsCounters.storage_operations_total++;
    if (result === 'error') {
      metricsCounters.storage_errors_total++;
    }

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping KV metrics');
      return;
    }

    metrics.kv_operations_total.add(1, {
      operation,
      result,
      storage_type: storageType,
    });

    if (duration !== undefined) {
      metrics.kv_operation_duration.record(duration, {
        operation,
        storage_type: storageType,
      });
    }

    if (result === 'error') {
      metrics.kv_operation_errors.add(1, {
        operation,
        storage_type: storageType,
      });
    }
  } catch (error) {
    console.warn('Failed to record KV metrics:', error);
  }
}

/**
 * KVストレージの接続状態メトリクスを記録する関数
 *
 * @param connected - 接続状態（true=接続、false=切断）
 * @param storageType - ストレージタイプ
 * @public
 */
export function recordKVConnectionStatus(
  connected: boolean,
  storageType: 'redis' | 'edge-config' | 'memory'
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping KV connection status');
      return;
    }

    metrics.kv_connection_status.record(connected ? 1 : 0, {
      storage_type: storageType,
    });
  } catch (error) {
    console.warn('Failed to record KV connection status:', error);
  }
}

/**
 * Admin APIメトリクスを記録する関数
 *
 * @param method - HTTPメソッド
 * @param endpoint - APIエンドポイント
 * @param statusCode - HTTPステータスコード
 * @param _duration - 処理時間（ミリ秒）（現在未使用）
 * @public
 */
export function recordAdminAPIMetrics(
  method: string,
  endpoint: string,
  statusCode: number,
  _duration?: number
): void {
  try {
    // Increment internal counters
    metricsCounters.admin_api_calls_total++;
    if (statusCode >= 400) {
      metricsCounters.admin_api_errors_total++;
    }

    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping Admin API metrics');
      return;
    }

    metrics.admin_api_requests.add(1, {
      method,
      endpoint,
      status_code: statusCode.toString(),
    });

    if (statusCode === 401) {
      metrics.admin_api_auth_failures.add(1, {
        method,
        endpoint,
      });
    }

    if (statusCode === 429) {
      metrics.admin_api_rate_limits.add(1, {
        method,
        endpoint,
      });
    }
  } catch (error) {
    console.warn('Failed to record Admin API metrics:', error);
  }
}

/**
 * Phase 3メトリクスの現在のスナップショットを取得する関数
 *
 * 内部カウンターの現在値を取得し、タイムスタンプ付きの読み取り専用オブジェクトとして返します。
 * メトリクスが初期化されていない場合は、すべてゼロの値を返します。
 *
 * @returns 現在のメトリクス値とタイムスタンプを含む読み取り専用オブジェクト
 *
 * @example
 * ```typescript
 * const snapshot = getPhase3MetricsSnapshot();
 * console.log(`設定取得回数: ${snapshot.config_fetch_total}`);
 * console.log(`スナップショット取得時刻: ${snapshot.timestamp}`);
 * ```
 *
 * @public
 */
export function getPhase3MetricsSnapshot(): {
  readonly config_fetch_total: number;
  readonly config_update_total: number;
  readonly config_error_total: number;
  readonly rate_limit_hits_total: number;
  readonly rate_limit_resets_total: number;
  readonly storage_operations_total: number;
  readonly storage_errors_total: number;
  readonly admin_api_calls_total: number;
  readonly admin_api_errors_total: number;
  readonly timestamp: string;
} {
  // If not initialized, return zeros
  if (!isInitialized) {
    return Object.freeze({
      config_fetch_total: 0,
      config_update_total: 0,
      config_error_total: 0,
      rate_limit_hits_total: 0,
      rate_limit_resets_total: 0,
      storage_operations_total: 0,
      storage_errors_total: 0,
      admin_api_calls_total: 0,
      admin_api_errors_total: 0,
      timestamp: new Date().toISOString(),
    });
  }

  return Object.freeze({
    config_fetch_total: metricsCounters.config_fetch_total,
    config_update_total: metricsCounters.config_update_total,
    config_error_total: metricsCounters.config_error_total,
    rate_limit_hits_total: metricsCounters.rate_limit_hits_total,
    rate_limit_resets_total: metricsCounters.rate_limit_resets_total,
    storage_operations_total: metricsCounters.storage_operations_total,
    storage_errors_total: metricsCounters.storage_errors_total,
    admin_api_calls_total: metricsCounters.admin_api_calls_total,
    admin_api_errors_total: metricsCounters.admin_api_errors_total,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Phase 3メトリクスをリセットする関数
 *
 * すべてのメトリクスインスタンスと内部カウンターを初期化します。
 * テスト環境で使用されることが多い関数です。
 *
 * @public
 */
export function resetPhase3Metrics(): void {
  enhancedMetricsInstance = null;
  isInitialized = false;

  // Reset internal counters
  metricsCounters.config_fetch_total = 0;
  metricsCounters.config_update_total = 0;
  metricsCounters.config_error_total = 0;
  metricsCounters.rate_limit_hits_total = 0;
  metricsCounters.rate_limit_resets_total = 0;
  metricsCounters.storage_operations_total = 0;
  metricsCounters.storage_errors_total = 0;
  metricsCounters.admin_api_calls_total = 0;
  metricsCounters.admin_api_errors_total = 0;
}

/**
 * 操作をメトリクスでラップして実行するユーティリティ関数
 *
 * 指定された操作を実行し、成功または失敗に応じて自動的にメトリクスを記録します。
 * 実行時間も自動的に計測され、メトリクスに含まれます。
 *
 * @typeParam T - 関数の戻り値の型
 * @param operation - 操作名（メトリクスのラベルとして使用）
 * @param category - メトリクスカテゴリ（config, rate_limit, kv, admin_api）
 * @param fn - 実行する非同期関数
 * @returns 元の関数の戻り値をラップしたPromise
 *
 * @example
 * ```typescript
 * // 設定取得操作をメトリクス付きで実行
 * const config = await withMetrics(
 *   'fetchRemoteConfig',
 *   'config',
 *   () => fetchConfigFromRemote()
 * );
 *
 * // KV操作をメトリクス付きで実行
 * const value = await withMetrics(
 *   'getValue',
 *   'kv',
 *   () => storage.get('key')
 * );
 * ```
 *
 * @public
 */
export function withMetrics<T>(
  operation: string,
  category: 'config' | 'rate_limit' | 'kv' | 'admin_api',
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;

      switch (category) {
        case 'config':
          recordConfigFetchMetrics('remote', 'success', duration);
          break;
        case 'kv':
          recordKVMetrics('memory', 'get', 'success', duration);
          break;
        // Add other categories as needed
      }

      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;

      switch (category) {
        case 'config':
          recordConfigFetchMetrics('remote', 'error', duration);
          break;
        case 'kv':
          recordKVMetrics('memory', 'get', 'error', duration);
          break;
        // Add other categories as needed
      }

      throw error;
    });
}

/**
 * Process individual config operation for batch metrics
 */
function processConfigOperation(data: Record<string, unknown>): void {
  if (data.duration && typeof data.success === 'boolean') {
    recordConfigFetchMetrics(
      (data.source as 'remote' | 'cache' | 'default' | 'fallback') || 'remote',
      data.success ? 'success' : 'error',
      data.duration as number
    );
  }
}

/**
 * Process individual KV operation for batch metrics
 */
function processKVOperation(data: Record<string, unknown>): void {
  if (data.duration && typeof data.success === 'boolean') {
    recordKVMetrics(
      (data.storageType as 'redis' | 'edge-config' | 'memory') || 'memory',
      (data.operation as string) || 'get',
      data.success ? 'success' : 'error',
      data.duration as number
    );
  }
}

/**
 * バッチメトリクス記録関数
 *
 * 複数の操作のメトリクスを一括で記録します。
 * 効率的な一括処理により、パフォーマンスを向上させます。
 *
 * @param operations - 記録する操作の配列
 * @public
 */
export function recordBatchMetrics(
  operations: Array<{
    type: 'config' | 'rate_limit' | 'kv' | 'admin_api';
    data: Record<string, unknown>;
  }>
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping batch metrics');
      return;
    }

    for (const operation of operations) {
      switch (operation.type) {
        case 'config':
          processConfigOperation(operation.data);
          break;
        case 'kv':
          processKVOperation(operation.data);
          break;
        // Add other types as needed
      }
    }
  } catch (error) {
    console.warn('Failed to record batch metrics:', error);
  }
}
