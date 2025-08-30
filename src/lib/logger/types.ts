/**
 * Structured logging system type definitions
 *
 * High-performance logging system based on Next.js 15 + Pino.
 * Provides type-safe interfaces for structured logging with
 * OpenTelemetry compliance and performance optimization.
 */

/**
 * Log level definition array
 *
 * OpenTelemetry-compliant log level definitions.
 * 'trace' is the most detailed level, 'fatal' is the most critical.
 * These levels follow industry standards for consistent log filtering
 * and monitoring integration.
 *
 * @public
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

/**
 * Log level type definition
 *
 * Type-safe log level derived from LOG_LEVELS array.
 * This ensures compile-time validation of log levels while
 * maintaining runtime performance. Provides both safety
 * and optimal performance characteristics.
 *
 * @public
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Log argument type definition
 *
 * Defines acceptable argument types for log methods.
 * Only values that can be safely serialized by JSON.stringify are allowed.
 * This constraint ensures reliable log transmission and storage.
 *
 * - string: Text messages and identifiers
 * - number: Numeric data and statistics
 * - boolean: Flags and state values
 * - `Record<string, unknown>`: Structured data objects
 * - Error: Error objects (automatically serialized)
 * - null/undefined: Representation of absent values
 *
 * @public
 */
export type LogArgument =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | Error
  | null
  | undefined;

/**
 * Unified Logger interface
 *
 * Provides consistent logger API for both server (Pino) and client (Console)
 * environments. Enables structured logging and performance optimization
 * across different runtime contexts.
 *
 * All log methods are asynchronous and thread-safe by design.
 * Production environments automatically apply log level filtering
 * for optimal performance and security.
 *
 * @public
 */
export interface Logger {
  /**
   * Trace level log output
   *
   * Most detailed debugging information. Recommended for development
   * environments only due to potential performance impact and verbosity.
   * Use for fine-grained execution flow tracking.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  trace(message: string, ...args: LogArgument[]): void;

  /**
   * Debug level log output
   *
   * Detailed information for development and staging environments.
   * Includes variable states, function parameters, and intermediate
   * processing results for troubleshooting.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  debug(message: string, ...args: LogArgument[]): void;

  /**
   * Info level log output
   *
   * General informational logs safe for production environments.
   * Used for application flow milestones, configuration changes,
   * and important business events.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  info(message: string, ...args: LogArgument[]): void;

  /**
   * Warning level log output
   *
   * Potential issues and performance warnings that don't prevent
   * normal operation but may indicate problems requiring attention.
   * Used for deprecated features, suboptimal performance, etc.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  warn(message: string, ...args: LogArgument[]): void;

  /**
   * Error level log output
   *
   * Recoverable error information that allows continued processing.
   * Used for handled exceptions, validation failures, and other
   * errors that don't crash the application.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  error(message: string, ...args: LogArgument[]): void;

  /**
   * Fatal level log output
   *
   * Critical errors requiring application termination.
   * Used for unrecoverable system failures, security breaches,
   * or corruption that prevents safe operation.
   *
   * @param message - Log message
   * @param args - Additional log data
   *
   * @public
   */
  fatal(message: string, ...args: LogArgument[]): void;

  /**
   * Log level enabled check
   *
   * Verifies whether the specified log level would be output
   * with current configuration. This enables performance optimization
   * by avoiding expensive log preparation for disabled levels.
   *
   * @param level - Log level to check
   * @returns true if log level is enabled
   *
   * @public
   */
  isLevelEnabled(level: LogLevel): boolean;
}

/**
 * Logger context definition
 *
 * 🚨 High-Risk Response: Child Logger Context Definition
 *
 * Structured data for distributed tracing and context tracking.
 * Integrates OpenTelemetry-compliant trace information with
 * application-specific context for comprehensive observability.
 *
 * For GDPR compliance, Personally Identifiable Information (PII)
 * must be hashed or pseudonymized before storage. This design
 * supports privacy-by-design logging architectures.
 *
 * @public
 */
export interface LoggerContext extends Record<string, unknown> {
  /**
   * Request-specific identifier
   *
   * Unique identifier for tracking a single HTTP request or task.
   * UUID v4 format is recommended for uniqueness and collision
   * resistance in distributed systems.
   *
   * @public
   */
  requestId: string;

  /**
   * Distributed trace identifier
   *
   * OpenTelemetry-compliant trace identifier for tracking
   * requests across microservice boundaries. Essential for
   * distributed system observability and debugging.
   *
   * @public
   */
  traceId?: string;

  /**
   * Span identifier
   *
   * Identifies specific operations within a trace.
   * Critical for performance analysis and bottleneck
   * identification in distributed request flows.
   *
   * @public
   */
  spanId?: string;

  /**
   * User identifier
   *
   * Authenticated user identifier. For GDPR compliance,
   * use hashed or pseudonymized values rather than raw
   * personal identifiers.
   *
   * @public
   */
  userId?: string;

  /**
   * Session ID
   *
   * ID for tracking user sessions.
   * Used for security analysis and user behavior analysis.
   *
   * @public
   */
  sessionId?: string;

  /**
   * Event name
   *
   * Event identifier for structured logging.
   * Used for metrics aggregation and alert configuration.
   *
   * @public
   */
  event_name?: string;

  /**
   * Event category
   *
   * Classification of log events. Predefined categories
   * used for automation of monitoring and alerts.
   *
   * @public
   */
  event_category?: 'user_action' | 'system_event' | 'error_event' | 'security_event';
}

/**
 * Logging middleware configuration
 *
 * Control HTTP request/response logging behavior.
 * Fine-grained configuration is possible considering
 * the balance between security and performance.
 *
 * @public
 */
