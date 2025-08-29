/**
 * Unified error handling and logging functionality
 * Compatible with Next.js App Router, API Routes, and Middleware
 */

import { sanitizeLogEntry } from './sanitizer';
import { serializeError } from './utils';

import type { Logger, LogArgument } from './types';

/**
 * Error category definitions
 */
export type ErrorCategory =
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'not_found_error'
  | 'network_error'
  | 'database_error'
  | 'external_api_error'
  | 'rate_limit_error'
  | 'system_error'
  | 'unknown_error';

/**
 * Error context information
 *
 * Holds detailed context information when errors occur.
 * Structures related data necessary for debugging, analysis, and monitoring.
 *
 * For GDPR compliance, personally identifiable information must be
 * hashed or pseudonymized prior to storage.
 *
 * @public
 */
export interface ErrorContext {
  /**
   * Request-specific ID
   *
   * Unique identifier of the HTTP request where the error occurred.
   * Used for error tracking in distributed tracing.
   *
   * @public
   */
  requestId?: string;

  /**
   * User ID
   *
   * Identifier of the user where the error occurred.
   * Use hashed or pseudonymized values for GDPR compliance.
   *
   * @public
   */
  userId?: string;

  /**
   * Session ID
   *
   * Identifier of the session where the error occurred.
   * Used for session-specific error pattern analysis.
   *
   * @public
   */
  sessionId?: string;

  /**
   * Request path
   *
   * URL path where the error occurred.
   * Used for endpoint-specific error rate analysis.
   *
   * @public
   */
  path?: string;

  /**
   * HTTP method
   *
   * HTTP method where the error occurred (GET/POST, etc.).
   * Used for method-specific error analysis.
   *
   * @public
   */
  method?: string;

  /**
   * User agent
   *
   * User-Agent string of the client where the error occurred.
   * Used for browser-specific error analysis.
   *
   * @public
   */
  userAgent?: string;

  /**
   * Hashed IP address
   *
   * GDPR-compliant hashed client IP address.
   * Used for geographic error pattern analysis.
   *
   * @public
   */
  hashedIP?: string;

  /**
   * Error occurrence timestamp
   *
   * UTC time string in ISO 8601 format.
   * Used for time series error analysis.
   *
   * @public
   */
  timestamp?: string;

  /**
   * Additional data
   *
   * Error-specific detailed information and custom context.
   * Used for flexible error information extension.
   *
   * @public
   */
  additionalData?: Record<string, unknown>;
}

/**
 * Structured error information
 *
 * Centrally manages detailed information about error classification, severity, and recoverability.
 * Used for automation of monitoring systems, alerts, and user notifications.
 *
 * @public
 */
export interface StructuredError {
  /**
   * Error category
   *
   * Predefined category indicating the type of error.
   * Used for automatic grouping in monitoring dashboards.
   *
   * @public
   */
  category: ErrorCategory;

  /**
   * Error message
   *
   * Human-readable error description.
   * Primary field for logging and debugging.
   *
   * @public
   */
  message: string;

  /**
   * Original error object
   *
   * Error instance or value from the error source.
   * Used for detailed stack trace analysis.
   *
   * @public
   */
  originalError: Error | unknown;

  /**
   * Error context
   *
   * Detailed context information when the error occurred.
   * Related data necessary for debugging and analysis.
   *
   * @public
   */
  context: ErrorContext;

  /**
   * Error severity
   *
   * Error severity level.
   * Used for alert prioritization and escalation automation.
   *
   * @public
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Retryable flag
   *
   * Indicates whether the error is temporary and retryable.
   * Used for automatic recovery and client retry logic.
   *
   * @public
   */
  isRetryable: boolean;

  /**
   * User-facing message
   *
   * User-friendly message that can be displayed to end users.
   * Used for UI notifications and error page displays.
   *
   * @public
   */
  userMessage?: string;

  /**
   * Error code
   *
   * Application-specific error identifier.
   * Used for support handling and automatic classification.
   *
   * @public
   */
  errorCode?: string;

  /**
   * HTTP status code
   *
   * Status code for HTTP responses.
   * Used for automatic API response generation.
   *
   * @public
   */
  statusCode?: number;
}

