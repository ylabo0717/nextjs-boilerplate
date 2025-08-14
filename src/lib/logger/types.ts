/**
 * 構造化ログシステム型定義
 * Next.js 15 + Pino ベースの高性能ログシステム
 */

/**
 * ログレベル定義配列
 *
 * OpenTelemetry仕様に準拠したログレベル定義。
 * traceが最も詳細で、fatalが最も重要なレベル。
 *
 * @public
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

/**
 * ログレベル型定義
 *
 * LOG_LEVELS配列から派生した型安全なログレベル。
 * パフォーマンスと安全性を両立する型定義。
 *
 * @public
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * ログ引数型定義
 *
 * ログメソッドで受け入れ可能な引数の型。
 * JSON.stringifyで安全にシリアライズ可能な値のみ許可。
 *
 * - string: 文字列メッセージやID
 * - number: 数値データや統計情報
 * - boolean: フラグや状態値
 * - Record\<string, unknown\>: 構造化データ
 * - Error: エラーオブジェクト（自動的にシリアライズ）
 * - null/undefined: 存在しない値の表現
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
 * 統一Loggerインターフェース
 *
 * サーバー（Pino）とクライアント（Console）の両環境で
 * 統一されたロガーAPIを提供。構造化ログとパフォーマンス
 * 最適化を実現。
 *
 * すべてのログメソッドは非同期でスレッドセーフ。
 * 本番環境では自動的にログレベルフィルタリングを実行。
 *
 * @public
 */
export interface Logger {
  /**
   * トレースレベルログ出力
   *
   * 最も詳細なデバッグ情報。開発環境でのみ推奨。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  trace(message: string, ...args: LogArgument[]): void;

  /**
   * デバッグレベルログ出力
   *
   * 開発・ステージング環境での詳細情報。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  debug(message: string, ...args: LogArgument[]): void;

  /**
   * 情報レベルログ出力
   *
   * 一般的な情報ログ。本番環境でも安全。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  info(message: string, ...args: LogArgument[]): void;

  /**
   * 警告レベルログ出力
   *
   * 潜在的な問題やパフォーマンス警告。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  warn(message: string, ...args: LogArgument[]): void;

  /**
   * エラーレベルログ出力
   *
   * 処理継続可能なエラー情報。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  error(message: string, ...args: LogArgument[]): void;

  /**
   * 致命的レベルログ出力
   *
   * アプリケーション停止を要する重大エラー。
   *
   * @param message - ログメッセージ
   * @param args - 追加のログデータ
   *
   * @public
   */
  fatal(message: string, ...args: LogArgument[]): void;

  /**
   * ログレベル有効性チェック
   *
   * 指定されたログレベルが現在の設定で出力されるか確認。
   * パフォーマンス最適化に使用。
   *
   * @param level - チェックするログレベル
   * @returns ログレベルが有効な場合true
   *
   * @public
   */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * ロガーコンテキスト定義
 *
 * 🚨 高リスク対応: Child Logger Context定義
 *
 * 分散トレーシングとコンテキスト追跡のための
 * 構造化データ。OpenTelemetry準拠のトレース情報と
 * アプリケーション固有のコンテキストを統合。
 *
 * GDPR準拠のため、個人識別情報（PII）は事前にハッシュ化
 * または仮名化して格納する必要がある。
 *
 * @public
 */
export interface LoggerContext extends Record<string, unknown> {
  /**
   * リクエスト固有ID
   *
   * 単一HTTPリクエストまたはタスクを追跡するための一意識別子。
   * UUID v4形式を推奨。
   *
   * @public
   */
  requestId: string;

  /**
   * 分散トレースID
   *
   * OpenTelemetry準拠のトレース識別子。
   * マイクロサービス間のリクエスト追跡に使用。
   *
   * @public
   */
  traceId?: string;

  /**
   * スパンID
   *
   * トレース内の特定操作を示すスパン識別子。
   * パフォーマンス分析とボトルネック特定に使用。
   *
   * @public
   */
  spanId?: string;

  /**
   * ユーザーID
   *
   * 認証済みユーザーの識別子。GDPR準拠のため
   * ハッシュ化または仮名化された値を使用。
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