export interface LoggingMiddlewareOptions {
  /**
   * HTTP header logging flag
   *
   * When true, record request and response headers.
   * Caution required as sensitive information may be included.
   *
   * @defaultValue false
   * @public
   */
  logHeaders?: boolean;

  /**
   * HTTP body logging flag
   *
   * When true, record request and response body.
   * Be careful with recording large data or sensitive information.
   *
   * @defaultValue false
   * @public
   */
  logBody?: boolean;

  /**
   * Log message label configuration
   *
   * Customize log messages used in each phase.
   * Used for internationalization and detail level adjustment.
   *
   * @public
   */
  labels?: {
    /**
     * Label at request start
     * @defaultValue "Request started"
     * @public
     */
    start?: string;

    /**
     * Label on successful request
     * @defaultValue "Request completed"
     * @public
     */
    success?: string;

    /**
     * Label on request error
     * @defaultValue "Request failed"
     * @public
     */
    error?: string;
  };
}

/**
 * Base properties configuration
 *
 * Basic information automatically assigned to all log entries.
 * Used for application identification and environment management.
 *
 * @public
 */
export interface BaseProperties {
  /**
   * Application name
   *
   * Identifier of the application that generated the log.
   * Used for log separation in microservice environments.
   *
   * @public
   */
  app: string;

  /**
   * Runtime environment
   *
   * Environment identifier such as development/staging/production.
   * Used for environment-specific log filtering.
   *
   * @public
   */
  env: string;

  /**
   * Process ID
   *
   * Unique identifier of Node.js process.
   * Used for debugging and performance analysis.
   *
   * @public
   */
  pid: number;

  /**
   * Application version
   *
   * Version information of deployed application.
   * Used for release tracking and failure analysis.
   *
   * @public
   */
  version?: string;

  /**
   * Log schema version
   *
   * Version of structured log format.
   * Used to ensure compatibility with log parsers.
   *
   * @public
   */
  log_schema_version: string;
}

/**
 * OpenTelemetry compliant severity numbers
 *
 * ⚠️ Medium risk response: severity_number compliant with OpenTelemetry Logs
 *
 * Numeric severity based on RFC 5424 Syslog protocol.
 * Used for automatic classification and monitoring alerts in log aggregation systems.
 *
 * Higher numbers indicate higher severity, with 21 (fatal) being the highest level.
 * Ensures compatibility with external log systems.
 *
 * @public
 */
export const SEVERITY_NUMBERS = {
  /** Trace level: Detailed debug information (severity: 1) */
  trace: 1,
  /** Debug level: Development information (severity: 5) */
  debug: 5,
  /** Info level: General information (severity: 9) */
  info: 9,
  /** Warn level: Requires attention (severity: 13) */
  warn: 13,
  /** Error level: Recoverable errors (severity: 17) */
  error: 17,
  /** Fatal level: System stopping errors (severity: 21) */
  fatal: 21,
} as const;

/**
 * Structured event definition
 *
 * Structured records of business logic and user operations.
 * Used for metrics collection, user behavior analysis, and security monitoring.
 *
 * Design compliant with OpenTelemetry Events model.
 *
 * @public
 */
export interface StructuredEvent {
  /**
   * Event name
   *
   * Unique identifier of the occurred event.
   * Used as key for metrics aggregation.
   *
   * @example "user_login", "payment_completed", "api_error"
   * @public
   */
  event_name: string;

  /**
   * Event category
   *
   * Classification category of events. Used for monitoring alerts
   * and automatic grouping in dashboards.
   *
   * @public
   */
  event_category: 'user_action' | 'system_event' | 'error_event' | 'security_event';

  /**
   * Event attributes
   *
   * Event-specific detailed data.
   * Structured information for analysis and debugging.
   *
   * @public
   */
  event_attributes: Record<string, unknown>;
}

/**
 * Log entry basic structure
 *
 * Standard log entries generated by structured logging system.
 * Design compliant with OpenTelemetry Logs Data Model.
 *
 * Defines required fields common to all log entries and
 * extensible dynamic properties.
 *
 * @public
 */
export interface LogEntry {
  /**
   * Log generation timestamp
   *
   * UTC time string in ISO 8601 format.
   * Used for time series analysis and correlation analysis.
   *
   * @example "2024-01-15T10:30:45.123Z"
   * @public
   */
  timestamp: string;

  /**
   * Log level
   *
   * One of trace/debug/info/warn/error/fatal.
   * Used for log filtering and severity determination.
   *
   * @public
   */
  level: LogLevel;

  /**
   * OpenTelemetry severity number
   *
   * Numeric severity compliant with RFC 5424.
   * Used to ensure compatibility with external systems.
   *
   * @public
   */
  severity_number: number;

  /**
   * Log message
   *
   * Human-readable message string.
   * Primary field for search and alert configuration.
   *
   * @public
   */
  message: string;

  /**
   * Log schema version
   *
   * Version of structured log format.
   * Used to ensure parser compatibility.
   *
   * @public
   */
  log_schema_version: string;

  /**
   * Dynamic properties
   *
   * Additional information specific to log entry.
   * Stores context data and detailed analysis data.
   *
   * @public
   */
  [key: string]: unknown;
}

/**
 * Sanitized log entry
 *
 * Log data after security sanitization processing.
 * Prevents log injection attacks and ensures safe output.
 *
 * Represents clean log data protected from XSS,
 * SQL injection, and control character attacks.
 *
 * @public
 */
export interface SanitizedLogEntry {
  /**
   * Sanitized message
   *
   * Message with dangerous control characters and special characters removed.
   * Safe to use in console output and file output.
   *
   * @public
   */
  message: string;

  /**
   * Sanitized additional data
   *
   * Optional structured data.
   * Recursively sanitized processing has been applied.
   *
   * @public
   */
  data?: unknown;
}
