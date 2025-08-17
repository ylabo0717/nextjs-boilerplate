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
/**
 * エラー分類設定型
 *
 * エラー分類に使用される設定オブジェクト。
 * 純粋関数の引数として使用される不変設定。
 *
 * @public
 */
export type ErrorClassifierConfig = Record<string, never>;

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
/**
 * エラーハンドラー設定型
 *
 * エラー処理に使用される設定オブジェクト。
 * 純粋関数の引数として使用される不変設定。
 *
 * @public
 */
export type ErrorHandlerConfig = {
  /** エラーログの記録に使用するロガーインスタンス */
  readonly logger: Logger;
};

/**
 * エラーハンドラー設定を作成（純粋関数）
 *
 * Logger インスタンスを含む不変設定オブジェクトを生成。
 * アプリケーション起動時に一度だけ実行される純粋関数。
 *
 * @param logger - エラーログ記録に使用するロガー
 * @returns 不変なエラーハンドラー設定オブジェクト
 *
 * @public
 */
export function createErrorHandlerConfig(logger: Logger): ErrorHandlerConfig {
  return {
    logger,
  } as const;
}

/**
 * エラーの自動分類（純粋関数）
 *
 * エラーオブジェクトまたは値を解析して適切なカテゴリを判定。
 * エラーメッセージ、型、プロパティを総合的に評価。
 *
 * @param _config - エラー分類設定（現在未使用、将来拡張用）
 * @param error - 分類対象のエラーオブジェクトまたは値
 * @param context - エラーコンテキスト情報
 * @returns 判定された構造化エラー
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
 * 既知のエラータイプの分類（純粋関数）
 *
 * Error インスタンスを詳細に分析してカテゴリを判定。
 *
 * @param error - 分類対象のError インスタンス
 * @param context - エラーコンテキスト情報
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
 * 未知のエラータイプの分類（純粋関数）
 *
 * Error以外の値を構造化エラーに変換。
 *
 * @param error - 分類対象の値
 * @param context - エラーコンテキスト情報
 * @returns 判定された構造化エラー
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

// エラー判定ヘルパー関数群（純粋関数）

/**
 * バリデーションエラー判定（純粋関数）
 *
 * エラーがユーザー入力の検証失敗によるものかを判定。
 * フォーム入力、APIパラメーター検証エラーなどが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns バリデーションエラーの場合true
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
 * 認証エラー判定（純粋関数）
 *
 * エラーがユーザー認証の失敗によるものかを判定。
 * ログイン失敗、トークン無効、認証情報不足などが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns 認証エラーの場合true
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
 * 認可エラー判定（純粋関数）
 *
 * エラーがアクセス権限不足によるものかを判定。
 * リソースアクセス拒否、権限不足などが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns 認可エラーの場合true
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
 * 未発見エラー判定（純粋関数）
 *
 * エラーがリソース不存在によるものかを判定。
 * ページ、ファイル、データの存在しないアクセスが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns 未発見エラーの場合true
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
 * ネットワークエラー判定（純粋関数）
 *
 * エラーがネットワーク接続問題によるものかを判定。
 * タイムアウト、接続失敗、ネットワーク障害などが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns ネットワークエラーの場合true
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
 * データベースエラー判定（純粋関数）
 *
 * エラーがデータベース操作失敗によるものかを判定。
 * 接続エラー、クエリエラー、制約違反などが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns データベースエラーの場合true
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
 * レート制限エラー判定（純粋関数）
 *
 * エラーがAPI使用制限超過によるものかを判定。
 * リクエスト頻度制限、使用量制限超過などが対象。
 *
 * @param error - 判定対象のエラーオブジェクト
 * @param message - エラーメッセージ（小文字）
 * @returns レート制限エラーの場合true
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
 * エラーの処理とログ記録（純粋関数 + 制御された副作用）
 *
 * エラーを分類し、適切なログレベルで記録する。
 * 構造化されたエラー情報を返す。
 *
 * @param config - エラーハンドラー設定
 * @param error - 処理対象のエラー
 * @param context - エラーコンテキスト情報
 * @returns 構造化されたエラー情報
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

  // ログレベルの決定
  const logLevel = getLogLevel(structuredError.severity);

  // ログエントリの作成
  const logEntry = createLogEntry(structuredError);

  // ログ出力（型安全な方法でメソッド呼び出し）
  logWithLevel(config.logger, logLevel, logEntry.message, logEntry.data);

  return structuredError;
}

/**
 * 型安全なログレベル呼び出し（純粋関数 + 制御された副作用）
 *
 * @param logger - ロガーインスタンス
 * @param level - ログレベル
 * @param message - ログメッセージ
 * @param data - ログデータ
 *
 * @internal
 */
function logWithLevel(
  logger: Logger,
  level: 'error' | 'warn' | 'info',
  message: string,
  data?: unknown
): void {
  // unknownをLogArgumentに適合する形に変換
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
 * 重要度に基づくログレベルの決定（純粋関数）
 *
 * @param severity - エラーの重要度
 * @returns 対応するログレベル
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
 * 構造化ログエントリの作成（純粋関数）
 *
 * StructuredErrorを構造化ログエントリに変換。
 *
 * @param structuredError - 変換対象の構造化エラー
 * @returns ログエントリデータ
 *
 * @internal
 */
function createLogEntry(structuredError: StructuredError): {
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
 * API Routes用エラーハンドラー（純粋関数 + 制御された副作用）
 *
 * @param config - エラーハンドラー設定
 * @param error - 処理対象のエラー
 * @param context - エラーコンテキスト情報
 * @returns API エラーレスポンス
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
