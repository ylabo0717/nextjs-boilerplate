/**
 * Loki Transport Implementation for Logger System
 *
 * Integrates Grafana Loki with the existing logger infrastructure.
 * Provides transport layer for automatic log forwarding to Loki
 * with proper batching, error handling, and environment detection.
 */

import { getLoggerContext, defaultLoggerContextConfig } from './context';
import { LokiClient, validateLokiConfig, createDefaultLokiConfig } from './loki-client';
import { sanitizeLogEntry } from './sanitizer';

// Re-export from loki-client for convenience
export { LokiClient, validateLokiConfig, createDefaultLokiConfig } from './loki-client';

import type { LokiClientConfig, LokiLabels } from './loki-client';
import type { Logger, LogLevel, LogArgument, LoggerContext } from './types';

/**
 * Loki トランスポート設定型
 *
 * @public
 */
export interface LokiTransportConfig extends Partial<LokiClientConfig> {
  /** Transport を有効化するかどうか (default: true) */
  readonly enabled?: boolean;
  /** 最小ログレベル (この レベル以下のログは送信されない) */
  readonly minLevel?: LogLevel;
  /** Loki への送信を除外するログパターン */
  readonly excludePatterns?: readonly RegExp[];
  /** 送信前のログ変換関数 */
  readonly logTransformer?: (
    level: LogLevel,
    message: string,
    args: readonly LogArgument[]
  ) => {
    message: string;
    labels: LokiLabels;
    metadata?: Record<string, unknown>;
  };
  /** エラー時のフォールバック動作 */
  readonly onError?: (
    error: Error,
    logData: {
      level: LogLevel;
      message: string;
      args: readonly LogArgument[];
    }
  ) => void;
}

/**
 * Loki トランスポート統計情報型
 *
 * @public
 */
export interface LokiTransportStats {
  readonly enabled: boolean;
  readonly totalLogs: number;
  readonly successfulLogs: number;
  readonly failedLogs: number;
  readonly excludedLogs: number;
  readonly bufferedLogs: number;
  readonly lastError?: string;
  readonly lastErrorTime?: Date;
}

/**
 * 内部統計情報型（mutable）
 *
 * @internal
 */
interface MutableTransportStats {
  enabled: boolean;
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  excludedLogs: number;
  bufferedLogs: number;
  lastError?: string;
  lastErrorTime?: Date;
}

/**
 * Loki ログトランスポート
 *
 * 既存のロガーシステムからGrafana Lokiへのログ転送を管理。
 * バッファリング、リトライ、エラーハンドリングを自動処理。
 *
 * @example
 * ```typescript
 * const transport = new LokiTransport({
 *   url: 'http://localhost:3100',
 *   defaultLabels: { service: 'my-app' },
 *   minLevel: 'info',
 *   excludePatterns: [/health.*check/i]
 * });
 *
 * await transport.initialize();
 *
 * // ログラッパーで使用
 * const wrappedLogger = transport.wrapLogger(baseLogger);
 * wrappedLogger.info('This will be sent to Loki and the base logger');
 * ```
 *
 * @public
 */
export class LokiTransport {
  private readonly config: Required<LokiTransportConfig>;
  private client: LokiClient | null = null;
  private stats: MutableTransportStats;
  private isInitialized = false;

  /**
   * Loki トランスポートを作成
   *
   * @param config - トランスポート設定
   */
  constructor(config: LokiTransportConfig = {}) {
    const defaultConfig = createDefaultLokiConfig();

    this.config = {
      enabled: true,
      minLevel: 'info',
      excludePatterns: [],
      onError: (error, logData) => {
        console.error('LokiTransport error:', error, { logData });
      },
      ...defaultConfig,
      ...config,
    } as Required<LokiTransportConfig>;

    this.stats = {
      enabled: this.config.enabled,
      totalLogs: 0,
      successfulLogs: 0,
      failedLogs: 0,
      excludedLogs: 0,
      bufferedLogs: 0,
    };
  }

