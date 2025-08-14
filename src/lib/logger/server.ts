/**
 * Pinoベースサーバーサイドロガー実装
 * 高性能・構造化ログと統合セキュリティ機能
 */

import pino from 'pino';

import { loggerContextManager } from './context';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getLogLevelFromEnv, createBaseProperties, REDACT_PATHS, serializeError } from './utils';

import type { Logger, LogArgument } from './types';

/**
 * Pinoベースサーバーロガーの作成
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
export const serverLogger = createServerLogger();

/**
 * 複数引数を適切にマージする関数
 * 🚨 セキュリティ強化: 引数の自動サニタイズ
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
 * 🚨 Child Logger + AsyncLocalStorage統合
 */
export const serverLoggerWrapper: Logger = {
  trace: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.trace(logData, message);
  },
  debug: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.debug(logData, message);
  },
  info: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.info(logData, message);
  },
  warn: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.warn(logData, message);
  },
  error: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.error(logData, message);
  },
  fatal: (message: string, ...args) => {
    const mergedArgs = mergeLogArguments(args);
    const context = loggerContextManager.getContext();
    const logData = { ...context, ...mergedArgs };
    serverLogger.fatal(logData, message);
  },
  isLevelEnabled: (level) => serverLogger.isLevelEnabled(level),
};

/**
 * 高レベルヘルパー関数群
 */
export const serverLoggerHelpers = {
  /**
   * パフォーマンス測定
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
   * 非同期パフォーマンス測定
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
   */
  logSecurityEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSecurityEvent(serverLoggerWrapper, event, details);
  },

  /**
   * ユーザーアクションログ
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logUserAction(serverLoggerWrapper, action, details);
  },

  /**
   * システムイベントログ
   */
  logSystemEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSystemEvent(serverLoggerWrapper, event, details);
  },
};

export default serverLoggerWrapper;
