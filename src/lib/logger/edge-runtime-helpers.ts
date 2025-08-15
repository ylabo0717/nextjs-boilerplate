/**
 * Edge Runtime制限対応ヘルパー関数
 *
 * Edge Runtime環境での制限事項に対する回避策とベストプラクティスを提供します。
 * AsyncLocalStorageの制限、非同期コンテキスト継承の課題を解決するためのユーティリティです。
 */

import { createCompatibleStorage, detectRuntimeEnvironment } from './utils';

import type { LoggerContext } from './types';

/**
 * Edge Runtime対応の非同期ラッパー関数
 *
 * Edge Runtime環境では非同期操作でコンテキストが失われるため、
 * 明示的なコンテキストバインディングを提供します。
 *
 * @param context - 保持するコンテキスト
 * @param asyncOperation - 実行する非同期操作
 * @returns コンテキストが保持された非同期操作の結果
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
    // Edge Runtime: 明示的なコンテキストバインディングを使用
    const storage = createCompatibleStorage<LoggerContext>();
    return await storage.run(context, asyncOperation);
  } else {
    // Node.js環境: 通常の実行
    return await asyncOperation();
  }
}

/**
 * Edge Runtime対応のPromise.all実行
 *
 * 複数の非同期操作を並行実行する際に、各操作でコンテキストを保持します。
 * Edge Runtime環境では自動的なコンテキスト継承ができないため、
 * 各Promise操作に対して明示的にコンテキストをバインドします。
 *
 * @param context - 保持するコンテキスト
 * @param operations - 実行する非同期操作の配列
 * @returns すべての操作の結果を含む配列
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
    // Edge Runtime: 各操作にコンテキストをバインド
    const storage = createCompatibleStorage<LoggerContext>();
    return await Promise.all(operations.map((op) => storage.run(context, op)));
  } else {
    // Node.js環境: 通常のPromise.all
    return await Promise.all(operations.map((op) => op()));
  }
}

/**
 * Edge Runtime対応のタイマー実行
 *
 * setTimeout/setIntervalでコンテキストが失われることを防ぎ、
 * 指定されたコンテキストでコールバック関数を実行します。
 *
 * @param context - 保持するコンテキスト
 * @param callback - 実行するコールバック関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns タイマーID
 *
 * @example
 * ```typescript
 * const timerId = setTimeoutWithContext(context, () => {
 *   // このコールバック内でもコンテキストが利用可能
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
    // Edge Runtime: コンテキストをバインドしたコールバックを使用
    const storage = createCompatibleStorage<LoggerContext>();
    const boundCallback = storage.bind(callback, context);
    return setTimeout(boundCallback, delay);
  } else {
    // Node.js環境: 通常のsetTimeout
    return setTimeout(callback, delay);
  }
}

/**
 * Edge Runtime対応のInterval実行
 *
 * setIntervalでコンテキストが失われることを防ぎ、
 * 指定されたコンテキストで定期的にコールバック関数を実行します。
 *
 * @param context - 保持するコンテキスト
 * @param callback - 実行するコールバック関数
 * @param interval - 実行間隔（ミリ秒）
 * @returns IntervalID
 *
 * @example
 * ```typescript
 * const intervalId = setIntervalWithContext(context, () => {
 *   // 定期実行でもコンテキストが利用可能
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
    // Edge Runtime: コンテキストをバインドしたコールバックを使用
    const storage = createCompatibleStorage<LoggerContext>();
    const boundCallback = storage.bind(callback, context);
    return setInterval(boundCallback, interval);
  } else {
    // Node.js環境: 通常のsetInterval
    return setInterval(callback, interval);
  }
}

/**
 * Edge Runtime制限事項の診断情報を取得
 *
 * 現在の実行環境でのEdge Runtime制限事項と対応状況を分析し、
 * 開発者向けの診断情報を提供します。
 *
 * @returns 診断情報オブジェクト
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

  // AsyncLocalStorageの可用性チェック
  let asyncLocalStorageAvailable = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks');
    asyncLocalStorageAvailable = typeof AsyncLocalStorage === 'function';
  } catch {
    asyncLocalStorageAvailable = false;
  }

  // コンテキストストレージタイプの判定
  let contextStorageType: 'AsyncLocalStorage' | 'EdgeContextStorage' | 'Unknown';
  if (runtime === 'edge') {
    contextStorageType = 'EdgeContextStorage';
  } else if (asyncLocalStorageAvailable) {
    contextStorageType = 'AsyncLocalStorage';
  } else {
    contextStorageType = 'Unknown';
  }

  // 環境別の推奨事項
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
 * Edge Runtime環境での推奨実装パターンをチェック
 *
 * 現在のコードがEdge Runtime環境での制限に適切に対応しているかを
 * 静的に分析し、改善提案を提供します。
 *
 * @param codePattern - チェックするコードパターン
 * @returns 分析結果と改善提案
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
 * Edge Runtime対応のコンテキスト継承ラッパー
 *
 * 関数やクラスメソッドをラップして、Edge Runtime環境でも
 * 確実にコンテキストが継承されるようにします。
 *
 * @param target - ラップ対象の関数
 * @param context - 継承するコンテキスト
 * @returns コンテキスト継承が保証された関数
 *
 * @example
 * ```typescript
 * const wrappedFunction = wrapWithContext(originalFunction, context);
 * await wrappedFunction(arg1, arg2);
 * ```
 *
 * @typeParam T - ラップ対象関数の型（関数シグネチャを保持）
 * @public
 */
export function wrapWithContext<T extends (...args: unknown[]) => unknown>(
  target: T,
  context: LoggerContext
): T {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime: 明示的なコンテキストバインディング
    const storage = createCompatibleStorage<LoggerContext>();
    return storage.bind(target, context) as T;
  } else {
    // Node.js環境: 元の関数をそのまま返す
    return target;
  }
}
