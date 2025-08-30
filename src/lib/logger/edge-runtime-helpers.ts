/**
 * Edge Runtime limitation handling helper functions
 *
 * Provides workarounds and best practices for Edge Runtime environment limitations.
 * Utilities for solving AsyncLocalStorage limitations and asynchronous context inheritance issues.
 */

import { createCompatibleStorage, detectRuntimeEnvironment } from './utils';

import type { LoggerContext } from './types';

/**
 * Edge Runtime compatible asynchronous wrapper function
 *
 * Provides explicit context binding as context is lost during asynchronous operations
 * in Edge Runtime environments.
 *
 * @param context - Context to preserve
 * @param asyncOperation - Asynchronous operation to execute
 * @returns Result of asynchronous operation with preserved context
 *
 * @example
 * ```typescript
 * const result = await withEdgeContext(context, async () => {
 *   const data = await fetch('/api/data');
 *   return data.json();
 * });
 * ```
 *
 * @public
 */
export async function withEdgeContext<T>(
  context: LoggerContext,
  asyncOperation: () => Promise<T>
): Promise<T> {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: Use explicit context binding
    const storage = createCompatibleStorage<LoggerContext>();
    return await storage.run(context, asyncOperation);
  } else {
    // Node.js environment: Normal execution
    return await asyncOperation();
  }
}

/**
 * Edge Runtime compatible Promise.all execution
 *
 * Preserves context for each operation when executing multiple asynchronous operations in parallel.
 * In Edge Runtime environments, automatic context inheritance is not possible,
 * so context is explicitly bound to each Promise operation.
 *
 * @param context - Context to preserve
 * @param operations - Array of asynchronous operations to execute
 * @returns Array containing results of all operations
 *
 * @example
 * ```typescript
 * const results = await promiseAllWithContext(context, [
 *   () => fetch('/api/user'),
 *   () => fetch('/api/settings'),
 *   () => fetch('/api/preferences')
 * ]);
 * ```
 *
 * @public
 */
export async function promiseAllWithContext<T>(
  context: LoggerContext,
  operations: (() => Promise<T>)[]
): Promise<T[]> {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: Bind context to each operation
    const storage = createCompatibleStorage<LoggerContext>();
    return await Promise.all(operations.map((op) => storage.run(context, op)));
  } else {
    // Node.js environment: Normal Promise.all
    return await Promise.all(operations.map((op) => op()));
  }
}

/**
 * Edge Runtime compatible timer execution
 *
 * Prevents context loss in setTimeout/setInterval and executes callback functions
 * with the specified context.
 *
 * @param context - Context to preserve
 * @param callback - Callback function to execute
 * @param delay - Delay time (milliseconds)
 * @returns Timer ID
 *
 * @example
 * ```typescript
 * const timerId = setTimeoutWithContext(context, () => {
 *   // Context is available within this callback
 *   logger.info('Delayed operation completed');
 * }, 1000);
 * ```
 *
 * @public
 */
export function setTimeoutWithContext(
  context: LoggerContext,
  callback: () => void,
  delay: number
): NodeJS.Timeout {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: Use callback with bound context
    const storage = createCompatibleStorage<LoggerContext>();
    const boundCallback = storage.bind(callback, context);
    return setTimeout(boundCallback, delay);
  } else {
    // Node.js environment: Normal setTimeout
    return setTimeout(callback, delay);
  }
}

/**
 * Edge Runtime compatible Interval execution
 *
 * Prevents context loss in setInterval and periodically executes callback functions
 * with the specified context.
 *
 * @param context - Context to preserve
 * @param callback - Callback function to execute
 * @param interval - Execution interval (milliseconds)
 * @returns IntervalID
 *
 * @example
 * ```typescript
 * const intervalId = setIntervalWithContext(context, () => {
 *   // Context is available even in periodic execution
 *   logger.debug('Periodic health check');
 * }, 30000);
 * ```
 *
 * @public
 */
export function setIntervalWithContext(
  context: LoggerContext,
  callback: () => void,
  interval: number
): NodeJS.Timeout {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: Use callback with bound context
    const storage = createCompatibleStorage<LoggerContext>();
    const boundCallback = storage.bind(callback, context);
    return setInterval(boundCallback, interval);
  } else {
    // Node.js environment: Normal setInterval
    return setInterval(callback, interval);
  }
}

/**
 * Get Edge Runtime limitation diagnostic information
 *
 * Analyzes Edge Runtime limitations and compliance status in the current execution environment
 * and provides diagnostic information for developers.
 *
 * @returns Diagnostic information object
 *
 * @example
 * ```typescript
 * const diagnostics = getEdgeRuntimeDiagnostics();
 * console.log('Runtime:', diagnostics.runtime);
 * console.log('AsyncLocalStorage available:', diagnostics.asyncLocalStorageAvailable);
 * ```
 *
 * @public
 */
