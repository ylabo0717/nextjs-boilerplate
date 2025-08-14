/**
 * Metrics API E2E Tests
 * 
 * End-to-end tests for OpenTelemetry metrics integration and Prometheus endpoint.
 */

import { test, expect } from '@playwright/test';

test.describe('Metrics API', () => {
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

  test('should handle HEAD requests for health checks', async ({ page }) => {
    const response = await page.request.head('/api/metrics');
    
    expect(response.status()).toBe(200);
    
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('must-revalidate');
  });

  test('should have proper cache headers', async ({ page }) => {
    const response = await page.request.get('/api/metrics');
    
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('must-revalidate');
  });

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

  test('should handle concurrent requests properly', async ({ page }) => {
    // Make multiple concurrent requests to test stability
    const requests = Array.from({ length: 5 }, () => 
      page.request.get('/api/metrics')
    );
    
    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // All responses should have the same structure
    const dataPromises = responses.map(response => response.json());
    const allData = await Promise.all(dataPromises);
    
    allData.forEach(data => {
      expect(data).toHaveProperty('status', 'active');
      expect(data).toHaveProperty('port', 9464);
    });
  });

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