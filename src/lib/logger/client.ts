/**
 * Client-side logger implementation (pure functional approach)
 *
 * Lightweight logging for browser environments with console integration.
 * Follows architecture principles with pure-function-first implementation,
 * providing stateless, predictable, and testable logging system.
 */

import { incrementLogCounter, incrementErrorCounter } from './metrics';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getClientLogLevel, createBaseProperties, serializeError } from './utils';

import type { Logger, LogArgument, LogLevel } from './types';

/**
 * Browser console style definitions
 *
 * CSS configuration for each log level to provide visual
 * differentiation in browser console. Enhances debugging
 * experience through color-coded log levels.
 *
 * @internal
 */
const CONSOLE_STYLES = {
  trace: 'color: #6b7280; font-weight: normal;',
  debug: 'color: #3b82f6; font-weight: normal;',
  info: 'color: #10b981; font-weight: normal;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  fatal: 'color: #dc2626; font-weight: bold; background: #fef2f2;',
} as const;

/**
 * Log level priority mapping
 *
 * Priority definition by numeric values. Higher values indicate greater importance.
 * Used for log level filtering.
 *
 * @internal
 */
const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

/**
 * クライアントLogger設定型
 *
 * ログ動作を制御する不変設定オブジェクト。
 * 純粋関数の引数として使用。
 *
 * @public
 */
/**
 * Client Logger configuration type
 *
 * Immutable configuration object that controls log behavior.
 * Used as an argument for pure functions.
 *
 * @public
 */
export type ClientLoggerConfig = {
  /** Current log level setting */
  readonly level: LogLevel;
  /** Base properties applied to all log entries */
  readonly baseProperties: Readonly<Record<string, unknown>>;
};

/**
 * クライアントLogger設定を作成
 *
 * 環境変数とシステム情報から不変の設定オブジェクトを生成。
 * アプリケーション起動時に一度だけ実行される純粋関数。
 *
 * @returns 不変なLogger設定オブジェクト
 *
 * @public
 */
/**
 * Create client Logger configuration
 *
 * Generate immutable configuration object from environment variables and system information.
 * Pure function executed only once at application startup.
 *
 * @returns Immutable Logger configuration object
 *
 * @public
 */
export function createClientLoggerConfig(): ClientLoggerConfig {
  return {
    level: getClientLogLevel(),
    baseProperties: Object.freeze(createBaseProperties()),
  } as const;
}

/**
 * Get numeric value of log level (pure function)
 *
 * Convert log level string to corresponding numeric value.
 * Enable numeric comparison while maintaining type safety.
 *
 * @param level - Log level to convert
 * @returns Numeric value corresponding to log level
 *
 * @internal
 */
function getLogLevelValue(level: LogLevel): number {
  switch (level) {
    case 'trace':
      return LOG_LEVELS.trace;
    case 'debug':
      return LOG_LEVELS.debug;
    case 'info':
      return LOG_LEVELS.info;
    case 'warn':
      return LOG_LEVELS.warn;
    case 'error':
      return LOG_LEVELS.error;
    case 'fatal':
      return LOG_LEVELS.fatal;
    default:
      return LOG_LEVELS.info; // Fallback
  }
}

/**
 * Check log level validity (pure function)
 *
 * Determine whether specified log level will be output with current settings.
 * Used for pre-check for performance optimization.
 *
 * @param config - Logger configuration
 * @param level - Log level to check
 * @returns true if log level is enabled
 *
 * @public
 */
export function isLevelEnabled(config: ClientLoggerConfig, level: LogLevel): boolean {
  const targetLevel = getLogLevelValue(level);
  const currentLevel = getLogLevelValue(config.level);

  return targetLevel >= currentLevel;
}

/**
 * Get console style (pure function)
 *
 * Retrieve CSS description string corresponding to log level.
 * Apply styles while maintaining type safety.
 *
 * @param level - Log level to get style for
 * @returns CSS style string
 *
 * @internal
 */
function getConsoleStyle(level: LogLevel): string {
  switch (level) {
    case 'trace':
      return CONSOLE_STYLES.trace;
    case 'debug':
      return CONSOLE_STYLES.debug;
    case 'info':
      return CONSOLE_STYLES.info;
    case 'warn':
      return CONSOLE_STYLES.warn;
    case 'error':
      return CONSOLE_STYLES.error;
    case 'fatal':
      return CONSOLE_STYLES.fatal;
    default:
      return CONSOLE_STYLES.info; // Fallback
  }
}

/**
 * Get console method (pure function)
 *
 * Select optimal browser console method for log level.
 * Use console.error for error levels, console.warn for warnings.
 *
 * @param level - Log level
 * @returns Corresponding console method
 *
 * @internal
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'trace':
      return console.trace.bind(console);
    case 'debug':
      return console.debug.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'error':
    case 'fatal':
      return console.error.bind(console);
    default:
      return console.log.bind(console);
  }
}

/**
 * Process log arguments (pure function)
 *
 * Convert multiple arguments passed to log method into unified structure.
 * Apply appropriate processing and size limitations based on types.
 *
 * @param args - Argument array of log method
 * @returns Unified structured data
 *
 * @internal
 */
