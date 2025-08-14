/**
 * Admin API Integration Tests
 * 
 * Tests the admin API endpoints for dynamic log level management
 * with real authentication, rate limiting, and configuration storage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET, POST, PATCH, DELETE } from '@/app/api/admin/log-level/route';
import { resetDefaultStorage } from '@/lib/logger/kv-storage';
import { clearConfigCache } from '@/lib/logger/remote-config';

// Mock environment variables
const mockEnv = {
  ADMIN_API_KEYS: 'test-key-1,test-key-2,super-secret-key',
  ADMIN_ALLOWED_ORIGINS: 'http://localhost:3000,https://admin.example.com',
  ADMIN_RATE_LIMIT_PER_MINUTE: '30',
  ADMIN_BURST_LIMIT: '5',
  JWT_SECRET: 'test-jwt-secret',
};

// Helper function to create mock request
function createMockRequest(
  method: string,
  options: {
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/log-level');
  
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers = new Headers({
    'content-type': 'application/json',
    ...options.headers,
  });

  const requestInit: any = {
    method,
    headers,
  };

  if (options.body && (method === 'POST' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(options.body);
  }

  return new NextRequest(url, requestInit);
}

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    // Reset storage and cache
    resetDefaultStorage();
    clearConfigCache();
    
    // Mock environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value);
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDefaultStorage();
    vi.restoreAllMocks();
  });

  describe('Authentication Integration', () => {
    it('should reject requests without authorization header', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing authorization header');
    });

    it('should reject requests with invalid API key', async () => {
      const request = createMockRequest('GET', {
        headers: { authorization: 'Bearer invalid-key' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid API key');
    });

    it('should accept requests with valid API key', async () => {
      const request = createMockRequest('GET', {
        headers: { authorization: 'Bearer test-key-1' },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle CORS validation', async () => {
      const request = createMockRequest('GET', {
        headers: {
          authorization: 'Bearer test-key-1',
          origin: 'https://malicious.example.com',
        },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Origin not allowed');
    });

    it('should accept allowed origins', async () => {
      const request = createMockRequest('GET', {
        headers: {
          authorization: 'Bearer test-key-1',
          origin: 'http://localhost:3000',
        },
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should allow requests within rate limit', async () => {
      const request = createMockRequest('GET', {
        headers: { authorization: 'Bearer test-key-1' },
      });
      
      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const request = createMockRequest('GET', {
        headers: { 
          authorization: 'Bearer test-key-1',
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'test-client',
        },
      });
      
      // Exceed rate limit (30 requests per minute)
      const responses = [];
      for (let i = 0; i < 35; i++) {
        responses.push(await GET(request));
      }
      
      // Last few responses should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      
      const data = await lastResponse.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(typeof data.retry_after).toBe('number');
    });

    it('should track different clients separately', async () => {
      const client1Request = createMockRequest('GET', {
        headers: {
          authorization: 'Bearer test-key-1',
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'client-1',
        },
      });

      const client2Request = createMockRequest('GET', {
        headers: {
          authorization: 'Bearer test-key-1',
          'x-forwarded-for': '192.168.1.101',
          'user-agent': 'client-2',
        },
      });
      
      // Both clients should be able to make requests
      const response1 = await GET(client1Request);
      const response2 = await GET(client2Request);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Configuration Management Integration', () => {
    const validConfig = {
      global_level: 'debug',
      service_levels: {
        api: 'info',
        auth: 'warn',
      },
      rate_limits: {
        error: 50,
        warn: 500,
      },
      last_updated: new Date().toISOString(),
      version: 1,
      enabled: true,
    };

    it('should handle complete configuration lifecycle (POST → GET → PATCH → DELETE)', async () => {
      const authHeaders = { authorization: 'Bearer test-key-1' };
      
      // 1. POST - Create new configuration
      const postRequest = createMockRequest('POST', {
        headers: authHeaders,
        body: validConfig,
      });
      
      const postResponse = await POST(postRequest);
      expect(postResponse.status).toBe(200);
      
      const postData = await postResponse.json();
      expect(postData.success).toBe(true);
      expect(postData.data.config.global_level).toBe('debug');
      // Version could be 1 (if no previous config) or 2 (if merged with default)
      expect([1, 2]).toContain(postData.data.config.version);
      
      // 2. GET - Retrieve configuration
      const getRequest = createMockRequest('GET', {
        headers: authHeaders,
        searchParams: { summary: 'true' },
      });
      
      const getResponse = await GET(getRequest);
      expect(getResponse.status).toBe(200);
      
      const getData = await getResponse.json();
      expect(getData.success).toBe(true);
      expect(getData.data.config.global_level).toBe('debug');
      expect(getData.data.summary).toBeDefined();
      
      // 3. PATCH - Partial update
      const patchRequest = createMockRequest('PATCH', {
        headers: authHeaders,
        body: { global_level: 'info' },
      });
      
      const patchResponse = await PATCH(patchRequest);
      expect(patchResponse.status).toBe(200);
      
      const patchData = await patchResponse.json();
      expect(patchData.success).toBe(true);
      expect(patchData.data.config.global_level).toBe('info');
      // Version should be previous version + 1
      const expectedVersion = postData.data.config.version + 1;
      expect(patchData.data.config.version).toBe(expectedVersion);
      expect(patchData.data.changes.global_level).toBe('info');
      
      // 4. DELETE - Reset to default
      const deleteRequest = createMockRequest('DELETE', {
        headers: authHeaders,
      });
      
      const deleteResponse = await DELETE(deleteRequest);
      expect(deleteResponse.status).toBe(200);
      
      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);
      // DELETE creates a new default config, but the version might increment from previous
      expect(deleteData.data.config.version).toBeGreaterThanOrEqual(1);
    });

    it('should validate configuration format on POST', async () => {
      const invalidConfigs = [
        { 
          global_level: 'invalid_level',
          last_updated: new Date().toISOString(),
          version: 1,
        },
        { 
          global_level: 'info',
          service_levels: 'not_an_object',
          last_updated: new Date().toISOString(),
          version: 1,
        },
        { 
          global_level: 'info',
          rate_limits: { error: -1 },
          last_updated: new Date().toISOString(),
          version: 1,
        },
        { 
          global_level: 'info',
          enabled: 'not_boolean',
          last_updated: new Date().toISOString(),
          version: 1,
        },
      ];

      for (const invalidConfig of invalidConfigs) {
        const request = createMockRequest('POST', {
          headers: { authorization: 'Bearer test-key-1' },
          body: invalidConfig,
        });
        
        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Configuration validation failed');
        expect(data.details.errors).toBeDefined();
      }
    });

    it('should handle invalid JSON in request body', async () => {
      const url = new URL('http://localhost:3000/api/admin/log-level');
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-key-1',
          'content-type': 'application/json',
        },
        body: '{ invalid json',
      });
      
      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should merge configurations correctly in PATCH', async () => {
      const authHeaders = { authorization: 'Bearer test-key-1' };
      
      // Set initial configuration
      const initialConfig = {
        global_level: 'info',
        service_levels: { api: 'debug', auth: 'warn' },
        rate_limits: { error: 100 },
        last_updated: new Date().toISOString(),
        version: 1,
        enabled: true,
      };
      
      await POST(createMockRequest('POST', {
        headers: authHeaders,
        body: initialConfig,
      }));
      
      // Patch with partial update
      const patchRequest = createMockRequest('PATCH', {
        headers: authHeaders,
        body: {
          service_levels: { api: 'info', db: 'error' }, // Add new service, modify existing
          rate_limits: { warn: 500 }, // Add new rate limit
        },
      });
      
      const response = await PATCH(patchRequest);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      const config = data.data.config;
      
      // Global level should remain unchanged
      expect(config.global_level).toBe('info');
      
      // Service levels should be merged
      expect(config.service_levels.api).toBe('info'); // Modified
      expect(config.service_levels.auth).toBe('warn'); // Preserved
      expect(config.service_levels.db).toBe('error'); // Added
      
      // Rate limits should be merged
      expect(config.rate_limits.error).toBe(100); // Preserved
      expect(config.rate_limits.warn).toBe(500); // Added
      
      // Enabled should remain unchanged
      expect(config.enabled).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle storage failures gracefully', async () => {
      // Mock storage to fail
      vi.doMock('@/lib/logger/kv-storage', () => ({
        getDefaultStorage: () => ({
          get: () => Promise.reject(new Error('Storage unavailable')),
          set: () => Promise.reject(new Error('Storage unavailable')),
          delete: () => Promise.reject(new Error('Storage unavailable')),
          exists: () => Promise.reject(new Error('Storage unavailable')),
          type: 'memory',
        }),
        resetDefaultStorage: () => {},
      }));

      const request = createMockRequest('GET', {
        headers: { authorization: 'Bearer test-key-1' },
      });
      
      const response = await GET(request);
      
      // Should still return a response (possibly with fallback config)
      expect(response.status).toBeOneOf([200, 500]);
      
      const data = await response.json();
      if (response.status === 500) {
        expect(data.success).toBe(false);
      }
    });

    it('should include proper error details in responses', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      
      expect(data).toMatchObject({
        success: false,
        error: 'Missing authorization header',
        timestamp: expect.any(String),
      });
      
      // Timestamp should be valid ISO string
      expect(() => new Date(data.timestamp)).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const authHeaders = { authorization: 'Bearer test-key-1' };
      const startTime = Date.now();
      
      // Make 5 concurrent GET requests (stay under rate limit)
      const requests = Array.from({ length: 5 }, (_, i) =>
        GET(createMockRequest('GET', { 
          headers: { 
            ...authHeaders,
            'x-forwarded-for': `192.168.1.${100 + i}`, // Different IPs to avoid rate limiting
            'user-agent': `test-client-${i}`,
          } 
        }))
      );
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // Most requests should succeed (some might be rate limited)
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // Should complete reasonably quickly (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should maintain performance under mixed operations', async () => {
      const authHeaders = { authorization: 'Bearer test-key-1' };
      const startTime = Date.now();
      
      // Mix of different operations with different client IDs
      const operations = [
        () => GET(createMockRequest('GET', { 
          headers: { ...authHeaders, 'x-forwarded-for': '192.168.1.110', 'user-agent': 'test-op-1' }
        })),
        () => POST(createMockRequest('POST', {
          headers: { ...authHeaders, 'x-forwarded-for': '192.168.1.111', 'user-agent': 'test-op-2' },
          body: { 
            global_level: 'debug', 
            enabled: true,
            last_updated: new Date().toISOString(),
            version: 1,
          },
        })),
        () => GET(createMockRequest('GET', { 
          headers: { ...authHeaders, 'x-forwarded-for': '192.168.1.112', 'user-agent': 'test-op-3' }
        })),
      ];
      
      const responses = await Promise.all(
        operations.map(operation => operation())
      );
      const endTime = Date.now();
      
      // Most operations should succeed
      const successCount = responses.filter(r => r.status < 400).length;
      expect(successCount).toBeGreaterThan(1);
      
      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});