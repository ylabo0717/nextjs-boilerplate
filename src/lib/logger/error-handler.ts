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
 *
 * エラー発生時の詳細なコンテキスト情報を保持。
 * デバッグ、分析、監視に必要な関連データを構造化。
 *
 * GDPR準拠のため、個人識別情報は事前にハッシュ化または
 * 仮名化して格納する必要がある。
 *
 * @public
 */
export interface ErrorContext {
  /**
   * リクエスト固有ID
   *
   * エラーが発生したHTTPリクエストの一意識別子。
   * 分散トレーシングでのエラー追跡に使用。
   *
   * @public
   */
  requestId?: string;

  /**
   * ユーザーID
   *
   * エラーが発生したユーザーの識別子。
   * GDPR準拠のためハッシュ化または仮名化済み値を使用。
   *
   * @public
   */
  userId?: string;

  /**
   * セッションID
   *
   * エラーが発生したセッションの識別子。
   * セッション固有のエラーパターン分析に使用。
   *
   * @public
   */
  sessionId?: string;

  /**
   * リクエストパス
   *
   * エラーが発生したURLパス。
   * エンドポイント別エラー率分析に使用。
   *
   * @public
   */
  path?: string;

  /**
   * HTTPメソッド
   *
   * エラーが発生したHTTPメソッド（GET/POST等）。
   * メソッド別エラー分析に使用。
   *
   * @public
   */
  method?: string;

  /**
   * ユーザーエージェント
   *
   * エラーが発生したクライアントのUser-Agent文字列。
   * ブラウザ固有エラーの分析に使用。
   *
   * @public
   */
  userAgent?: string;

  /**
   * ハッシュ化IPアドレス
   *
   * GDPR準拠でハッシュ化されたクライアントIPアドレス。
   * 地理的エラーパターンの分析に使用。
   *
   * @public
   */
  hashedIP?: string;

  /**
   * エラー発生タイムスタンプ
   *
   * ISO 8601形式のUTC時刻文字列。
   * 時系列エラー分析に使用。
   *
   * @public
   */
  timestamp?: string;

  /**
   * 追加データ
   *
   * エラー固有の詳細情報やカスタムコンテキスト。
   * 柔軟なエラー情報拡張に使用。
   *
   * @public
   */
  additionalData?: Record<string, unknown>;
}

/**
 * 構造化エラー情報
 *
 * エラーの分類、重要度、回復可能性などの詳細情報を統一的に管理。
 * 監視システム、アラート、ユーザー通知の自動化に使用。
 *
 * @public
 */
export interface StructuredError {
  /**
   * エラーカテゴリ
   *
   * エラーの種類を示す事前定義カテゴリ。
   * 監視ダッシュボードでの自動グループ化に使用。
   *
   * @public
   */
  category: ErrorCategory;

  /**
   * エラーメッセージ
   *
   * 人間が読める形式のエラー説明。
   * ログとデバッグの主要フィールド。
   *
   * @public
   */
  message: string;

  /**
   * 元のエラーオブジェクト
   *
   * エラー発生元のErrorインスタンスまたは値。
   * 詳細なスタックトレース分析に使用。
   *
   * @public
   */
  originalError: Error | unknown;

  /**
   * エラーコンテキスト
   *
   * エラー発生時の詳細なコンテキスト情報。
   * デバッグと分析に必要な関連データ。
   *
   * @public
   */
  context: ErrorContext;

  /**
   * エラー重要度
   *
   * エラーの深刻度レベル。
   * アラート優先度とエスカレーション自動化に使用。
   *
   * @public
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * 再試行可能フラグ
   *
   * エラーが一時的で再試行可能かを示す。
   * 自動復旧とクライアントリトライロジックに使用。
   *
   * @public
   */
  isRetryable: boolean;

  /**
   * ユーザー向けメッセージ
   *
   * エンドユーザーに表示可能な分かりやすいメッセージ。
   * UI通知とエラーページ表示に使用。
   *
   * @public
   */
  userMessage?: string;

  /**
   * エラーコード
   *
   * アプリケーション固有のエラー識別子。
   * サポート対応と自動分類に使用。
   *
   * @public
   */
  errorCode?: string;

  /**
   * HTTPステータスコード
   *
   * HTTPレスポンス用のステータスコード。
   * API応答の自動生成に使用。
   *
   * @public
   */
  statusCode?: number;
}

/**
 * エラー分類器
 *
 * エラーオブジェクトの自動分類とカテゴリ判定を提供。
 * エラーメッセージ、プロパティ、型情報を解析して
 * 適切なエラーカテゴリを自動判定。
 *
 * 統一的なエラー処理とアラート自動化に使用。
 *
 * @public
 */
