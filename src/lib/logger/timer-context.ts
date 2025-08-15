/**
 * Timer Context Integration for Logger
 *
 * Provides context-aware setTimeout and setInterval functions that preserve
 * OpenTelemetry trace context across asynchronous timer operations.
 *
 * This ensures that async timers maintain the same trace_id and span context
 * as their parent execution context, enabling proper distributed tracing.
 */

import { getLoggerContext } from './context';

import type { LoggerContextConfig } from './context';
import type { LoggerContext } from './types';

/**
 * Timer handle that includes context information
 *
 * @public
 */
export interface ContextualTimerHandle {
  /** The underlying timer ID from setTimeout/setInterval */
  readonly timerId: NodeJS.Timeout;
  /** The context that was active when the timer was created */
  readonly context: LoggerContext | null;
  /** Cancel the timer */
  clear(): void;
}

/**
 * Internal helper to create context-preserving callback wrapper
 */
function createContextWrapper<TArgs extends unknown[]>(
  config: LoggerContextConfig,
  callback: (...args: TArgs) => void,
  currentContext: LoggerContext | null
): (...callbackArgs: TArgs) => void {
  return (...callbackArgs: TArgs) => {
    if (currentContext) {
      // Execute callback within the preserved context
      config.storage.run(currentContext, () => {
        callback(...callbackArgs);
      });
    } else {
      // No context to preserve, execute directly
      callback(...callbackArgs);
    }
  };
}

/**
 * Context-aware setTimeout wrapper
 *
 * Captures the current logger context and ensures that the callback
 * executes within the same context, preserving trace_id and other context data.
 *
 * @param config - Logger context configuration
 * @param callback - Function to execute after delay
 * @param delay - Delay in milliseconds
 * @param args - Additional arguments to pass to callback
 * @returns Timer handle with context information
 *
 * @example
 * ```typescript
 * const config = createLoggerContextConfig();
 *
 * runWithLoggerContext(config, { requestId: 'req_123', traceId: 'trace_456' }, () => {
 *   // This timeout will preserve the trace context
 *   const timer = setTimeoutWithContext(config, () => {
 *     // This callback will have the same requestId and traceId
 *     console.log('Timer executed with preserved context');
 *   }, 1000);
 * });
 * ```
 *
 * @public
 */
export function setTimeoutWithContext<TArgs extends unknown[]>(
  config: LoggerContextConfig,
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): ContextualTimerHandle {
  // Capture the current context
  const currentContext = getLoggerContext(config);

  // Create the wrapped callback that restores context
  const wrappedCallback = createContextWrapper(config, callback, currentContext ?? null);

  // Create the timer with wrapped callback
  const timerId = setTimeout(wrappedCallback, delay, ...args);

  return {
    timerId,
    context: currentContext ?? null,
    clear: () => clearTimeout(timerId),
  };
}

/**
 * Context-aware setInterval wrapper
 *
 * Captures the current logger context and ensures that each interval callback
 * executes within the same context, preserving trace_id and other context data.
 *
 * @param config - Logger context configuration
 * @param callback - Function to execute on each interval
 * @param delay - Interval delay in milliseconds
 * @param args - Additional arguments to pass to callback
 * @returns Timer handle with context information
 *
 * @example
 * ```typescript
 * const config = createLoggerContextConfig();
 *
 * runWithLoggerContext(config, { requestId: 'req_123', traceId: 'trace_456' }, () => {
 *   // This interval will preserve the trace context for each execution
 *   const timer = setIntervalWithContext(config, () => {
 *     // Each callback execution will have the same requestId and traceId
 *     console.log('Interval executed with preserved context');
 *   }, 5000);
 *
 *   // Stop after 30 seconds
 *   setTimeout(() => timer.clear(), 30000);
 * });
 * ```
 *
 * @public
 */
export function setIntervalWithContext<TArgs extends unknown[]>(
  config: LoggerContextConfig,
  callback: (...args: TArgs) => void,
  delay: number,
  ...args: TArgs
): ContextualTimerHandle {
  // Capture the current context
  const currentContext = getLoggerContext(config);

  // Create the wrapped callback that restores context
  const wrappedCallback = createContextWrapper(config, callback, currentContext ?? null);

  // Create the interval with wrapped callback
  const timerId = setInterval(wrappedCallback, delay, ...args);

  return {
    timerId,
    context: currentContext ?? null,
    clear: () => clearInterval(timerId),
  };
}

