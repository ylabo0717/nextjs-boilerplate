/**
 * 🚨 High-risk response: Complete implementation of Child Logger + Edge Runtime compatible context
 * Enhanced trace tracking through complete request context management
 * Addresses AsyncLocalStorage limitations in Edge Runtime environment
 */

import { sanitizeLogEntry } from './sanitizer';
import { SEVERITY_NUMBERS } from './types';
import { createCompatibleStorage } from './utils';

import type { Logger, LoggerContext, LogArgument } from './types';
import type { CompatibleStorage } from './utils';

/**
 * Logger context management configuration type
 *
 * Configuration object for context management using AsyncLocalStorage.
 * Immutable configuration used as arguments for pure functions.
 *
 * @public
 */
export type LoggerContextConfig = {
  /** Environment-compatible context storage area (AsyncLocalStorage compatible) */
  readonly storage: CompatibleStorage<LoggerContext>;
};

/**
 * Create Logger context configuration (pure function)
 *
 * Generate immutable configuration object containing AsyncLocalStorage instance.
 * Pure function executed only once at application startup.
 *
 * @returns Immutable context configuration object
 *
 * @public
 */
export function createLoggerContextConfig(): LoggerContextConfig {
  return {
    storage: createCompatibleStorage<LoggerContext>(),
  } as const;
}

/**
 * Execution within request context (pure function + controlled side effects)
 *
 * Execute function with specified context.
 * Context is automatically inherited in all synchronous and asynchronous processes during execution.
 *
 * Used at HTTP request processing entry points,
 * enabling automatic tracking of context information in subsequent processing.
 *
 * @param config - Context configuration
 * @param context - Context information to set
 * @param fn - Function to execute within context
 * @returns Function execution result
 *
 * @public
 */
export function runWithLoggerContext<T>(
  config: LoggerContextConfig,
  context: LoggerContext,
  fn: () => T
): T {
  return config.storage.run(context, fn);
}

/**
 * Get current context (pure function)
 *
 * Get currently executing context from AsyncLocalStorage.
 * Returns undefined when executed outside context.
 *
 * Used for context information access in middleware or arbitrary processing.
 *
 * @param config - Context configuration
 * @returns Current context information, or undefined
 *
 * @public
 */
export function getLoggerContext(config: LoggerContextConfig): LoggerContext | undefined {
  return config.storage.getStore();
}

/**
 * Partial context update (pure function)
 *
 * Create new context by merging with existing context.
 * Preserves immutability without modifying original context.
 *
 * Used for gradual addition of additional information (user ID, session information, etc.)
 * during request processing.
 *
 * @param config - Context configuration
 * @param updates - Context information to update
 * @returns Merged new context, or undefined
 *
 * @public
 */
export function updateLoggerContext(
  config: LoggerContextConfig,
  updates: Partial<LoggerContext>
): LoggerContext | undefined {
  const currentContext = getLoggerContext(config);
  if (!currentContext) {
    return undefined;
  }

  return { ...currentContext, ...updates };
}

/**
 * Generate context-aware Child Logger (pure function)
 *
 * Create Child Logger compatible with unified Logger interface.
 * Automatically adds context information to all log outputs.
 *
 * Wraps base logger methods and automatically applies context information
 * and security sanitization.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param _additionalContext - Additional context information (for future extension)
 * @returns Context-aware logger instance
 *
 * @public
 */
export function createContextualLogger(
  config: LoggerContextConfig,
  baseLogger: Logger,
  _additionalContext: Partial<LoggerContext> = {}
): Logger {
  return {
    trace: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.trace.bind(baseLogger), 'trace', message, args);
    },
    debug: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.debug.bind(baseLogger), 'debug', message, args);
    },
    info: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.info.bind(baseLogger), 'info', message, args);
    },
    warn: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.warn.bind(baseLogger), 'warn', message, args);
    },
    error: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.error.bind(baseLogger), 'error', message, args);
    },
    fatal: (message: string, ...args: LogArgument[]) => {
      logWithContext(config, baseLogger.fatal.bind(baseLogger), 'fatal', message, args);
    },
    isLevelEnabled: (level) => baseLogger.isLevelEnabled(level),
  };
}

