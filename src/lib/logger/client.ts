/**
 * クライアントサイドLogger実装（純粋関数型）
 * ブラウザ環境での軽量ログ処理とコンソール統合
 *
 * アーキテクチャ原則に従った純粋関数ファーストの実装。
 * ステートレスで予測可能、テスタブルなログシステムを提供。
 */

import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getClientLogLevel, createBaseProperties, serializeError } from './utils';

import type { Logger, LogArgument, LogLevel } from './types';

/**
 * ブラウザコンソールスタイル定義
 *
 * 各ログレベルに対応するCSS設定。
 * ブラウザコンソールでの視覚的区別に使用。
 *
 * @internal
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
 *
 * 数値による優先度定義。高い値ほど重要度が高い。
 * ログレベルフィルタリングに使用。
 *
 * @internal
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
 * クライアントLogger設定型
 *
 * ログ動作を制御する不変設定オブジェクト。
 * 純粋関数の引数として使用。
 *
 * @public
 */
export type ClientLoggerConfig = {
  /** 現在のログレベル設定 */
  readonly level: LogLevel;
  /** すべてのログエントリに付与される基本プロパティ */
  readonly baseProperties: Readonly<Record<string, unknown>>;
};

/**
 * クライアントLogger設定を作成
 *
 * 環境変数とシステム情報から不変の設定オブジェクトを生成。
 * アプリケーション起動時に一度だけ実行される純粋関数。
 *
 * @returns 不変なLogger設定オブジェクト
 *
 * @public
 */
export function createClientLoggerConfig(): ClientLoggerConfig {
  return {
    level: getClientLogLevel(),
    baseProperties: Object.freeze(createBaseProperties()),
  } as const;
}

/**
 * ログレベルの数値を取得（純粋関数）
 *
 * ログレベル文字列を対応する数値に変換。
 * 型安全性を保ちながら数値比較を可能にする。
 *
 * @param level - 変換するログレベル
 * @returns ログレベルに対応する数値
 *
 * @internal
 */
function getLogLevelValue(level: LogLevel): number {
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
      return LOG_LEVELS.info; // フォールバック
  }
}

/**
 * ログレベルの有効性チェック（純粋関数）
 *
 * 指定されたログレベルが現在の設定で出力されるかを判定。
 * パフォーマンス最適化のためのプリチェックに使用。
 *
 * @param config - Logger設定
 * @param level - チェックするログレベル
 * @returns ログレベルが有効な場合true
 *
 * @public
 */
export function isLevelEnabled(config: ClientLoggerConfig, level: LogLevel): boolean {
  const targetLevel = getLogLevelValue(level);
  const currentLevel = getLogLevelValue(config.level);

  return targetLevel >= currentLevel;
}

/**
 * コンソールスタイルを取得（純粋関数）
 *
 * ログレベルに対応するCSS記述文字列を取得。
 * 型安全性を保ちながらスタイル適用。
 *
 * @param level - スタイルを取得するログレベル
 * @returns CSSスタイル文字列
 *
 * @internal
 */
function getConsoleStyle(level: LogLevel): string {
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
      return CONSOLE_STYLES.info; // フォールバック
  }
}

/**
 * コンソールメソッドを取得（純粋関数）
 *
 * ログレベルに最適なブラウザコンソールメソッドを選択。
 * エラーレベルはconsole.error、警告はconsole.warnを使用。
 *
 * @param level - ログレベル
 * @returns 対応するコンソールメソッド
 *
 * @internal
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
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
 * ログ引数を処理（純粋関数）
 *
 * ログメソッドに渡された複数引数を統一的な構造に変換。
 * 型に応じた適切な処理とサイズ制限を適用。
 *
 * @param args - ログメソッドの引数配列
 * @returns 統一された構造化データ
 *
 * @internal
 */
