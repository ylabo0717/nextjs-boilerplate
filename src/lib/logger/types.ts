/**
 * 構造化ログシステム型定義
 * Next.js 15 + Pino ベースの高性能ログシステム
 */

/**
 * ログレベル定義
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * ログ引数の型定義
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
 */
export interface Logger {
  trace(message: string, ...args: LogArgument[]): void;
  debug(message: string, ...args: LogArgument[]): void;
  info(message: string, ...args: LogArgument[]): void;
  warn(message: string, ...args: LogArgument[]): void;
  error(message: string, ...args: LogArgument[]): void;
  fatal(message: string, ...args: LogArgument[]): void;
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * 🚨 高リスク対応: Child Logger Context定義
 */
export interface LoggerContext extends Record<string, unknown> {
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  event_name?: string;
  event_category?: 'user_action' | 'system_event' | 'error_event' | 'security_event';
}

/**
 * ログミドルウェア設定
 */
export interface LoggingMiddlewareOptions {
  logHeaders?: boolean;
  logBody?: boolean;
  labels?: {
    start?: string;
    success?: string;
    error?: string;
  };
}

/**
 * ベースプロパティ設定
 */
export interface BaseProperties {
  app: string;
  env: string;
  pid: number;
  version?: string;
  log_schema_version: string;
}

/**
 * ⚠️ 中リスク対応: OpenTelemetry Logs準拠のseverity_number
 */
export const SEVERITY_NUMBERS = {
  trace: 1,
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
  fatal: 21,
} as const;

/**
 * 構造化イベント定義
 */
export interface StructuredEvent {
  event_name: string;
  event_category: 'user_action' | 'system_event' | 'error_event' | 'security_event';
  event_attributes: Record<string, unknown>;
}

/**
 * ログエントリ基本構造
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  severity_number: number;
  message: string;
  log_schema_version: string;
  [key: string]: unknown;
}

/**
 * サニタイズ済みログエントリ
 */
export interface SanitizedLogEntry {
  message: string;
  data?: unknown;
}
