/**
 * Prometheus Metrics Endpoint
 *
 * OpenTelemetry metrics in Prometheus format for monitoring and observability.
 * Compatible with Prometheus scraping and Grafana dashboards.
 */

import { NextRequest, NextResponse } from 'next/server';

import { withAPIRouteTracing, traceOperation } from '../../../lib/logger/api-route-tracing';

/**
 * GET /api/metrics - Prometheus metrics endpoint
 *
 * Returns OpenTelemetry metrics in Prometheus format.
 * Used by Prometheus for scraping application metrics.
 */
export const GET = withAPIRouteTracing(
  async (_request: NextRequest): Promise<NextResponse> => {
    try {
      // Import metrics functions to check initialization
      const { isMetricsInitialized } = await import('../../../lib/logger/metrics');
      const { isPhase3MetricsInitialized, getPhase3MetricsSnapshot } = await import(
        '../../../lib/logger/enhanced-metrics'
      );

      // Check if metrics are properly initialized with tracing
      const metricsInitialized = await traceOperation(
        'check-metrics-initialization',
        async () => {
          return isMetricsInitialized();
        },
        { 'metrics.type': 'core' }
      );

      if (!metricsInitialized) {
        // Try to initialize metrics if not already done
        await traceOperation(
          'initialize-core-metrics',
          async () => {
            const { initializeMetrics } = await import('../../../lib/logger/metrics');
            await initializeMetrics();
          },
          { 'metrics.operation': 'initialize' }
        );
      }

      const enhancedInitialized = await traceOperation(
        'check-enhanced-metrics-initialization',
        async () => {
          return isPhase3MetricsInitialized();
        },
        { 'metrics.type': 'enhanced' }
      );

      if (!enhancedInitialized) {
        await traceOperation(
          'initialize-enhanced-metrics',
          async () => {
            const { initializePhase3Metrics } = await import(
              '../../../lib/logger/enhanced-metrics'
            );
            initializePhase3Metrics();
          },
          { 'metrics.operation': 'initialize-enhanced' }
        );
      }

      // Get enhanced metrics snapshot with tracing
      const enhancedSnapshot = await traceOperation(
        'get-metrics-snapshot',
        async () => {
          return getPhase3MetricsSnapshot();
        },
        { 'metrics.operation': 'snapshot' }
      );

      // Return a simple response indicating metrics endpoint is active
      // The actual Prometheus metrics are served directly by the PrometheusExporter
      // which runs on port 9464 as configured in metrics.ts
      const metricsInfo = {
        status: 'active',
        endpoint: '/metrics',
        format: 'prometheus',
        port: 9464,
        message: 'OpenTelemetry metrics are available via PrometheusExporter on port 9464',
        metrics_initialized: metricsInitialized,
        enhanced_initialized: enhancedInitialized,
        enhanced_metrics: enhancedSnapshot,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(metricsInfo, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (error) {
      console.error('Error serving metrics:', error);

      return new NextResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
  {
    spanName: 'GET /api/metrics',
    attributes: {
      'api.type': 'metrics',
      'api.format': 'prometheus',
    },
  }
);

/**
 * Health check for metrics endpoint
 */
export const HEAD = withAPIRouteTracing(
  async (_request: NextRequest): Promise<NextResponse> => {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  },
  {
    spanName: 'HEAD /api/metrics',
    attributes: {
      'api.type': 'health-check',
    },
  }
);
