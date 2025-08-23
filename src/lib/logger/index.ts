/**
 * Structured logging system integration exports
 * 
 * Provides unified interface for both client and server environments.
 * Centralizes logger configuration and environment detection to ensure
 * consistent logging behavior across different runtime contexts.
 */

// Static imports for environment-specific loggers
import { clientLoggerWrapper, clientLoggerHelpers } from './client';
import { loggerContextManager, createContextualLoggerCompat } from './context';
import { errorHandler } from './error-handler';
import { initializeLokiTransport, createLokiConfigFromEnv } from './loki-transport';
import { serverLoggerWrapper, serverLoggerHelpers } from './server';

import type { LokiTransportConfig } from './loki-transport';
import type { Logger, LogArgument, LogLevel, LoggerContext } from './types';

// Type definitions and interfaces
export type {
  Logger,
  LogLevel,
  LogArgument,
  LoggerContext,
  BaseProperties,
  SanitizedLogEntry,
} from './types';

// Core functionality
export {
  sanitizeLogEntry,
  sanitizeControlCharacters,
  sanitizeForJson,
  limitObjectSize,
} from './sanitizer';

export { hashIP, validateIPHashSecret } from './crypto';

export {
  getLogLevelFromEnv,
  getClientLogLevel,
  createBaseProperties,
  generateRequestId,
  serializeError,
  isLogLevelEnabled,
  getLogLevelValue,
  REDACT_PATHS,
} from './utils';

// Context management
export {
  runWithLoggerContext,
  getLoggerContext,
  createContextualLogger,
  createContextualLoggerCompat,
  loggerContextManager,
} from './context';

// Timer context integration
export {
  setTimeoutWithContext,
  setIntervalWithContext,
  TimerContextManager,
  createTimerContextManager,
} from './timer-context';
export type { ContextualTimerHandle } from './timer-context';

// API Route tracing integration
export {
  withAPIRouteTracing,
  createTracedAPIClient,
  getCurrentSpanContext,
  traceOperation,
} from './api-route-tracing';
export type {
  APIRouteSpanContext,
  APIRouteSpanResult,
  CreateAPIRouteSpanOptions,
} from './api-route-tracing';

// Server-side logger
export { serverLogger, serverLoggerWrapper, serverLoggerHelpers } from './server';

// Client-side logger
export { clientLogger, clientLoggerWrapper, clientLoggerHelpers } from './client';

// Middleware integration
export {
  createRequestContext,
  logRequestStart,
  logRequestEnd,
  logSecurityEvent,
  logMiddlewareError,
  logRateLimit,
  logRedirect,
  middlewareLoggerHelpers,
} from './middleware';

// Loki integration
export {
  LokiClient,
  LokiTransport,
  validateLokiConfig,
  createDefaultLokiConfig,
  initializeLokiTransport,
  getLokiTransport,
  shutdownLokiTransport,
  createLokiConfigFromEnv,
} from './loki-transport';

export type {
  LokiLabels,
  LokiLogEntry,
  LokiLogStream,
  LokiPushPayload,
  LokiClientConfig,
} from './loki-client';

export type { LokiTransportConfig, LokiTransportStats } from './loki-transport';

// Error handling
export { errorHandler, errorHandlerUtils } from './error-handler';

export type { ErrorCategory, ErrorContext, StructuredError } from './error-handler';

/**
 * Environment detection function
 * 
 * Pure function that determines the current runtime environment.
 * This is essential for selecting the appropriate logger implementation
 * based on whether code is running in Node.js, Edge Runtime, or browser.
 */
function detectEnvironment(): 'server' | 'client' | 'edge' {
  // Server-side detection
  if (typeof window === 'undefined') {
    try {
      // Test if Pino is available in Node.js environment
      // If serverLoggerWrapper is accessible at this point, we're in Node.js
      return 'server';
    } catch {
      // Edge Runtime or other environments where Pino is not available
      return 'edge';
    }
  } else {
    // Browser environment
    return 'client';
  }
}

/**
 * Creates appropriate logger based on environment
 * 
 * Pure function that returns the correct logger implementation
 * based on the detected runtime environment. This ensures
 * optimal logging performance for each context.
 */
function createAppropriateLogger(environment: 'server' | 'client' | 'edge'): Logger {
  switch (environment) {
    case 'server':
      return serverLoggerWrapper;
    case 'edge':
    case 'client':
      return clientLoggerWrapper;
  }
}

/**
 * Environment-aware logger instance
 * 
 * Automatically detects server/client environment and returns
 * the appropriate logger. This is the main logger export that
 * should be used throughout the application.
 */
export const logger = createAppropriateLogger(detectEnvironment());

/**
 * Initialize integrated logger system
 * 
 * Should be called during application startup. Sets up global error handlers,
 * configures Loki transport if enabled, and establishes initial logging context.
 * This centralized initialization ensures consistent logging behavior.
 */
