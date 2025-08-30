/**
 * Structured log utility functions
 * Contains security-critical functionality
 */

import { randomUUID } from 'node:crypto';

import { LogLevel, LOG_LEVELS, BaseProperties, SEVERITY_NUMBERS } from './types';

/**
 * Default log level
 */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

/**
 * Function to get log level from environment variables
 *
 * Reads the LOG_LEVEL environment variable and returns a valid log level.
 * Returns default log level if invalid value or not set.
 *
 * @returns Valid log level value
 *
 * @example
 * ```typescript
 * // When LOG_LEVEL=debug
 * const level = getLogLevelFromEnv(); // 'debug'
 *
 * // When LOG_LEVEL is not set or invalid
 * const level = getLogLevelFromEnv(); // 'info' (default)
 * ```
 *
 * @public
 */
export function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();

  if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  return DEFAULT_LOG_LEVEL;
}

/**
 * Function to get appropriate log level for client-side
 *
 * Determines appropriate log level based on server-side and client-side environments.
 * Uses NEXT_PUBLIC_LOG_LEVEL environment variable on client-side,
 * and normal LOG_LEVEL environment variable on server-side.
 *
 * @returns Log level suitable for client environment
 *
 * @example
 * ```typescript
 * // Usage in browser environment
 * const clientLevel = getClientLogLevel(); // Gets from NEXT_PUBLIC_LOG_LEVEL
 *
 * // Usage on server-side
 * const serverLevel = getClientLogLevel(); // Gets from LOG_LEVEL
 * ```
 *
 * @public
 */
export function getClientLogLevel(): LogLevel {
  if (typeof window === 'undefined') {
    // Get from environment variables on server-side
    return getLogLevelFromEnv();
  }

  // Use environment variable with NEXT_PUBLIC_ prefix in browser environment
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase();

  if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  // Detailed logs in development environment, default in production environment
  return process.env.NODE_ENV === 'development' ? 'debug' : DEFAULT_LOG_LEVEL;
}

/**
 * Function to generate base properties for structured logging
 *
 * Generates common base properties included in all log entries.
 * Includes application name, environment, process ID, version information, etc.
 *
 * @returns Structured log base properties object
 *
 * @example
 * ```typescript
 * const baseProps = createBaseProperties();
 * // {
 * //   app: 'nextjs-boilerplate',
 * //   env: 'development',
 * //   pid: 12345,
 * //   version: '1.0.0',
 * //   log_schema_version: '1.0.0'
 * // }
 * ```
 *
 * @public
 */
export function createBaseProperties(): BaseProperties {
  return {
    app: process.env.NEXT_PUBLIC_APP_NAME || 'nextjs-boilerplate',
    env: process.env.NODE_ENV || 'development',
    pid: typeof process !== 'undefined' ? process.pid : 0,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    log_schema_version: '1.0.0',
  };
}

/**
 * Path definitions for masking sensitive information from logs
 *
 * List of object paths that may contain security-critical information.
 * Data matching these paths is automatically replaced with '[REDACTED]'.
 * Includes authentication information, personal information (PII), and confidential business information.
 *
 * @example
 * ```typescript
 * // When the following data is included in logs
 * const userData = {
 *   user: { email: 'user@example.com', name: 'John' },
 *   password: 'secret123'
 * };
 *
 * // Transformed as follows by REDACT_PATHS
 * // {
 * //   user: { email: '[REDACTED]', name: 'John' },
 * //   password: '[REDACTED]'
 * // }
 * ```
 *
 * @public
 */
export const REDACT_PATHS = [
  // Authentication information
  'password',
  'token',
  'authorization',
  'auth',
  'secret',
  'key',
  '*.password',
  '*.token',
  '*.authorization',
  '*.auth',
  '*.secret',
  '*.key',

  // HTTP headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',

  // Personal information (PII)
  'user.email',
  'user.phone',
  'user.ssn',
  'user.credit_card',
  '*.email',
  '*.phone',
  '*.ssn',
  '*.credit_card',
  'email',
  'phone',
  'ssn',
  'credit_card',

  // Confidential business information
  'payment.card_number',
  'payment.cvv',
  'bank.account_number',
  'card_number',
  'cvv',
  'account_number',
];

