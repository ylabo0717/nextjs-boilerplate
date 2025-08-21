/**
 * Health API E2E Tests
 *
 * End-to-end tests for the /api/health endpoint, validating it works correctly
 * in a real browser environment for Docker health checks and monitoring.
 *
 * @remarks
 * These tests ensure the health endpoint meets production requirements for
 * containerized deployments and monitoring systems. Health checks are critical
 * for Kubernetes liveness/readiness probes and load balancer health routing.
 */

import { test, expect } from '@playwright/test';

test.describe('Health API E2E', () => {
  /**
   * Tests that the health endpoint responds with correct HTTP status and content type.
   *
   * Verifies the /api/health endpoint returns 200 OK status with proper JSON content type.
   * This is essential for Docker health checks and monitoring systems that depend on
   * the health endpoint to determine application availability and readiness.
   *
   * @remarks
   * Docker health checks typically expect HTTP 200 responses to consider a container healthy.
   * Failure to return proper status codes can cause container orchestration systems
   * to restart or remove healthy containers.
   */
  test('should respond to health endpoint with success status', async ({ page }) => {
    const response = await page.request.get('/api/health');

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toBe('application/json');
  });

  /**
   * Tests that the health endpoint returns a well-structured response with all required fields.
   *
   * Verifies the response contains status, timestamp, uptime, version, environment, and system
   * information with correct data types. This ensures monitoring systems can reliably parse
   * and use the health data for operational dashboards and alerting.
   *
   * @remarks
   * Structured health responses enable automated monitoring, alerting, and operational
   * dashboards. The version and environment fields help with deployment tracking
   * and debugging in multi-environment setups.
   */
  test('should return correct health status format', async ({ page }) => {
    const response = await page.request.get('/api/health');
    const data = await response.json();

    // Verify the enhanced health response format
    expect(data).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String),
      environment: expect.any(String),
      system: expect.objectContaining({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          external: expect.any(Number),
        }),
        pid: expect.any(Number),
        nodejs_version: expect.any(String),
      }),
    });
  });

  /**
   * Tests that the health endpoint can handle multiple simultaneous requests reliably.
   *
   * Makes 10 concurrent requests to simulate real-world monitoring scenarios where
   * multiple systems may check health simultaneously. Ensures the endpoint remains
   * stable and consistent under concurrent load without race conditions or failures.
   */
  test('should handle concurrent health check requests', async ({ page }) => {
    // Make multiple concurrent requests to simulate monitoring systems
    const requests = Array.from({ length: 10 }, () => page.request.get('/api/health'));

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });

    // All responses should have the same structure
    const dataPromises = responses.map((response) => response.json());
    const allData = await Promise.all(dataPromises);

    allData.forEach((data) => {
      // Verify each response has the correct structure
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        system: expect.any(Object),
      });
    });
  });

  /**
   * Tests that the health endpoint meets performance requirements for monitoring systems.
   *
   * Verifies response times stay under 500ms, which is critical for monitoring systems
   * that perform frequent health checks. Fast response times prevent monitoring timeouts
   * and reduce the overhead of health checking on application performance.
   */
  test('should respond quickly for monitoring systems', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get('/api/health');
    const endTime = Date.now();

    expect(response.status()).toBe(200);

    // Health checks should be very fast (under 500ms for E2E)
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  /**
   * Tests that the health endpoint works with Docker health check user agents.
   *
   * Verifies the endpoint responds correctly to requests from Docker's built-in
   * health check mechanism. This ensures containerized deployments can properly
   * monitor application health using Docker's native health check functionality.
   */
  test('should work with different user agents (Docker health check)', async ({ page }) => {
    const response = await page.request.get('/api/health', {
      headers: {
        'User-Agent': 'Docker-HealthCheck/1.0',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  /**
   * Tests that the health endpoint works with various monitoring system user agents.
   *
   * Verifies compatibility with common monitoring tools (Prometheus, Grafana, Kubernetes, curl)
   * by testing different user agent headers. This ensures the health endpoint works reliably
   * across diverse monitoring and observability toolchains in production environments.
   */
  test('should work with different user agents (monitoring systems)', async ({ page }) => {
    const monitoringAgents = [
      'Prometheus/2.0',
      'Grafana/8.0',
      'Kubernetes/1.25 (health check)',
      'curl/7.68.0',
    ];

    for (const userAgent of monitoringAgents) {
      const response = await page.request.get('/api/health', {
        headers: {
          'User-Agent': userAgent,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
    }
  });

  /**
   * Tests that the health endpoint properly handles HEAD requests for efficient health checks.
   *
   * Verifies the endpoint responds appropriately to HEAD requests, which allow monitoring
   * systems to check availability without downloading the full response body.
   * This enables more efficient health checking with reduced bandwidth usage.
   */
  test('should handle HEAD requests for lightweight health checks', async ({ page }) => {
    const response = await page.request.head('/api/health');

    // Note: Next.js API routes typically don't support HEAD by default,
    // but this test ensures the endpoint doesn't crash on HEAD requests
    // The status should be either 200 (if HEAD is supported) or 405 (Method Not Allowed)
    expect([200, 405]).toContain(response.status());
  });

  /**
   * Tests that the health endpoint is available immediately after application startup.
   *
   * Verifies the health endpoint works correctly after the main application has loaded,
   * ensuring proper initialization order and that health checks don't fail during
   * application warm-up periods in production deployments.
   */
  test('should be accessible after application startup', async ({ page }) => {
    // First navigate to the main page to ensure the app is fully loaded
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Then test the health endpoint
    const response = await page.request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  /**
   * Tests that the health endpoint remains stable during various application states.
   *
   * Navigates through different pages (including non-existent ones) and verifies
   * the health endpoint continues to function correctly. This ensures the health
   * check system is resilient and doesn't break during normal application usage patterns.
   */
  test('should work consistently across multiple page loads', async ({ page }) => {
    // Navigate to different pages to stress test the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);

    // Navigate to a potentially non-existent page
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);

    // Go back to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  /**
   * Tests that the health endpoint handles requests with different HTTP headers correctly.
   *
   * Tests various header combinations (Accept, Cache-Control, X-Forwarded-For, X-Real-IP)
   * commonly used in production environments with load balancers and proxies.
   * This ensures the health endpoint works reliably in complex deployment architectures.
   */
  test('should handle requests with various headers', async ({ page }) => {
    const testCases: Array<{ headers: Record<string, string>; description: string }> = [
      {
        headers: { Accept: 'application/json' },
        description: 'with Accept header',
      },
      {
        headers: { 'Cache-Control': 'no-cache' },
        description: 'with Cache-Control header',
      },
      {
        headers: { 'X-Forwarded-For': '192.168.1.100' },
        description: 'with X-Forwarded-For header',
      },
      {
        headers: { 'X-Real-IP': '10.0.0.1' },
        description: 'with X-Real-IP header',
      },
    ];

    for (const testCase of testCases) {
      const response = await page.request.get('/api/health', {
        headers: testCase.headers,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
    }
  });

  /**
   * Tests that the health endpoint maintains consistent performance under repeated usage.
   *
   * Makes multiple sequential requests and measures response times to ensure performance
   * doesn't degrade over time. Consistent performance is critical for monitoring systems
   * that make frequent health check requests throughout application lifecycle.
   */
  test('should maintain performance under repeated requests', async ({ page }) => {
    const iterations = 5;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const response = await page.request.get('/api/health');
      const endTime = Date.now();

      expect(response.status()).toBe(200);
      responseTimes.push(endTime - startTime);

      // Small delay between requests
      await page.waitForTimeout(100);
    }

    // All requests should be reasonably fast
    responseTimes.forEach((time) => {
      expect(time).toBeLessThan(1000);
    });

    // Performance should be consistent (no significant degradation)
    const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    expect(averageTime).toBeLessThan(500);
  });

  /**
   * Tests that the health endpoint functions correctly in realistic production scenarios.
   *
   * Simulates production conditions by making requests after full page loads and other
   * API calls. Verifies the health endpoint works reliably when the application is under
   * normal operational load and returns properly structured responses with correct headers.
   */
  test('should work in production-like conditions', async ({ page }) => {
    // Simulate production conditions by making the request after the page is fully loaded
    // and other API calls might be happening
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Make a request to another API endpoint first (if available)
    try {
      await page.request.get('/api/metrics');
    } catch {
      // Ignore if metrics endpoint doesn't exist
    }

    // Now test health endpoint
    const response = await page.request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String),
      environment: expect.any(String),
      system: expect.any(Object),
    });

    // Verify response headers are appropriate for health checks
    const contentType = response.headers()['content-type'];
    expect(contentType).toBe('application/json');
  });
});
