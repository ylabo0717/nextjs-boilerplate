/**
 * Pinoベースサーバーサイドロガー実装
 *
 * 高性能・構造化ログと統合セキュリティ機能を提供するサーバーサイドロガー。
 * Next.js 15 + Pino v9 による最適化されたログシステム。
 *
 * 主要機能:
 * - 高性能な構造化ログ出力
 * - 自動セキュリティサニタイゼーション
 * - 機密情報の自動Redaction
 * - AsyncLocalStorage連携コンテキスト管理
 * - OpenTelemetry準拠のメタデータ
 * - 環境別Transport最適化
 */ import pino from 'pino';

import { loggerContextManager } from './context';
import { incrementLogCounter, incrementErrorCounter } from './metrics';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getLogLevelFromEnv, createBaseProperties, REDACT_PATHS, serializeError } from './utils';

import type { Logger, LogArgument } from './types';

/**
 * Pinoベースサーバーロガーの作成
 *
 * 本番環境向けに最適化されたPinoロガーインスタンスを作成。
 * セキュリティ機能、パフォーマンス最適化、構造化ログ機能を統合。
 *
 * 設定される機能:
 * - 環境変数ベースのログレベル制御
 * - ISO 8601準拠のタイムスタンプ
 * - 機密情報の自動Redaction
 * - カスタムシリアライザー（エラー、リクエスト、レスポンス）
 * - OpenTelemetry準拠のログフォーマット
 * - ログ出力前のセキュリティサニタイゼーション
 *
 * @returns 設定済みPinoロガーインスタンス
 *
 * @internal
 */
function createServerLogger(): pino.Logger {
  const baseProperties = createBaseProperties();

  const pinoOptions: pino.LoggerOptions = {
    level: getLogLevelFromEnv(),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: baseProperties,

    // 🚨 セキュリティ: 機密情報のRedaction設定
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },

    // 標準シリアライザー + カスタムエラーシリアライザー
    serializers: {
      ...pino.stdSerializers,
      err: (error: Error | unknown) => serializeError(error),
      req: (req: unknown) => {
        // リクエストオブジェクトのサニタイズ
        const sanitized = sanitizeLogEntry('', req);
        return limitObjectSize(sanitized.data, 5, 50);
      },
      res: (res: unknown) => {
        // レスポンスオブジェクトのサニタイズ
        const sanitized = sanitizeLogEntry('', res);
        return limitObjectSize(sanitized.data, 3, 20);
      },
    },

    // フォーマッターで追加情報を付与
    formatters: {
      level: (label: string, number: number) => ({
        level: label,
        severity_number: number,
      }),
      bindings: (bindings: pino.Bindings) => ({
        ...bindings,
        service: baseProperties.app,
        log_schema_version: baseProperties.log_schema_version,
      }),
    },

    // ログ出力前の最終処理
    hooks: {
      logMethod(inputArgs, method) {
        // 🚨 セキュリティ: 全ログエントリのサニタイズ
        if (!inputArgs || (inputArgs as unknown[]).length === 0) {
          return method.apply(this, inputArgs);
        }

        // 引数を配列として扱う
        const args = Array.from(inputArgs);
        const [firstArg, ...restArgs] = args;

        // 第一引数がstringの場合：(message, ...args)のパターン
        if (typeof firstArg === 'string') {
          const sanitized = sanitizeLogEntry(firstArg, {});
          const message: string = String(sanitized.message);
          const newArgs = [sanitized.data, message, ...restArgs];
          return method.apply(this, newArgs as Parameters<typeof method>);
        }

        // 第一引数がobjectで、第二引数がstringの場合：(obj, message, ...args)のパターン
        if (restArgs.length > 0 && typeof restArgs[0] === 'string') {
          const sanitized = sanitizeLogEntry(restArgs[0] as string, firstArg);
          const message: string = String(sanitized.message);
          const newArgs = [sanitized.data, message, ...restArgs.slice(1)];
          return method.apply(this, newArgs as Parameters<typeof method>);
        }

        // その他の場合はそのまま実行
        return method.apply(this, inputArgs);
      },
    },
  };

  // 環境に応じたTransport設定
  return createLoggerWithTransport(pinoOptions);
}