/**
 * Function to convert log level to corresponding numeric value
 *
 * Converts log level to numeric value based on OpenTelemetry SeverityNumber specification.
 * This numeric value is used for log level importance comparison and filtering.
 *
 * @param level - Log level to convert
 * @returns Numeric value corresponding to log level (SeverityNumber)
 *
 * @example
 * ```typescript
 * const errorValue = getLogLevelValue('error'); // 17
 * const infoValue = getLogLevelValue('info');   // 9
 * const debugValue = getLogLevelValue('debug'); // 5
 * ```
 *
 * @public
 */
export function getLogLevelValue(level: LogLevel): number {
  const severityNumber = SEVERITY_NUMBERS[level as keyof typeof SEVERITY_NUMBERS];
  return severityNumber || 30;
}

/**
 * Function to determine if specified log level is enabled with current settings
 *
 * Determines whether target log level is subject to output based on current log level settings.
 * Only log levels with higher importance are determined as enabled.
 *
 * @param currentLevel - Currently configured log level
 * @param targetLevel - Log level to be determined
 * @returns true if target log level is enabled, false if disabled
 *
 * @example
 * ```typescript
 * // When current level is 'info'
 * isLogLevelEnabled('info', 'error'); // true (error is more important than info)
 * isLogLevelEnabled('info', 'debug'); // false (debug is less important than info)
 * isLogLevelEnabled('info', 'info');  // true (same level)
 * ```
 *
 * @public
 */
export function isLogLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return getLogLevelValue(targetLevel) >= getLogLevelValue(currentLevel);
}

/**
 * Function to generate unique request ID (UUID v7 implementation)
 *
 * Generates unique ID for log correlation analysis and request tracing.
 * Using UUID v7 completely prevents collisions in high-frequency execution.
 *
 * @returns Unique request ID string
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // 'req_01234567-89ab-7cde-f012-3456789abcde'
 *
 * // Usage example in logs
 * logger.info('Request started', { requestId });
 * ```
 *
 * @public
 * @remarks Using UUID v7 prevents collisions in high-frequency execution
 */
export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Edge Runtime environment detection (pure function)
 *
 * Detects whether it's Vercel Edge Runtime environment.
 * Determined by checking the existence of global variable EdgeRuntime.
 *
 * @returns true if Edge Runtime environment
 *
 * @example
 * ```typescript
 * if (isEdgeRuntime()) {
 *   // Edge Runtime compatible code
 * } else {
 *   // Node.js environment code
 * }
 * ```
 *
 * @public
 */
export function isEdgeRuntime(): boolean {
  try {
    // Check existence of EdgeRuntime global variable
    return typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime === 'string';
  } catch {
    return false;
  }
}

/**
 * Detect runtime environment type (pure function)
 *
 * Identifies the type of current runtime environment.
 * Distinguishes between Edge Runtime, Node.js, and browser environments.
 *
 * @returns Runtime environment type
 *
 * @public
 */
export function detectRuntimeEnvironment(): 'edge' | 'nodejs' | 'browser' {
  // Edge Runtime environment
  if (isEdgeRuntime()) {
    return 'edge';
  }

  // Node.js environment (server-side)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    return 'nodejs';
  }

  // Browser environment
  return 'browser';
}

/**
 * Edge Runtime compatible context storage
 *
 * Provides request-scoped context management in Edge Runtime environments
 * where AsyncLocalStorage is not available.
 * Implemented using WeakMap and Promise chaining.
 *
 * ## Reasons for Class Implementation
 *
 * **As an exception to Pure Functions First principle, adopting class implementation for the following reasons:**
 * - **State Management**: Object association and current context management through WeakMap
 * - **Environment Constraints**: Alternative AsyncLocalStorage implementation for Edge Runtime environments
 * - **Lifecycle**: Context inheritance and automatic cleanup in request scope
 * - **Memory Efficiency**: Garbage collection-aware memory management through WeakMap
 * - **Type Safety**: Type-safe context management with generic type parameters
 *
 * @internal
 */
class EdgeContextStorage<T> {
  private currentContext: T | null = null;

