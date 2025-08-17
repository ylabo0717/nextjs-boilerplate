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
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