/**
 * Error classifier
 *
 * Provides automatic classification and category determination of error objects.
 * Analyzes error messages, properties, and type information to
 * automatically determine appropriate error categories.
 *
 * Used for unified error handling and alert automation.
 *
 * @public
 */
/**
 * Error classifier configuration type
 *
 * Configuration object used for error classification.
 * Immutable configuration used as arguments for pure functions.
 *
 * @public
 */
export type ErrorClassifierConfig = Record<string, never>;

/**
 * Integrated error handler
 *
 * Processes error classification, log recording, and user notifications in an integrated manner.
 * Provides unified error handling for Next.js App Router, API Routes, and Middleware.
 *
 * Key features:
 * - Automatic error classification and structuring
 * - Security sanitization
 * - Severity-based log recording
 * - User-facing message generation
 * - Automatic context information collection
 *
 * @public
 */
/**
 * Error handler configuration type
 *
 * Configuration object used for error handling.
 * Immutable configuration used as arguments for pure functions.
 *
 * @public
 */
export type ErrorHandlerConfig = {
  /** Logger instance used for error log recording */
  readonly logger: Logger;
};

/**
 * Create error handler configuration (pure function)
 *
 * Generates immutable configuration object containing Logger instance.
 * Pure function executed only once at application startup.
 *
 * @param logger - Logger used for error log recording
 * @returns Immutable error handler configuration object
 *
 * @public
 */
export function createErrorHandlerConfig(logger: Logger): ErrorHandlerConfig {
  return {
    logger,
  } as const;
}

/**
 * Automatic error classification (pure function)
 *
 * Analyzes error objects or values to determine appropriate categories.
 * Comprehensively evaluates error messages, types, and properties.
 *
 * @param _config - Error classification configuration (currently unused, for future extension)
 * @param error - Error object or value to classify
 * @param context - Error context information
 * @returns Determined structured error
 *
 * @public
 */
export function classifyError(
  _config: ErrorClassifierConfig,
  error: Error | unknown,
  context: ErrorContext = {}
): StructuredError {
  if (error instanceof Error) {
    return classifyKnownError(error, context);
  }

  return classifyUnknownError(error, context);
}

/**
 * Classification of known error types (pure function)
 *
 * Analyzes Error instances in detail to determine categories.
 *
 * @param error - Error instance to classify
 * @param context - Error context information
 * @returns 判定された構造化エラー
 *
 * @internal
 */
function classifyKnownError(error: Error, context: ErrorContext): StructuredError {
  const message = error.message.toLowerCase();

  // Validation errors
  if (isValidationError(error, message)) {
    return {
      category: 'validation_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'low',
      isRetryable: false,
      userMessage: 'Invalid input provided',
      statusCode: 400,
    };
  }

  // Authentication errors
  if (isAuthenticationError(error, message)) {
    return {
      category: 'authentication_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'medium',
      isRetryable: false,
      userMessage: 'Authentication required',
      statusCode: 401,
    };
  }

  // Authorization errors
  if (isAuthorizationError(error, message)) {
    return {
      category: 'authorization_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'medium',
      isRetryable: false,
      userMessage: 'Access denied',
      statusCode: 403,
    };
  }

  // Not found errors
  if (isNotFoundError(error, message)) {
    return {
      category: 'not_found_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'low',
      isRetryable: false,
      userMessage: 'Resource not found',
      statusCode: 404,
    };
  }

  // Network errors
  if (isNetworkError(error, message)) {
    return {
      category: 'network_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'medium',
      isRetryable: true,
      userMessage: 'Network error occurred',
      statusCode: 503,
    };
  }

  // Database errors
  if (isDatabaseError(error, message)) {
    return {
      category: 'database_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'high',
      isRetryable: true,
      userMessage: 'Service temporarily unavailable',
      statusCode: 503,
    };
  }

  // Rate limit errors
  if (isRateLimitError(error, message)) {
    return {
      category: 'rate_limit_error',
      message: error.message,
      originalError: error,
      context,
      severity: 'medium',
      isRetryable: true,
      userMessage: 'Rate limit exceeded',
      statusCode: 429,
    };
  }

  // Default system error
  return {
    category: 'system_error',
    message: error.message,
    originalError: error,
    context,
    severity: 'high',
    isRetryable: false,
    userMessage: 'An error occurred',
    statusCode: 500,
  };
}

