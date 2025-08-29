/**
 * Next.js Middleware integrated logger
 * Request tracking and logging functionality compatible with Edge Runtime
 */

import type { NextRequest, NextResponse } from 'next/server';

import { hashIPWithDefault } from './crypto';
import { incrementLogCounter, incrementErrorCounter, recordRequestDuration } from './metrics';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { generateRequestId, serializeError } from './utils';

import type { LoggerContext } from './types';

/**
 * Log entry type definition for Middleware
 *
 * @internal
 */
export interface MiddlewareLogEntry {
  /** Request-specific identifier */
  requestId: string;
  /** HTTP method */
  method: string;
  /** Request URL */
  url: string;
  /** User agent string */
  userAgent?: string;
  /** Hashed IP address */
  hashedIP: string;
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** Request processing time in milliseconds */
  duration?: number;
  /** HTTP status code */
  status?: number;
  /** Error information */
  error?: Record<string, unknown>;
  /** Event name */
  event_name: string;
  /** Event category */
  event_category: 'middleware_event' | 'security_event' | 'error_event';
  /** Event attributes */
  event_attributes?: Record<string, unknown>;
}

/**
 * Lightweight logger compatible with Edge Runtime
 * Implementation that does not use Node.js-specific features
 */
/**
 * Log output for Edge Runtime (pure function + controlled side effects)
 *
 * Lightweight log output compatible with Edge Runtime constraints.
 * Implementation using only console API without Node.js-specific features.
 *
 * @param level - Log level
 * @param entry - Log entry
 *
 * @public
 */
export function logForEdgeRuntime(
  level: 'info' | 'warn' | 'error',
  entry: MiddlewareLogEntry
): void {
  // Sanitization processing
  const sanitized = sanitizeLogEntry(
    `${entry.event_name}: ${entry.method} ${entry.url}`,
    limitObjectSize(entry, 5, 30)
  );

  // 📊 Metrics: Log entry counter (middleware)
  try {
    incrementLogCounter(level, 'middleware');

    // Error-level logs also increment error counter
    if (level === 'error') {
      const errorType = entry.error ? 'middleware_error' : 'request_error';
      incrementErrorCounter(errorType, 'middleware', 'high');
    }

    // Record request duration if available
    if (entry.duration && typeof entry.duration === 'number') {
      const statusCode = entry.status || 200;
      recordRequestDuration(entry.duration, entry.method, statusCode, entry.url);
    }
  } catch (metricsError) {
    // Metrics errors should not break logging functionality
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to update middleware metrics:', metricsError);
    }
  }

  // Only console is available in Edge Runtime
  const logData = {
    level,
    timestamp: entry.timestamp,
    message: sanitized.message,
    data: sanitized.data,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'info':
    default:
      console.log(JSON.stringify(logData));
      break;
  }
}

/**
 * Generate context for request tracking
 */
export function createRequestContext(request: NextRequest): LoggerContext {
  const requestId = generateRequestId();
  // request.ip is available in Next.js 15, use 'unknown' if not available
  // Type-safely check ip property
  const ip = 'ip' in request ? (request as { ip?: string }).ip || 'unknown' : 'unknown';

  // Execute IP hashing in pure function form
  // Use default configuration (backward compatibility alias)
  const hashedIP = hashIPWithDefault(ip);

  return {
    requestId,
    hashedIP,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
  } as LoggerContext;
}

/**
 * Request start log
 */
export function logRequestStart(request: NextRequest, context: LoggerContext): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.request_start',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      headers: sanitizeHeaders(request.headers),
    },
  };

  logForEdgeRuntime('info', entry);
}

/**
 * Request end log
 */
export function logRequestEnd(
  request: NextRequest,
  response: NextResponse,
  context: LoggerContext,
  startTime: number
): void {
  const duration = Date.now() - startTime;

  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    duration,
    status: response.status,
    event_name: 'middleware.request_end',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      duration_ms: duration,
      response_size: response.headers.get('content-length') || undefined,
      cache_status: response.headers.get('x-cache') || undefined,
    },
  };

  const level = response.status >= 400 ? 'error' : 'info';
  logForEdgeRuntime(level, entry);
}