function processLogArguments(args: LogArgument[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const arg of args) {
    if (arg === null || arg === undefined) {
      continue;
    }

    if (arg instanceof Error) {
      // Error object processing
      result.error = serializeError(arg);
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      // Object merge (with size limitation)
      const limited = limitObjectSize(arg, 8, 50);
      Object.assign(result, limited);
    } else {
      // Other types are stored in args array
      if (!result.args) {
        result.args = [];
      }
      (result.args as unknown[]).push(arg);
    }
  }

  return result;
}

/**
 * Output to browser console (side-effect function)
 *
 * Output with styles and console methods according to log level.
 * Structured data is displayed as collapsible groups.
 *
 * @param level - Log level
 * @param message - Output message
 * @param data - Additional structured data
 *
 * @internal
 */
function outputToConsole(level: LogLevel, message: string, data?: unknown): void {
  const style = getConsoleStyle(level);
  const prefix = `[${level.toUpperCase()}]`;

  // Console method selection
  const consoleMethod = getConsoleMethod(level);

  if (data && typeof data === 'object') {
    // Display as group when data exists
    console.group(`%c${prefix} ${message}`, style);
    consoleMethod('Details:', data);
    console.groupEnd();
  } else {
    // Simple message output
    consoleMethod(`%c${prefix} ${message}`, style, data || '');
  }
}

/**
 * Output development debug information (side-effect function)
 *
 * Display detailed debug information only in development environment.
 * Visualize internal state and arguments of log processing.
 *
 * @param level - Log level
 * @param originalMessage - Original message
 * @param processedData - Processed data
 * @param processedArgs - Processed arguments
 *
 * @internal
 */
function outputDevelopmentDebug(
  level: LogLevel,
  originalMessage: string,
  processedData: unknown,
  processedArgs: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.groupCollapsed(`[Logger] ${level.toUpperCase()} - ${timestamp}`);
    console.log('Original message:', originalMessage);
    console.log('Processed data:', processedData);
    console.log('Arguments:', processedArgs);
    console.groupEnd();
  }
}

/**
 * Extract error type from log arguments for metrics classification
 *
 * Pure function that analyzes log arguments to determine error type
 * for detailed error metrics categorization on client-side.
 *
 * @param processedArgs - Processed log arguments object
 * @returns Error type string for metrics labeling
 *
 * @internal
 */
function extractErrorType(processedArgs: Record<string, unknown>): string {
  // Check for error object
  if (processedArgs.error && typeof processedArgs.error === 'object') {
    const error = processedArgs.error as { name?: string; code?: string; type?: string };
    return error.name || error.code || error.type || 'unknown_error';
  }

  // Check for error in args array
  if (processedArgs.args && Array.isArray(processedArgs.args)) {
    const errorArg = processedArgs.args.find((arg: unknown) => arg instanceof Error);
    if (errorArg) {
      return (errorArg as Error).name || 'error';
    }
  }

  // Check for specific error patterns in other fields
  if (processedArgs.event_name && typeof processedArgs.event_name === 'string') {
    return processedArgs.event_name;
  }

  // Default error type for client-side
  return 'client_error';
}

/**
 * Integrated log output function (pure function + controlled side effects)
 *
 * Common output processing used by all log levels.
 * Integrates security sanitization, formatting, and console output.
 *
 * Design principles:
 * - Configuration and message processing are pure functions
 * - Console output is separated as side effects only
 * - Maximize testability
 *
 * @param config - Logger configuration (immutable)
 * @param level - Log level
 * @param message - Log message
 * @param args - Additional log data
 *
 * @public
 */
export function log(
  config: ClientLoggerConfig,
  level: LogLevel,
  message: string,
  ...args: LogArgument[]
): void {
  // Level check (pure function)
  if (!isLevelEnabled(config, level)) {
    return;
  }

  // Log entry construction (pure function)
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...config.baseProperties,
  };

  // Argument processing and sanitization (pure function)
  const processedArgs = processLogArguments(args);
  const sanitized = sanitizeLogEntry(message, {
    ...logEntry,
    ...processedArgs,
  });

  // 📊 Metrics: Log entry counter (client-side)
  try {
    incrementLogCounter(level, 'client');

    // Error-level logs also increment error counter
    if (level === 'error' || level === 'fatal') {
      const errorType = extractErrorType(processedArgs);
      const severity = level === 'fatal' ? 'critical' : 'high';
      incrementErrorCounter(errorType, 'client', severity);
    }
  } catch (metricsError) {
    // Metrics errors should not break logging functionality
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to update client-side metrics:', metricsError);
    }
  }

  // Side effect: Output to browser console
  outputToConsole(level, sanitized.message, sanitized.data);

  // Side effect: Development environment debug information
  outputDevelopmentDebug(level, message, sanitized.data, processedArgs);
}

