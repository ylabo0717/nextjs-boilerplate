/**
 * 🚨 高リスク対応: Child Logger + AsyncLocalStorage完全実装
 * リクエストコンテキストの完全管理によるトレース追跡の向上
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { sanitizeLogEntry } from './sanitizer';
import { SEVERITY_NUMBERS } from './types';

import type { Logger, LoggerContext, LogArgument } from './types';

/**
 * Logger コンテキスト管理設定型
 *
 * AsyncLocalStorage を使用したコンテキスト管理用の設定オブジェクト。
 * 純粋関数の引数として使用される不変設定。
 *
 * @public
 */
export type LoggerContextConfig = {
  /** AsyncLocalStorageを使ったコンテキスト保存領域 */
  readonly storage: AsyncLocalStorage<LoggerContext>;
};

/**
 * Logger コンテキスト設定を作成（純粋関数）
 *
 * AsyncLocalStorage インスタンスを含む不変設定オブジェクトを生成。
 * アプリケーション起動時に一度だけ実行される純粋関数。
 *
 * @returns 不変なコンテキスト設定オブジェクト
 *
 * @public
 */
export function createLoggerContextConfig(): LoggerContextConfig {
  return {
    storage: new AsyncLocalStorage<LoggerContext>(),
  } as const;
}

/**
 * リクエストコンテキストでの実行（純粋関数 + 制御された副作用）
 *
 * 指定されたコンテキストで関数を実行。
 * 実行中のすべての同期・非同期処理でコンテキストが自動的に継承される。
 *
 * HTTP リクエスト処理のエントリーポイントで使用し、
 * 以降の処理でコンテキスト情報を自動追跡可能。
 *
 * @param config - コンテキスト設定
 * @param context - 設定するコンテキスト情報
 * @param fn - コンテキスト内で実行する関数
 * @returns 関数の実行結果
 *
 * @public
 */
export function runWithLoggerContext<T>(
  config: LoggerContextConfig,
  context: LoggerContext,
  fn: () => T
): T {
  return config.storage.run(context, fn);
}

/**
 * 現在のコンテキストを取得（純粋関数）
 *
 * AsyncLocalStorage から現在実行中のコンテキストを取得。
 * コンテキスト外での実行時は undefined を返す。
 *
 * ミドルウェアや任意の処理でのコンテキスト情報アクセスに使用。
 *
 * @param config - コンテキスト設定
 * @returns 現在のコンテキスト情報、または undefined
 *
 * @public
 */
export function getLoggerContext(config: LoggerContextConfig): LoggerContext | undefined {
  return config.storage.getStore();
}

/**
 * コンテキストの部分的更新（純粋関数）
 *
 * 既存のコンテキストとマージして新しいコンテキストを作成。
 * 元のコンテキストは変更せず、不変性を保持。
 *
 * リクエスト処理中の追加情報（ユーザー ID、セッション情報等）の
 * 段階的追加に使用。
 *
 * @param config - コンテキスト設定
 * @param updates - 更新するコンテキスト情報
 * @returns マージされた新しいコンテキスト、または undefined
 *
 * @public
 */
export function updateLoggerContext(
  config: LoggerContextConfig,
  updates: Partial<LoggerContext>
): LoggerContext | undefined {
  const currentContext = getLoggerContext(config);
  if (!currentContext) {
    return undefined;
  }

  return { ...currentContext, ...updates };
}

/**
 * コンテキスト付き Child Logger の生成（純粋関数）
 *
 * 統一 Logger インターフェース対応の Child Logger 作成。
 * すべてのログ出力に自動的にコンテキスト情報を付与。
 *
 * ベースロガーのメソッドをラップし、コンテキスト情報と
 * セキュリティサニタイゼーションを自動適用。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースとなるロガーインスタンス
 * @param _additionalContext - 追加のコンテキスト情報（将来拡張用）
 * @returns コンテキスト付きロガーインスタンス
 *
 * @public
 */
