/**
 * 構造化ログシステム統合エクスポート
 * Client/Server双方対応の統一インターフェース
 */

// 各環境のLoggerを静的にインポート
import { clientLoggerWrapper, clientLoggerHelpers } from './client';
import { loggerContextManager, createContextualLoggerCompat } from './context';
import { errorHandler } from './error-handler';
import { initializeLokiTransport, createLokiConfigFromEnv } from './loki-transport';
import { serverLoggerWrapper, serverLoggerHelpers } from './server';

import type { LokiTransportConfig } from './loki-transport';
import type { Logger, LogArgument, LogLevel, LoggerContext } from './types';

// 型定義とインターフェース
export type {
  Logger,
  LogLevel,
  LogArgument,
  LoggerContext,
  BaseProperties,
  SanitizedLogEntry,
} from './types';

// コア機能
export {
  sanitizeLogEntry,
  sanitizeControlCharacters,
  sanitizeForJson,
  limitObjectSize,
} from './sanitizer';

export { hashIP, validateIPHashSecret } from './crypto';

export {
  getLogLevelFromEnv,
  getClientLogLevel,
  createBaseProperties,
  generateRequestId,
  serializeError,
  isLogLevelEnabled,
  getLogLevelValue,
  REDACT_PATHS,
} from './utils';

// コンテキスト管理
export {
  runWithLoggerContext,
  getLoggerContext,
  createContextualLogger,
  createContextualLoggerCompat,
  loggerContextManager,
} from './context';

// タイマーコンテキスト統合
export {
  setTimeoutWithContext,
  setIntervalWithContext,
  TimerContextManager,
  createTimerContextManager,
} from './timer-context';
export type { ContextualTimerHandle } from './timer-context';

// API Route トレーシング統合
export {
  withAPIRouteTracing,
  createTracedAPIClient,
  getCurrentSpanContext,
  traceOperation,
} from './api-route-tracing';
export type {
  APIRouteSpanContext,
  APIRouteSpanResult,
  CreateAPIRouteSpanOptions,
} from './api-route-tracing';

// サーバーサイドLogger
export { serverLogger, serverLoggerWrapper, serverLoggerHelpers } from './server';

// クライアントサイドLogger
export { clientLogger, clientLoggerWrapper, clientLoggerHelpers } from './client';

// Middleware統合
export {
  createRequestContext,
  logRequestStart,
  logRequestEnd,
  logSecurityEvent,
  logMiddlewareError,
  logRateLimit,
  logRedirect,
  middlewareLoggerHelpers,
} from './middleware';

// Loki統合
export {
  LokiClient,
  LokiTransport,
  validateLokiConfig,
  createDefaultLokiConfig,
  initializeLokiTransport,
  getLokiTransport,
  shutdownLokiTransport,
  createLokiConfigFromEnv,
} from './loki-transport';

export type {
  LokiLabels,
  LokiLogEntry,
  LokiLogStream,
  LokiPushPayload,
  LokiClientConfig,
} from './loki-client';

export type { LokiTransportConfig, LokiTransportStats } from './loki-transport';

// エラーハンドリング
export { errorHandler, errorHandlerUtils } from './error-handler';

export type { ErrorCategory, ErrorContext, StructuredError } from './error-handler';

/**
 * 環境自動判定Logger
 * サーバー/クライアント環境を自動判定して適切なLoggerを返す
 */
export const logger = (() => {
  // サーバーサイド判定
  if (typeof window === 'undefined') {
    // Node.js環境
    try {
      // Pinoが利用できるかテスト
      return serverLoggerWrapper;
    } catch {
      // Edge Runtime等でPinoが使用できない場合のフォールバック
      return clientLoggerWrapper;
    }
  } else {
    // ブラウザ環境
    return clientLoggerWrapper;
  }
})();

/**
 * 統合Logger初期化関数
 * アプリケーション起動時に呼び出す
 */
