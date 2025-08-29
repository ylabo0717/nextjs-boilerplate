/**
 * Pino-based server-side logger implementation
 *
 * High-performance structured logger with integrated security features
 * for server-side environments. Optimized logging system using
 * Next.js 15 + Pino v9 for production-grade performance.
 *
 * Key features:
 * - High-performance structured log output
 * - Automatic security sanitization
 * - Automatic redaction of sensitive information
 * - AsyncLocalStorage-integrated context management
 * - OpenTelemetry-compliant metadata
 * - Environment-specific transport optimization
 */
import pino from 'pino';

import { loggerContextManager } from './context';
import { incrementLogCounter, incrementErrorCounter } from './metrics';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { getLogLevelFromEnv, createBaseProperties, REDACT_PATHS, serializeError } from './utils';

import type { Logger, LogArgument } from './types';

// Create base properties using the utility function
const baseProperties = createBaseProperties();

/**
 * Create Pino-based server logger
 *
 * Creates optimized Pino logger instance for production environments.
 * Integrates security features, performance optimization, and structured
 * logging capabilities for enterprise-grade server logging.
 *
 * Configured features:
 * - Environment variable-based log level control
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
  const pinoOptions: pino.LoggerOptions = {
    name: baseProperties.app,
    level: getLogLevelFromEnv() as pino.Level,

    // 🚨 Security: Redacting sensitive information
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },

    // Standard serializers + Custom error serializer
    serializers: {
      ...pino.stdSerializers,
      err: (error: Error | unknown) => serializeError(error),
      req: (req: unknown) => {
        // Request object sanitization
        const sanitized = sanitizeLogEntry('', req);
        return limitObjectSize(sanitized.data, 5, 50);
      },
      res: (res: unknown) => {
        // Response object sanitization
        const sanitized = sanitizeLogEntry('', res);
        return limitObjectSize(sanitized.data, 3, 20);
      },
    },

    // Formatter for additional information
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

    // Final processing before log output
    hooks: {
      logMethod(inputArgs, method) {
        // 🚨 Security: Sanitize all log entries
        if (!inputArgs || (inputArgs as unknown[]).length === 0) {
          return method.apply(this, inputArgs);
        }

        // Treat arguments as array
        const args = Array.from(inputArgs);
        const [firstArg, ...restArgs] = args;

        // First argument is string: (message, ...args) pattern
        if (typeof firstArg === 'string') {
          const sanitized = sanitizeLogEntry(firstArg, {});
          const message: string = String(sanitized.message);
          const newArgs = [sanitized.data, message, ...restArgs];
          return method.apply(this, newArgs as Parameters<typeof method>);
        }

        // First argument is object and second is string: (obj, message, ...args) pattern
        if (restArgs.length > 0 && typeof restArgs[0] === 'string') {
          const sanitized = sanitizeLogEntry(restArgs[0] as string, firstArg);
          const message: string = String(sanitized.message);
          const newArgs = [sanitized.data, message, ...restArgs.slice(1)];
          return method.apply(this, newArgs as Parameters<typeof method>);
        }

        // Other cases: execute as-is
        return method.apply(this, inputArgs);
      },
    },
  };

  // Environment-specific Transport configuration
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
/**
 * Create Logger with environment-specific Transport configuration
 *
 * Initialize Pino logger with optimal Transport selection based on
 * runtime environment (development/production, Next.js runtime).
 *
 * Transport selection logic:
 * - Development environment && non-Next.js runtime: pino-pretty (colored)
 * - Production environment || Next.js runtime: standard output (JSON)
 *
 * Automatically falls back to standard output when pino-pretty initialization fails.
 *
 * @param options - Pino logger options
 * @returns Configured Pino logger instance
 *
 * @internal
 */