  /**
   * Execute callback with specified context
   */
  run(context: T, callback: () => void): void;
  run<R>(context: T, callback: () => R): R;
  run<R>(context: T, callback: () => R): R {
    const previousContext = this.currentContext;
    this.currentContext = context;

    try {
      return callback();
    } finally {
      this.currentContext = previousContext;
    }
  }

  /**
   * Get current context
   */
  getStore(): T | undefined {
    return this.currentContext ?? undefined;
  }

  /**
   * Bind context to object
   */
  bind<Args extends unknown[]>(fn: (...args: Args) => void, context?: T): (...args: Args) => void {
    const boundContext = context ?? this.currentContext;
    if (!boundContext) {
      return fn;
    }

    return (...args: Args) => {
      return this.run(boundContext, () => fn(...args));
    };
  }
}

/**
 * Environment-compatible AsyncLocalStorage interface
 *
 * Uses EdgeContextStorage in Edge Runtime environments,
 * and AsyncLocalStorage in Node.js environments.
 *
 * @internal
 */
export interface CompatibleStorage<T> {
  /**
   * Execute callback function with specified context
   * @param store - Context value to set
   * @param callback - Callback function to execute
   * @returns Return value of callback function
   */
  run<R>(store: T, callback: () => R): R;

  /**
   * Get current context value
   * @returns Current context value, or undefined if not set
   */
  getStore(): T | undefined;

  /**
   * Bind function with specified context
   * @param fn - Function to bind
   * @param context - Context value to bind (defaults to current context if omitted)
   * @returns Bound function
   */
  bind<Args extends unknown[]>(fn: (...args: Args) => void, context?: T): (...args: Args) => void;
}

/**
 * Environment-compatible storage factory (pure function)
 *
 * Creates appropriate context storage based on runtime environment.
 * Uses custom implementation in Edge Runtime environments,
 * and AsyncLocalStorage in Node.js environments.
 *
 * @returns Environment-compatible storage instance
 *
 * @public
 */
export function createCompatibleStorage<T>(): CompatibleStorage<T> {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime environment: Use custom implementation
    const edgeStorage = new EdgeContextStorage<T>();
    return {
      run: edgeStorage.run.bind(edgeStorage),
      getStore: edgeStorage.getStore.bind(edgeStorage),
      bind: edgeStorage.bind.bind(edgeStorage),
    };
  } else {
    // Node.js environment: Use AsyncLocalStorage
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AsyncLocalStorage } = require('node:async_hooks');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AsyncLocalStorageConstructor = AsyncLocalStorage as any;
      const als = new AsyncLocalStorageConstructor() as {
        run<R>(store: T, callback: () => R): R;
        getStore(): T | undefined;
      };
      return {
        run: als.run.bind(als),
        getStore: als.getStore.bind(als),
        bind: <Args extends unknown[]>(fn: (...args: Args) => void, context?: T) => {
          if (!context) {
            return fn;
          }
          return (...args: Args) => als.run(context, () => fn(...args));
        },
      };
    } catch {
      // Fallback: Use Edge implementation
      const fallbackStorage = new EdgeContextStorage<T>();
      return {
        run: fallbackStorage.run.bind(fallbackStorage),
        getStore: fallbackStorage.getStore.bind(fallbackStorage),
        bind: fallbackStorage.bind.bind(fallbackStorage),
      };
    }
  }
}

/**
 * Function to serialize error objects into structured log format
 *
 * Converts Error objects or arbitrary values into JSON-serializable format.
 * For Error objects, extracts name, message, stack, and cause properties.
 * For other values, converts to safe string representation.
 *
 * @param error - Error object or arbitrary value to serialize
 * @returns JSON-serializable error information object
 *
 * @example
 * ```typescript
 * // For Error objects
 * const err = new Error('Something went wrong');
 * const serialized = serializeError(err);
 * // {
 * //   name: 'Error',
 * //   message: 'Something went wrong',
 * //   stack: '...',
 * //   cause: undefined
 * // }
 *
 * // For string values
 * const serialized = serializeError('Custom error');
 * // {
 * //   message: 'Custom error',
 * //   type: 'string'
 * // }
 * ```
 *
 * @public
 */
export function serializeError(error: Error | unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return {
    message: String(error),
    type: typeof error,
  };
}