export class ErrorClassifier {
  /**
   * エラーの自動分類
   *
   * エラーオブジェクトまたは値を解析して適切なカテゴリを判定。
   * エラーメッセージ、型、プロパティを総合的に評価。
   *
   * @param error - 分類対象のエラーオブジェクトまたは値
   * @returns 判定されたエラーカテゴリ
   *
   * @public
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

  /**
   * バリデーションエラー判定
   *
   * エラーがユーザー入力の検証失敗によるものかを判定。
   * フォーム入力、APIパラメーター検証エラーなどが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns バリデーションエラーの場合true
   *
   * @public
   */
  private static isValidationError(error: Error, message: string): boolean {
    return (
      error.name === 'ValidationError' ||
      error.name === 'ZodError' ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    );
  }

  /**
   * 認証エラー判定
   *
   * エラーがユーザー認証の失敗によるものかを判定。
   * ログイン失敗、トークン無効、認証情報不足などが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns 認証エラーの場合true
   *
   * @public
   */
  private static isAuthenticationError(error: Error, message: string): boolean {
    return (
      error.name === 'AuthenticationError' ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('invalid credentials')
    );
  }

  /**
   * 認可エラー判定
   *
   * エラーがアクセス権限不足によるものかを判定。
   * リソースアクセス拒否、権限不足などが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns 認可エラーの場合true
   *
   * @public
   */
  private static isAuthorizationError(error: Error, message: string): boolean {
    return (
      error.name === 'AuthorizationError' ||
      message.includes('forbidden') ||
      message.includes('access denied') ||
      message.includes('permission')
    );
  }

  /**
   * 未発見エラー判定
   *
   * エラーがリソース不存在によるものかを判定。
   * ページ、ファイル、データの存在しないアクセスが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns 未発見エラーの場合true
   *
   * @public
   */
  private static isNotFoundError(error: Error, message: string): boolean {
    return (
      error.name === 'NotFoundError' ||
      message.includes('not found') ||
      message.includes('does not exist')
    );
  }

  /**
   * ネットワークエラー判定
   *
   * エラーがネットワーク接続問題によるものかを判定。
   * タイムアウト、接続失敗、ネットワーク障害などが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns ネットワークエラーの場合true
   *
   * @public
   */
  private static isNetworkError(error: Error, message: string): boolean {
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection')
    );
  }

  /**
   * データベースエラー判定
   *
   * エラーがデータベース操作失敗によるものかを判定。
   * 接続エラー、クエリエラー、制約違反などが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns データベースエラーの場合true
   *
   * @public
   */
  private static isDatabaseError(error: Error, message: string): boolean {
    return (
      error.name === 'DatabaseError' ||
      error.name === 'QueryError' ||
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('query failed')
    );
  }

  /**
   * レート制限エラー判定
   *
   * エラーがAPI使用制限超過によるものかを判定。
   * リクエスト頻度制限、使用量制限超過などが対象。
   *
   * @param error - 判定対象のエラーオブジェクト
   * @param message - エラーメッセージ（小文字）
   * @returns レート制限エラーの場合true
   *
   * @public
   */
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
 *
 * エラーの分類、ログ記録、ユーザー通知を統合的に処理。
 * Next.js App Router、API Routes、Middleware での
 * 統一的なエラー処理を提供。
 *
 * 主要機能:
 * - エラーの自動分類と構造化
 * - セキュリティサニタイゼーション
 * - 重要度別ログ記録
 * - ユーザー向けメッセージ生成
 * - コンテキスト情報の自動収集
 *
 * @public
 */
export class ErrorHandler {
  /**
   * ロガーインスタンス
   *
   * エラーログ記録に使用するロガー。
   * 統一Loggerインターフェース準拠。
   *
   * @internal
   */
  private logger: Logger;

  /**
   * ErrorHandlerコンストラクタ
   *
   * ロガーインスタンスを設定してエラーハンドラーを初期化。
   *
   * @param logger - エラーログ記録に使用するロガー
   *
   * @public
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

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
   *
   * StructuredErrorを構造化ログエントリに変換。
   *
   * @param structuredError - 変換対象の構造化エラー
   * @returns ログエントリデータ
   *
   * @internal
   */
  private createLogEntry(structuredError: StructuredError): {
    /** ログメッセージ */
    message: string;
    /** ログデータ */
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
   *
   * React ErrorBoundaryでの使用に特化したエラー処理。
   * ユーザー向けメッセージと再試行フラグを返す。
   *
   * @param error - 処理対象のエラー
   * @param context - エラーコンテキスト情報
   * @returns コンポーネント向けエラー情報
   *
   * @public
   */
  handleComponentError(
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
