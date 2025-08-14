/**
 * クライアントサイドLogger実装
 * ブラウザ環境での軽量ログ処理とコンソール統合
 */

import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getClientLogLevel, createBaseProperties, serializeError } from './utils';

import type { Logger, LogArgument, LogLevel } from './types';

/**
 * ブラウザコンソールスタイル定義
 */
const CONSOLE_STYLES = {
  trace: 'color: #6b7280; font-weight: normal;',
  debug: 'color: #3b82f6; font-weight: normal;',
  info: 'color: #10b981; font-weight: normal;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  fatal: 'color: #dc2626; font-weight: bold; background: #fef2f2;',
} as const;

/**
 * ログレベルの優先度マップ
 */
const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

/**
 * クライアントサイドLogger実装
 * Edge Runtime対応の軽量実装
 */
class ClientLogger {
  private level: LogLevel;
  private baseProperties: ReturnType<typeof createBaseProperties>;

  constructor() {
    this.level = getClientLogLevel();
    this.baseProperties = createBaseProperties();
  }

  /**
   * ログレベルのバリデーション
   */
  public isLevelEnabled(level: LogLevel): boolean {
    const targetLevel = this.getLevelValue(level);
    const currentLevel = this.getLevelValue(this.level);

    return targetLevel >= currentLevel;
  }

  /**
   * 型安全にログレベルの数値を取得
   */
  private getLevelValue(level: LogLevel): number {
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

    if (validLevels.includes(level)) {
      switch (level) {
        case 'trace':
          return LOG_LEVELS.trace;
        case 'debug':
          return LOG_LEVELS.debug;
        case 'info':
          return LOG_LEVELS.info;
        case 'warn':
          return LOG_LEVELS.warn;
        case 'error':
          return LOG_LEVELS.error;
        case 'fatal':
          return LOG_LEVELS.fatal;
        default:
          return LOG_LEVELS.info;
      }
    }

    return LOG_LEVELS.info; // フォールバック
  }

  /**
   * 型安全にコンソールスタイルを取得
   */
  private getConsoleStyle(level: LogLevel): string {
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

    if (validLevels.includes(level)) {
      // 事前定義された安全なキーのみアクセス
      switch (level) {
        case 'trace':
          return CONSOLE_STYLES.trace;
        case 'debug':
          return CONSOLE_STYLES.debug;
        case 'info':
          return CONSOLE_STYLES.info;
        case 'warn':
          return CONSOLE_STYLES.warn;
        case 'error':
          return CONSOLE_STYLES.error;
        case 'fatal':
          return CONSOLE_STYLES.fatal;
        default:
          return CONSOLE_STYLES.info;
      }
    }

    return CONSOLE_STYLES.info; // フォールバック
  } /**
   * 統合ログ出力メソッド
   */
  private log(level: LogLevel, message: string, ...args: LogArgument[]): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    // ログエントリの構築
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.baseProperties,
    };

    // 引数の処理とサニタイズ
    const processedArgs = this.processArguments(args);
    const sanitized = sanitizeLogEntry(message, {
      ...logEntry,
      ...processedArgs,
    });

    // ブラウザコンソールへの出力
    this.outputToConsole(level, sanitized.message, sanitized.data);

    // 開発環境では追加のデバッグ情報を出力
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed(`[Logger] ${level.toUpperCase()} - ${timestamp}`);
      console.log('Original message:', message);
      console.log('Processed data:', sanitized.data);
      console.log('Arguments:', processedArgs);
      console.groupEnd();
    }
  }

  /**
   * 引数の処理とマージ
   */
  private processArguments(args: LogArgument[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const arg of args) {
      if (arg === null || arg === undefined) {
        continue;
      }

      if (arg instanceof Error) {
        // Error オブジェクトの処理
        result.error = serializeError(arg);
      } else if (typeof arg === 'object' && !Array.isArray(arg)) {
        // オブジェクトのマージ（サイズ制限付き）
        const limited = limitObjectSize(arg, 8, 50);
        Object.assign(result, limited);
      } else {
        // その他の型は args 配列に格納
        if (!result.args) {
          result.args = [];
        }
        (result.args as unknown[]).push(arg);
      }
    }

    return result;
  }

  /**
   * ブラウザコンソールへの出力
   */
  private outputToConsole(level: LogLevel, message: string, data?: unknown): void {
    // 型安全な方法でスタイルを取得
    const style = this.getConsoleStyle(level);
    const prefix = `[${level.toUpperCase()}]`;

    // コンソールメソッドの選択
    const consoleMethod = this.getConsoleMethod(level);

    if (data && typeof data === 'object') {
      // データがある場合はグループ化して表示
      console.group(`%c${prefix} ${message}`, style);
      consoleMethod('Details:', data);
      console.groupEnd();
    } else {
      // シンプルなメッセージ出力
      consoleMethod(`%c${prefix} ${message}`, style, data || '');
    }
  }

  /**
   * レベル別コンソールメソッドの取得
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'trace':
        return console.trace.bind(console);
      case 'debug':
        return console.debug.bind(console);
      case 'info':
        return console.info.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'error':
      case 'fatal':
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Logger インターフェース実装
   */
  trace = (message: string, ...args: LogArgument[]) => this.log('trace', message, ...args);
  debug = (message: string, ...args: LogArgument[]) => this.log('debug', message, ...args);
  info = (message: string, ...args: LogArgument[]) => this.log('info', message, ...args);
  warn = (message: string, ...args: LogArgument[]) => this.log('warn', message, ...args);
  error = (message: string, ...args: LogArgument[]) => this.log('error', message, ...args);
  fatal = (message: string, ...args: LogArgument[]) => this.log('fatal', message, ...args);
}

