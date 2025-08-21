/**
 * Metrics API Testing Suite
 *
 * End-to-end tests for OpenTelemetry metrics integration and Prometheus endpoint.
 * Validates metrics collection, response formats, and monitoring system compatibility.
 */

import { test, expect } from '@playwright/test';

test.describe('Metrics API', () => {
  /**
   * Tests that the metrics endpoint responds with correct HTTP status and content type.
   *
   * Verifies that the /api/metrics endpoint returns a 200 OK status and proper JSON
   * content type, ensuring the metrics collection system is functioning correctly
   * for monitoring and observability purposes.
   */
  test('should respond to metrics endpoint with proper status', async ({ page }) => {
    // Navigate to trigger some logging activity first
    await page.goto('/');

    // Wait for page to load and generate some logs
    await page.waitForLoadState('networkidle');

    // Test the metrics API endpoint
    const response = await page.request.get('/api/metrics');

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  /**
   * Tests that the metrics endpoint returns well-structured response data.
   *
   * Validates that the response contains all required fields (status, endpoint, format, port, 
   * message, timestamp) with correct data types and valid timestamp format (ISO 8601).
   * This ensures the metrics API provides consistent, parseable data for monitoring systems.
   *
   * @example
   * ```typescript
   * // Expected metrics response structure
   * {
   *   status: 'active',
   *   endpoint: '/metrics',
   *   format: 'prometheus',
   *   port: 9464,
   *   message: '...',
   *   timestamp: '2024-01-01T00:00:00.000Z'
   * }
   * ```
   */
  test('should return metrics information in correct format', async ({ page }) => {
    const response = await page.request.get('/api/metrics');
    const data = await response.json();

    expect(data).toHaveProperty('status', 'active');
    expect(data).toHaveProperty('endpoint', '/metrics');
    expect(data).toHaveProperty('format', 'prometheus');
    expect(data).toHaveProperty('port', 9464);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('timestamp');

    // Validate timestamp format (ISO 8601)
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toISOString()).toBe(data.timestamp);
  });

  /**
   * Tests that the metrics endpoint properly handles HEAD requests for lightweight health checks.
   *
   * Verifies that HEAD requests return appropriate status and cache control headers without
   * response body, allowing monitoring systems to perform efficient health checks without
   * downloading the full metrics payload.
   */
  test('should handle HEAD requests for health checks', async ({ page }) => {
    const response = await page.request.head('/api/metrics');

    expect(response.status()).toBe(200);

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('must-revalidate');
  });

  /**
   * Tests that the metrics endpoint includes appropriate cache control headers.
   *
   * Verifies that cache headers (no-store, no-cache, must-revalidate) are set correctly
   * to prevent caching of metrics data, ensuring monitoring systems always receive
   * fresh, real-time metrics information.
   */
  test('should have proper cache headers', async ({ page }) => {
    const response = await page.request.get('/api/metrics');

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('must-revalidate');
  });

  /**
   * Tests that the metrics system continues to function after various page interactions.
   *
   * Performs multiple page navigations and verifies that the metrics endpoint remains
   * responsive and functional. This ensures the metrics collection system is robust
   * and doesn't break during normal application usage patterns.
   */
  test('should generate metrics after page interactions', async ({ page }) => {
    // Perform various actions to generate metrics
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to different pages to generate more metrics
    await page.goto('/example');
    await page.waitForLoadState('networkidle');

    // Go back to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Now check if metrics endpoint is still working
    const response = await page.request.get('/api/metrics');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('active');
  });

  /**
   * Tests that the metrics endpoint handles multiple simultaneous requests correctly.
   *
   * Makes concurrent requests to test thread safety and stability under load.
   * Verifies that all requests succeed and return consistent response structure,
   * ensuring the metrics system is reliable under concurrent access patterns.
   *
   * @example
   * ```typescript
   * // Concurrent request testing pattern
   * const requests = Array.from({ length: 5 }, () => 
   *   page.request.get('/api/metrics')
   * );
   * const responses = await Promise.all(requests);
   * ```
   */
  test('should handle concurrent requests properly', async ({ page }) => {
    // Make multiple concurrent requests to test stability
    const requests = Array.from({ length: 5 }, () => page.request.get('/api/metrics'));

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });

    // All responses should have the same structure
    const dataPromises = responses.map((response) => response.json());
    const allData = await Promise.all(dataPromises);

    allData.forEach((data) => {
      expect(data).toHaveProperty('status', 'active');
      expect(data).toHaveProperty('port', 9464);
    });
  });

  /**
   * Tests that the metrics endpoint meets performance requirements for monitoring systems.
   *
   * Measures response time and ensures it stays under acceptable thresholds (1 second).
   * Fast response times are critical for monitoring systems that may query metrics
   * frequently without impacting application performance.
   */
  test('should respond quickly to metrics requests', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get('/api/metrics');
    const endTime = Date.now();

    expect(response.status()).toBe(200);

    // Should respond within 1 second (generous timeout for CI)
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1000);
  });
});