export function initializeLogger(
  options: {
    enableGlobalErrorHandlers?: boolean;
    context?: Record<string, unknown>;
    enableLoki?: boolean;
    lokiConfig?: LokiTransportConfig;
  } = {}
): void {
  const {
    enableGlobalErrorHandlers = true,
    context = {},
    enableLoki = process.env.LOKI_ENABLED !== 'false',
    lokiConfig,
  } = options;

  // グローバルエラーハンドラーの設定
  if (enableGlobalErrorHandlers) {
    setupGlobalErrorHandlers();
  }

  // Loki トランスポートの初期化（非同期だが初期化は妨げない）
  if (enableLoki) {
    const config = lokiConfig || createLokiConfigFromEnv();
    initializeLokiTransport(config).catch((error) => {
      console.warn('Failed to initialize Loki transport:', error);
    });
  }

  // 初期コンテキストの設定
  if (Object.keys(context).length > 0) {
    // Note: これはサーバーサイドでのみ有効
    if (typeof window === 'undefined') {
      // contextを適切な型にキャスト（部分的なLoggerContextとして扱う）
      const loggerContext = {
        requestId: (context.requestId as string) || 'init',
        ...context,
      } as LoggerContext;
      loggerContextManager.runWithContext(loggerContext, () => {
        logger.info('Logger initialized with context', context);
      });
    } else {
      logger.info('Logger initialized', context);
    }
  } else {
    logger.info('Logger initialized');
  }
}

/**
 * グローバルエラーハンドラーの設定
 */
function setupGlobalErrorHandlers(): void {
  // 静的にインポートしたerrorHandlerを使用

  if (typeof window === 'undefined') {
    // Node.js環境
    process.on('uncaughtException', (error: Error) => {
      errorHandler.handleUncaughtException(error, {
        timestamp: new Date().toISOString(),
      });

      // アプリケーションを適切に終了
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      errorHandler.handleUnhandledRejection(reason, {
        timestamp: new Date().toISOString(),
      });
    });
  } else {
    // ブラウザ環境
    window.addEventListener('error', (event) => {
      errorHandler.handle(event.error, {
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      errorHandler.handleUnhandledRejection(event.reason, {
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    });
  }
}

/**
 * コンテキスト付きLogger取得
 * @internal
 */
export function getLoggerWithContext(context: Record<string, unknown>): Logger {
  if (typeof window === 'undefined') {
    // サーバーサイド
    return createContextualLoggerCompat(logger, context);
  } else {
    // クライアントサイド（コンテキストは個別に付与）
    return {
      trace: (message: string, ...args: LogArgument[]) => logger.trace(message, context, ...args),
      debug: (message: string, ...args: LogArgument[]) => logger.debug(message, context, ...args),
      info: (message: string, ...args: LogArgument[]) => logger.info(message, context, ...args),
      warn: (message: string, ...args: LogArgument[]) => logger.warn(message, context, ...args),
      error: (message: string, ...args: LogArgument[]) => logger.error(message, context, ...args),
      fatal: (message: string, ...args: LogArgument[]) => logger.fatal(message, context, ...args),
      isLevelEnabled: (level: string) => logger.isLevelEnabled(level as LogLevel),
    };
  }
}

/**
 * 統合パフォーマンス測定
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  _context: Record<string, unknown> = {}
): T {
  if (typeof window === 'undefined') {
    // サーバーサイド
    return serverLoggerHelpers.measurePerformance(name, fn);
  } else {
    // クライアントサイド
    return clientLoggerHelpers.measurePerformance(name, fn);
  }
}

/**
 * 統合非同期パフォーマンス測定
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  _context: Record<string, unknown> = {}
): Promise<T> {
  if (typeof window === 'undefined') {
    // サーバーサイド
    return (
      serverLoggerHelpers.measurePerformanceAsync?.(name, fn) ??
      Promise.resolve(serverLoggerHelpers.measurePerformance(name, () => fn()))
    );
  } else {
    // クライアントサイド - measurePerformanceAsyncが存在しない場合は同期版を使用
    return Promise.resolve(clientLoggerHelpers.measurePerformance(name, () => fn()));
  }
}
/**
 * 統合ユーザーアクションログ
 */
export function logUserAction(action: string, details: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') {
    // サーバーサイド
    serverLoggerHelpers.logUserAction(action, details);
  } else {
    // クライアントサイド
    clientLoggerHelpers.logUserAction(action, details);
  }
}

/**
 * 統合エラーログ
 * @internal
 */
export function logError(error: Error | unknown, context: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') {
    // サーバーサイド - 既存のerrorHandlerオブジェクトを使用
    errorHandler.handle(error, context);
  } else {
    // クライアントサイド
    clientLoggerHelpers.logError(error, context);
  }
}

/**
 * デバッグ用Logger情報表示
 */
export function debugLogger(): void {
  const info = {
    environment: typeof window === 'undefined' ? 'server' : 'client',
    logLevel:
      typeof window === 'undefined'
        ? process.env.LOG_LEVEL || 'info'
        : process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV,
    runtime: typeof window === 'undefined' ? process.env.NEXT_RUNTIME || 'nodejs' : 'browser',
    timestamp: new Date().toISOString(),
  };

  logger.debug('Logger debug information', info);
}

// デフォルトエクスポート
export default logger;