  /**
   * トランスポートを初期化
   *
   * @returns Promise that resolves when transport is initialized
   *
   * @public
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.config.enabled) {
      console.info('LokiTransport is disabled');
      return;
    }

    try {
      await validateLokiConfig(this.config);
      this.client = new LokiClient(this.config);
      this.isInitialized = true;
      console.info('LokiTransport initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize LokiTransport:', errorMessage);
      this.stats.lastError = errorMessage;
      this.stats.lastErrorTime = new Date();
      throw error;
    }
  }

  /**
   * 既存のロガーをラップしてLoki転送機能を追加
   *
   * @param baseLogger - ベースとなるロガー
   * @returns Loki転送機能付きロガー
   *
   * @public
   */
  wrapLogger(baseLogger: Logger): Logger {
    return {
      trace: (message: string, ...args: LogArgument[]) => {
        baseLogger.trace(message, ...args);
        this.sendToLoki('trace', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      debug: (message: string, ...args: LogArgument[]) => {
        baseLogger.debug(message, ...args);
        this.sendToLoki('debug', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      info: (message: string, ...args: LogArgument[]) => {
        baseLogger.info(message, ...args);
        this.sendToLoki('info', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      warn: (message: string, ...args: LogArgument[]) => {
        baseLogger.warn(message, ...args);
        this.sendToLoki('warn', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      error: (message: string, ...args: LogArgument[]) => {
        baseLogger.error(message, ...args);
        this.sendToLoki('error', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      fatal: (message: string, ...args: LogArgument[]) => {
        baseLogger.fatal(message, ...args);
        this.sendToLoki('fatal', message, args).catch(() => {
          // Error already handled by sendToLoki
        });
      },
      isLevelEnabled: (level: LogLevel) => baseLogger.isLevelEnabled(level),
    };
  }

  /**
   * ログを直接 Loki に送信
   *
   * @param level - ログレベル
   * @param message - ログメッセージ
   * @param args - ログ引数
   * @returns Promise that resolves when log is sent or queued
   *
   * @public
   */
  async sendLog(
    level: LogLevel,
    message: string,
    args: readonly LogArgument[] = []
  ): Promise<void> {
    await this.sendToLoki(level, message, args);
  }

  /**
   * トランスポートをシャットダウン
   *
   * @returns Promise that resolves when shutdown is complete
   *
   * @public
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.client = null;
    }
    this.isInitialized = false;
    console.info('LokiTransport shutdown complete');
  }

  /**
   * トランスポート統計情報を取得
   *
   * @returns Transport statistics
   *
   * @public
   */
  getStats(): LokiTransportStats {
    if (this.client) {
      const clientStats = this.client.getStats();
      return {
        ...this.stats,
        bufferedLogs: clientStats.bufferedLogs,
      };
    }
    return this.stats;
  }

  /**
   * トランスポート設定を取得
   *
   * @returns Transport configuration (for debugging)
   *
   * @public
   */
  getConfig(): Readonly<LokiTransportConfig> {
    return { ...this.config };
  }

  /**
   * ログレベルが送信対象かチェック
   *
   * @param level - チェックするログレベル
   * @returns true if level should be sent
   *
   * @public
   */
  shouldSendLevel(level: LogLevel): boolean {
    const levelValues: Record<LogLevel, number> = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60,
    };

    const currentLevelValue = levelValues[level as keyof typeof levelValues] || 0;
    const minLevelValue = levelValues[this.config.minLevel as keyof typeof levelValues] || 30;

    return currentLevelValue >= minLevelValue;
  }

  /**
   * ログを Loki に送信（内部実装）
   *
   * @param level - ログレベル
   * @param message - ログメッセージ
   * @param args - ログ引数
   * @returns Promise that resolves when log is processed
   *
   * @internal
   */
  private async sendToLoki(
    level: LogLevel,
    message: string,
    args: readonly LogArgument[]
  ): Promise<void> {
    this.stats.totalLogs++;

    // Transport が無効または初期化されていない場合
    if (!this.config.enabled || !this.isInitialized || !this.client) {
      this.stats.excludedLogs++;
      return;
    }

    // ログレベルのチェック
    if (!this.shouldSendLevel(level)) {
      this.stats.excludedLogs++;
      return;
    }

    // 除外パターンのチェック
    if (this.config.excludePatterns.some((pattern) => pattern.test(message))) {
      this.stats.excludedLogs++;
      return;
    }

    try {
      // ログの変換とラベル生成
      const logData = this.transformLog(level, message, args);

      // コンテキスト情報の取得
      const context = getLoggerContext(defaultLoggerContextConfig);
      const contextLabels = this.extractContextLabels(context);

      // 最終的なラベルの生成
      const finalLabels: LokiLabels = {
        ...logData.labels,
        ...contextLabels,
      };

      // Loki に送信
      await this.client.pushLog(level, logData.message, finalLabels, logData.metadata);

      this.stats.successfulLogs++;
    } catch (error) {
      this.stats.failedLogs++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      this.stats.lastErrorTime = new Date();

      // エラーハンドラーを呼び出し
      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        level,
        message,
        args,
      });
    }
  }

  /**
   * ログを変換してラベルとメタデータを生成
   *
   * @param level - ログレベル
   * @param message - ログメッセージ
   * @param args - ログ引数
   * @returns Transformed log data
   *
   * @internal
   */
  private transformLog(
    level: LogLevel,
    message: string,
    args: readonly LogArgument[]
  ): {
    message: string;
    labels: LokiLabels;
    metadata?: Record<string, unknown>;
  } {
    // カスタム変換関数が指定されている場合
    if (this.config.logTransformer) {
      return this.config.logTransformer(level, message, args);
    }

    // デフォルト変換
    const sanitized = sanitizeLogEntry(message, { level, args });

    const labels: LokiLabels = {
      level,
      logger: 'nextjs-boilerplate',
    };

    const metadata: Record<string, unknown> = {
      args: args.length > 0 ? args : undefined,
      timestamp: new Date().toISOString(),
    };

    return {
      message: sanitized.message,
      labels,
      metadata,
    };
  }

  /**
   * ロガーコンテキストからラベルを抽出
   *
   * @param context - ロガーコンテキスト
   * @returns Context labels for Loki
   *
   * @internal
   */
  private extractContextLabels(context: LoggerContext | undefined): LokiLabels {
    if (!context) {
      return {};
    }

    const labels: LokiLabels = {};

    if (context.requestId) {
      labels.request_id = context.requestId;
    }

    if (context.traceId) {
      labels.trace_id = context.traceId;
    }

    if (context.spanId) {
      labels.span_id = context.spanId;
    }

    // HTTPコンテキスト情報（Record<string, unknown>として追加されている可能性）
    if (typeof context.method === 'string') {
      labels.http_method = context.method;
    }

    if (typeof context.url === 'string') {
      labels.http_url = context.url;
    }

    if (context.userId) {
      labels.user_id = context.userId;
    }

    if (context.sessionId) {
      labels.session_id = context.sessionId;
    }

    if (context.event_name) {
      labels.event_name = context.event_name;
    }

    if (context.event_category) {
      labels.event_category = context.event_category;
    }

    return labels;
  }
}

/**
 * グローバル Loki トランスポートインスタンス
 *
 * アプリケーション全体で使用されるデフォルトトランスポート。
 *
 * @public
 */
export let globalLokiTransport: LokiTransport | null = null;

/**
 * グローバル Loki トランスポートを初期化
 *
 * @param config - トランスポート設定
 * @returns Promise that resolves when transport is initialized
 *
 * @public
 */
export async function initializeLokiTransport(
  config: LokiTransportConfig = {}
): Promise<LokiTransport> {
  if (globalLokiTransport) {
    console.warn('LokiTransport is already initialized');
    return globalLokiTransport;
  }

  globalLokiTransport = new LokiTransport(config);
  await globalLokiTransport.initialize();

  return globalLokiTransport;
}

/**
 * グローバル Loki トランスポートを取得
 *
 * @returns Global transport instance or null if not initialized
 *
 * @public
 */
export function getLokiTransport(): LokiTransport | null {
  return globalLokiTransport;
}

/**
 * グローバル Loki トランスポートをシャットダウン
 *
 * @returns Promise that resolves when transport is shutdown
 *
 * @public
 */
export async function shutdownLokiTransport(): Promise<void> {
  if (globalLokiTransport) {
    await globalLokiTransport.shutdown();
    globalLokiTransport = null;
  }
}

/**
 * 環境変数からLoki設定を作成
 *
 * @returns Loki transport configuration from environment
 *
 * @public
 */
export function createLokiConfigFromEnv(): LokiTransportConfig {
  return {
    enabled: process.env.LOKI_ENABLED !== 'false',
    url: process.env.LOKI_URL || 'http://localhost:3100',
    tenantId: process.env.LOKI_TENANT_ID,
    apiKey: process.env.LOKI_API_KEY,
    minLevel: (process.env.LOKI_MIN_LEVEL as LogLevel) || 'info',
    batchSize: process.env.LOKI_BATCH_SIZE ? parseInt(process.env.LOKI_BATCH_SIZE, 10) : undefined,
    flushInterval: process.env.LOKI_FLUSH_INTERVAL
      ? parseInt(process.env.LOKI_FLUSH_INTERVAL, 10)
      : undefined,
    timeout: process.env.LOKI_TIMEOUT ? parseInt(process.env.LOKI_TIMEOUT, 10) : undefined,
    maxRetries: process.env.LOKI_MAX_RETRIES
      ? parseInt(process.env.LOKI_MAX_RETRIES, 10)
      : undefined,
    auth:
      process.env.LOKI_USERNAME && process.env.LOKI_PASSWORD
        ? {
            username: process.env.LOKI_USERNAME,
            password: process.env.LOKI_PASSWORD,
          }
        : undefined,
  };
}
