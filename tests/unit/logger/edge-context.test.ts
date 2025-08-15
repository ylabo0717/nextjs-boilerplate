/**
 * Edge Runtime Context Management Tests
 * Edge Runtime環境でのコンテキスト管理機能のテスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isEdgeRuntime,
  detectRuntimeEnvironment,
  createCompatibleStorage,
} from '@/lib/logger/utils';
import {
  createLoggerContextConfig,
  runWithLoggerContext,
  getLoggerContext,
} from '@/lib/logger/context';
import type { LoggerContext } from '@/lib/logger/types';

describe('Edge Runtime Environment Detection', () => {
  let originalEdgeRuntime: any;

  beforeEach(() => {
    // Store original EdgeRuntime value
    originalEdgeRuntime = (globalThis as any).EdgeRuntime;
  });

  afterEach(() => {
    // Reset EdgeRuntime to original value
    if (originalEdgeRuntime !== undefined) {
      (globalThis as any).EdgeRuntime = originalEdgeRuntime;
    } else {
      delete (globalThis as any).EdgeRuntime;
    }
  });

  test('should detect Edge Runtime when EdgeRuntime global is string', () => {
    // Mock Edge Runtime environment
    (globalThis as any).EdgeRuntime = 'edge-runtime';

    expect(isEdgeRuntime()).toBe(true);
    expect(detectRuntimeEnvironment()).toBe('edge');
  });

  test('should detect non-Edge environment when EdgeRuntime is not available', () => {
    // Ensure EdgeRuntime is not defined
    delete (globalThis as any).EdgeRuntime;

    expect(isEdgeRuntime()).toBe(false);
    // In test environment, it will be detected as 'browser' which is expected
    expect(['nodejs', 'browser']).toContain(detectRuntimeEnvironment());
  });

  test('should handle Edge Runtime detection errors gracefully', () => {
    // Mock getter that throws error
    Object.defineProperty(globalThis, 'EdgeRuntime', {
      get() {
        throw new Error('Access denied');
      },
      configurable: true,
    });

    expect(isEdgeRuntime()).toBe(false);
  });
});

describe('Compatible Storage', () => {
  test('should create storage with correct interface', () => {
    const storage = createCompatibleStorage<string>();

    expect(storage).toHaveProperty('run');
    expect(storage).toHaveProperty('getStore');
    expect(storage).toHaveProperty('bind');

    expect(typeof storage.run).toBe('function');
    expect(typeof storage.getStore).toBe('function');
    expect(typeof storage.bind).toBe('function');
  });

  test('should store and retrieve context correctly', () => {
    const storage = createCompatibleStorage<string>();
    const testContext = 'test-context';

    let retrievedContext: string | undefined;

    storage.run(testContext, () => {
      retrievedContext = storage.getStore();
    });

    expect(retrievedContext).toBe(testContext);
  });

  test('should handle nested context execution', () => {
    const storage = createCompatibleStorage<string>();
    const contexts: (string | undefined)[] = [];

    storage.run('outer', () => {
      contexts.push(storage.getStore());

      storage.run('inner', () => {
        contexts.push(storage.getStore());
      });

      contexts.push(storage.getStore());
    });

    expect(contexts).toEqual(['outer', 'inner', 'outer']);
  });

  test('should bind functions with context', () => {
    const storage = createCompatibleStorage<string>();
    const testContext = 'bound-context';
    let capturedContext: string | undefined;

    const boundFunction = storage.bind(() => {
      capturedContext = storage.getStore();
    }, testContext);

    boundFunction();

    expect(capturedContext).toBe(testContext);
  });

  test('should return original function when binding without context', () => {
    const storage = createCompatibleStorage<string>();
    const originalFunction = vi.fn();

    const boundFunction = storage.bind(originalFunction);

    expect(boundFunction).toBe(originalFunction);
  });
});

describe('Logger Context Integration', () => {
  test('should create logger context config with compatible storage', () => {
    const config = createLoggerContextConfig();

    expect(config).toHaveProperty('storage');
    expect(config.storage).toHaveProperty('run');
    expect(config.storage).toHaveProperty('getStore');
    expect(config.storage).toHaveProperty('bind');
  });

  test('should run logger context and retrieve it', () => {
    const config = createLoggerContextConfig();
    const testContext: LoggerContext = {
      requestId: 'test-request-id',
      traceId: 'test-trace-id',
      spanId: 'test-span-id',
      method: 'GET',
      url: '/test',
      timestamp: new Date().toISOString(),
    };

    let retrievedContext: LoggerContext | undefined;

    runWithLoggerContext(config, testContext, () => {
      retrievedContext = getLoggerContext(config);
    });

    expect(retrievedContext).toEqual(testContext);
  });

  test('should handle async operations with context', async () => {
    const config = createLoggerContextConfig();
    const testContext: LoggerContext = {
      requestId: 'async-test-request',
      traceId: 'async-test-trace',
      method: 'POST',
      url: '/async-test',
      timestamp: new Date().toISOString(),
    };

    const results: (LoggerContext | undefined)[] = [];

    await runWithLoggerContext(config, testContext, async () => {
      results.push(getLoggerContext(config));

      await new Promise((resolve) => setTimeout(resolve, 10));

      results.push(getLoggerContext(config));
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(testContext);
    expect(results[1]).toEqual(testContext);
  });

  test('should maintain separate contexts in parallel execution', async () => {
    const config = createLoggerContextConfig();

    const context1: LoggerContext = {
      requestId: 'request-1',
      traceId: 'trace-1',
      method: 'GET',
      url: '/test-1',
      timestamp: new Date().toISOString(),
    };

    const context2: LoggerContext = {
      requestId: 'request-2',
      traceId: 'trace-2',
      method: 'POST',
      url: '/test-2',
      timestamp: new Date().toISOString(),
    };

    const results = await Promise.all([
      new Promise<LoggerContext | undefined>((resolve) => {
        runWithLoggerContext(config, context1, () => {
          setTimeout(() => {
            resolve(getLoggerContext(config));
          }, 20);
        });
      }),
      new Promise<LoggerContext | undefined>((resolve) => {
        runWithLoggerContext(config, context2, () => {
          setTimeout(() => {
            resolve(getLoggerContext(config));
          }, 10);
        });
      }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(context1);
    expect(results[1]).toEqual(context2);
  });
});

describe('Edge Runtime Context Performance', () => {
  test('should handle high-frequency context operations', () => {
    const storage = createCompatibleStorage<number>();
    const iterations = 1000;
    const results: number[] = [];

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      storage.run(i, () => {
        const value = storage.getStore();
        if (value !== undefined) {
          results.push(value);
        }
      });
    }

    const end = performance.now();
    const duration = end - start;

    expect(results).toHaveLength(iterations);
    expect(results).toEqual(Array.from({ length: iterations }, (_, i) => i));
    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });

  test('should handle deeply nested context calls', () => {
    const storage = createCompatibleStorage<string>();
    const depth = 100;
    let currentDepth = 0;

    function recursiveRun(d: number): void {
      if (d === 0) {
        currentDepth = depth;
        return;
      }

      storage.run(`level-${d}`, () => {
        const context = storage.getStore();
        expect(context).toBe(`level-${d}`);
        recursiveRun(d - 1);
      });
    }

    recursiveRun(depth);
    expect(currentDepth).toBe(depth);
  });
});