export function initializeLogger(
  options: {
    enableGlobalErrorHandlers?: boolean;
    context?: Record<string, unknown>;
    enableLoki?: boolean;
    lokiConfig?: LokiTransportConfig;
  } = {}
): void {
  const {
    enableGlobalErrorHandlers = true,
    context = {},
    enableLoki = process.env.LOKI_ENABLED !== 'false',
    lokiConfig,
  } = options;

  // Set up global error handlers
  if (enableGlobalErrorHandlers) {
    setupGlobalErrorHandlers();
  }

  // Initialize Loki transport (async but doesn't block initialization)
  if (enableLoki) {
    const config = lokiConfig || createLokiConfigFromEnv();
    initializeLokiTransport(config).catch((error) => {
      console.warn('Failed to initialize Loki transport:', error);
    });
  }

  // Set up initial context
  if (Object.keys(context).length > 0) {
    // Note: This is only effective on server-side
    if (typeof window === 'undefined') {
      // Cast context to appropriate type (treat as partial LoggerContext)
      const loggerContext = {
        requestId: (context.requestId as string) || 'init',
        ...context,
      } as LoggerContext;
      loggerContextManager.runWithContext(loggerContext, () => {
        logger.info('Logger initialized with context', context);
      });
    } else {
      logger.info('Logger initialized', context);
    }
  } else {
    logger.info('Logger initialized');
  }
}

/**
 * Set up global error handlers
 * 
 * Configures uncaught exception and unhandled rejection handlers
 * for both Node.js and browser environments. This ensures that
 * all errors are properly logged and handled consistently.
 */
function setupGlobalErrorHandlers(): void {
  // Use statically imported errorHandler

  if (typeof window === 'undefined') {
    // Node.js environment
    process.on('uncaughtException', (error: Error) => {
      errorHandler.handleUncaughtException(error, {
        timestamp: new Date().toISOString(),
      });

      // Gracefully terminate the application
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      errorHandler.handleUnhandledRejection(reason, {
        timestamp: new Date().toISOString(),
      });
    });
  } else {
    // Browser environment
    window.addEventListener('error', (event) => {
      errorHandler.handle(event.error, {
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleUnhandledRejection(event.reason, {
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    });
  }
}

/**
 * Get logger with context
 * 
 * Creates a logger instance with attached context information.
 * Context is handled differently between server and client environments
 * due to their different execution models.
 * 
 * @internal
 */
export function getLoggerWithContext(context: Record<string, unknown>): Logger {
  if (typeof window === 'undefined') {
    // Server-side
    return createContextualLoggerCompat(logger, context);
  } else {
    // Client-side (context is attached individually)
    return {
      trace: (message: string, ...args: LogArgument[]) => logger.trace(message, context, ...args),
      debug: (message: string, ...args: LogArgument[]) => logger.debug(message, context, ...args),
      info: (message: string, ...args: LogArgument[]) => logger.info(message, context, ...args),
      warn: (message: string, ...args: LogArgument[]) => logger.warn(message, context, ...args),
      error: (message: string, ...args: LogArgument[]) => logger.error(message, context, ...args),
      fatal: (message: string, ...args: LogArgument[]) => logger.fatal(message, context, ...args),
      isLevelEnabled: (level: string) => logger.isLevelEnabled(level as LogLevel),
    };
  }
}

/**
 * Integrated performance measurement
 * 
 * Measures function execution time using the appropriate logger helper
 * based on the current environment. Provides consistent performance
 * tracking across server and client contexts.
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  _context: Record<string, unknown> = {}
): T {
  if (typeof window === 'undefined') {
    // Server-side
    return serverLoggerHelpers.measurePerformance(name, fn);
  } else {
    // Client-side
    return clientLoggerHelpers.measurePerformance(name, fn);
  }
}

/**
 * Integrated async performance measurement
 * 
 * Measures asynchronous function execution time with fallback handling
 * for environments that don't support async measurement. Ensures
 * consistent performance tracking for Promise-based operations.
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  _context: Record<string, unknown> = {}
): Promise<T> {
  if (typeof window === 'undefined') {
    // Server-side
    return (
      serverLoggerHelpers.measurePerformanceAsync?.(name, fn) ??
      Promise.resolve(serverLoggerHelpers.measurePerformance(name, () => fn()))
    );
  } else {
    // Client-side - use sync version if measurePerformanceAsync doesn't exist
    return Promise.resolve(clientLoggerHelpers.measurePerformance(name, () => fn()));
  }
}
/**
 * Integrated user action logging
 * 
 * Logs user actions with consistent formatting across environments.
 * This is essential for tracking user behavior and debugging
 * user-reported issues in both server and client contexts.
 */
export function logUserAction(action: string, details: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') {
    // Server-side
    serverLoggerHelpers.logUserAction(action, details);
  } else {
    // Client-side
    clientLoggerHelpers.logUserAction(action, details);
  }
}

/**
 * Integrated error logging
 * 
 * Provides unified error handling across environments using the
 * appropriate error handler for each context. Server-side uses
 * the structured error handler while client-side uses helper functions.
 * 
 * @internal
 */
export function logError(error: Error | unknown, context: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') {
    // Server-side - use existing errorHandler object
    errorHandler.handle(error, context);
  } else {
    // Client-side
    clientLoggerHelpers.logError(error, context);
  }
}

/**
 * Debug logger information display
 * 
 * Outputs detailed logger configuration and runtime information
 * for debugging purposes. Helps identify environment-specific
 * logging issues and configuration problems.
 */
export function debugLogger(): void {
  const info = {
    environment: typeof window === 'undefined' ? 'server' : 'client',
    logLevel:
      typeof window === 'undefined'
        ? process.env.LOG_LEVEL || 'info'
        : process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV,
    runtime: typeof window === 'undefined' ? process.env.NEXT_RUNTIME || 'nodejs' : 'browser',
    timestamp: new Date().toISOString(),
  };

  logger.debug('Logger debug information', info);
}

// Default export
export default logger;
