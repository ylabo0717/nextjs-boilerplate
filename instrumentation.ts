/**
 * Next.js Instrumentation for OpenTelemetry Metrics
 *
 * This file is automatically loaded by Next.js and sets up OpenTelemetry metrics
 * in a pure function architecture compatible with Edge Runtime.
 */

export async function register() {
  // Only initialize metrics in Node.js environment (not Edge Runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeMetrics } = await import('./src/lib/logger/metrics');
    await initializeMetrics();
  }
}