/**
 * Classification of unknown error types (pure function)
 *
 * Converts non-Error values to structured errors.
 *
 * @param error - Value to classify
 * @param context - Error context information
 * @returns Determined structured error
 *
 * @internal
 */
function classifyUnknownError(error: unknown, context: ErrorContext): StructuredError {
  return {
    category: 'unknown_error',
    message: String(error),
    originalError: error,
    context,
    severity: 'medium',
    isRetryable: false,
    userMessage: 'An unexpected error occurred',
    statusCode: 500,
  };
}

// Error determination helper functions (pure functions)

/**
 * Validation error determination (pure function)
 *
 * Determines whether an error is due to user input validation failure.
 * Targets form inputs, API parameter validation errors, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if validation error
 *
 * @internal
 */
function isValidationError(error: Error, message: string): boolean {
  return (
    error.name === 'ValidationError' ||
    error.name === 'ZodError' ||
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  );
}

/**
 * Authentication error determination (pure function)
 *
 * Determines whether an error is due to user authentication failure.
 * Targets login failures, invalid tokens, insufficient authentication information, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if authentication error
 *
 * @internal
 */
function isAuthenticationError(error: Error, message: string): boolean {
  return (
    error.name === 'AuthenticationError' ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('invalid credentials')
  );
}

/**
 * Authorization error determination (pure function)
 *
 * Determines whether an error is due to insufficient access permissions.
 * Targets resource access denial, insufficient permissions, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if authorization error
 *
 * @internal
 */
function isAuthorizationError(error: Error, message: string): boolean {
  return (
    error.name === 'AuthorizationError' ||
    message.includes('forbidden') ||
    message.includes('access denied') ||
    message.includes('permission')
  );
}

/**
 * Not found error determination (pure function)
 *
 * Determines whether an error is due to non-existent resources.
 * Targets access to non-existent pages, files, and data.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if not found error
 *
 * @internal
 */
function isNotFoundError(error: Error, message: string): boolean {
  return (
    error.name === 'NotFoundError' ||
    message.includes('not found') ||
    message.includes('does not exist')
  );
}

/**
 * Network error determination (pure function)
 *
 * Determines whether an error is due to network connection issues.
 * Targets timeouts, connection failures, network outages, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if network error
 *
 * @internal
 */
function isNetworkError(error: Error, message: string): boolean {
  return (
    error.name === 'NetworkError' ||
    error.name === 'TimeoutError' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection')
  );
}

/**
 * Database error determination (pure function)
 *
 * Determines whether an error is due to database operation failure.
 * Targets connection errors, query errors, constraint violations, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if database error
 *
 * @internal
 */
function isDatabaseError(error: Error, message: string): boolean {
  return (
    error.name === 'DatabaseError' ||
    error.name === 'QueryError' ||
    message.includes('database') ||
    message.includes('connection') ||
    message.includes('query failed')
  );
}

/**
 * Rate limit error determination (pure function)
 *
 * Determines whether an error is due to API usage limit exceeded.
 * Targets request frequency limits, usage limit exceeded, etc.
 *
 * @param error - Error object to determine
 * @param message - Error message (lowercase)
 * @returns true if rate limit error
 *
 * @internal
 */
function isRateLimitError(error: Error, message: string): boolean {
  return (
    error.name === 'RateLimitError' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

/**
 * Error processing and log recording (pure function + controlled side effects)
 *
 * Classifies errors and records them at appropriate log levels.
 * Returns structured error information.
 *
 * @param config - Error handler configuration
 * @param error - Error to process
 * @param context - Error context information
 * @returns Structured error information
 *
 * @public
 */
export function handleError(
  config: ErrorHandlerConfig,
  error: Error | unknown,
  context: ErrorContext = {}
): StructuredError {
  const classifierConfig: ErrorClassifierConfig = {};
  const structuredError = classifyError(classifierConfig, error, context);

  // Determine log level
  const logLevel = getLogLevel(structuredError.severity);

  // Create log entry
  const logEntry = createLogEntry(structuredError);

  // Log output (type-safe method call)
  logWithLevel(config.logger, logLevel, logEntry.message, logEntry.data);

  return structuredError;
}

/**
 * Type-safe log level call (pure function + controlled side effects)
 *
 * @param logger - Logger instance
 * @param level - Log level
 * @param message - Log message
 * @param data - Log data
 *
 * @internal
 */
function logWithLevel(
  logger: Logger,
  level: 'error' | 'warn' | 'info',
  message: string,
  data?: unknown
): void {
  // Convert unknown to LogArgument compatible form
  const logData = data as LogArgument;

  switch (level) {
    case 'error':
      logger.error(message, logData);
      break;
    case 'warn':
      logger.warn(message, logData);
      break;
    case 'info':
      logger.info(message, logData);
      break;
    default:
      logger.error(message, logData);
  }
}

/**
 * Log level determination based on severity (pure function)
 *
 * @param severity - Error severity
 * @returns Corresponding log level
 *
 * @internal
 */
function getLogLevel(severity: StructuredError['severity']): 'error' | 'warn' | 'info' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warn';
    case 'low':
    default:
      return 'info';
  }
}