export function createContextualLogger(
  config: LoggerContextConfig,
  baseLogger: Logger,
  _additionalContext: Partial<LoggerContext> = {}
): Logger {
  return {
    trace: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.trace.bind(baseLogger), 'trace', message, args);
    },
    debug: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.debug.bind(baseLogger), 'debug', message, args);
    },
    info: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.info.bind(baseLogger), 'info', message, args);
    },
    warn: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.warn.bind(baseLogger), 'warn', message, args);
    },
    error: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.error.bind(baseLogger), 'error', message, args);
    },
    fatal: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.fatal.bind(baseLogger), 'fatal', message, args);
    },
    isLevelEnabled: (level) => baseLogger.isLevelEnabled(level),
  };
}

/**
 * コンテキスト情報をログエントリに自動付与（純粋関数 + 制御された副作用）
 *
 * ベースロガーのログ関数をラップし、現在のコンテキスト情報と
 * OpenTelemetry 準拠のメタデータを自動付与。
 *
 * セキュリティサニタイゼーションを適用し、安全なログ出力を保証。
 *
 * @param config - コンテキスト設定
 * @param logFunction - ベースロガーのログ関数
 * @param level - ログレベル
 * @param message - ログメッセージ
 * @param args - 追加のログ引数
 *
 * @internal
 */
function logWithContext(
  config: LoggerContextConfig,
  logFunction: (message: string, ...args: LogArgument[]) => void,
  level: keyof typeof SEVERITY_NUMBERS,
  message: string,
  args: readonly LogArgument[]
): void {
  const currentContext = getLoggerContext(config);

  // コンテキスト情報を含むログエントリを作成
  const severityNumber = SEVERITY_NUMBERS[level as keyof typeof SEVERITY_NUMBERS];
  const contextData = {
    ...currentContext,
    severity_number: severityNumber,
    timestamp: new Date().toISOString(),
  };

  // サニタイズ処理
  const sanitized = sanitizeLogEntry(message, contextData);

  // 元の引数と組み合わせて実行
  logFunction(sanitized.message, sanitized.data as LogArgument, ...args);
}

/**
 * ユーザーアクションログ用のヘルパー（純粋関数 + 制御された副作用）
 *
 * ユーザー操作の構造化ログ記録。
 * メトリクス収集、ユーザー行動分析、A/B テスト分析に使用。
 *
 * 自動的に 'user_action' カテゴリとイベント名プレフィックスを付与。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 * @param action - ユーザーアクション名
 * @param details - アクション固有の詳細情報
 *
 * @public
 */
export function logUserAction(
  config: LoggerContextConfig,
  baseLogger: Logger,
  action: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
  const userActionData = {
    event_name: `user.${action}`,
    event_category: 'user_action' as const,
    event_attributes: details,
    ...context,
  };

  const sanitized = sanitizeLogEntry(`User action: ${action}`, userActionData);
  baseLogger.info(sanitized.message, sanitized.data as LogArgument);
}

/**
 * システムイベントログ用のヘルパー（純粋関数 + 制御された副作用）
 *
 * アプリケーション内部イベントの構造化ログ記録。
 * システム監視、パフォーマンス分析、障害検知に使用。
 *
 * 自動的に 'system_event' カテゴリとイベント名プレフィックスを付与。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 * @param event - システムイベント名
 * @param details - イベント固有の詳細情報
 *
 * @public
 */
export function logSystemEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
  const systemEventData = {
    event_name: `system.${event}`,
    event_category: 'system_event' as const,
    event_attributes: details,
    ...context,
  };

  const sanitized = sanitizeLogEntry(`System event: ${event}`, systemEventData);
  baseLogger.info(sanitized.message, sanitized.data as LogArgument);
}

/**
 * セキュリティイベントログ用のヘルパー（純粋関数 + 制御された副作用）
 *
 * セキュリティ関連イベントの高優先度ログ記録。
 * 不正アクセス検知、認証失敗、権限違反などの記録に使用。
 *
 * 自動的に 'security_event' カテゴリ、'high' 重要度、error レベルで記録。
 * セキュリティ監視システムでの自動アラート対象。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 * @param event - セキュリティイベント名
 * @param details - イベント固有の詳細情報
 *
 * @public
 */
