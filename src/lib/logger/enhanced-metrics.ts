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
  duration: number,
  success: boolean,
  cached: boolean,
  source: 'remote' | 'cache' | 'default' = 'remote'
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping config fetch metrics');
      return;
    }

    metrics.config_fetch_total.add(1, {
      success: success.toString(),
      source,
    });

    metrics.config_fetch_duration.record(duration, {
      success: success.toString(),
      source,
    });

    if (cached) {
      metrics.config_cache_hits.add(1, {
        type: 'hit',
      });
    } else {
      metrics.config_cache_hits.add(1, {
        type: 'miss',
      });
    }
  } catch (error) {
    console.warn('Failed to record config fetch metrics:', error);
  }
}

export function recordConfigValidationError(
  errorType: string,
  fieldName?: string
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping validation error metrics');
      return;
    }

    metrics.config_validation_errors.add(1, {
      error_type: errorType,
      field: fieldName || 'unknown',
    });
  } catch (error) {
    console.warn('Failed to record config validation error metrics:', error);
  }
}

export function recordRateLimitMetrics(
  decision: 'allowed' | 'denied',
  reason: 'tokens' | 'backoff' | 'sampling',
  remainingTokens: number,
  logLevel?: string,
  backoffTime?: number,
  adaptiveRate?: number
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping rate limit metrics');
      return;
    }

    metrics.rate_limit_decisions.add(1, {
      decision,
      reason,
      log_level: logLevel || 'unknown',
    });

    metrics.rate_limit_tokens.record(remainingTokens);

    if (backoffTime) {
      metrics.rate_limit_backoff_time.record(backoffTime / 1000); // Convert to seconds
    }

    if (adaptiveRate !== undefined) {
      metrics.rate_limit_sampling_rate.record(adaptiveRate, {
        log_level: logLevel || 'unknown',
      });
    }
  } catch (error) {
    console.warn('Failed to record rate limit metrics:', error);
  }
}

export function recordKVMetrics(
  operation: 'get' | 'set' | 'delete' | 'exists' | 'health_check',
  duration: number,
  success: boolean,
  storageType: 'redis' | 'edge-config' | 'memory',
  errorType?: string
): void {
  try {
    const metrics = getPhase3Metrics();
    if (!metrics) {
      console.warn('Enhanced metrics not initialized, skipping KV metrics');
      return;
    }

    metrics.kv_operations_total.add(1, {
      operation,
      success: success.toString(),
      storage_type: storageType,
    });

    metrics.kv_operation_duration.record(duration, {
      operation,
      storage_type: storageType,
    });

    if (!success && errorType) {
      metrics.kv_operation_errors.add(1, {
        operation,
        storage_type: storageType,
        error_type: errorType,
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
  authSuccess: boolean,
  rateLimited: boolean
): void {
  try {
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

    if (!authSuccess) {
      metrics.admin_api_auth_failures.add(1, {
        method,
        endpoint,
      });
    }

    if (rateLimited) {
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
  readonly initialized: boolean;
  readonly meter_name: string;
  readonly version: string;
  readonly metrics_count: number;
} {
  return Object.freeze({
    initialized: isInitialized,
    meter_name: 'nextjs-boilerplate-enhanced',
    version: '1.0.0',
    metrics_count: enhancedMetricsInstance ? Object.keys(enhancedMetricsInstance).length : 0,
  });
}

export function resetPhase3Metrics(): void {
  enhancedMetricsInstance = null;
  isInitialized = false;
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
          recordConfigFetchMetrics(duration, true, false);
          break;
        case 'kv':
          recordKVMetrics(operation as any, duration, true, 'memory');
          break;
        // Add other categories as needed
      }
      
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      
      switch (category) {
        case 'config':
          recordConfigFetchMetrics(duration, false, false);
          break;
        case 'kv':
          recordKVMetrics(operation as any, duration, false, 'memory', error.name);
          break;
        // Add other categories as needed
      }
      
      throw error;
    });
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
          if (operation.data.duration && typeof operation.data.success === 'boolean') {
            recordConfigFetchMetrics(
              operation.data.duration as number,
              operation.data.success,
              operation.data.cached as boolean || false,
              operation.data.source as any
            );
          }
          break;
        case 'kv':
          if (operation.data.duration && typeof operation.data.success === 'boolean') {
            recordKVMetrics(
              operation.data.operation as any,
              operation.data.duration as number,
              operation.data.success,
              operation.data.storageType as any,
              operation.data.errorType as string
            );
          }
          break;
        // Add other types as needed
      }
    }
  } catch (error) {
    console.warn('Failed to record batch metrics:', error);
  }
}