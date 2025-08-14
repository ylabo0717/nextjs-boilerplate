/**
 * Enhanced metrics for operational monitoring
 *
 * Provides comprehensive monitoring for remote configuration,
 * rate limiting, and KV storage operations.
 */

import { metrics } from '@opentelemetry/api';

export interface EnhancedMetrics {
  // Remote configuration metrics
  config_fetch_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  config_fetch_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  config_cache_hits: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  config_validation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  // Rate limiter metrics
  rate_limit_decisions: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  rate_limit_tokens: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  rate_limit_backoff_time: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  rate_limit_sampling_rate: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;

  // KV storage metrics
  kv_operations_total: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  kv_operation_duration: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
  kv_connection_status: ReturnType<ReturnType<typeof metrics.getMeter>['createGauge']>;
  kv_operation_errors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;

  // Admin API metrics
  admin_api_requests: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  admin_api_auth_failures: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
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

export function getPhase3Metrics(): EnhancedMetrics | null {
  return enhancedMetricsInstance;
}

export function isPhase3MetricsInitialized(): boolean {
  return isInitialized && enhancedMetricsInstance !== null;
}

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
