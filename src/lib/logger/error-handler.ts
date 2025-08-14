/**
 * 統合エラーハンドリングとログ機能
 * Next.js App Router、API Routes、Middleware対応
 */

import { sanitizeLogEntry } from './sanitizer';
import { serializeError } from './utils';

import type { Logger, LogArgument } from './types';

/**
 * エラー分類定義
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
 * エラーコンテキスト情報
 */
export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  hashedIP?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * 構造化エラー情報
 */
export interface StructuredError {
  category: ErrorCategory;
  message: string;
  originalError: Error | unknown;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  userMessage?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * エラー分類器
 */
export class ErrorClassifier {
  /**
   * エラーの自動分類
   */
  static classify(error: Error | unknown, context: ErrorContext = {}): StructuredError {
    if (error instanceof Error) {
      return this.classifyKnownError(error, context);
    }

    return this.classifyUnknownError(error, context);
  }

  /**
   * 既知のエラータイプの分類
   */
  private static classifyKnownError(error: Error, context: ErrorContext): StructuredError {
    const message = error.message.toLowerCase();

    // Validation errors
    if (this.isValidationError(error, message)) {
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
    if (this.isAuthenticationError(error, message)) {
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
    if (this.isAuthorizationError(error, message)) {
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
    if (this.isNotFoundError(error, message)) {
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
    if (this.isNetworkError(error, message)) {
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
    if (this.isDatabaseError(error, message)) {
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
    if (this.isRateLimitError(error, message)) {
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
   * 未知のエラータイプの分類
   */
  private static classifyUnknownError(error: unknown, context: ErrorContext): StructuredError {
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

  // エラー判定ヘルパーメソッド群
  private static isValidationError(error: Error, message: string): boolean {
    return (
      error.name === 'ValidationError' ||
      error.name === 'ZodError' ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    );
  }

  private static isAuthenticationError(error: Error, message: string): boolean {
    return (
      error.name === 'AuthenticationError' ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('invalid credentials')
    );
  }

  private static isAuthorizationError(error: Error, message: string): boolean {
    return (
      error.name === 'AuthorizationError' ||
      message.includes('forbidden') ||
      message.includes('access denied') ||
      message.includes('permission')
    );
  }

  private static isNotFoundError(error: Error, message: string): boolean {
    return (
      error.name === 'NotFoundError' ||
      message.includes('not found') ||
      message.includes('does not exist')
    );
  }

  private static isNetworkError(error: Error, message: string): boolean {
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection')
    );
  }

  private static isDatabaseError(error: Error, message: string): boolean {
    return (
      error.name === 'DatabaseError' ||
      error.name === 'QueryError' ||
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('query failed')
    );
  }

  private static isRateLimitError(error: Error, message: string): boolean {
    return (
      error.name === 'RateLimitError' ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }
}

/**
 * 統合エラーハンドラー
 */
export class ErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * エラーの処理とログ記録
   */
  handle(error: Error | unknown, context: ErrorContext = {}): StructuredError {
    const structuredError = ErrorClassifier.classify(error, context);

    // ログレベルの決定
    const logLevel = this.getLogLevel(structuredError.severity);

    // ログエントリの作成
    const logEntry = this.createLogEntry(structuredError);

    // ログ出力（型安全な方法でメソッド呼び出し）
    this.logWithLevel(logLevel, logEntry.message, logEntry.data);

    return structuredError;
  }

  /**
   * 型安全なログレベル呼び出し
   */
  private logWithLevel(level: 'error' | 'warn' | 'info', message: string, data?: unknown): void {
    // unknownをLogArgumentに適合する形に変換
    const logData = data as LogArgument;

    switch (level) {
      case 'error':
        this.logger.error(message, logData);
        break;
      case 'warn':
        this.logger.warn(message, logData);
        break;
      case 'info':
        this.logger.info(message, logData);
        break;
      default:
        this.logger.error(message, logData);
    }
  }

  /**
   * 重要度に基づくログレベルの決定
   */
  private getLogLevel(severity: StructuredError['severity']): 'error' | 'warn' | 'info' {
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
   * 構造化ログエントリの作成
   */
  private createLogEntry(structuredError: StructuredError) {
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
   * API Routes用エラーハンドラー
   */
  handleApiError(error: Error | unknown, context: ErrorContext = {}): Response {
    const structuredError = this.handle(error, context);

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
   * React Components用エラーハンドラー
   */
  handleComponentError(
    error: Error | unknown,
    context: ErrorContext = {}
  ): {
    userMessage: string;
    shouldRetry: boolean;
    errorId: string;
  } {
    const structuredError = this.handle(error, context);

    return {
      userMessage: structuredError.userMessage || 'An error occurred',
      shouldRetry: structuredError.isRetryable,
      errorId: context.requestId || 'unknown',
    };
  }

  /**
   * Promise rejection用グローバルハンドラー
   */
  handleUnhandledRejection(reason: unknown, context: ErrorContext = {}): void {
    this.handle(reason, {
      ...context,
      additionalData: {
        type: 'unhandled_rejection',
        ...(context.additionalData || {}),
      },
    });
  }

  /**
   * 未捕捉例外用グローバルハンドラー
   */
  handleUncaughtException(error: Error, context: ErrorContext = {}): void {
    this.handle(error, {
      ...context,
      additionalData: {
        type: 'uncaught_exception',
        ...(context.additionalData || {}),
      },
    });
  }
}

/**
 * エラーハンドリング用ユーティリティ関数
 */
export const errorHandlerUtils = {
  /**
   * Async関数のエラーキャッチ装飾
   */
  withErrorHandling: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    handler: ErrorHandler,
    context: ErrorContext = {}
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        handler.handle(error, context);
        throw error;
      }
    };
  },

  /**
   * Try-catch付きの安全な実行
   */
  safeExecute: async <T>(
    fn: () => Promise<T>,
    handler: ErrorHandler,
    context: ErrorContext = {},
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      handler.handle(error, context);
      return fallback;
    }
  },

  /**
   * エラーバウンダリ用のReactコンポーネントヘルパー
   */
  createErrorBoundaryHandler: (handler: ErrorHandler) => {
    return (error: Error, errorInfo: { componentStack: string }) => {
      handler.handle(error, {
        additionalData: {
          component_stack: errorInfo.componentStack,
          type: 'react_error_boundary',
        },
      });
    };
  },

  /**
   * Next.js API Routes用の統一エラーハンドラー
   */
  createApiHandler: (handler: ErrorHandler) => {
    return (error: Error | unknown, context: Record<string, unknown> = {}) => {
      return handler.handleApiError(error, {
        requestId: context.requestId as string,
        path: context.path as string,
        method: context.method as string,
        hashedIP: context.hashedIP as string,
        timestamp: (context.timestamp as string) || new Date().toISOString(),
      });
    };
  },
};

export default ErrorHandler;