export function logSecurityEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
  const securityEventData = {
    event_name: `security.${event}`,
    event_category: 'security_event' as const,
    event_attributes: details,
    severity: 'high',
    ...context,
  };

  const sanitized = sanitizeLogEntry(`Security event: ${event}`, securityEventData);
  baseLogger.error(sanitized.message, sanitized.data as LogArgument);
}

/**
 * エラーイベントログ用のヘルパー（純粋関数 + 制御された副作用）
 *
 * アプリケーションエラーの構造化ログ記録。
 * Error オブジェクトまたは Unknown 値のエラー情報を統一的に処理。
 *
 * エラー追跡、デバッグ、障害分析に使用。
 * 自動的に 'error_event' カテゴリと error レベルで記録。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 * @param error - エラーオブジェクトまたは値
 * @param context_info - エラー発生時のコンテキスト情報
 *
 * @public
 */
export function logErrorEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  error: Error | unknown,
  context_info: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
  const errorEventData = {
    event_name: 'error.application',
    event_category: 'error_event' as const,
    event_attributes: context_info,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { value: String(error) },
    ...context,
  };

  const sanitized = sanitizeLogEntry('Application error occurred', errorEventData);
  baseLogger.error(sanitized.message, sanitized.data as LogArgument);
}

/**
 * パフォーマンス測定用のヘルパー（純粋関数 + 制御された副作用）
 *
 * アプリケーションパフォーマンスメトリクスの構造化ログ記録。
 * 実行時間、処理速度、リソース使用量などの測定値を記録。
 *
 * パフォーマンス監視、ボトルネック分析、最適化効果測定に使用。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 * @param metric - メトリクス名
 * @param value - 測定値
 * @param unit - 測定単位（デフォルト: 'ms'）
 *
 * @public
 */
export function logPerformanceMetric(
  config: LoggerContextConfig,
  baseLogger: Logger,
  metric: string,
  value: number,
  unit: string = 'ms'
): void {
  const context = getLoggerContext(config);
  const performanceData = {
    event_name: `performance.${metric}`,
    event_category: 'system_event' as const,
    event_attributes: {
      metric_name: metric,
      metric_value: value,
      metric_unit: unit,
    },
    ...context,
  };

  const sanitized = sanitizeLogEntry(`Performance metric: ${metric}`, performanceData);
  baseLogger.info(sanitized.message, sanitized.data as LogArgument);
}

/**
 * トレース ID とスパン ID の設定ヘルパー（副作用関数）
 *
 * OpenTelemetry との統合用のトレース情報設定。
 * 分散トレーシングでのリクエスト追跡に使用。
 *
 * 現在のコンテキストに分散トレース識別子を追加し、
 * マイクロサービス間でのリクエスト追跡を可能にする。
 *
 * @param config - コンテキスト設定
 * @param traceId - 分散トレース識別子
 * @param spanId - スパン識別子（オプション）
 *
 * @public
 */
export function setTraceContext(
  config: LoggerContextConfig,
  traceId: string,
  spanId?: string
): void {
  const currentContext = getLoggerContext(config);
  if (currentContext) {
    currentContext.traceId = traceId;
    if (spanId) {
      currentContext.spanId = spanId;
    }
  }
}

/**
 * デバッグ用: 現在のコンテキスト情報の表示（純粋関数 + 制御された副作用）
 *
 * 開発・デバッグ時のコンテキスト状態確認用。
 * コンテキスト情報の設定と継承が正しく動作しているかの検証に使用。
 *
 * 本番環境では使用を避け、開発・ステージング環境でのみ実行推奨。
 *
 * @param config - コンテキスト設定
 * @param baseLogger - ベースロガーインスタンス
 *
 * @public
 */