/**
 * 環境に応じたTransport設定でLoggerを作成
 *
 * 実行環境（開発/本番、Next.jsランタイム）に応じて最適な
 * Transportを選択してPinoロガーを初期化。
 *
 * Transport選択ロジック:
 * - 開発環境 && 非Next.jsランタイム: pino-pretty（色付き）
 * - 本番環境 || Next.jsランタイム: 標準出力（JSON）
 *
 * pino-pretty初期化失敗時は自動的に標準出力にフォールバック。
 *
 * @param options - Pinoロガーオプション
 * @returns 設定済みPinoロガーインスタンス
 *
 * @internal
 */
function createLoggerWithTransport(options: pino.LoggerOptions): pino.Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isNextRuntime = typeof process.env.NEXT_RUNTIME !== 'undefined';

  // 開発環境 かつ Next.jsランタイム以外の場合のみpino-prettyを使用
  if (isDevelopment && !isNextRuntime) {
    try {
      const transport = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          hideObject: false,
          messageFormat: '{levelLabel} [{time}] ({service}): {msg}',
        },
      });

      return pino(options, transport);
    } catch (error) {
      // pino-pretty初期化失敗時のフォールバック
      console.warn('Failed to initialize pino-pretty transport, falling back to basic logger:', {
        error: serializeError(error),
        timestamp: new Date().toISOString(),
      });

      return pino(options);
    }
  }

  // 本番環境またはNext.jsランタイム環境では標準出力
  return pino(options);
}

// Serverロガーインスタンスの作成
/**
 * サーバーサイドメインロガーインスタンス
 *
 * アプリケーション全体で使用されるPinoベースロガー。
 * 設定済みのセキュリティ機能とパフォーマンス最適化を含む。
 *
 * 直接使用よりもserverLoggerWrapperの使用を推奨。
 *
 * @public
 */
export const serverLogger = createServerLogger();

/**
 * Extract error type from log arguments for metrics classification
 *
 * Pure function that analyzes log arguments to determine error type
 * for detailed error metrics categorization.
 *
 * @param mergedArgs - Merged log arguments object
 * @returns Error type string for metrics labeling
 *
 * @internal
 */
function extractErrorType(mergedArgs: Record<string, unknown>): string {
  // Check for error object
  if (mergedArgs.err && typeof mergedArgs.err === 'object') {
    const error = mergedArgs.err as { name?: string; code?: string; type?: string };
    return error.name || error.code || error.type || 'unknown_error';
  }

  // Check for error in args array
  if (mergedArgs.args && Array.isArray(mergedArgs.args)) {
    const errorArg = mergedArgs.args.find((arg: unknown) => arg instanceof Error);
    if (errorArg) {
      return (errorArg as Error).name || 'error';
    }
  }

  // Check for specific error patterns in other fields
  if (mergedArgs.event_name && typeof mergedArgs.event_name === 'string') {
    return mergedArgs.event_name;
  }

  // Default error type
  return 'application_error';
}

/**
 * 複数引数を適切にマージする関数
 *
 * 🚨 セキュリティ強化: 引数の自動サニタイズ
 *
 * ログメソッドに渡される複数の引数を統一的な構造に変換。
 * 型に応じた適切な処理とセキュリティサニタイゼーションを適用。
 *
 * 処理ルール:
 * - Error オブジェクト: errキーでserializeError適用
 * - Object型: サニタイズ後にマージ、サイズ制限適用
 * - その他: args配列にプリミティブ値として格納
 * - null/undefined: スキップ
 *
 * @param args - ログメソッドの引数配列
 * @returns 統一された構造化データ
 *
 * @internal
 */