export function getEdgeRuntimeDiagnostics(): {
  runtime: 'edge' | 'nodejs' | 'browser';
  asyncLocalStorageAvailable: boolean;
  contextStorageType: 'AsyncLocalStorage' | 'EdgeContextStorage' | 'Unknown';
  recommendations: string[];
} {
  const runtime = detectRuntimeEnvironment();

  // AsyncLocalStorage availability check
  let asyncLocalStorageAvailable = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks');
    asyncLocalStorageAvailable = typeof AsyncLocalStorage === 'function';
  } catch {
    asyncLocalStorageAvailable = false;
  }

  // Context storage type determination
  let contextStorageType: 'AsyncLocalStorage' | 'EdgeContextStorage' | 'Unknown';
  if (runtime === 'edge') {
    contextStorageType = 'EdgeContextStorage';
  } else if (asyncLocalStorageAvailable) {
    contextStorageType = 'AsyncLocalStorage';
  } else {
    contextStorageType = 'Unknown';
  }

  // Environment-specific recommendations
  const recommendations: string[] = [];
  if (runtime === 'edge') {
    recommendations.push(
      'Use explicit context binding with storage.bind() for async operations',
      'Avoid relying on automatic context inheritance in Promise chains',
      'Use withEdgeContext() helper for complex async flows',
      'Implement manual context passing for middleware and API routes'
    );
  } else if (runtime === 'nodejs' && asyncLocalStorageAvailable) {
    recommendations.push(
      'AsyncLocalStorage is available - use standard context management',
      'Consider using logger context manager for automatic context handling'
    );
  } else {
    recommendations.push(
      'Limited context support - implement explicit context passing',
      'Consider upgrading to newer Node.js version for AsyncLocalStorage support'
    );
  }

  return {
    runtime,
    asyncLocalStorageAvailable,
    contextStorageType,
    recommendations,
  };
}

/**
 * Check recommended implementation patterns in Edge Runtime environment
 *
 * Statically analyzes whether current code appropriately handles limitations
 * in Edge Runtime environment and provides improvement suggestions.
 *
 * @param codePattern - Code pattern to check
 * @returns Analysis results and improvement suggestions
 *
 * @public
 */
export function analyzeEdgeRuntimeCompliance(codePattern: {
  hasAsyncOperations: boolean;
  usesPromiseAll: boolean;
  usesSetTimeout: boolean;
  usesSetInterval: boolean;
  hasContextDependency: boolean;
}): {
  compliant: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (codePattern.hasContextDependency) {
    if (codePattern.hasAsyncOperations) {
      issues.push('Async operations may lose context in Edge Runtime');
      suggestions.push('Use withEdgeContext() wrapper for async operations');
    }

    if (codePattern.usesPromiseAll) {
      issues.push('Promise.all may not preserve context in Edge Runtime');
      suggestions.push('Use promiseAllWithContext() helper function');
    }

    if (codePattern.usesSetTimeout) {
      issues.push('setTimeout callbacks lose context in Edge Runtime');
      suggestions.push('Use setTimeoutWithContext() helper function');
    }

    if (codePattern.usesSetInterval) {
      issues.push('setInterval callbacks lose context in Edge Runtime');
      suggestions.push('Use setIntervalWithContext() helper function');
    }
  }

  const compliant = issues.length === 0;

  if (compliant && codePattern.hasContextDependency) {
    suggestions.push(
      'Code appears to be Edge Runtime compliant',
      'Consider adding integration tests to verify context behavior'
    );
  }

  return {
    compliant,
    issues,
    suggestions,
  };
}

/**
 * Edge Runtime compatible context inheritance wrapper
 *
 * Wraps functions and class methods to ensure reliable context inheritance
 * even in Edge Runtime environments.
 *
 * @param target - Function to wrap
 * @param context - Context to inherit
 * @returns Function with guaranteed context inheritance
 *
 * @example
 * ```typescript
 * const wrappedFunction = wrapWithContext(originalFunction, context);
 * await wrappedFunction(arg1, arg2);
 * ```
 *
 * @typeParam T - Type of target function (preserves function signature)
 * @public
 */
export function wrapWithContext<T extends (...args: unknown[]) => unknown>(
  target: T,
  context: LoggerContext
): T {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: Explicit context binding
    const storage = createCompatibleStorage<LoggerContext>();
    return storage.bind(target, context) as T;
  } else {
    // Node.js environment: Return original function as-is
    return target;
  }
}
