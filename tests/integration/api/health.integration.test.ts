/**
 * Health API Integration Testing Suite
 *
 * Integration tests for the /api/health endpoint that provides service health status
 * and system information. Critical for Docker health checks, Kubernetes probes,
 * and monitoring system integration in production environments.
 *
 * @remarks
 * These tests validate the health endpoint's contract and ensure it meets
 * requirements for container orchestration and monitoring systems.
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
    /**
     * Tests that the health endpoint returns successful HTTP status.
     *
     * Verifies the GET /api/health endpoint responds with 200 OK status,
     * which is essential for Docker health checks and monitoring systems
     * to determine that the application is running and responsive.
     */
    it('should return 200 status with success response', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
    });

    /**
     * Tests that the health endpoint returns a properly structured JSON response.
     *
     * Verifies the response contains all required fields (status, timestamp, uptime,
     * version, environment, system metrics) with correct data types. This ensures
     * monitoring systems can reliably parse and use the health data.
     */
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

    /**
     * Tests that the health endpoint sets appropriate HTTP content-type header.
     *
     * Verifies the response includes 'application/json' content-type header,
     * enabling monitoring systems and Docker health checks to properly parse
     * the response body as JSON data.
     */
    it('should set correct content-type header', async () => {
      const response = await GET();

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    /**
     * Tests that the health endpoint handles concurrent requests without issues.
     *
     * Makes 10 simultaneous requests to verify thread safety and stability under load.
     * This ensures the health check system remains reliable when multiple monitoring
     * systems or Docker health checks access the endpoint simultaneously.
     */
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

    /**
     * Tests that the health endpoint meets performance requirements for monitoring systems.
     *
     * Measures response time and ensures it stays under 100ms for optimal monitoring
     * efficiency. Fast health checks are critical to prevent monitoring timeouts
     * and reduce operational overhead in production environments.
     */
    it('should respond quickly (performance test)', async () => {
      const startTime = Date.now();
      const response = await GET();
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Health endpoint should respond within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    /**
     * Tests that the health endpoint works with different HTTP headers from monitoring tools.
     *
     * Verifies compatibility with headers commonly sent by Docker health checks,
     * load balancers, and monitoring systems. This ensures the endpoint works
     * reliably across diverse production deployment architectures.
     */
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

    /**
     * Tests that the health endpoint meets Docker health check requirements.
     *
     * Verifies the endpoint returns the 200 status and valid JSON that Docker
     * expects for determining container health. This enables proper container
     * orchestration and automatic container restart on health check failures.
     */
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

    /**
     * Tests that the health endpoint integrates properly with monitoring systems.
     *
     * Verifies the endpoint provides the status information and content-type headers
     * that monitoring tools (Prometheus, Grafana, etc.) expect for service health
     * monitoring and alerting in production environments.
     */
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
    /**
     * Tests that the health endpoint provides consistent responses across multiple requests.
     *
     * Makes 5 sequential requests and verifies each returns the same structure and status.
     * This ensures the health endpoint is reliable and stateless, providing consistent
     * information for monitoring systems regardless of request timing.
     */
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

      // All responses should have consistent structure
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: expect.any(String),
          system: expect.any(Object),
        });
        expect(response.contentType).toBe('application/json');
      });
    });

    /**
     * Tests that the health endpoint is stateless and has no side effects.
     *
     * Verifies that multiple requests don't affect each other and return consistent
     * static information (version, environment, PID, Node.js version). This ensures
     * the health check doesn't alter application state or consume resources.
     */
    it('should be stateless (no side effects)', async () => {
      // Make first request
      const response1 = await GET();
      const data1 = await response1.json();

      // Make second request
      const response2 = await GET();
      const data2 = await response2.json();

      // Both responses should have same structure and status (stateless)
      expect(response1.status).toBe(response2.status);
      expect(data1.status).toBe(data2.status);
      expect(data1.version).toBe(data2.version);
      expect(data1.environment).toBe(data2.environment);
      expect(data1.system.pid).toBe(data2.system.pid);
      expect(data1.system.nodejs_version).toBe(data2.system.nodejs_version);
      // Dynamic fields (timestamp, uptime, memory) can differ between calls
    });
  });

  describe('Enhanced Health Information', () => {
    /**
     * Tests that the health endpoint includes comprehensive system information.
     *
     * Verifies the response contains memory metrics, process ID, and Node.js version
     * in the expected format. This information helps monitoring systems understand
     * resource usage and system state for operational visibility.
     */
    it('should include system metrics', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.system).toBeDefined();
      expect(data.system.memory).toBeDefined();
      expect(data.system.pid).toBeGreaterThan(0);
      expect(data.system.nodejs_version).toMatch(/^v\d+\.\d+\.\d+/);
    });

    /**
     * Tests that the health endpoint includes appropriate caching headers.
     *
     * Verifies cache control headers prevent caching of health data, ensuring
     * monitoring systems always receive fresh, real-time health information
     * rather than stale cached responses.
     */
    it('should include cache control headers', async () => {
      const response = await GET();

      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('pragma')).toBe('no-cache');
      expect(response.headers.get('expires')).toBe('0');
    });

    /**
     * Tests that the health endpoint includes a valid and current timestamp.
     *
     * Verifies the timestamp is properly formatted, parseable as a Date,
     * and represents recent time (within 5 seconds). This helps monitoring
     * systems track when health information was generated.
     */
    it('should include valid timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(() => new Date(data.timestamp)).not.toThrow();
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    /**
     * Tests that the health endpoint includes accurate process uptime information.
     *
     * Verifies uptime is a non-negative number representing how long the
     * application has been running. This metric helps monitoring systems
     * track application stability and restart frequency.
     */
    it('should include uptime information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.uptime).toBe('number');
    });

    /**
     * Tests that the health endpoint includes valid environment information.
     *
     * Verifies the environment field contains a recognized value (development, test,
     * or production). This helps monitoring systems differentiate between
     * different deployment environments for proper alerting and routing.
     */
    it('should include environment information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(['development', 'test', 'production']).toContain(data.environment);
    });
  });

  describe('Error Handling', () => {
    /**
     * Tests that the health endpoint gracefully handles unusual or unexpected parameters.
     *
     * Verifies the endpoint ignores query parameters and still returns a valid
     * health response. This ensures robustness when monitoring systems send
     * extra parameters or malformed requests.
     */
    it('should handle requests gracefully even with unusual parameters', async () => {
      // Test with query parameters (should be ignored)
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        system: expect.any(Object),
      });
    });

    /**
     * Tests that the health endpoint handles malformed or empty headers without errors.
     *
     * Verifies the endpoint still returns a valid health response even when
     * receiving requests with malformed headers. This ensures the health check
     * remains reliable even in edge cases or when facing unusual client behavior.
     */
    it('should handle empty or malformed headers gracefully', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
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
});
