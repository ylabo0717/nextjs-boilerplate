/**
 * Enhanced metrics for operational monitoring
 *
 * Provides comprehensive monitoring for remote configuration,
 * rate limiting, and KV storage operations.
 */

import { metrics } from '@opentelemetry/api';

/**
 * Enhanced Metrics interface
 *
 * Interface defining advanced metrics collection features added in Phase C.
 * Manages counters, gauges, and histograms using OpenTelemetry meters.
 *
 * @public
 */
export interface EnhancedMetrics {
  /** Number of remote configuration fetches */
  config_fetch_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Remote configuration fetch duration distribution */
  config_fetch_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** Configuration cache hit count */
  config_cache_hits: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Configuration validation error count */
  config_validation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  /** Rate limit decision count (allowed/denied) */
  rate_limit_decisions: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Current rate limit token count */
  rate_limit_tokens: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  /** Rate limit backoff time distribution */
  rate_limit_backoff_time: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** Current rate limit sampling rate */
  rate_limit_sampling_rate: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;

  /** Total KV storage operations */
  kv_operations_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** KV storage operation duration distribution */
  kv_operation_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  /** KV storage connection status (1=connected, 0=disconnected) */
  kv_connection_status: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  /** KV storage operation error count */
  kv_operation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  /** Total Admin API requests */
  admin_api_requests: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Admin API authentication failure count */
  admin_api_auth_failures: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  /** Admin API rate limit hit count */
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
 * Function to initialize Phase 3 enhanced metrics
 *
 * Initializes detailed metrics for monitoring remote configuration,
 * rate limiting, KV storage, and Admin API operations.
 * Returns existing instance if already initialized.
 *
 * @returns Initialized EnhancedMetrics instance
 * @throws Error - When metrics initialization fails
 *
 * @example
 * ```typescript
 * const metrics = initializePhase3Metrics();
 * // Console displays '✅ Enhanced Metrics initialized successfully'
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
 * Function to get initialized Phase 3 metrics instance
 *
 * @returns Initialized EnhancedMetrics instance or null
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
 * Function to check if Phase 3 metrics are initialized
 *
 * @returns true if initialized, false otherwise
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
 * Function to record remote configuration fetch metrics
 *
 * Records configuration fetch source, result, and duration as metrics.
 * Updates both internal counters and OpenTelemetry metrics.
 *
 * @param source - Configuration fetch source (remote, cache, default, fallback)
 * @param result - Fetch result (success, error)
 * @param duration - Time taken for fetch (milliseconds) (optional)
 *
 * @example
 * ```typescript
 * // Record successful remote fetch
 * recordConfigFetchMetrics('remote', 'success', 150);
 *
 * // Record cache hit
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
 * Function to record configuration validation error metrics
 *
 * @param errorType - Error type
 * @param errorMessage - Error message (optional)
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
 * Function to record configuration update metrics
 *
 * @param source - Update source
 * @param oldVersion - Version before update
 * @param newVersion - Version after update
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
 * Function to record rate limit metrics
 *
 * Records rate limit hits and resets as metrics.
 * Updates both internal counters and OpenTelemetry metrics.
 *
 * @param clientId - Client identifier
 * @param endpoint - Target endpoint
 * @param action - Action type (hit, reset)
 * @param reason - Reason for action
 *
 * @example
 * ```typescript
 * // Record rate limit hit
 * recordRateLimitMetrics('client123', '/api/logs', 'hit', 'token_exhausted');
 *
 * // Record rate limit reset
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
 * Function to record KV storage metrics
 *
 * Records Redis, Edge Config, and memory storage operations as metrics.
 * Tracks operation type, result, duration, and error information.
 *
 * @param storageType - Storage type (redis, edge-config, memory)
 * @param operation - Operation name (get, set, delete, etc.)
 * @param result - Operation result (success, error)
 * @param duration - Time taken for operation (milliseconds) (optional)
 *
 * @example
 * ```typescript
 * // Record successful Redis GET operation
 * recordKVMetrics('redis', 'get', 'success', 25);
 *
 * // Record Edge Config error
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
 * Function to record KV storage connection status metrics
 *
 * @param connected - Connection status (true=connected, false=disconnected)
 * @param storageType - Storage type
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
 * Function to record Admin API metrics
 *
 * @param method - HTTP method
 * @param endpoint - API endpoint
 * @param statusCode - HTTP status code
 * @param _duration - Processing time (milliseconds) (currently unused)
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
 * Function to get current snapshot of Phase 3 metrics
 *
 * Gets current values of internal counters and returns them as a timestamped read-only object.
 * Returns all zero values if metrics are not initialized.
 *
 * @returns Read-only object containing current metrics values and timestamp
 *
 * @example
 * ```typescript
 * const snapshot = getPhase3MetricsSnapshot();
 * console.log(`Configuration fetches: ${snapshot.config_fetch_total}`);
 * console.log(`Snapshot timestamp: ${snapshot.timestamp}`);
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
 * Function to reset Phase 3 metrics
 *
 * Initializes all metrics instances and internal counters.
 * Often used in test environments.
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
 * Utility function to wrap and execute operations with metrics
 *
 * Executes specified operations and automatically records metrics based on success or failure.
 * Execution time is also automatically measured and included in metrics.
 *
 * @typeParam T - Type of function return value
 * @param operation - Operation name (used as metrics label)
 * @param category - Metrics category (config, rate_limit, kv, admin_api)
 * @param fn - Asynchronous function to execute
 * @returns Promise wrapping the original function's return value
 *
 * @example
 * ```typescript
 * // Execute configuration fetch operation with metrics
 * const config = await withMetrics(
 *   'fetchRemoteConfig',
 *   'config',
 *   () => fetchConfigFromRemote()
 * );
 *
 * // Execute KV operation with metrics
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
 * Batch metrics recording function
 *
 * Records metrics for multiple operations in batch.
 * Improves performance through efficient batch processing.
 *
 * @param operations - Array of operations to record
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