function processLogArguments(args: LogArgument[]): Record<string, unknown> {
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
 * ブラウザコンソールに出力（副作用関数）
 *
 * ログレベルに応じたスタイルとコンソールメソッドで出力。
 * 構造化データは折りたたみ可能なグループとして表示。
 *
 * @param level - ログレベル
 * @param message - 出力メッセージ
 * @param data - 追加の構造化データ
 *
 * @internal
 */
function outputToConsole(level: LogLevel, message: string, data?: unknown): void {
  const style = getConsoleStyle(level);
  const prefix = `[${level.toUpperCase()}]`;

  // コンソールメソッドの選択
  const consoleMethod = getConsoleMethod(level);

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
 * 開発環境用デバッグ情報出力（副作用関数）
 *
 * 開発環境でのみ詳細なデバッグ情報を表示。
 * ログ処理の内部状態と引数を可視化。
 *
 * @param level - ログレベル
 * @param originalMessage - 元のメッセージ
 * @param processedData - 処理済みデータ
 * @param processedArgs - 処理済み引数
 *
 * @internal
 */
function outputDevelopmentDebug(
  level: LogLevel,
  originalMessage: string,
  processedData: unknown,
  processedArgs: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.groupCollapsed(`[Logger] ${level.toUpperCase()} - ${timestamp}`);
    console.log('Original message:', originalMessage);
    console.log('Processed data:', processedData);
    console.log('Arguments:', processedArgs);
    console.groupEnd();
  }
}

/**
 * 統合ログ出力関数（純粋関数 + 制御された副作用）
 *
 * すべてのログレベルで使用される共通出力処理。
 * セキュリティサニタイゼーション、フォーマット、コンソール出力を統合。
 *
 * 設計原則:
 * - 設定とメッセージ処理は純粋関数
 * - コンソール出力のみ副作用として分離
 * - テスタビリティを最大化
 *
 * @param config - Logger設定（不変）
 * @param level - ログレベル
 * @param message - ログメッセージ
 * @param args - 追加のログデータ
 *
 * @public
 */
export function log(
  config: ClientLoggerConfig,
  level: LogLevel,
  message: string,
  ...args: LogArgument[]
): void {
  // レベルチェック（純粋関数）
  if (!isLevelEnabled(config, level)) {
    return;
  }

  // ログエントリの構築（純粋関数）
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...config.baseProperties,
  };

  // 引数の処理とサニタイズ（純粋関数）
  const processedArgs = processLogArguments(args);
  const sanitized = sanitizeLogEntry(message, {
    ...logEntry,
    ...processedArgs,
  });

  // 副作用: ブラウザコンソールへの出力
  outputToConsole(level, sanitized.message, sanitized.data);

  // 副作用: 開発環境デバッグ情報
  outputDevelopmentDebug(level, message, sanitized.data, processedArgs);
}

/**
 * Logger インターフェース準拠オブジェクトを作成
 *
 * 設定を部分適用した統一Loggerインターフェース。
 * サーバーサイドロガーとの互換性を保ちながら、
 * クライアント最適化されたログ処理を提供。
 *
 * @param config - Logger設定
 * @returns Logger インターフェース準拠オブジェクト
 *
 * @public
 */
export function createClientLogger(config: ClientLoggerConfig): Logger {
  return {
    trace: (message: string, ...args: LogArgument[]) => log(config, 'trace', message, ...args),
    debug: (message: string, ...args: LogArgument[]) => log(config, 'debug', message, ...args),
    info: (message: string, ...args: LogArgument[]) => log(config, 'info', message, ...args),
    warn: (message: string, ...args: LogArgument[]) => log(config, 'warn', message, ...args),
    error: (message: string, ...args: LogArgument[]) => log(config, 'error', message, ...args),
    fatal: (message: string, ...args: LogArgument[]) => log(config, 'fatal', message, ...args),
    isLevelEnabled: (level: LogLevel) => isLevelEnabled(config, level),
  };
}

// ===================================================================
// デフォルトインスタンスとヘルパー関数（後方互換性）
// ===================================================================

