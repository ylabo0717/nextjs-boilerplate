import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker health checks and monitoring systems.
 *
 * Returns a simple JSON response indicating service health status.
 * This endpoint is designed to be lightweight and fast for monitoring purposes.
 *
 * @returns Promise resolving to NextResponse with health status
 *
 * @example
 * ```
 * GET /api/health
 * Response: { "status": "ok" }
 * ```
 */
export function GET() {
  try {
    // Basic health check
    const basicHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Enhanced health checks for production
    const healthChecks = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      pid: process.pid,
      nodejs_version: process.version,
    };

    // Return comprehensive health status
    return NextResponse.json(
      {
        ...basicHealth,
        system: healthChecks,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    // Return unhealthy status on any error
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
