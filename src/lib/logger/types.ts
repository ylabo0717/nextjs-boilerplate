/**
 * Structured logging system type definitions
 *
 * High-performance logging system based on Next.js 15 + Pino.
 * Provides type-safe interfaces for structured logging with
 * OpenTelemetry compliance and performance optimization.
 */

/**
 * Log level definition array
 *
 * OpenTelemetry-compliant log level definitions.
 * 'trace' is the most detailed level, 'fatal' is the most critical.
 * These levels follow industry standards for consistent log filtering
 * and monitoring integration.
 *
 * @public
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

/**
 * Log level type definition
 *
 * Type-safe log level derived from LOG_LEVELS array.
 * This ensures compile-time validation of log levels while
 * maintaining runtime performance. Provides both safety
 * and optimal performance characteristics.
 *
 * @public
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Log argument type definition
 *
 * Defines acceptable argument types for log methods.
 * Only values that can be safely serialized by JSON.stringify are allowed.
 * This constraint ensures reliable log transmission and storage.
 *
 * - string: Text messages and identifiers
 * - number: Numeric data and statistics
 * - boolean: Flags and state values
 * - `Record<string, unknown>`: Structured data objects
 * - Error: Error objects (automatically serialized)
 * - null/undefined: Representation of absent values
 *
 * @public
 */
export type LogArgument =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | Error
  | null
  | undefined;

/**
 * Unified Logger interface
 *
 * Provides consistent logger API for both server (Pino) and client (Console)
 * environments. Enables structured logging and performance optimization
 * across different runtime contexts.
 *
 * All log methods are asynchronous and thread-safe by design.
 * Production environments automatically apply log level filtering
 * for optimal performance and security.
 *
 * @public
 */
export interface Logger {
  /**
   * Trace level log output
   *
   * Most detailed debugging information. Recommended for development
   * environments only due to potential performance impact and verbosity.
   * Use for fine-grained execution flow tracking.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  trace(message: string, ...args: LogArgument[]): void;

  /**
   * Debug level log output
   *
   * Detailed information for development and staging environments.
   * Includes variable states, function parameters, and intermediate
   * processing results for troubleshooting.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  debug(message: string, ...args: LogArgument[]): void;

  /**
   * Info level log output
   *
   * General informational logs safe for production environments.
   * Used for application flow milestones, configuration changes,
   * and important business events.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  info(message: string, ...args: LogArgument[]): void;

  /**
   * Warning level log output
   *
   * Potential issues and performance warnings that don't prevent
   * normal operation but may indicate problems requiring attention.
   * Used for deprecated features, suboptimal performance, etc.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  warn(message: string, ...args: LogArgument[]): void;

  /**
   * Error level log output
   *
   * Recoverable error information that allows continued processing.
   * Used for handled exceptions, validation failures, and other
   * errors that don't crash the application.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  error(message: string, ...args: LogArgument[]): void;

  /**
   * Fatal level log output
   *
   * Critical errors requiring application termination.
   * Used for unrecoverable system failures, security breaches,
   * or corruption that prevents safe operation.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  fatal(message: string, ...args: LogArgument[]): void;

  /**
   * Log level enabled check
   *
   * Verifies whether the specified log level would be output
   * with current configuration. This enables performance optimization
   * by avoiding expensive log preparation for disabled levels.
   *
   * @param level - Log level to check
   * @returns true if log level is enabled
   *
   * @public
   */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * Logger context definition
 *
 * 🚨 High-Risk Response: Child Logger Context Definition
 *
 * Structured data for distributed tracing and context tracking.
 * Integrates OpenTelemetry-compliant trace information with
 * application-specific context for comprehensive observability.
 *
 * For GDPR compliance, Personally Identifiable Information (PII)
 * must be hashed or pseudonymized before storage. This design
 * supports privacy-by-design logging architectures.
 *
 * @public
 */
export interface LoggerContext extends Record<string, unknown> {
  /**
   * Request-specific identifier
   *
   * Unique identifier for tracking a single HTTP request or task.
   * UUID v4 format is recommended for uniqueness and collision
   * resistance in distributed systems.
   *
   * @public
   */
  requestId: string;

