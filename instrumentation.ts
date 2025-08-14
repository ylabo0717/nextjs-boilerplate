/**
 * Next.js Instrumentation for OpenTelemetry Metrics
 *
 * This file is automatically loaded by Next.js and sets up OpenTelemetry metrics
 * in a pure function architecture compatible with Edge Runtime.
 */

export async function register() {
  // Only initialize metrics in Node.js environment (not Edge Runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initializeMetrics } = await import('./src/lib/logger/metrics');
      await initializeMetrics();

      const { initializePhase3Metrics } = await import('./src/lib/logger/enhanced-metrics');
      initializePhase3Metrics();

      console.log('✅ Logger metrics initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize metrics:', error);
    }
  }
}
