/**
 * Health API E2E Tests
 *
 * End-to-end tests for the /api/health endpoint, validating it works correctly
 * in a real browser environment for Docker health checks and monitoring.
 */

import { test, expect } from '@playwright/test';

test.describe('Health API E2E', () => {
  test('should respond to health endpoint with success status', async ({ page }) => {
    const response = await page.request.get('/api/health');

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toBe('application/json');
  });

  test('should return correct health status format', async ({ page }) => {
    const response = await page.request.get('/api/health');
    const data = await response.json();

    expect(data).toEqual({
      status: 'ok',
    });
  });

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
      expect(data).toEqual({ status: 'ok' });
    });
  });

  test('should respond quickly for monitoring systems', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get('/api/health');
    const endTime = Date.now();

    expect(response.status()).toBe(200);

    // Health checks should be very fast (under 500ms for E2E)
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

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

  test('should handle HEAD requests for lightweight health checks', async ({ page }) => {
    const response = await page.request.head('/api/health');

    // Note: Next.js API routes typically don't support HEAD by default,
    // but this test ensures the endpoint doesn't crash on HEAD requests
    // The status should be either 200 (if HEAD is supported) or 405 (Method Not Allowed)
    expect([200, 405]).toContain(response.status());
  });

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
    expect(data).toEqual({ status: 'ok' });

    // Verify response headers are appropriate for health checks
    const contentType = response.headers()['content-type'];
    expect(contentType).toBe('application/json');
  });
});
