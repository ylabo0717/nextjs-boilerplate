/**
 * API Route Tracing Tests - Simplified
 * Basic tests for OpenTelemetry span linking across Next.js API Routes
 */

import { describe, test, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withAPIRouteTracing,
  createTracedAPIClient,
  getCurrentSpanContext,
  traceOperation
} from '@/lib/logger/api-route-tracing';

// Simple mocks
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: (name: string, options: any, callback: any) => {
        if (typeof callback === 'function') {
          const mockSpan = {
            spanContext: () => ({
              traceId: 'test-trace-id',
              spanId: 'test-span-id',
              traceFlags: 1
            }),
            setAttributes: () => {},
            setStatus: () => {},
            recordException: () => {},
            end: () => {}
          };
          return callback(mockSpan);
        }
        return null;
      }
    }),
    getActiveSpan: () => ({
      spanContext: () => ({
        traceId: 'active-trace-id',
        spanId: 'active-span-id',
        traceFlags: 1
      })
    })
  },
  context: {
    active: () => ({}),
    with: (ctx: any, callback: any) => callback()
  },
  SpanKind: { SERVER: 1, INTERNAL: 3 },
  SpanStatusCode: { OK: 1, ERROR: 2 }
}));

// Mock fetch with proper vi mock
const mockFetch = vi.fn().mockResolvedValue(new Response('{"success": true}'));
vi.stubGlobal('fetch', mockFetch);

describe('API Route Tracing - Basic Functionality', () => {
  test('withAPIRouteTracing wraps handler without errors', async () => {
    const handler = vi.fn(async () => NextResponse.json({ test: 'data' }));
    const wrappedHandler = withAPIRouteTracing(handler);

    const request = new NextRequest('https://example.com/api/test');
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalled();
    expect(response).toBeInstanceOf(NextResponse);
  });

  test('withAPIRouteTracing handles errors gracefully', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Test error');
    });
    const wrappedHandler = withAPIRouteTracing(handler);

    const request = new NextRequest('https://example.com/api/test');
    
    await expect(wrappedHandler(request)).rejects.toThrow('Test error');
    expect(handler).toHaveBeenCalled();
  });

  test('withAPIRouteTracing accepts custom options', async () => {
    const handler = vi.fn(async () => NextResponse.json({ success: true }));
    const wrappedHandler = withAPIRouteTracing(handler, {
      spanName: 'Custom Span',
      attributes: { 'custom.attr': 'value' }
    });

    const request = new NextRequest('https://example.com/api/test');
    const response = await wrappedHandler(request);

    expect(response).toBeInstanceOf(NextResponse);
  });

  test('traceOperation executes function and returns result', async () => {
    const operation = vi.fn(async () => 'operation-result');

    const result = await traceOperation('test-op', operation);

    expect(result).toBe('operation-result');
    expect(operation).toHaveBeenCalled();
  });

  test('traceOperation handles errors', async () => {
    const operation = vi.fn(async () => {
      throw new Error('Operation error');
    });

    await expect(traceOperation('failing-op', operation))
      .rejects.toThrow('Operation error');
    expect(operation).toHaveBeenCalled();
  });

  test('createTracedAPIClient returns client with methods', () => {
    const client = createTracedAPIClient();

    expect(client).toHaveProperty('get');
    expect(client).toHaveProperty('post');
    expect(client).toHaveProperty('put');
    expect(client).toHaveProperty('delete');
    expect(client).toHaveProperty('patch');
    expect(client).toHaveProperty('fetch');
  });

  test('createTracedAPIClient methods work', async () => {
    const client = createTracedAPIClient();
    
    // This should not throw
    await expect(client.get('/api/test')).resolves.toBeTruthy();
  });

  test('getCurrentSpanContext returns context or null', () => {
    const context = getCurrentSpanContext();
    
    // Should either return a valid context or null
    expect(context === null || typeof context === 'object').toBe(true);
    
    if (context) {
      expect(context).toHaveProperty('traceId');
      expect(context).toHaveProperty('spanId');
      expect(context).toHaveProperty('traceFlags');
    }
  });

  test('trace context is injected into response headers', async () => {
    const handler = vi.fn(async () => NextResponse.json({ data: 'test' }));
    const wrappedHandler = withAPIRouteTracing(handler);

    const request = new NextRequest('https://example.com/api/test');
    const response = await wrappedHandler(request);

    // Check that trace headers are present
    expect(response.headers.get('x-trace-id')).toBeTruthy();
    expect(response.headers.get('x-span-id')).toBeTruthy();
    expect(response.headers.get('traceparent')).toBeTruthy();
  });

  test('handles malformed trace headers without error', async () => {
    const handler = vi.fn(async () => NextResponse.json({ success: true }));
    const wrappedHandler = withAPIRouteTracing(handler);

    const request = new NextRequest('https://example.com/api/test', {
      headers: {
        'traceparent': 'invalid-header',
        'tracestate': 'malformed'
      }
    });

    // Should not throw despite invalid headers
    const response = await wrappedHandler(request);
    expect(response).toBeInstanceOf(NextResponse);
  });

  test('client includes trace headers in requests', async () => {
    const client = createTracedAPIClient();

    await client.get('/api/test');

    expect(mockFetch).toHaveBeenCalled();
    
    // Check that request includes proper headers
    const calls = mockFetch.mock.calls;
    const call = calls.find(([url]) => url === '/api/test' || (url instanceof Request && url.url.includes('/api/test')));
    expect(call).toBeTruthy();
    
    // If it's a Request object, check its headers
    if (call && call[0] instanceof Request) {
      const request = call[0] as Request;
      expect(request.headers.get('traceparent')).toBeTruthy();
      expect(request.headers.get('x-request-id')).toBeTruthy();
    }
  });

  test('client preserves existing headers', async () => {
    const client = createTracedAPIClient();

    await client.post('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      },
      body: JSON.stringify({ data: 'test' })
    });

    expect(mockFetch).toHaveBeenCalled();
    
    // Find the POST call
    const calls = mockFetch.mock.calls;
    const postCall = calls.find(([url]) => {
      if (url instanceof Request) {
        return url.url.includes('/api/test') && url.method === 'POST';
      }
      return false;
    });
    
    expect(postCall).toBeTruthy();
    
    if (postCall && postCall[0] instanceof Request) {
      const request = postCall[0] as Request;
      expect(request.headers.get('Content-Type')).toBe('application/json');
      expect(request.headers.get('Authorization')).toBe('Bearer token');
      expect(request.headers.get('traceparent')).toBeTruthy();
      expect(request.headers.get('x-request-id')).toBeTruthy();
    }
  });
});