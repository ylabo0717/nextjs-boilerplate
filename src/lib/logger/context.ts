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
 * AsyncLocalStorageを使用してリクエストスコープのコンテキストを管理
 */
class LoggerContextManager {
  private storage = new AsyncLocalStorage<LoggerContext>();

  /**
   * リクエストコンテキストでの実行
   * 全ての同期・非同期処理でコンテキストが自動的に継承される
   */
  runWithContext<T>(context: LoggerContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * 現在のコンテキストを取得
   */
  getContext(): LoggerContext | undefined {
    return this.storage.getStore();
  }

  /**
   * コンテキストの部分的更新
   * 既存のコンテキストとマージして新しいコンテキストを作成
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
   * 統一Loggerインターフェース対応
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
   * OpenTelemetryとの統合用
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
export const loggerContextManager = new LoggerContextManager();

// ユーティリティ関数のエクスポート
export const runWithLoggerContext = <T>(context: LoggerContext, fn: () => T) =>
  loggerContextManager.runWithContext(context, fn);

export const getLoggerContext = () => loggerContextManager.getContext();

export const createContextualLogger = (baseLogger: Logger, context?: Partial<LoggerContext>) =>
  loggerContextManager.createContextualLogger(baseLogger, context);