/**
 * Security event log
 */
export function logSecurityEvent(
  request: NextRequest,
  context: LoggerContext,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: `security.${event}`,
    event_category: 'security_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      security_event: event,
      ...details,
    },
  };

  logForEdgeRuntime('warn', entry);
}

/**
 * Middleware error log
 */
export function logMiddlewareError(
  request: NextRequest,
  context: LoggerContext,
  error: Error | unknown,
  details: Record<string, unknown> = {}
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    error: serializeError(error),
    event_name: 'middleware.error',
    event_category: 'error_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      error_type: error instanceof Error ? error.name : typeof error,
      ...details,
    },
  };

  logForEdgeRuntime('error', entry);
}

/**
 * Sanitize headers (remove sensitive information)
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-session-id',
  ]);

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.has(lowerKey)) {
      // Set property in type-safe manner
      Object.assign(sanitized, { [key]: '[REDACTED]' });
    } else {
      // Set property in type-safe manner
      Object.assign(sanitized, { [key]: value });
    }
  });

  return sanitized;
}

/**
 * Rate limit log
 */
export function logRateLimit(
  request: NextRequest,
  context: LoggerContext,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.rate_limit',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      rate_limit: limit,
      rate_remaining: remaining,
      rate_reset: resetTime,
      rate_exceeded: remaining <= 0,
    },
  };

  const level = remaining <= 0 ? 'warn' : 'info';
  logForEdgeRuntime(level, entry);
}

/**
 * Redirect log
 */
export function logRedirect(
  request: NextRequest,
  context: LoggerContext,
  destination: string,
  permanent: boolean = false
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.redirect',
    event_category: 'middleware_event',
    event_attributes: {
      from_path: new URL(request.url).pathname,
      to_path: destination,
      permanent,
      redirect_type: permanent ? '301' : '302',
    },
  };

  logForEdgeRuntime('info', entry);
}

/**
 * Helper functions for Middleware integration
 */
export const middlewareLoggerHelpers = {
  /**
   * Log decoration for entire request
   */
  wrapRequest: async (
    request: NextRequest,
    handler: (request: NextRequest, context: LoggerContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const context = createRequestContext(request);

    // Request start log
    logRequestStart(request, context);

    try {
      // Execute handler
      const response = await handler(request, context);

      // Request end log
      logRequestEnd(request, response, context, startTime);

      // Add request ID to response headers
      response.headers.set('x-request-id', context.requestId);

      return response;
    } catch (error) {
      // Error log
      logMiddlewareError(request, context, error);
      throw error;
    }
  },

  /**
   * Wrapper with security checks
   */
  withSecurity: (
    request: NextRequest,
    context: LoggerContext,
    checks: {
      checkUserAgent?: boolean;
      checkReferer?: boolean;
      logSuspiciousActivity?: boolean;
    } = {}
  ): void => {
    const { checkUserAgent = true, checkReferer = false, logSuspiciousActivity = true } = checks;

    // User-Agent check
    if (checkUserAgent && !context.userAgent) {
      logSecurityEvent(request, context, 'missing_user_agent');
    }

    // Referer check
    if (checkReferer) {
      const referer = request.headers.get('referer');
      if (!referer) {
        logSecurityEvent(request, context, 'missing_referer');
      }
    }

    // Detect suspicious activity
    if (logSuspiciousActivity) {
      const path = new URL(request.url).pathname;

      // Detect common attack patterns
      const suspiciousPatterns = [
        /\.\.\//, // Path traversal
        /<script/i, // XSS attempt
        /union.*select/i, // SQL injection
        /\/admin\//, // Admin path access
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(path) || pattern.test(request.url)) {
          logSecurityEvent(request, context, 'suspicious_pattern', {
            pattern: pattern.source,
            matched_url: request.url,
          });
        }
      }
    }
  },
};

export default middlewareLoggerHelpers;