/**
 * Creation of structured log entry (pure function)
 *
 * Converts StructuredError to structured log entry.
 *
 * @param structuredError - Structured error to convert
 * @returns Log entry data
 *
 * @internal
 */
function createLogEntry(structuredError: StructuredError): {
  /** Log message */
  message: string;
  /** Log data */
  data: unknown;
} {
  const logData = {
    event_name: `error.${structuredError.category}`,
    event_category: 'error_event' as const,
    error_category: structuredError.category,
    error_severity: structuredError.severity,
    error_retryable: structuredError.isRetryable,
    error_code: structuredError.errorCode,
    status_code: structuredError.statusCode,
    error_details: serializeError(structuredError.originalError),
    context: structuredError.context,
    timestamp: new Date().toISOString(),
  };

  const sanitized = sanitizeLogEntry(
    `${structuredError.category}: ${structuredError.message}`,
    logData
  );

  return {
    message: sanitized.message,
    data: sanitized.data,
  };
}

/**
 * Error handler for API Routes (pure function + controlled side effects)
 *
 * @param config - Error handler configuration
 * @param error - Error to process
 * @param context - Error context information
 * @returns API error response
 *
 * @public
 */
export function handleApiError(
  config: ErrorHandlerConfig,
  error: Error | unknown,
  context: ErrorContext = {}
): Response {
  const structuredError = handleError(config, error, context);

  return new Response(
    JSON.stringify({
      error: true,
      message: structuredError.userMessage,
      code: structuredError.errorCode,
      requestId: context.requestId,
    }),
    {
      status: structuredError.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * React Components用エラーハンドラー（純粋関数 + 制御された副作用）
 *
 * React ErrorBoundaryでの使用に特化したエラー処理。
 * ユーザー向けメッセージと再試行フラグを返す。
 *
 * @param config - エラーハンドラー設定
 * @param error - 処理対象のエラー
 * @param context - エラーコンテキスト情報
 * @returns コンポーネント向けエラー情報
 *
 * @public
 */
export function handleComponentError(
  config: ErrorHandlerConfig,
  error: Error | unknown,
  context: ErrorContext = {}
): {
  /** ユーザー向けエラーメッセージ */
  userMessage: string;
  /** 再試行推奨フラグ */
  shouldRetry: boolean;
  /** エラー識別ID */
  errorId: string;
} {
  const structuredError = handleError(config, error, context);

  return {
    userMessage: structuredError.userMessage || 'An error occurred',
    shouldRetry: structuredError.isRetryable,
    errorId: context.requestId || 'unknown',
  };
}

/**
 * Promise rejection用グローバルハンドラー（純粋関数 + 制御された副作用）
 *
 * @param config - エラーハンドラー設定
 * @param reason - 拒否理由
 * @param context - エラーコンテキスト情報
 *
 * @public
 */
export function handleUnhandledRejection(
  config: ErrorHandlerConfig,
  reason: unknown,
  context: ErrorContext = {}
): void {
  handleError(config, reason, {
    ...context,
    additionalData: {
      type: 'unhandled_rejection',
      ...(context.additionalData || {}),
    },
  });
}

/**
 * 未捕捉例外用グローバルハンドラー（純粋関数 + 制御された副作用）
 *
 * @param config - エラーハンドラー設定
 * @param error - 処理対象のエラー
 * @param context - エラーコンテキスト情報
 *
 * @public
 */
export function handleUncaughtException(
  config: ErrorHandlerConfig,
  error: Error,
  context: ErrorContext = {}
): void {
  handleError(config, error, {
    ...context,
    additionalData: {
      type: 'uncaught_exception',
      ...(context.additionalData || {}),
    },
  });
}

// ===================================================================
// デフォルトインスタンスとヘルパー関数（後方互換性）
// ===================================================================

/**
 * デフォルト エラーハンドラー設定
 *
 * アプリケーション全体で使用されるデフォルト設定。
 * 一度だけ作成され、以降は immutable として使用。
 *
 * @public
 */
export const defaultErrorHandlerConfig = createDefaultErrorHandlerConfig();

/**
 * 純粋関数ファクトリーパターンでデフォルトエラーハンドラー設定を作成
 * 循環インポートを避けるため遅延評価を実装
 */
function createDefaultErrorHandlerConfig(): () => ErrorHandlerConfig {
  let _config: ErrorHandlerConfig | null = null;

  return (): ErrorHandlerConfig => {
    if (!_config) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { serverLoggerWrapper } = require('./server') as typeof import('./server');
        _config = createErrorHandlerConfig(serverLoggerWrapper);
      } catch {
        // server モジュールが利用できない場合は client logger をフォールバックとして使用
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { clientLoggerWrapper } = require('./client') as typeof import('./client');
        _config = createErrorHandlerConfig(clientLoggerWrapper);
      }
    }
    return _config;
  };
}

/**
 * デフォルトエラーハンドラー（後方互換性）
 *
 * 既存コードとの互換性のためのオブジェクト型インターフェース。
 * 純粋関数を既存のメソッド呼び出しパターンでラップ。
 *
 * @public
 */
export const errorHandler = {
  handle: (error: Error | unknown, context?: ErrorContext) =>
    handleError(defaultErrorHandlerConfig(), error, context),

  handleApiError: (error: Error | unknown, context?: ErrorContext) =>
    handleApiError(defaultErrorHandlerConfig(), error, context),

  handleComponentError: (error: Error | unknown, context?: ErrorContext) =>
    handleComponentError(defaultErrorHandlerConfig(), error, context),

  handleUnhandledRejection: (reason: unknown, context?: ErrorContext) =>
    handleUnhandledRejection(defaultErrorHandlerConfig(), reason, context),

  handleUncaughtException: (error: Error, context?: ErrorContext) =>
    handleUncaughtException(defaultErrorHandlerConfig(), error, context),
};

/**
 * エラーハンドリング用ユーティリティ関数（純粋関数版に更新）
 *
 * @public
 */
export const errorHandlerUtils = {
  /**
   * Async関数のエラーキャッチ装飾（純粋関数版）
   */
  withErrorHandling: <T extends unknown[], R>(
    config: ErrorHandlerConfig,
    fn: (...args: T) => Promise<R>,
    context: ErrorContext = {}
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(config, error, context);
        throw error;
      }
    };
  },

  /**
   * Try-catch付きの安全な実行（純粋関数版）
   */
  safeExecute: async <T>(
    config: ErrorHandlerConfig,
    fn: () => Promise<T>,
    context: ErrorContext = {},
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      handleError(config, error, context);
      return fallback;
    }
  },

  /**
   * エラーバウンダリ用のReactコンポーネントヘルパー（純粋関数版）
   */
  createErrorBoundaryHandler: (config: ErrorHandlerConfig) => {
    return (error: Error, errorInfo: { componentStack: string }) => {
      handleError(config, error, {
        additionalData: {
          component_stack: errorInfo.componentStack,
          type: 'react_error_boundary',
        },
      });
    };
  },

  /**
   * Next.js API Routes用の統一エラーハンドラー（純粋関数版）
   */
  createApiHandler: (config: ErrorHandlerConfig) => {
    return (error: Error | unknown, context: Record<string, unknown> = {}) => {
      return handleApiError(config, error, {
        requestId: context.requestId as string,
        path: context.path as string,
        method: context.method as string,
        hashedIP: context.hashedIP as string,
        timestamp: (context.timestamp as string) || new Date().toISOString(),
      });
    };
  },
};

/**
 * 後方互換性用のデフォルトエクスポート
 *
 * 既存コードとの互換性のため errorHandler オブジェクトをデフォルトとしてエクスポート。
 * 新しいコードでは純粋関数形式の使用を推奨。
 *
 * @public
 */
export default errorHandler;