/**
 * デフォルトクライアントLogger設定
 *
 * アプリケーション全体で使用されるデフォルト設定。
 * 一度だけ作成され、以降はimmutableとして使用。
 *
 * @public
 */
export const defaultClientLoggerConfig = createClientLoggerConfig();

/**
 * デフォルトクライアントLoggerインスタンス
 *
 * 最も一般的な用途での推奨ロガー。
 * デフォルト設定を使用した即座に利用可能なインスタンス。
 *
 * @public
 */
export const clientLogger = createClientLogger(defaultClientLoggerConfig);

/**
 * Logger インターフェース準拠のラッパー（後方互換性）
 *
 * 既存コードとの互換性のためのエイリアス。
 * clientLoggerと同じインスタンスを指す。
 *
 * @public
 */
export const clientLoggerWrapper: Logger = clientLogger;

/**
 * クライアントサイド専用ヘルパー関数群
 *
 * ブラウザ環境での一般的なログパターンの便利関数集。
 * Web API統合、ユーザー操作追跡、ナビゲーション記録等の
 * クライアント固有のログ機能を提供。
 *
 * @public
 */
export const clientLoggerHelpers = {
  /**
   * パフォーマンス測定（Web API使用）
   *
   * Web API のperformance.now()を使用した高精度測定。
   * ブラウザ環境での関数実行時間を自動記録。
   *
   * @param name - 測定操作名
   * @param fn - 測定対象の関数
   * @returns 関数の実行結果
   *
   * @public
   */
  measurePerformance: <T>(name: string, fn: () => T): T => {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      log(defaultClientLoggerConfig, 'info', `Performance: ${name}`, {
        event_name: `performance.${name}`,
        event_category: 'system_event',
        duration_ms: duration,
        operation: name,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log(defaultClientLoggerConfig, 'error', `Performance error: ${name}`, {
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
   *
   * ユーザー操作の構造化ログ記録。
   * クリック、フォーム送信、ページ遷移等の記録に使用。
   *
   * @param action - ユーザーアクション名
   * @param details - アクション詳細情報
   *
   * @public
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    log(defaultClientLoggerConfig, 'info', `User action: ${action}`, {
      event_name: `user.${action}`,
      event_category: 'user_action',
      event_attributes: details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * ナビゲーションイベントログ
   *
   * ページ遷移とルーティングイベントの記録。
   * SPAでのユーザーナビゲーション追跡に使用。
   *
   * @param from - 遷移元パス
   * @param to - 遷移先パス
   * @param method - 遷移方法（デフォルト: 'unknown'）
   *
   * @public
   */
  logNavigation: (from: string, to: string, method: string = 'unknown') => {
    log(defaultClientLoggerConfig, 'info', 'Navigation event', {
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
   *
   * クライアントサイドエラーの構造化ログ記録。
   * ブラウザ情報、URL、コンテキストを自動収集。
   *
   * @param error - エラーオブジェクトまたは値
   * @param context - エラー発生時のコンテキスト情報
   *
   * @public
   */
  logError: (error: Error | unknown, context: Record<string, unknown> = {}) => {
    log(defaultClientLoggerConfig, 'error', 'Client error occurred', {
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
   *
   * HTTPリクエストの構造化ログ記録。
   * ステータスコードに応じたログレベル自動選択。
   *
   * @param url - リクエストURL
   * @param method - HTTPメソッド
   * @param status - HTTPステータスコード（オプション）
   * @param duration - 処理時間（ms）（オプション）
   *
   * @public
   */
  logApiCall: (url: string, method: string, status?: number, duration?: number) => {
    const level: LogLevel = status && status >= 400 ? 'error' : 'info';

    log(defaultClientLoggerConfig, level, `API call: ${method} ${url}`, {
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

/**
 * デフォルトクライアントロガーエクスポート
 *
 * 統一Loggerインターフェース準拠のクライアントサイドロガー。
 * 最も一般的な用途での推奨エクスポート。
 *
 * @public
 */
export default clientLoggerWrapper;
