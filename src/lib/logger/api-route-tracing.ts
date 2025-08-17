/**
 * API Route Tracing Integration for Next.js
 *
 * Provides OpenTelemetry span linking and context propagation
 * across Next.js API Routes for distributed tracing.
 *
 * This enables proper trace correlation when API routes call
 * other API routes or external services.
 */

import type { NextRequest, NextResponse } from 'next/server';

import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';

import { generateRequestId } from './utils';

import type { LoggerContext } from './types';

/**
 * Span context information for API route tracing
 *
 * @public
 */
export interface APIRouteSpanContext {
  /** The OpenTelemetry trace ID */
  readonly traceId: string;
  /** The OpenTelemetry span ID */
  readonly spanId: string;
  /** The current trace flags */
  readonly traceFlags: number;
  /** The trace state information */
  readonly traceState?: string;
  /** Logger context associated with this span */
  readonly loggerContext: LoggerContext;
}

/**
 * Result of API route span execution
 *
 * @public
 */
export interface APIRouteSpanResult<T = unknown> {
  /** The result of the API route handler */
  result: T;
  /** The span context information */
  spanContext: APIRouteSpanContext;
  /** Whether the operation was successful */
  success: boolean;
  /** Error information if the operation failed */
  error?: Error;
}

/**
 * Options for creating API route spans
 *
 * @public
 */
export interface CreateAPIRouteSpanOptions {
  /** The name of the span (defaults to route path) */
  spanName?: string;
  /** Additional attributes to add to the span */
  attributes?: Record<string, string | number | boolean>;
  /** Whether to automatically extract trace context from headers */
  extractContext?: boolean;
  /** Logger context to use (if not provided, will be created from request) */
  loggerContext?: LoggerContext;
}

/**
 * Tracer instance for API routes
 */
const apiRouteTracer = trace.getTracer('nextjs-api-routes', '1.0.0');

/**
 * Extract trace context from Next.js request headers
 *
 * @param request - The Next.js request object
 * @returns The extracted trace context or active context
 *
 * @internal
 */
function extractTraceContext(request: NextRequest): ReturnType<typeof context.active> {
  const traceParent = request.headers.get('traceparent');
  const traceState = request.headers.get('tracestate');

  if (traceParent) {
    // Parse W3C Trace Context format: 00-{trace-id}-{parent-id}-{trace-flags}
    const parts = traceParent.split('-');
    if (parts.length === 4 && parts[0] === '00') {
      // Create a carrier object for context extraction
      const carrier = {
        traceparent: traceParent,
        ...(traceState && { tracestate: traceState }),
      };

      // Use propagation API to extract context
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { propagation } = require('@opentelemetry/api');
        return propagation.extract(context.active(), carrier);
      } catch {
        // Fallback to active context if extraction fails
        return context.active();
      }
    }
  }

  return context.active();
}

/**
 * Inject trace context into response headers
 *
 * @param response - The Next.js response object
 * @param spanContext - The current span context
 *
 * @internal
 */
function injectTraceContext(response: NextResponse, spanContext: APIRouteSpanContext): void {
  // Add trace context headers for downstream services
  response.headers.set('x-trace-id', spanContext.traceId);
  response.headers.set('x-span-id', spanContext.spanId);

  // Add W3C Trace Context headers
  const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
  response.headers.set('traceparent', traceParent);

  if (spanContext.traceState) {
    response.headers.set('tracestate', spanContext.traceState);
  }
}

/**
 * Create a span context from the current OpenTelemetry span
 *
 * @param loggerContext - The logger context to associate
 * @returns The API route span context
 *
 * @internal
 */
function createSpanContextFromActive(loggerContext: LoggerContext): APIRouteSpanContext {
  const activeSpan = trace.getActiveSpan();

  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags,
      traceState: spanContext.traceState?.toString(),
      loggerContext,
    };
  }

  // Fallback: create minimal context
  return {
    traceId: generateRequestId(), // Use as fallback trace ID
    spanId: generateRequestId().slice(0, 16), // Use as fallback span ID
    traceFlags: 1,
    loggerContext,
  };
}

/**
 * Wrap an API route handler with OpenTelemetry tracing
 *
 * Creates a span for the API route execution and ensures proper
 * trace context propagation across async operations.
 *
 * @param handler - The API route handler function
 * @param options - Options for span creation
 * @returns Wrapped handler with tracing
 *
 * @example
 * ```typescript
 * export const GET = withAPIRouteTracing(
 *   async (request: NextRequest): Promise<NextResponse> => {
 *     // Your API route logic here
 *     return NextResponse.json({ data: 'example' });
 *   },
 *   {
 *     spanName: 'GET /api/example',
 *     attributes: { 'api.version': '1.0' }
 *   }
 * );
 * ```
 *
 * @public
 */