/**
 * Create Logger interface compliant object
 *
 * Unified Logger interface with partial application of configuration.
 * Provides client-optimized log processing while maintaining
 * compatibility with server-side logger.
 *
 * @param config - Logger configuration
 * @returns Logger interface compliant object
 *
 * @public
 */
export function createClientLogger(config: ClientLoggerConfig): Logger {
  return {
    trace: (message: string, ...args: LogArgument[]) => log(config, 'trace', message, ...args),
    debug: (message: string, ...args: LogArgument[]) => log(config, 'debug', message, ...args),
    info: (message: string, ...args: LogArgument[]) => log(config, 'info', message, ...args),
    warn: (message: string, ...args: LogArgument[]) => log(config, 'warn', message, ...args),
    error: (message: string, ...args: LogArgument[]) => log(config, 'error', message, ...args),
    fatal: (message: string, ...args: LogArgument[]) => log(config, 'fatal', message, ...args),
    isLevelEnabled: (level: LogLevel) => isLevelEnabled(config, level),
  };
}

// ===================================================================
// Default instances and helper functions (backward compatibility)
// ===================================================================

/**
 * Default client Logger configuration
 *
 * Default configuration used throughout the application.
 * Created only once and used as immutable thereafter.
 *
 * @public
 */
export const defaultClientLoggerConfig = createClientLoggerConfig();

/**
 * Default client Logger instance
 *
 * Recommended logger for most common uses.
 * Instance immediately available using default configuration.
 *
 * @public
 */
export const clientLogger = createClientLogger(defaultClientLoggerConfig);

/**
 * Logger interface compliant wrapper (backward compatibility)
 *
 * Alias for compatibility with existing code.
 * Points to the same instance as clientLogger.
 *
 * @public
 */
export const clientLoggerWrapper: Logger = clientLogger;

/**
 * Client-side specific helper functions
 *
 * Collection of convenience functions for common log patterns in browser environment.
 * Provides client-specific log functionality including Web API integration,
 * user action tracking, navigation recording, etc.
 *
 * @public
 */
export const clientLoggerHelpers = {
  /**
   * Performance measurement (using Web API)
   *
   * High-precision measurement using Web API performance.now().
   * Automatically record function execution time in browser environment.
   *
   * @param name - Measurement operation name
   * @param fn - Function to measure
   * @returns Function execution result
   *
   * @public
   */
  measurePerformance: <T>(name: string, fn: () => T): T => {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      log(defaultClientLoggerConfig, 'info', `Performance: ${name}`, {
        event_name: `performance.${name}`,
        event_category: 'system_event',
        duration_ms: duration,
        operation: name,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log(defaultClientLoggerConfig, 'error', `Performance error: ${name}`, {
        event_name: 'error.performance',
        event_category: 'error_event',
        duration_ms: duration,
        operation: name,
        error: serializeError(error),
      });
      throw error;
    }
  },

  /**
   * User action log
   *
   * Structured log recording of user operations.
   * Used for recording clicks, form submissions, page transitions, etc.
   *
   * @param action - User action name
   * @param details - Action detail information
   *
   * @public
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    log(defaultClientLoggerConfig, 'info', `User action: ${action}`, {
      event_name: `user.${action}`,
      event_category: 'user_action',
      event_attributes: details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Navigation event log
   *
   * Record page transitions and routing events.
   * Used for tracking user navigation in SPA.
   *
   * @param from - Source path
   * @param to - Destination path
   * @param method - Transition method (default: 'unknown')
   *
   * @public
   */
  logNavigation: (from: string, to: string, method: string = 'unknown') => {
    log(defaultClientLoggerConfig, 'info', 'Navigation event', {
      event_name: 'navigation.route_change',
      event_category: 'user_action',
      event_attributes: {
        from_path: from,
        to_path: to,
        method,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Error event log
   *
   * Structured log recording of client-side errors.
   * Automatically collect browser information, URL, and context.
   *
   * @param error - Error object or value
   * @param context - Context information when error occurred
   *
   * @public
   */
  logError: (error: Error | unknown, context: Record<string, unknown> = {}) => {
    log(defaultClientLoggerConfig, 'error', 'Client error occurred', {
      event_name: 'error.client',
      event_category: 'error_event',
      event_attributes: context,
      error: serializeError(error),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });
  },

  /**
   * API call log
   *
   * Structured log recording of HTTP requests.
   * Automatic log level selection based on status code.
   *
   * @param url - Request URL
   * @param method - HTTP method
   * @param status - HTTP status code (optional)
   * @param duration - Processing time (ms) (optional)
   *
   * @public
   */
  logApiCall: (url: string, method: string, status?: number, duration?: number) => {
    const level: LogLevel = status && status >= 400 ? 'error' : 'info';

    log(defaultClientLoggerConfig, level, `API call: ${method} ${url}`, {
      event_name: 'api.request',
      event_category: 'system_event',
      event_attributes: {
        url,
        method,
        status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
    });
  },
};

/**
 * Default client logger export
 *
 * Client-side logger compliant with unified Logger interface.
 * Recommended export for most common uses.
 *
 * @public
 */
export default clientLoggerWrapper;
