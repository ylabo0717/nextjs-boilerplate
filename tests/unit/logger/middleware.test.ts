import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock external dependencies with full module mock
vi.mock('@/lib/logger/crypto', () => ({
  hashIPWithDefault: vi.fn().mockReturnValue('hashed-ip-123'),
}));

vi.mock('@/lib/logger/utils', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-request-id'),
  serializeError: vi.fn().mockImplementation((error) => ({
    message: error.message || String(error),
    stack: error.stack || undefined,
  })),
}));

import {
  middlewareLoggerHelpers,
  createRequestContext,
  logRequestStart,
  logRequestEnd,
  logMiddlewareError,
  logSecurityEvent,
  logRateLimit,
  logRedirect,
} from '@/lib/logger/middleware';
import { hashIPWithDefault } from '@/lib/logger/crypto';
import { generateRequestId } from '@/lib/logger/utils';

// Create spies for the imported mocked functions
const mockHashIPWithDefault = vi.mocked(hashIPWithDefault);
const mockGenerateRequestId = vi.mocked(generateRequestId);

// Mock console methods used by logForEdgeRuntime
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Middleware Logger - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Date.now mock
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('middlewareLoggerHelpers', () => {
    it('should export middlewareLoggerHelpers', () => {
      expect(middlewareLoggerHelpers).toBeDefined();
      expect(typeof middlewareLoggerHelpers).toBe('object');
    });

    it('should have wrapRequest method', () => {
      expect(middlewareLoggerHelpers.wrapRequest).toBeDefined();
      expect(typeof middlewareLoggerHelpers.wrapRequest).toBe('function');
    });

    it('should have withSecurity method', () => {
      expect(middlewareLoggerHelpers.withSecurity).toBeDefined();
      expect(typeof middlewareLoggerHelpers.withSecurity).toBe('function');
    });

    describe('wrapRequest', () => {
      it('should wrap request successfully and add request ID to response headers', async () => {
        const request = new NextRequest('https://example.com/api/test');
        const mockResponse = new NextResponse('OK');
        const mockHandler = vi.fn().mockResolvedValue(mockResponse);

        const result = await middlewareLoggerHelpers.wrapRequest(request, mockHandler);

        expect(mockHandler).toHaveBeenCalledWith(request, expect.any(Object));
        expect(result.headers.get('x-request-id')).toBe('test-request-id');
        // Verify logging occurred
        expect(mockConsoleLog).toHaveBeenCalled();
      });

      it('should handle handler errors and re-throw them', async () => {
        const request = new NextRequest('https://example.com/api/test');
        const error = new Error('Handler error');
        const mockHandler = vi.fn().mockRejectedValue(error);

        await expect(middlewareLoggerHelpers.wrapRequest(request, mockHandler)).rejects.toThrow(
          'Handler error'
        );

        // Verify error logging occurred
        expect(mockConsoleError).toHaveBeenCalled();
      });

      it('should calculate and log request duration', async () => {
        const request = new NextRequest('https://example.com/api/test');
        const mockResponse = new NextResponse('OK');
        const mockHandler = vi.fn().mockImplementation(async () => {
          // Simulate 100ms delay
          vi.advanceTimersByTime(100);
          return mockResponse;
        });

        await middlewareLoggerHelpers.wrapRequest(request, mockHandler);

        // Check that logging occurred
        expect(mockConsoleLog).toHaveBeenCalled();
      });
    });

    describe('withSecurity', () => {
      const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
        const request = new NextRequest(url);
        Object.entries(headers).forEach(([key, value]) => {
          request.headers.set(key, value);
        });
        return request;
      };

      const createMockContext = (overrides = {}) => ({
        requestId: 'test-id',
        method: 'GET',
        url: 'https://example.com/api/test',
        timestamp: '2023-01-01T00:00:00.000Z',
        userAgent: 'Test Agent',
        ...overrides,
      });

      it('should not throw when security checks are disabled', () => {
        const request = createMockRequest('https://example.com/api/test');
        const context = createMockContext();

        expect(() => {
          middlewareLoggerHelpers.withSecurity(request, context, {
            checkUserAgent: false,
            checkReferer: false,
            logSuspiciousActivity: false,
          });
        }).not.toThrow();
      });

      it('should log security event when User-Agent is missing', () => {
        const request = createMockRequest('https://example.com/api/test');
        const context = createMockContext({ userAgent: undefined });

        middlewareLoggerHelpers.withSecurity(request, context, {
          checkUserAgent: true,
        });

        expect(mockConsoleWarn).toHaveBeenCalled();
      });

      it('should detect suspicious patterns', () => {
        const request = createMockRequest('https://example.com/admin/users');
        const context = createMockContext();

        middlewareLoggerHelpers.withSecurity(request, context, {
          logSuspiciousActivity: true,
        });

        expect(mockConsoleWarn).toHaveBeenCalled();
      });
    });
  });

  describe('createRequestContext', () => {
    it('should create request context with all required fields', () => {
      const request = new NextRequest('https://example.com/api/test', {
        headers: {
          'user-agent': 'Test Browser',
        },
      });

      const context = createRequestContext(request);

      expect(context).toEqual({
        requestId: 'test-request-id',
        hashedIP: 'hashed-ip-123',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      });
      expect(mockHashIPWithDefault).toHaveBeenCalledWith('unknown');
      expect(mockGenerateRequestId).toHaveBeenCalled();
    });

    it('should handle missing user agent', () => {
      const request = new NextRequest('https://example.com/api/test');

      const context = createRequestContext(request);

      expect(context.userAgent).toBeUndefined();
    });
  });

  describe('logRequestStart', () => {
    it('should log request start with correct structure', () => {
      const request = new NextRequest('https://example.com/api/test?param=value');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test?param=value',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      logRequestStart(request, context);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('logRequestEnd', () => {
    it('should log request end with duration and response details', () => {
      const request = new NextRequest('https://example.com/api/test');
      const response = new NextResponse('OK', { status: 200 });
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const startTime = Date.now() - 150; // 150ms ago

      logRequestEnd(request, response, context, startTime);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('logMiddlewareError', () => {
    it('should log middleware error with error details', () => {
      const request = new NextRequest('https://example.com/api/test');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const error = new Error('Test error');

      logMiddlewareError(request, context, error);

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
      const request = new NextRequest('https://example.com/api/test');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const error = 'String error';

      logMiddlewareError(request, context, error);

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with details', () => {
      const request = new NextRequest('https://example.com/api/test');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const details = { pattern: 'test-pattern', matched_url: 'test-url' };

      logSecurityEvent(request, context, 'suspicious_pattern', details);

      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('logRateLimit', () => {
    it('should log rate limit event', () => {
      const request = new NextRequest('https://example.com/api/test');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/api/test',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const limit = 100;
      const remaining = 0;
      const resetTime = Date.now() + 60000;

      logRateLimit(request, context, limit, remaining, resetTime);

      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('logRedirect', () => {
    it('should log redirect event', () => {
      const request = new NextRequest('https://example.com/old-path');
      const context = {
        requestId: 'test-id',
        hashedIP: 'hashed-ip',
        method: 'GET',
        url: 'https://example.com/old-path',
        userAgent: 'Test Browser',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const destination = 'https://example.com/new-path';
      const permanent = true;

      logRedirect(request, context, destination, permanent);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