  /**
   * Distributed trace identifier
   *
   * OpenTelemetry-compliant trace identifier for tracking
   * requests across microservice boundaries. Essential for
   * distributed system observability and debugging.
   *
   * @public
   */
  traceId?: string;

  /**
   * Span identifier
   *
   * Identifies specific operations within a trace.
   * Critical for performance analysis and bottleneck
   * identification in distributed request flows.
   *
   * @public
   */
  spanId?: string;

  /**
   * User identifier
   *
   * Authenticated user identifier. For GDPR compliance,
   * use hashed or pseudonymized values rather than raw
   * personal identifiers.
   *
   * @public
   */
  userId?: string;

  /**
   * セッションID
   *
   * ユーザーセッションの追跡用ID。
   * セキュリティ分析とユーザー行動分析に使用。
   *
   * @public
   */
  sessionId?: string;

  /**
   * イベント名
   *
   * 構造化ログ用のイベント識別子。
   * メトリクス集計とアラート設定に使用。
   *
   * @public
   */
  event_name?: string;

  /**
   * イベントカテゴリ
   *
   * ログイベントの分類。監視とアラートの
   * 自動化に使用される事前定義カテゴリ。
   *
   * @public
   */
  event_category?: 'user_action' | 'system_event' | 'error_event' | 'security_event';
}

/**
 * ログミドルウェア設定
 *
 * HTTPリクエスト/レスポンスのログ記録動作を制御。
 * セキュリティとパフォーマンスのバランスを考慮した
 * 細かな設定が可能。
 *
 * @public
 */
export interface LoggingMiddlewareOptions {
  /**
   * HTTPヘッダーログ記録フラグ
   *
   * trueの場合、リクエスト・レスポンスヘッダーを記録。
   * 機密情報が含まれる可能性があるため注意が必要。
   *
   * @defaultValue false
   * @public
   */
  logHeaders?: boolean;

  /**
   * HTTPボディログ記録フラグ
   *
   * trueの場合、リクエスト・レスポンスボディを記録。
   * 大量データや機密情報の記録に注意。
   *
   * @defaultValue false
   * @public
   */
  logBody?: boolean;

  /**
   * ログメッセージラベル設定
   *
   * 各フェーズで使用するログメッセージをカスタマイズ。
   * 国際化や詳細レベル調整に使用。
   *
   * @public
   */
  labels?: {
    /**
     * リクエスト開始時のラベル
     * @defaultValue "Request started"
     * @public
     */
    start?: string;

    /**
     * リクエスト成功時のラベル
     * @defaultValue "Request completed"
     * @public
     */
    success?: string;

    /**
     * リクエストエラー時のラベル
     * @defaultValue "Request failed"
     * @public
     */
    error?: string;
  };
}

/**
 * ベースプロパティ設定
 *
 * すべてのログエントリに自動付与される基本情報。
 * アプリケーションの識別と環境管理に使用。
 *
 * @public
 */
export interface BaseProperties {
  /**
   * アプリケーション名
   *
   * ログを生成したアプリケーションの識別子。
   * マイクロサービス環境でのログ分離に使用。
   *
   * @public
   */
  app: string;

  /**
   * 実行環境
   *
   * development/staging/productionなどの環境識別子。
   * 環境別ログフィルタリングに使用。
   *
   * @public
   */
  env: string;

  /**
   * プロセスID
   *
   * Node.jsプロセスの一意識別子。
   * デバッグとパフォーマンス分析に使用。
   *
   * @public
   */
  pid: number;

  /**
   * アプリケーションバージョン
   *
   * デプロイ済みアプリケーションのバージョン情報。
   * リリース追跡と障害分析に使用。
   *
   * @public
   */
  version?: string;

