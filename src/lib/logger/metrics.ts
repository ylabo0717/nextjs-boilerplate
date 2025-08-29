/**
 * OpenTelemetry Metrics Integration for Structured Logging
 *
 * Pure function-based metrics implementation compatible with Edge Runtime.
 * Provides automated metrics collection for log entries and errors.
 */

import { metrics, type Counter, type Histogram, type Gauge } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

import type { LogLevel } from './types';

// Metrics instances (singleton pattern for pure function access)
let logEntriesCounter: Counter | null = null;
let errorCounter: Counter | null = null;
let requestDurationHistogram: Histogram | null = null;
let memoryUsageGauge: Gauge | null = null;

/**
 * Function to initialize OpenTelemetry Metrics Provider
 *
 * Sets up a metrics collection system integrated with Prometheus exporter.
 * Pure function implementation compatible with Edge Runtime environments.
 * Initializes global metrics instances and creates metrics for log entries,
 * errors, request duration, and memory usage.
 *
 * @returns Promise<void> - Resolves when initialization is complete
 * @throws Error - When Prometheus exporter configuration or meter creation fails
 *
 * @example
 * ```typescript
 * // Initialize at application startup
 * await initializeMetrics();
 * // Console displays '✅ OpenTelemetry Metrics initialized successfully'
 *
 * // Metrics functions are available after initialization
 * incrementLogCounter('info', 'server');
 * ```
 *
 * @public
 */
export async function initializeMetrics(): Promise<void> {
  try {
    // Configure Prometheus exporter
    const prometheusExporter = new PrometheusExporter({
      port: 9464,
      endpoint: '/metrics',
    });

    // Create meter provider with simple configuration
    const meterProvider = new MeterProvider({
      readers: [prometheusExporter],
    });

    // Set global meter provider
    metrics.setGlobalMeterProvider(meterProvider);

    // Create meter instance
    const meter = metrics.getMeter('nextjs-boilerplate-logger', '1.0.0');

    // Initialize counters
    logEntriesCounter = meter.createCounter('log_entries_total', {
      description: 'Total number of log entries by level and component',
    });

    errorCounter = meter.createCounter('error_count', {
      description: 'Total number of errors by type and component',
    });

    // Initialize histogram for request duration
    requestDurationHistogram = meter.createHistogram('request_duration_ms', {
      description: 'Request processing duration in milliseconds',
      unit: 'ms',
    });

    // Initialize gauge for memory usage
    memoryUsageGauge = meter.createGauge('memory_usage_bytes', {
      description: 'Current memory usage in bytes',
      unit: 'bytes',
    });

    console.log('✅ OpenTelemetry Metrics initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry Metrics:', error);
    throw error;
  }
}

/**
 * Increment log entries counter
 *
 * Pure function for incrementing log metrics with proper labels.
 *
 * @param level - Log level (trace, debug, info, warn, error, fatal)
 * @param component - Component name (server, client, middleware, api)
 * @param environment - Environment (development, staging, production)
 */
export function incrementLogCounter(
  level: LogLevel,
  component: string,
  environment: string = process.env.NODE_ENV || 'development'
): void {
  if (!logEntriesCounter) {
    console.warn('Log counter not initialized, skipping metric update');
    return;
  }

  try {
    logEntriesCounter.add(1, {
      level,
      component,
      environment,
    });
  } catch (error) {
    console.error('Failed to increment log counter:', error);
  }
}

/**
 * Increment error counter
 *
 * Pure function for incrementing error metrics with error classification.
 *
 * @param errorType - Type of error (validation, network, system, etc.)
 * @param component - Component where error occurred
 * @param severity - Error severity (low, medium, high, critical)
 */
export function incrementErrorCounter(
  errorType: string,
  component: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  if (!errorCounter) {
    console.warn('Error counter not initialized, skipping metric update');
    return;
  }

  try {
    errorCounter.add(1, {
      error_type: errorType,
      component,
      severity,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Failed to increment error counter:', error);
  }
}

/**
 * Record request duration
 *
 * Pure function for recording HTTP request processing time.
 *
 * @param duration - Duration in milliseconds
 * @param method - HTTP method (GET, POST, etc.)
 * @param statusCode - HTTP status code
 * @param route - Route path
 */
export function recordRequestDuration(
  duration: number,
  method: string,
  statusCode: number,
  route: string = 'unknown'
): void {
  if (!requestDurationHistogram) {
    console.warn('Request duration histogram not initialized, skipping metric update');
    return;
  }

  try {
    requestDurationHistogram.record(duration, {
      method: method.toUpperCase(),
      status_code: statusCode.toString(),
      route,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Failed to record request duration:', error);
  }
}

/**
 * Update memory usage gauge
 *
 * Pure function for updating current memory usage metrics.
 *
 * @param processType - Type of process (server, edge, client)
 * @param runtime - Runtime environment (nodejs, edge)
 */
export function updateMemoryUsage(
  processType: 'server' | 'edge' | 'client' = 'server',
  runtime: 'nodejs' | 'edge' = 'nodejs'
): void {
  if (!memoryUsageGauge) {
    console.warn('Memory usage gauge not initialized, skipping metric update');
    return;
  }

  try {
    // Only collect memory usage in Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memoryUsage = process.memoryUsage();

      memoryUsageGauge.record(memoryUsage.heapUsed, {
        process_type: processType,
        runtime,
        memory_type: 'heap_used',
        environment: process.env.NODE_ENV || 'development',
      });

      memoryUsageGauge.record(memoryUsage.heapTotal, {
        process_type: processType,
        runtime,
        memory_type: 'heap_total',
        environment: process.env.NODE_ENV || 'development',
      });
    }
  } catch (error) {
    console.error('Failed to update memory usage:', error);
  }
}

/**
 * Function to get metrics instances for testing and debugging
 *
 * Pure function that returns currently initialized metrics instances.
 * Returns null if metrics are not initialized.
 * Primarily used for unit testing and debugging purposes.
 *
 * @returns Metrics instances object or null
 *
 * @example
 * ```typescript
 * const metrics = getMetricsInstances();
 * if (metrics.logEntriesCounter) {
 *   console.log('Log counter is initialized');
 * }
 * ```
 *
 * @internal
 */
export function getMetricsInstances() {
  return {
    logEntriesCounter,
    errorCounter,
    requestDurationHistogram,
    memoryUsageGauge,
  };
}

/**
 * Function to check if metrics are initialized
 *
 * Verifies that all metrics instances (log counter, error counter,
 * request duration histogram, memory usage gauge) are initialized.
 *
 * @returns true if all metrics are initialized, false otherwise
 *
 * @example
 * ```typescript
 * if (isMetricsInitialized()) {
 *   incrementLogCounter('info', 'server');
 * } else {
 *   console.warn('Metrics are not initialized');
 * }
 * ```
 *
 * @public
 */
export function isMetricsInitialized(): boolean {
  return Boolean(logEntriesCounter && errorCounter && requestDurationHistogram && memoryUsageGauge);
}

/**
 * Function to reset metrics instances (for testing)
 *
 * Resets all metrics instances to null.
 * Primarily used in test environments to run tests in a clean state.
 * Pure function implementation with no side effects.
 *
 * @example
 * ```typescript
 * // Reset metrics in test setup
 * beforeEach(() => {
 *   resetMetrics();
 * });
 * ```
 *
 * @internal
 */
export function resetMetrics(): void {
  logEntriesCounter = null;
  errorCounter = null;
  requestDurationHistogram = null;
  memoryUsageGauge = null;
}