// クライアントLoggerインスタンスの作成
export const clientLogger = new ClientLogger();

/**
 * Logger インターフェース準拠のラッパー
 */
export const clientLoggerWrapper: Logger = {
  trace: clientLogger.trace,
  debug: clientLogger.debug,
  info: clientLogger.info,
  warn: clientLogger.warn,
  error: clientLogger.error,
  fatal: clientLogger.fatal,
  isLevelEnabled: (level) => clientLogger.isLevelEnabled(level),
};

/**
 * クライアントサイド専用ヘルパー関数群
 */
export const clientLoggerHelpers = {
  /**
   * パフォーマンス測定（Web API使用）
   */
  measurePerformance: <T>(name: string, fn: () => T): T => {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      clientLogger.info(`Performance: ${name}`, {
        event_name: `performance.${name}`,
        event_category: 'system_event',
        duration_ms: duration,
        operation: name,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      clientLogger.error(`Performance error: ${name}`, {
        event_name: 'error.performance',
        event_category: 'error_event',
        duration_ms: duration,
        operation: name,
        error: serializeError(error),
      });
      throw error;
    }
  },

  /**
   * ユーザーアクションログ
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    clientLogger.info(`User action: ${action}`, {
      event_name: `user.${action}`,
      event_category: 'user_action',
      event_attributes: details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * ナビゲーションイベントログ
   */
  logNavigation: (from: string, to: string, method: string = 'unknown') => {
    clientLogger.info('Navigation event', {
      event_name: 'navigation.route_change',
      event_category: 'user_action',
      event_attributes: {
        from_path: from,
        to_path: to,
        method,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * エラーイベントログ
   */
  logError: (error: Error | unknown, context: Record<string, unknown> = {}) => {
    clientLogger.error('Client error occurred', {
      event_name: 'error.client',
      event_category: 'error_event',
      event_attributes: context,
      error: serializeError(error),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });
  },

  /**
   * API呼び出しログ
   */
  logApiCall: (url: string, method: string, status?: number, duration?: number) => {
    const level = status && status >= 400 ? 'error' : 'info';

    // eslint-disable-next-line security/detect-object-injection
    clientLogger[level](`API call: ${method} ${url}`, {
      event_name: 'api.request',
      event_category: 'system_event',
      event_attributes: {
        url,
        method,
        status,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
    });
  },
};

export default clientLoggerWrapper;