/**
 * Global timer context manager
 *
 * Provides utilities for managing context-aware timers globally.
 *
 * ## クラス実装の理由
 *
 * **Pure Functions First原則の例外として、以下の理由でクラス実装を採用:**
 * - **状態管理**: アクティブタイマーの追跡とライフサイクル管理が必要
 * - **リソース管理**: タイマーの適切なクリーンアップとメモリリーク防止
 * - **グローバル管理**: アプリケーション全体でのタイマー統制とモニタリング
 * - **コンテキスト保持**: 非同期処理でのロガーコンテキスト継承
 * - **デバッグ支援**: アクティブタイマーの可視化とトラブルシューティング
 *
 * @public
 */
export class TimerContextManager {
  /** Logger context configuration */
  private readonly config: LoggerContextConfig;
  /** Set of currently active timers being managed */
  private readonly activeTimers = new Set<ContextualTimerHandle>();

  constructor(config: LoggerContextConfig) {
    this.config = config;
  }

  /**
   * Internal helper to create a self-cleaning timeout
   */
  private createSelfCleaningTimeout<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ): ContextualTimerHandle {
    // eslint-disable-next-line prefer-const
    let timerRef: ContextualTimerHandle;

    // Wrap the callback to auto-remove timer on completion
    const wrappedCallback = (...callbackArgs: TArgs) => {
      this.activeTimers.delete(timerRef);
      callback(...callbackArgs);
    };

    timerRef = setTimeoutWithContext(this.config, wrappedCallback, delay, ...args);
    return timerRef;
  }

  /**
   * Create a context-aware setTimeout
   *
   * @param callback - Function to execute after delay
   * @param delay - Delay in milliseconds
   * @param args - Additional arguments to pass to callback
   * @returns Timer handle with context information
   */
  setTimeout<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ): ContextualTimerHandle {
    // Create timer with self-cleaning wrapper
    const timer = this.createSelfCleaningTimeout(callback, delay, ...args);
    this.activeTimers.add(timer);

    // Override clear to also remove from active timers
    const originalClear = timer.clear;
    timer.clear = () => {
      originalClear();
      this.activeTimers.delete(timer);
    };

    return timer;
  }

  /**
   * Create a context-aware setInterval
   *
   * @param callback - Function to execute on each interval
   * @param delay - Interval delay in milliseconds
   * @param args - Additional arguments to pass to callback
   * @returns Timer handle with context information
   */
  setInterval<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
    ...args: TArgs
  ): ContextualTimerHandle {
    const timer = setIntervalWithContext(this.config, callback, delay, ...args);
    this.activeTimers.add(timer);

    // Auto-remove from active timers when cleared
    const originalClear = timer.clear;
    timer.clear = () => {
      originalClear();
      this.activeTimers.delete(timer);
    };

    return timer;
  }

  /**
   * Clear all active timers managed by this instance
   *
   * @returns Number of timers that were cleared
   */
  clearAllTimers(): number {
    const count = this.activeTimers.size;
    for (const timer of this.activeTimers) {
      timer.clear();
    }
    this.activeTimers.clear();
    return count;
  }

  /**
   * Get information about active timers
   *
   * @returns Array of timer information
   */
  getActiveTimers(): Array<{
    timerId: NodeJS.Timeout;
    context: LoggerContext | null;
  }> {
    return Array.from(this.activeTimers).map((timer) => ({
      timerId: timer.timerId,
      context: timer.context,
    }));
  }

  /**
   * Get the number of active timers
   *
   * @returns Number of active timers
   */
  getActiveTimerCount(): number {
    return this.activeTimers.size;
  }
}

/**
 * Create a timer context manager instance
 *
 * @param config - Logger context configuration
 * @returns Timer context manager instance
 *
 * @example
 * ```typescript
 * const config = createLoggerContextConfig();
 * const timerManager = createTimerContextManager(config);
 *
 * runWithLoggerContext(config, { requestId: 'req_123' }, () => {
 *   // Both timers will preserve the request context
 *   timerManager.setTimeout(() => {
 *     console.log('Timeout with context');
 *   }, 1000);
 *
 *   timerManager.setInterval(() => {
 *     console.log('Interval with context');
 *   }, 5000);
 * });
 * ```
 *
 * @public
 */
export function createTimerContextManager(config: LoggerContextConfig): TimerContextManager {
  return new TimerContextManager(config);
}
