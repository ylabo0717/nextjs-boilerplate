/**
 * 🚨 高リスク対応: Child Logger + AsyncLocalStorage完全実装
 * リクエストコンテキストの完全管理によるトレース追跡の向上
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { sanitizeLogEntry } from './sanitizer';
import { SEVERITY_NUMBERS } from './types';

import type { Logger, LoggerContext, LogArgument } from './types';

/**
 * Logger Context Manager
 *
 * AsyncLocalStorageを使用してリクエストスコープのコンテキストを管理。
 * 非同期処理でもコンテキスト情報を自動的に継承し、分散トレーシングと
 * 構造化ログを実現。
 *
 * Node.js 14.8.0以降のAsyncLocalStorage APIを活用したスレッドセーフな
 * コンテキスト管理を提供。
 *
 * @public
 */
export class LoggerContextManager {
  /**
   * AsyncLocalStorage インスタンス
   *
   * リクエストスコープでのコンテキスト保存領域。
   * 非同期操作間でのコンテキスト継承を自動化。
   *
   * @internal
   */
  private storage = new AsyncLocalStorage<LoggerContext>();

  /**
   * リクエストコンテキストでの実行
   *
   * 指定されたコンテキストで関数を実行。
   * 実行中のすべての同期・非同期処理でコンテキストが自動的に継承される。
   *
   * HTTPリクエスト処理のエントリーポイントで使用し、
   * 以降の処理でコンテキスト情報を自動追跡可能。
   *
   * @param context - 設定するコンテキスト情報
   * @param fn - コンテキスト内で実行する関数
   * @returns 関数の実行結果
   *
   * @public
   */
  runWithContext<T>(context: LoggerContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * 現在のコンテキストを取得
   *
   * AsyncLocalStorageから現在実行中のコンテキストを取得。
   * コンテキスト外での実行時はundefinedを返す。
   *
   * ミドルウェアや任意の処理でのコンテキスト情報アクセスに使用。
   *
   * @returns 現在のコンテキスト情報、またはundefined
   *
   * @public
   */
  getContext(): LoggerContext | undefined {
    return this.storage.getStore();
  }

  /**
   * コンテキストの部分的更新
   *
   * 既存のコンテキストとマージして新しいコンテキストを作成。
   * 元のコンテキストは変更せず、不変性を保持。
   *
   * リクエスト処理中の追加情報（ユーザーID、セッション情報等）の
   * 段階的追加に使用。
   *
   * @param updates - 更新するコンテキスト情報
   * @returns マージされた新しいコンテキスト、またはundefined
   *
   * @public
   */
  updateContext(updates: Partial<LoggerContext>): LoggerContext | undefined {
    const currentContext = this.getContext();
    if (!currentContext) {
      return undefined;
    }

    return { ...currentContext, ...updates };
  }

  /**
   * コンテキスト付きChild Loggerの生成
   *
   * 統一Loggerインターフェース対応の Child Logger 作成。
   * すべてのログ出力に自動的にコンテキスト情報を付与。
   *
   * ベースロガーのメソッドをラップし、コンテキスト情報と
   * セキュリティサニタイゼーションを自動適用。
   *
   * @param baseLogger - ベースとなるロガーインスタンス
   * @param _additionalContext - 追加のコンテキスト情報（将来拡張用）
   * @returns コンテキスト付きロガーインスタンス
   *
   * @public
   */
  createContextualLogger(
    baseLogger: Logger,
    _additionalContext: Partial<LoggerContext> = {}
  ): Logger {
    return {
      trace: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.trace.bind(baseLogger), 'trace', message, args);
      },
      debug: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.debug.bind(baseLogger), 'debug', message, args);
      },
      info: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.info.bind(baseLogger), 'info', message, args);
      },
      warn: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.warn.bind(baseLogger), 'warn', message, args);
      },
      error: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.error.bind(baseLogger), 'error', message, args);
      },
      fatal: (message: string, ...args: LogArgument[]) => {
        this.logWithContext(baseLogger.fatal.bind(baseLogger), 'fatal', message, args);
      },
      isLevelEnabled: (level) => baseLogger.isLevelEnabled(level),
    };
  }

  /**
   * コンテキスト情報をログエントリに自動付与
   *
   * ベースロガーのログ関数をラップし、現在のコンテキスト情報と
   * OpenTelemetry準拠のメタデータを自動付与。
   *
   * セキュリティサニタイゼーションを適用し、安全なログ出力を保証。
   *
   * @param logFunction - ベースロガーのログ関数
   * @param level - ログレベル
   * @param message - ログメッセージ
   * @param args - 追加のログ引数
   *
   * @internal
   */
  private logWithContext(
    logFunction: (message: string, ...args: LogArgument[]) => void,
    level: keyof typeof SEVERITY_NUMBERS,
    message: string,
    args: readonly LogArgument[]
  ): void {
    const currentContext = this.getContext();

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
   * ユーザーアクションログ用のヘルパー
   *
   * ユーザー操作の構造化ログ記録。
   * メトリクス収集、ユーザー行動分析、A/Bテスト分析に使用。
   *
   * 自動的に 'user_action' カテゴリとイベント名プレフィックスを付与。
   *
   * @param baseLogger - ベースロガーインスタンス
   * @param action - ユーザーアクション名
   * @param details - アクション固有の詳細情報
   *
   * @public
   */
  logUserAction(baseLogger: Logger, action: string, details: Record<string, unknown> = {}): void {
    const context = this.getContext();
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
   * システムイベントログ用のヘルパー
   *
   * アプリケーション内部イベントの構造化ログ記録。
   * システム監視、パフォーマンス分析、障害検知に使用。
   *
   * 自動的に 'system_event' カテゴリとイベント名プレフィックスを付与。
   *
   * @param baseLogger - ベースロガーインスタンス
   * @param event - システムイベント名
   * @param details - イベント固有の詳細情報
   *
   * @public
   */
  logSystemEvent(baseLogger: Logger, event: string, details: Record<string, unknown> = {}): void {
    const context = this.getContext();
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
   * セキュリティイベントログ用のヘルパー
   *
   * セキュリティ関連イベントの高優先度ログ記録。
   * 不正アクセス検知、認証失敗、権限違反などの記録に使用。
   *
   * 自動的に 'security_event' カテゴリ、'high' 重要度、error レベルで記録。
   * セキュリティ監視システムでの自動アラート対象。
   *
   * @param baseLogger - ベースロガーインスタンス
   * @param event - セキュリティイベント名
   * @param details - イベント固有の詳細情報
   *
   * @public
   */
  logSecurityEvent(baseLogger: Logger, event: string, details: Record<string, unknown> = {}): void {
    const context = this.getContext();
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
   * エラーイベントログ用のヘルパー
   *
   * アプリケーションエラーの構造化ログ記録。
   * ErrorオブジェクトまたはUnknown値のエラー情報を統一的に処理。
   *
   * エラー追跡、デバッグ、障害分析に使用。
   * 自動的に 'error_event' カテゴリとerrorレベルで記録。
   *
   * @param baseLogger - ベースロガーインスタンス
   * @param error - エラーオブジェクトまたは値
   * @param context_info - エラー発生時のコンテキスト情報
   *
   * @public
   */
  logErrorEvent(
    baseLogger: Logger,
    error: Error | unknown,
    context_info: Record<string, unknown> = {}
  ): void {
    const context = this.getContext();
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
   * パフォーマンス測定用のヘルパー
   *
   * アプリケーションパフォーマンスメトリクスの構造化ログ記録。
   * 実行時間、処理速度、リソース使用量などの測定値を記録。
   *
   * パフォーマンス監視、ボトルネック分析、最適化効果測定に使用。
   *
   * @param baseLogger - ベースロガーインスタンス
   * @param metric - メトリクス名
   * @param value - 測定値
   * @param unit - 測定単位（デフォルト: 'ms'）
   *
   * @public
   */
  logPerformanceMetric(
    baseLogger: Logger,
    metric: string,
    value: number,
    unit: string = 'ms'
  ): void {
    const context = this.getContext();
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
   * トレースIDとスパンIDの設定ヘルパー
   *
   * OpenTelemetryとの統合用のトレース情報設定。
   * 分散トレーシングでのリクエスト追跡に使用。
   *
   * 現在のコンテキストに分散トレース識別子を追加し、
   * マイクロサービス間でのリクエスト追跡を可能にする。
   *
   * @param traceId - 分散トレース識別子
   * @param spanId - スパン識別子（オプション）
   *
   * @public
   */
  setTraceContext(traceId: string, spanId?: string): void {
    const currentContext = this.getContext();
    if (currentContext) {
      currentContext.traceId = traceId;
      if (spanId) {
        currentContext.spanId = spanId;
      }
    }
  }

  /**
   * デバッグ用: 現在のコンテキスト情報の表示
   *
   * 開発・デバッグ時のコンテキスト状態確認用。
   * コンテキスト情報の設定と継承が正しく動作しているかの検証に使用。
   *
   * 本番環境では使用を避け、開発・ステージング環境でのみ実行推奨。
   *
   * @param baseLogger - ベースロガーインスタンス
   *
   * @public
   */
  debugContext(baseLogger: Logger): void {
    const context = this.getContext();
    if (context) {
      baseLogger.debug('Current logger context', context as LogArgument);
    } else {
      baseLogger.debug('No logger context found');
    }
  }
}

// シングルトンインスタンス
/**
 * グローバルロガーコンテキストマネージャー
 *
 * アプリケーション全体で共有されるシングルトンインスタンス。
 * すべてのコンテキスト管理操作でこのインスタンスを使用。
 *
 * @public
 */
export const loggerContextManager = new LoggerContextManager();

// ユーティリティ関数のエクスポート

/**
 * コンテキスト付き関数実行
 *
 * 指定されたコンテキストで関数を実行するユーティリティ関数。
 * ロガーコンテキストマネージャーのrunWithContextメソッドへの
 * 便利なエイリアス。
 *
 * @param context - 設定するコンテキスト情報
 * @param fn - コンテキスト内で実行する関数
 * @returns 関数の実行結果
 *
 * @public
 */
export const runWithLoggerContext = <T>(context: LoggerContext, fn: () => T) =>
  loggerContextManager.runWithContext(context, fn);

/**
 * 現在のコンテキスト取得
 *
 * 現在実行中のコンテキスト情報を取得するユーティリティ関数。
 * ロガーコンテキストマネージャーのgetContextメソッドへの
 * 便利なエイリアス。
 *
 * @returns 現在のコンテキスト情報、またはundefined
 *
 * @public
 */
export const getLoggerContext = () => loggerContextManager.getContext();

/**
 * コンテキスト付きロガー作成
 *
 * コンテキスト情報を自動付与するロガーを作成するユーティリティ関数。
 * ロガーコンテキストマネージャーのcreateContextualLoggerメソッドへの
 * 便利なエイリアス。
 *
 * @param baseLogger - ベースとなるロガーインスタンス
 * @param context - 追加のコンテキスト情報（オプション）
 * @returns コンテキスト付きロガーインスタンス
 *
 * @public
 */
export const createContextualLogger = (baseLogger: Logger, context?: Partial<LoggerContext>) =>
  loggerContextManager.createContextualLogger(baseLogger, context);