/**
 * Automatically add context information to log entries (pure function + controlled side effects)
 *
 * Wrap base logger's log function and automatically add current context information
 * and OpenTelemetry-compliant metadata.
 *
 * Apply security sanitization to ensure safe log output.
 *
 * @param config - Context configuration
 * @param logFunction - Base logger's log function
 * @param level - Log level
 * @param message - Log message
 * @param args - Additional log arguments
 *
 * @internal
 */
function logWithContext(
  config: LoggerContextConfig,
  logFunction: (message: string, ...args: LogArgument[]) => void,
  level: string,
  message: string,
  args: readonly LogArgument[]
): void {
  const currentContext = getLoggerContext(config);

  // Create log entry with context information
  const severityNumber = SEVERITY_NUMBERS[level as keyof typeof SEVERITY_NUMBERS];
  const contextData = {
    ...currentContext,
    severity_number: severityNumber,
    timestamp: new Date().toISOString(),
  };

  // Sanitize processing
  const sanitized = sanitizeLogEntry(message, contextData);

  // Execute combined with original arguments
  logFunction(sanitized.message, sanitized.data as LogArgument, ...args);
}

/**
 * Helper for user action logging (pure function + controlled side effects)
 *
 * Structured log recording of user operations.
 * Used for metrics collection, user behavior analysis, and A/B test analysis.
 *
 * Automatically assigns 'user_action' category and event name prefix.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param action - User action name
 * @param details - Action-specific detail information
 *
 * @public
 */