function createLoggerWithTransport(options: pino.LoggerOptions): pino.Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isNextRuntime = typeof process.env.NEXT_RUNTIME !== 'undefined';

  // Use pino-pretty only in development environment and outside Next.js runtime
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
      // Fallback when pino-pretty initialization fails
      console.warn('Failed to initialize pino-pretty transport, falling back to basic logger:', {
        error: serializeError(error),
        timestamp: new Date().toISOString(),
      });

      return pino(options);
    }
  }

  // Standard output in production or Next.js runtime environment
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
/**
 * Function to properly merge multiple arguments
 *
 * 🚨 Security Enhancement: Automatic argument sanitization
 *
 * Convert multiple arguments passed to log methods into unified structure.
 * Apply appropriate processing and security sanitization based on type.
 *
 * Processing rules:
 * - Error objects: Apply serializeError with err key
 * - Object type: Sanitize then merge, apply size limits
 * - Others: Store as primitive values in args array
 * - null/undefined: Skip
 *
 * @param args - Array of log method arguments
 * @returns Unified structured data
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
      // Error objects are stored with err key (Pino standard)
      result.err = serializeError(arg);
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      // Objects are sanitized and merged
      const sanitized = sanitizeLogEntry('', arg);
      const limited = limitObjectSize(sanitized.data, 10, 100);
      Object.assign(result, limited);
    } else {
      // Other types are stored in args array
      if (!result.args) {
        result.args = [];
      }
      (result.args as unknown[]).push(arg);
    }
  }

  return result;
}

/**
 * Logger interface compliant wrapper implementation
 *
 * 🚨 Child Logger + AsyncLocalStorage integration
 *
 * Server-side logger following unified Logger interface.
 * Provides automatic context integration via AsyncLocalStorage
 * and security sanitization.
 *
 * All log methods automatically execute:
 * - Get current AsyncLocalStorage context
 * - Merge and sanitize arguments
 * - Automatically attach context information
 * - Safely forward to Pino logger
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
 * High-level helper functions
 *
 * Collection of convenience functions for commonly used log patterns.
 * Enables easy implementation of standard log recording for
 * performance measurement, security events, user actions, etc.
 *
 * @public
 */
export const serverLoggerHelpers = {
  /**
   * Performance measurement (for synchronous functions)
   *
   * Automatically measures function execution time and records performance logs.
   * Records both error logs and execution time when exceptions occur.
   *
   * @param name - Measurement operation name
   * @param fn - Synchronous function to measure
   * @returns Function execution result
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
   * Performance measurement (for asynchronous functions)
   *
   * Automatically measures Promise function execution time and records performance logs.
   * Records both error logs and execution time when exceptions occur.
   *
   * @param name - Measurement operation name
   * @param fn - Asynchronous function to measure
   * @returns Function execution result Promise
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
   * Security event log
   *
   * Records security-related events with high priority.
   * Automatically outputs at error level and becomes alert target for monitoring systems.
   *
   * @param event - Security event name
   * @param details - Event detail information
   *
   * @public
   */
  logSecurityEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSecurityEvent(serverLoggerWrapper, event, details);
  },

  /**
   * User action log
   *
   * Records user operations as structured logs.
   * Used for user behavior analysis, A/B testing, and metrics collection.
   *
   * @param action - User action name
   * @param details - Action detail information
   *
   * @public
   */
  logUserAction: (action: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logUserAction(serverLoggerWrapper, action, details);
  },

  /**
   * System event log
   *
   * Records application internal events as structured logs.
   * Used for system monitoring, performance analysis, and fault detection.
   *
   * @param event - System event name
   * @param details - Event detail information
   *
   * @public
   */
  logSystemEvent: (event: string, details: Record<string, unknown> = {}) => {
    loggerContextManager.logSystemEvent(serverLoggerWrapper, event, details);
  },
};

/**
 * Default server logger export
 *
 * Server-side logger compliant with unified Logger interface.
 * Recommended export for most common use cases.
 *
 * @public
 */
export default serverLoggerWrapper;
