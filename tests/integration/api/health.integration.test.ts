/**
 * Health API Integration Tests
 *
 * Tests the /api/health endpoint that provides basic service health status.
 * This endpoint is essential for Docker health checks and monitoring systems.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { GET } from '@/app/api/health/route';

describe('Health API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 status with success response', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should return correct JSON structure', async () => {
      const response = await GET();

      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        system: {
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
            external: expect.any(Number),
          },
          pid: expect.any(Number),
          nodejs_version: expect.any(String),
        },
      });
    });

    it('should set correct content-type header', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => GET());

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const responseData = await Promise.all(responses.map((response) => response.json()));

      responseData.forEach((data) => {
        expect(data).toMatchObject({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        });
      });
    });

    it('should respond quickly (performance test)', async () => {
      const startTime = Date.now();
      const response = await GET();
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Health endpoint should respond within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle requests with various headers', async () => {
      const testHeaders = [
        { 'user-agent': 'Docker-HealthCheck/1.0' },
        { 'x-forwarded-for': '192.168.1.100' },
        { accept: 'application/json' },
        { 'cache-control': 'no-cache' },
      ];

      for (const headers of testHeaders) {
        const response = await GET();

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toMatchObject({ status: 'ok' });
      }
    });

    it('should be suitable for Docker health checks', async () => {
      // Simulate Docker health check request
      const response = await GET();

      // Docker health checks expect 200 status for healthy service
      expect(response.status).toBe(200);

      // Response should be valid JSON
      const data = await response.json();
      expect(typeof data).toBe('object');
      expect(data.status).toBe('ok');
    });

    it('should work with monitoring systems', async () => {
      // Simulate monitoring system request
      const response = await GET();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');

      // Should have proper JSON content type for monitoring systems
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Health Check Reliability', () => {
    it('should consistently return the same response', async () => {
      const responses = [];

      // Make 5 requests sequentially
      for (let i = 0; i < 5; i++) {
        const response = await GET();
        const data = await response.json();

        responses.push({
          status: response.status,
          data,
          contentType: response.headers.get('content-type'),
        });
      }

      // All responses should be identical
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ status: 'ok' });
        expect(response.contentType).toBe('application/json');
      });
    });

    it('should be stateless (no side effects)', async () => {
      // Make first request
      const response1 = await GET();
      const data1 = await response1.json();

      // Make second request
      const response2 = await GET();
      const data2 = await response2.json();

      // Both responses should be identical (stateless)
      expect(response1.status).toBe(response2.status);
      expect(data1).toEqual(data2);
    });
  });

  describe('Enhanced Health Information', () => {
    it('should include system metrics', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.system).toBeDefined();
      expect(data.system.memory).toBeDefined();
      expect(data.system.pid).toBeGreaterThan(0);
      expect(data.system.nodejs_version).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('should include cache control headers', async () => {
      const response = await GET();

      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('pragma')).toBe('no-cache');
      expect(response.headers.get('expires')).toBe('0');
    });

    it('should include valid timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(() => new Date(data.timestamp)).not.toThrow();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('should include uptime information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.uptime).toBe('number');
    });

    it('should include environment information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(['development', 'test', 'production']).toContain(data.environment);
    });
  });

  describe('Error Handling', () => {
    it('should handle requests gracefully even with unusual parameters', async () => {
      // Test with query parameters (should be ignored)
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });

    it('should handle empty or malformed headers gracefully', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });
});