export function logUserAction(
  config: LoggerContextConfig,
  baseLogger: Logger,
  action: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
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
 * Helper for system event logging (pure function + controlled side effects)
 *
 * Structured log recording of application internal events.
 * Used for system monitoring, performance analysis, and fault detection.
 *
 * Automatically assigns 'system_event' category and event name prefix.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param event - System event name
 * @param details - Event-specific detail information
 *
 * @public
 */
export function logSystemEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
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
 * Helper for security event logging (pure function + controlled side effects)
 *
 * High-priority log recording of security-related events.
 * Used for recording unauthorized access detection, authentication failures, permission violations, etc.
 *
 * Automatically records with 'security_event' category, 'high' severity, and error level.
 * Target for automatic alerts in security monitoring systems.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param event - Security event name
 * @param details - Event-specific detail information
 *
 * @public
 */
export function logSecurityEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
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
 * Helper for error event logging (pure function + controlled side effects)
 *
 * Structured log recording of application errors.
 * Unified processing of error information from Error objects or Unknown values.
 *
 * Used for error tracking, debugging, and fault analysis.
 * Automatically records with 'error_event' category and error level.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param error - Error object or value
 * @param context_info - Context information when error occurred
 *
 * @public
 */
export function logErrorEvent(
  config: LoggerContextConfig,
  baseLogger: Logger,
  error: Error | unknown,
  context_info: Record<string, unknown> = {}
): void {
  const context = getLoggerContext(config);
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
 * Helper for performance measurement (pure function + controlled side effects)
 *
 * Structured log recording of application performance metrics.
 * Records measurement values such as execution time, processing speed, resource usage, etc.
 *
 * Used for performance monitoring, bottleneck analysis, and optimization effect measurement.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 * @param metric - Metrics name
 * @param value - Measured value
 * @param unit - Measurement unit (default: 'ms')
 *
 * @public
 */
export function logPerformanceMetric(
  config: LoggerContextConfig,
  baseLogger: Logger,
  metric: string,
  value: number,
  unit: string = 'ms'
): void {
  const context = getLoggerContext(config);
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
 * Helper for setting trace ID and span ID (side effect function)
 *
 * Trace information configuration for integration with OpenTelemetry.
 * Used for request tracking in distributed tracing.
 *
 * Adds distributed trace identifiers to the current context,
 * enabling request tracking between microservices.
 *
 * @param config - Context configuration
 * @param traceId - Distributed trace identifier
 * @param spanId - Span identifier (optional)
 *
 * @public
 */
export function setTraceContext(
  config: LoggerContextConfig,
  traceId: string,
  spanId?: string
): void {
  const currentContext = getLoggerContext(config);
  if (currentContext) {
    currentContext.traceId = traceId;
    if (spanId) {
      currentContext.spanId = spanId;
    }
  }
}

/**
 * Debug use: Display current context information (pure function + controlled side effects)
 *
 * For context state verification during development and debugging.
 * Used to verify that context information setting and inheritance are working correctly.
 *
 * Avoid use in production environment, recommend execution only in development and staging environments.
 *
 * @param config - Context configuration
 * @param baseLogger - Base logger instance
 *
 * @public
 */
export function debugLoggerContext(config: LoggerContextConfig, baseLogger: Logger): void {
  const context = getLoggerContext(config);
  if (context) {
    baseLogger.debug('Current logger context', context as LogArgument);
  } else {
    baseLogger.debug('No logger context found');
  }
}

// ===================================================================
// Default instances and helper functions (backward compatibility)
// ===================================================================

/**
 * Default Logger context configuration
 *
 * Default configuration used throughout the application.
 * Created only once and used as immutable thereafter.
 *
 * @public
 */
export const defaultLoggerContextConfig = createLoggerContextConfig();

/**
 * Default context manager (backward compatibility)
 *
 * Object-type interface for compatibility with existing code.
 * Wraps pure functions with existing method call patterns.
 *
 * @public
 */
export const loggerContextManager = {
  runWithContext: <T>(context: LoggerContext, fn: () => T) =>
    runWithLoggerContext(defaultLoggerContextConfig, context, fn),
  getContext: () => getLoggerContext(defaultLoggerContextConfig),
  updateContext: (updates: Partial<LoggerContext>) =>
    updateLoggerContext(defaultLoggerContextConfig, updates),
  createContextualLogger: (baseLogger: Logger, additionalContext?: Partial<LoggerContext>) =>
    createContextualLogger(defaultLoggerContextConfig, baseLogger, additionalContext),
  logUserAction: (baseLogger: Logger, action: string, details?: Record<string, unknown>) =>
    logUserAction(defaultLoggerContextConfig, baseLogger, action, details),
  logSystemEvent: (baseLogger: Logger, event: string, details?: Record<string, unknown>) =>
    logSystemEvent(defaultLoggerContextConfig, baseLogger, event, details),
  logSecurityEvent: (baseLogger: Logger, event: string, details?: Record<string, unknown>) =>
    logSecurityEvent(defaultLoggerContextConfig, baseLogger, event, details),
  logErrorEvent: (
    baseLogger: Logger,
    error: Error | unknown,
    context_info?: Record<string, unknown>
  ) => logErrorEvent(defaultLoggerContextConfig, baseLogger, error, context_info),
  logPerformanceMetric: (baseLogger: Logger, metric: string, value: number, unit?: string) =>
    logPerformanceMetric(defaultLoggerContextConfig, baseLogger, metric, value, unit),
  setTraceContext: (traceId: string, spanId?: string) =>
    setTraceContext(defaultLoggerContextConfig, traceId, spanId),
  debugContext: (baseLogger: Logger) => debugLoggerContext(defaultLoggerContextConfig, baseLogger),
};

// Utility function exports (backward compatibility)

/**
 * Context-aware function execution (backward compatibility)
 *
 * Convenient alias using default configuration.
 *
 * @param context - Context information to set
 * @param fn - Function to execute within context
 * @returns Function execution result
 *
 * @public
 */
export const runWithLoggerContextCompat = <T>(context: LoggerContext, fn: () => T) =>
  loggerContextManager.runWithContext(context, fn);

/**
 * Get current context (backward compatibility)
 *
 * Convenient alias using default configuration.
 *
 * @returns Current context information, or undefined
 *
 * @public
 */
export const getLoggerContextCompat = () => loggerContextManager.getContext();

/**
 * Create context-aware logger (backward compatibility)
 *
 * Convenient alias using default configuration.
 *
 * @param baseLogger - Base logger instance
 * @param context - Additional context information (optional)
 * @returns Context-aware logger instance
 *
 * @public
 */
export const createContextualLoggerCompat = (
  baseLogger: Logger,
  context?: Partial<LoggerContext>
) => loggerContextManager.createContextualLogger(baseLogger, context);