  /**
   * ログスキーマバージョン
   *
   * 構造化ログフォーマットのバージョン。
   * ログパーサーとの互換性保証に使用。
   *
   * @public
   */
  log_schema_version: string;
}

/**
 * OpenTelemetry準拠重要度数値
 *
 * ⚠️ 中リスク対応: OpenTelemetry Logs準拠のseverity_number
 *
 * RFC 5424 Syslogプロトコルに基づく数値重要度。
 * ログ集約システムでの自動分類と監視アラートに使用。
 *
 * 数値が大きいほど重要度が高く、21（fatal）が最高レベル。
 * 外部ログシステムとの互換性を保証。
 *
 * @public
 */
export const SEVERITY_NUMBERS = {
  /** トレースレベル：詳細デバッグ情報（重要度: 1） */
  trace: 1,
  /** デバッグレベル：開発時情報（重要度: 5） */
  debug: 5,
  /** 情報レベル：一般情報（重要度: 9） */
  info: 9,
  /** 警告レベル：注意が必要（重要度: 13） */
  warn: 13,
  /** エラーレベル：処理可能エラー（重要度: 17） */
  error: 17,
  /** 致命的レベル：システム停止エラー（重要度: 21） */
  fatal: 21,
} as const;

/**
 * 構造化イベント定義
 *
 * ビジネスロジックやユーザー操作の構造化された記録。
 * メトリクス収集、ユーザー行動分析、セキュリティ監視に使用。
 *
 * OpenTelemetry Eventsモデルに準拠した設計。
 *
 * @public
 */
export interface StructuredEvent {
  /**
   * イベント名
   *
   * 発生したイベントの一意識別子。
   * メトリクス集計のキーとして使用。
   *
   * @example "user_login", "payment_completed", "api_error"
   * @public
   */
  event_name: string;

  /**
   * イベントカテゴリ
   *
   * イベントの分類カテゴリ。監視アラートと
   * ダッシュボードでの自動グループ化に使用。
   *
   * @public
   */
  event_category: 'user_action' | 'system_event' | 'error_event' | 'security_event';

  /**
   * イベント属性
   *
   * イベント固有の詳細データ。
   * 分析とデバッグのための構造化情報。
   *
   * @public
   */
  event_attributes: Record<string, unknown>;
}

/**
 * ログエントリ基本構造
 *
 * 構造化ログシステムで生成される標準ログエントリ。
 * OpenTelemetry Logs Data Modelに準拠した設計。
 *
 * すべてのログエントリに共通して含まれる必須フィールドと
 * 拡張可能な動的プロパティを定義。
 *
 * @public
 */
export interface LogEntry {
  /**
   * ログ生成タイムスタンプ
   *
   * ISO 8601形式のUTC時刻文字列。
   * 時系列分析と相関分析に使用。
   *
   * @example "2024-01-15T10:30:45.123Z"
   * @public
   */
  timestamp: string;

  /**
   * ログレベル
   *
   * trace/debug/info/warn/error/fatalのいずれか。
   * ログフィルタリングと重要度判定に使用。
   *
   * @public
   */
  level: LogLevel;

  /**
   * OpenTelemetry重要度数値
   *
   * RFC 5424準拠の数値重要度。
   * 外部システムとの互換性確保に使用。
   *
   * @public
   */
  severity_number: number;

  /**
   * ログメッセージ
   *
   * 人間が読める形式のメッセージ文字列。
   * 検索とアラート設定の主要フィールド。
   *
   * @public
   */
  message: string;

  /**
   * ログスキーマバージョン
   *
   * 構造化ログフォーマットのバージョン。
   * パーサー互換性の保証に使用。
   *
   * @public
   */
  log_schema_version: string;

  /**
   * 動的プロパティ
   *
   * ログエントリ固有の追加情報。
   * コンテキストデータや詳細分析データを格納。
   *
   * @public
   */
  [key: string]: unknown;
}

/**
 * サニタイズ済みログエントリ
 *
 * セキュリティサニタイゼーション処理後のログデータ。
 * ログインジェクション攻撃を防止し、安全な出力を保証。
 *
 * XSS、SQLインジェクション、制御文字攻撃から保護された
 * クリーンなログデータを表現。
 *
 * @public
 */
export interface SanitizedLogEntry {
  /**
   * サニタイズ済みメッセージ
   *
   * 危険な制御文字、特殊文字が除去されたメッセージ。
   * コンソール出力とファイル出力で安全に使用可能。
   *
   * @public
   */
  message: string;

  /**
   * サニタイズ済み追加データ
   *
   * オプションの構造化データ。
   * 再帰的にサニタイズ処理が適用済み。
   *
   * @public
   */
  data?: unknown;
}