export function withAPIRouteTracing<T extends NextResponse>(
  handler: (request: NextRequest) => Promise<T>,
  options: CreateAPIRouteSpanOptions = {}
): (request: NextRequest) => Promise<T> {
  return async (request: NextRequest): Promise<T> => {
    const {
      spanName = `${request.method} ${new URL(request.url).pathname}`,
      attributes = {},
      extractContext = true,
      loggerContext,
    } = options;

    // Extract or use provided logger context
    const requestContext =
      loggerContext ||
      (() => {
        const requestId = generateRequestId();

        return {
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: new Date().toISOString(),
        } as LoggerContext;
      })();

    // Extract trace context from incoming request
    const parentContext = extractContext ? extractTraceContext(request) : context.active();

    return context.with(parentContext, () => {
      // Create span for this API route
      return apiRouteTracer.startActiveSpan(
        spanName,
        {
          kind: SpanKind.SERVER,
          attributes: {
            'http.method': request.method,
            'http.url': request.url,
            'http.scheme': new URL(request.url).protocol.slice(0, -1),
            'http.host': request.headers.get('host') || 'unknown',
            'http.user_agent': request.headers.get('user-agent') || 'unknown',
            'api.route.name': spanName,
            'logger.request_id': requestContext.requestId,
            ...attributes,
          },
        },
        async (span) => {
          try {
            // Execute the handler
            const result = await handler(request);

            // Add success attributes
            span.setAttributes({
              'http.status_code': result.status || 200,
              'api.success': true,
            });

            span.setStatus({ code: SpanStatusCode.OK });

            // Inject trace context into response
            const spanContext = createSpanContextFromActive(requestContext);
            injectTraceContext(result, spanContext);

            return result;
          } catch (error) {
            // Handle errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            span.recordException(error instanceof Error ? error : new Error(errorMessage));
            span.setAttributes({
              'api.success': false,
              'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
              'error.message': errorMessage,
            });

            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMessage,
            });

            throw error;
          } finally {
            span.end();
          }
        }
      );
    });
  };
}

/**
 * Create a client for making traced requests to other API routes
 *
 * Automatically propagates trace context to downstream API calls.
 *
 * @example
 * ```typescript
 * const client = createTracedAPIClient();
 *
 * // This call will include trace context headers
 * const response = await client.get('/api/other-route');
 * ```
 *
 * @public
 */
export function createTracedAPIClient() {
  return {
    /**
     * Make a traced GET request
     */
    async get(url: string, init?: RequestInit): Promise<Response> {
      return this.fetch(url, { ...init, method: 'GET' });
    },

    /**
     * Make a traced POST request
     */
    async post(url: string, init?: RequestInit): Promise<Response> {
      return this.fetch(url, { ...init, method: 'POST' });
    },

    /**
     * Make a traced PUT request
     */
    async put(url: string, init?: RequestInit): Promise<Response> {
      return this.fetch(url, { ...init, method: 'PUT' });
    },

    /**
     * Make a traced DELETE request
     */
    async delete(url: string, init?: RequestInit): Promise<Response> {
      return this.fetch(url, { ...init, method: 'DELETE' });
    },

    /**
     * Make a traced PATCH request
     */
    async patch(url: string, init?: RequestInit): Promise<Response> {
      return this.fetch(url, { ...init, method: 'PATCH' });
    },

    /**
     * Make a traced fetch request with automatic context propagation
     */
    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const headers = new Headers(init?.headers);

      // Inject current trace context into headers
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
        headers.set('traceparent', traceParent);

        if (spanContext.traceState) {
          headers.set('tracestate', spanContext.traceState.toString());
        }
      }

      // Add request ID header if we can generate one
      try {
        const requestId = generateRequestId();
        headers.set('x-request-id', requestId);
      } catch {
        // Ignore if request ID generation fails
      }

      return fetch(url, {
        ...init,
        headers,
      });
    },
  };
}

/**
 * Extract span context from current execution context
 *
 * Useful for passing span information to external systems
 * or for debugging purposes.
 *
 * @returns Current span context or null if no active span
 *
 * @public
 */
export function getCurrentSpanContext(): APIRouteSpanContext | null {
  const activeSpan = trace.getActiveSpan();

  if (activeSpan) {
    // Create a minimal logger context if none exists
    const loggerContext = {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    } as LoggerContext;

    return createSpanContextFromActive(loggerContext);
  }

  return null;
}

/**
 * Create a child span for internal operations
 *
 * Useful for tracing internal operations within an API route.
 *
 * @param name - Name of the operation
 * @param operation - The operation to trace
 * @param attributes - Additional span attributes
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await traceOperation('database-query', async () => {
 *   return await db.users.findMany();
 * }, { 'db.operation': 'findMany', 'db.table': 'users' });
 * ```
 *
 * @public
 */
export async function traceOperation<T>(
  name: string,
  operation: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  return apiRouteTracer.startActiveSpan(
    name,
    {
      kind: SpanKind.INTERNAL,
      attributes,
    },
    async (span) => {
      try {
        const result = await operation();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        span.recordException(error instanceof Error ? error : new Error(errorMessage));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