export function debugLoggerContext(config: LoggerContextConfig, baseLogger: Logger): void {
  const context = getLoggerContext(config);
  if (context) {
    baseLogger.debug('Current logger context', context as LogArgument);
  } else {
    baseLogger.debug('No logger context found');
  }
}

// ===================================================================
// デフォルトインスタンスとヘルパー関数（後方互換性）
// ===================================================================

/**
 * デフォルト Logger コンテキスト設定
 *
 * アプリケーション全体で使用されるデフォルト設定。
 * 一度だけ作成され、以降は immutable として使用。
 *
 * @public
 */
export const defaultLoggerContextConfig = createLoggerContextConfig();

/**
 * デフォルトコンテキストマネージャー（後方互換性）
 *
 * 既存コードとの互換性のためのオブジェクト型インターフェース。
 * 純粋関数を既存のメソッド呼び出しパターンでラップ。
 *
 * @public
 */
export const loggerContextManager = {
  runWithContext: <T>(context: LoggerContext, fn: () => T) =>
    runWithLoggerContext(defaultLoggerContextConfig, context, fn),
  getContext: () => getLoggerContext(defaultLoggerContextConfig),
  updateContext: (updates: Partial<LoggerContext>) =>
    updateLoggerContext(defaultLoggerContextConfig, updates),
  createContextualLogger: (baseLogger: Logger, additionalContext?: Partial<LoggerContext>) =>
    createContextualLogger(defaultLoggerContextConfig, baseLogger, additionalContext),
  logUserAction: (baseLogger: Logger, action: string, details?: Record<string, unknown>) =>
    logUserAction(defaultLoggerContextConfig, baseLogger, action, details),
  logSystemEvent: (baseLogger: Logger, event: string, details?: Record<string, unknown>) =>
    logSystemEvent(defaultLoggerContextConfig, baseLogger, event, details),
  logSecurityEvent: (baseLogger: Logger, event: string, details?: Record<string, unknown>) =>
    logSecurityEvent(defaultLoggerContextConfig, baseLogger, event, details),
  logErrorEvent: (
    baseLogger: Logger,
    error: Error | unknown,
    context_info?: Record<string, unknown>
  ) => logErrorEvent(defaultLoggerContextConfig, baseLogger, error, context_info),
  logPerformanceMetric: (baseLogger: Logger, metric: string, value: number, unit?: string) =>
    logPerformanceMetric(defaultLoggerContextConfig, baseLogger, metric, value, unit),
  setTraceContext: (traceId: string, spanId?: string) =>
    setTraceContext(defaultLoggerContextConfig, traceId, spanId),
  debugContext: (baseLogger: Logger) => debugLoggerContext(defaultLoggerContextConfig, baseLogger),
};

// ユーティリティ関数のエクスポート（後方互換性）

/**
 * コンテキスト付き関数実行（後方互換性）
 *
 * デフォルト設定を使用した便利なエイリアス。
 *
 * @param context - 設定するコンテキスト情報
 * @param fn - コンテキスト内で実行する関数
 * @returns 関数の実行結果
 *
 * @public
 */
export const runWithLoggerContextCompat = <T>(context: LoggerContext, fn: () => T) =>
  loggerContextManager.runWithContext(context, fn);

/**
 * 現在のコンテキスト取得（後方互換性）
 *
 * デフォルト設定を使用した便利なエイリアス。
 *
 * @returns 現在のコンテキスト情報、またはundefined
 *
 * @public
 */
export const getLoggerContextCompat = () => loggerContextManager.getContext();

/**
 * コンテキスト付きロガー作成（後方互換性）
 *
 * デフォルト設定を使用した便利なエイリアス。
 *
 * @param baseLogger - ベースとなるロガーインスタンス
 * @param context - 追加のコンテキスト情報（オプション）
 * @returns コンテキスト付きロガーインスタンス
 *
 * @public
 */
export const createContextualLoggerCompat = (
  baseLogger: Logger,
  context?: Partial<LoggerContext>
) => loggerContextManager.createContextualLogger(baseLogger, context);
