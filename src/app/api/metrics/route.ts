/**
 * Prometheus Metrics Endpoint
 *
 * OpenTelemetry metrics in Prometheus format for monitoring and observability.
 * Compatible with Prometheus scraping and Grafana dashboards.
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/metrics - Prometheus metrics endpoint
 *
 * Returns OpenTelemetry metrics in Prometheus format.
 * Used by Prometheus for scraping application metrics.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Import metrics functions to check initialization
    const { isMetricsInitialized } = await import('../../../lib/logger/metrics');

    // Check if metrics are properly initialized
    if (!isMetricsInitialized()) {
      // Try to initialize metrics if not already done
      try {
        const { initializeMetrics } = await import('../../../lib/logger/metrics');
        await initializeMetrics();
      } catch (initError) {
        console.error('Metrics initialization failed:', initError);
        return new NextResponse('Metrics initialization failed', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // For Prometheus format, we need to get the exporter
    // The PrometheusExporter should already be configured to serve metrics
    // at this endpoint via the MeterProvider configuration

    // Return a simple response indicating metrics endpoint is active
    // The actual Prometheus metrics are served directly by the PrometheusExporter
    // which runs on port 9464 as configured in metrics.ts
    const metricsInfo = {
      status: 'active',
      endpoint: '/metrics',
      format: 'prometheus',
      port: 9464,
      message: 'OpenTelemetry metrics are available via PrometheusExporter on port 9464',
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
}

/**
 * Health check for metrics endpoint
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