function mergeLogArguments(args: LogArgument[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const arg of args) {
    if (arg === null || arg === undefined) {
      continue;
    }

    if (arg instanceof Error) {
      // Error オブジェクトは err キーで格納（Pino標準）
      result.err = serializeError(arg);
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      // オブジェクトはサニタイズしてマージ
      const sanitized = sanitizeLogEntry('', arg);
      const limited = limitObjectSize(sanitized.data, 10, 100);
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
 * Logger インターフェース準拠のラッパー実装
 *
 * 🚨 Child Logger + AsyncLocalStorage統合
 *
 * 統一Loggerインターフェースに準拠したサーバーサイドロガー。
 * AsyncLocalStorageによるコンテキスト自動統合と
 * セキュリティサニタイゼーションを提供。
 *
 * すべてのログメソッドで以下を自動実行:
 * - 現在のAsyncLocalStorageコンテキスト取得
 * - 引数のマージとサニタイゼーション
 * - コンテキスト情報の自動付与
 * - Pinoロガーへの安全な転送
 *
 * @public
 */
export const serverLoggerWrapper: Logger = {
  trace: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter
    incrementLogCounter('trace', 'server');

    serverLogger.trace(logData, message);
  },
  debug: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter
    incrementLogCounter('debug', 'server');

    serverLogger.debug(logData, message);
  },
  info: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter
    incrementLogCounter('info', 'server');

    serverLogger.info(logData, message);
  },
  warn: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter
    incrementLogCounter('warn', 'server');

    serverLogger.warn(logData, message);
  },
  error: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter + Error counter
    incrementLogCounter('error', 'server');

    // Extract error type from arguments for detailed error metrics
    const errorType = extractErrorType(mergedArgs);
    incrementErrorCounter(errorType, 'server', 'high');

    serverLogger.error(logData, message);
  },
  fatal: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };

    // 📊 Metrics: Log entry counter + Error counter
    incrementLogCounter('fatal', 'server');

    // Extract error type from arguments for detailed error metrics
    const errorType = extractErrorType(mergedArgs);
    incrementErrorCounter(errorType, 'server', 'critical');

    serverLogger.fatal(logData, message);
  },
  isLevelEnabled: (level) => serverLogger.isLevelEnabled(level),
};

/**
 * 高レベルヘルパー関数群
 *
 * よく使用されるログパターンの便利関数集。
 * パフォーマンス測定、セキュリティイベント、ユーザーアクション等の
 * 定型的なログ記録を簡単に実行可能。
 *
 * @public
 */
export const serverLoggerHelpers = {
  /**
   * パフォーマンス測定（同期関数用）
   *
   * 関数の実行時間を自動測定し、パフォーマンスログを記録。
   * 例外発生時はエラーログと実行時間の両方を記録。
   *
   * @param name - 測定操作名
   * @param fn - 測定対象の同期関数
   * @returns 関数の実行結果
   *
   * @public
   */
  measurePerformance: <T>(name: string, fn: () => T): T => {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;

      loggerContextManager.logPerformanceMetric(serverLoggerWrapper, name, duration, 'ms');

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      loggerContextManager.logErrorEvent(serverLoggerWrapper, error, { operation: name, duration });
      throw error;
    }
  },

  /**
   * パフォーマンス測定（非同期関数用）
   *
   * Promise関数の実行時間を自動測定し、パフォーマンスログを記録。
   * 例外発生時はエラーログと実行時間の両方を記録。
   *
   * @param name - 測定操作名
   * @param fn - 測定対象の非同期関数
   * @returns 関数の実行結果Promise
   *
   * @public
   */
  measurePerformanceAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      loggerContextManager.logPerformanceMetric(serverLoggerWrapper, name, duration, 'ms');

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      loggerContextManager.logErrorEvent(serverLoggerWrapper, error, { operation: name, duration });
      throw error;
    }
  },

  /**
   * セキュリティイベントログ
   *
   * セキュリティ関連イベントを高優先度で記録。
   * 自動的にerrorレベルで出力し、監視システムでのアラート対象となる。
   *
   * @param event - セキュリティイベント名
   * @param details - イベント詳細情報
   *
   * @public
   */
  logSecurityEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSecurityEvent(serverLoggerWrapper, event, details);
  },

  /**
   * ユーザーアクションログ
   *
   * ユーザー操作を構造化ログとして記録。
   * ユーザー行動分析、A/Bテスト、メトリクス収集に使用。
   *
   * @param action - ユーザーアクション名
   * @param details - アクション詳細情報
   *
   * @public
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logUserAction(serverLoggerWrapper, action, details);
  },

  /**
   * システムイベントログ
   *
   * アプリケーション内部イベントを構造化ログとして記録。
   * システム監視、パフォーマンス分析、障害検知に使用。
   *
   * @param event - システムイベント名
   * @param details - イベント詳細情報
   *
   * @public
   */
  logSystemEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSystemEvent(serverLoggerWrapper, event, details);
  },
};

/**
 * デフォルトサーバーロガーエクスポート
 *
 * 統一Loggerインターフェース準拠のサーバーサイドロガー。
 * 最も一般的な用途での推奨エクスポート。
 *
 * @public
 */
export default serverLoggerWrapper;
