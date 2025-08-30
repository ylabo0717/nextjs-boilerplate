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
 * Loki transport configuration type
 *
 * @public
 */
export interface LokiTransportConfig extends Partial<LokiClientConfig> {
  /** Whether to enable Transport (default: true) */
  readonly enabled?: boolean;
  /** Minimum log level (logs below this level are not sent) */
  readonly minLevel?: LogLevel;
  /** Log patterns to exclude from sending to Loki */
  readonly excludePatterns?: readonly RegExp[];
  /** Log transformation function before sending */
  readonly logTransformer?: (
    level: LogLevel,
    message: string,
    args: readonly LogArgument[]
  ) => {
    message: string;
    labels: LokiLabels;
    metadata?: Record<string, unknown>;
  };
  /** Fallback behavior on error */
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
 * Loki transport statistics type
 *
 * @public
 */
export interface LokiTransportStats {
  /** Whether Loki transport is enabled */
  readonly enabled: boolean;
  /** Total number of logs that attempted to send */
  readonly totalLogs: number;
  /** Number of successfully sent logs */
  readonly successfulLogs: number;
  /** Number of failed log sends */
  readonly failedLogs: number;
  /** Number of logs excluded by filtering */
  readonly excludedLogs: number;
  /** Number of currently buffered logs */
  readonly bufferedLogs: number;
  /** Last error message that occurred */
  readonly lastError?: string;
  /** Time when the last error occurred */
  readonly lastErrorTime?: Date;
}

/**
 * Internal statistics type (mutable)
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
 * Loki transport for logs
 *
 * Manages forwarding logs from the existing logger to Grafana Loki.
 * Automatically handles buffering, retries, and error handling.
 *
 * ## Reason for class implementation
 *
 * As an exception to the Pure Functions First principle, a class is used because:
 * - State management is required (LokiClient instance, send stats, error states)
 * - Lifecycle management (init, shutdown, resource cleanup)
 * - Acts as a stateful proxy to wrap existing loggers
 * - Configuration changes and dynamic filtering rules
 * - Accumulated statistics and monitoring of delivery results
 *
 * @example
 * ```ts
 * const transport = new LokiTransport({
 *   url: 'http://localhost:3100',
 *   defaultLabels: { service: 'my-app' },
 *   minLevel: 'info',
 *   excludePatterns: [/health.*check/i]
 * });
 * await transport.initialize();
 * const wrapped = transport.wrapLogger(baseLogger);
 * wrapped.info('sent to Loki and base logger');
 * ```
 *
 * @public
 */
export class LokiTransport {
  /**
   * Transport configuration (internal use)
   *
   * @internal
   */
  private readonly config: Required<LokiTransportConfig>;

  /**
   * Loki client instance (internal use)
   *
   * @internal
   */
  private client: LokiClient | null = null;

  /**
   * Transport statistics (internal use)
   *
   * @internal
   */
  private stats: MutableTransportStats;

  /**
   * Initialization completed flag (internal use)
   *
   * @internal
   */
  private isInitialized = false;

  /**
   * Create Loki transport
   *
   * @param config - Transport configuration
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
   * Initialize transport
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
   * Wrap existing logger to add Loki forwarding functionality
   *
   * @param baseLogger - Base logger
   * @returns Logger with Loki forwarding functionality
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
   * Send log directly to Loki
   *
   * @param level - Log level
   * @param message - Log message
   * @param args - Log arguments
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
   * Shutdown transport
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
   * Get transport statistics
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
   * Get transport configuration
   *
   * @returns Transport configuration (for debugging)
   *
   * @public
   */
  getConfig(): Readonly<LokiTransportConfig> {
    return { ...this.config };
  }

  /**
   * Check whether the given log level should be sent
   *
   * @param level - Log level to check
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
   * Send log to Loki (internal)
   *
   * @param level - Log level
   * @param message - Log message
   * @param args - Log arguments
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

    // If transport is disabled or not initialized
    if (!this.config.enabled || !this.isInitialized || !this.client) {
      this.stats.excludedLogs++;
      return;
    }

    // Check log level threshold
    if (!this.shouldSendLevel(level)) {
      this.stats.excludedLogs++;
      return;
    }

    // Check exclude patterns
    if (this.config.excludePatterns.some((pattern) => pattern.test(message))) {
      this.stats.excludedLogs++;
      return;
    }

    try {
      // Transform log and generate labels
      const logData = this.transformLog(level, message, args);

      // Retrieve context information
      const context = getLoggerContext(defaultLoggerContextConfig);
      const contextLabels = this.extractContextLabels(context);

      // Build final labels
      const finalLabels: LokiLabels = {
        ...logData.labels,
        ...contextLabels,
      };

      // Send to Loki
      await this.client.pushLog(level, logData.message, finalLabels, logData.metadata);

      this.stats.successfulLogs++;
    } catch (error) {
      this.stats.failedLogs++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      this.stats.lastErrorTime = new Date();

      // Invoke error handler
      this.config.onError(error instanceof Error ? error : new Error(String(error)), {
        level,
        message,
        args,
      });
    }
  }

  /**
   * Transform log and create labels/metadata
   *
   * @param level - Log level
   * @param message - Log message
   * @param args - Log arguments
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
    // If a custom transformer is provided
    if (this.config.logTransformer) {
      return this.config.logTransformer(level, message, args);
    }

    // Default transformation
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
   * Extract labels from logger context
   *
   * @param context - Logger context
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

    // HTTP context info (may be included as Record<string, unknown>)
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
 * Global Loki transport instance
 *
 * Default transport used across the application.
 *
 * @public
 */
export let globalLokiTransport: LokiTransport | null = null;

/**
 * Initialize the global Loki transport
 *
 * @param config - Transport configuration
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
 * Get the global Loki transport
 *
 * @returns Global transport instance or null if not initialized
 *
 * @public
 */
export function getLokiTransport(): LokiTransport | null {
  return globalLokiTransport;
}

/**
 * Shutdown the global Loki transport
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
 * Create Loki configuration from environment variables
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
