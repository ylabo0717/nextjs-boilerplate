/**
 * Timer Context Integration Tests
 * Tests for setTimeout/setInterval with OpenTelemetry context preservation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  setTimeoutWithContext, 
  setIntervalWithContext,
  TimerContextManager,
  createTimerContextManager 
} from '@/lib/logger/timer-context';
import { createLoggerContextConfig, runWithLoggerContext } from '@/lib/logger/context';
import { generateRequestId } from '@/lib/logger/utils';

describe('Timer Context Integration', () => {
  let config: ReturnType<typeof createLoggerContextConfig>;
  const activeTimers: Array<() => void> = [];

  beforeEach(() => {
    config = createLoggerContextConfig();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear all active timers
    activeTimers.forEach(clear => clear());
    activeTimers.length = 0;
    vi.useRealTimers();
  });

  describe('setTimeoutWithContext', () => {
    test('preserves context in setTimeout callback', async () => {
      const requestId = generateRequestId();
      const traceId = 'trace_123';
      const results: string[] = [];

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId, traceId }, () => {
          const timer = setTimeoutWithContext(config, () => {
            const currentContext = config.storage.getStore();
            results.push(currentContext?.requestId || 'no-context');
            results.push(currentContext?.traceId || 'no-trace');
            resolve();
          }, 100);
          
          activeTimers.push(() => timer.clear());
        });

        // Fast-forward time
        vi.advanceTimersByTime(100);
      });

      expect(results).toEqual([requestId, traceId]);
    });

    test('handles missing context gracefully', async () => {
      const results: string[] = [];

      await new Promise<void>((resolve) => {
        // Execute outside of any context
        const timer = setTimeoutWithContext(config, () => {
          results.push('executed');
          resolve();
        }, 50);

        activeTimers.push(() => timer.clear());

        // Fast-forward time
        vi.advanceTimersByTime(50);
      });

      expect(results).toEqual(['executed']);
    });

    test('passes arguments correctly to callback', async () => {
      const results: any[] = [];

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId: 'test' }, () => {
          const timer = setTimeoutWithContext(
            config,
            (arg1: string, arg2: number, arg3: boolean) => {
              results.push(arg1, arg2, arg3);
              resolve();
            },
            100,
            'hello',
            42,
            true
          );

          activeTimers.push(() => timer.clear());
        });

        vi.advanceTimersByTime(100);
      });

      expect(results).toEqual(['hello', 42, true]);
    });

    test('can be cleared before execution', () => {
      const executed = vi.fn();

      runWithLoggerContext(config, { requestId: 'test' }, () => {
        const timer = setTimeoutWithContext(config, executed, 100);
        
        // Clear the timer before it executes
        timer.clear();
        
        vi.advanceTimersByTime(150);
      });

      expect(executed).not.toHaveBeenCalled();
    });

    test('returns correct timer handle information', () => {
      const requestId = generateRequestId();

      runWithLoggerContext(config, { requestId }, () => {
        const timer = setTimeoutWithContext(config, () => {}, 100);

        expect(timer.timerId).toBeDefined();
        expect(timer.context).toEqual({ requestId });
        expect(typeof timer.clear).toBe('function');
      });
    });
  });

  describe('setIntervalWithContext', () => {
    test('preserves context in setInterval callback', async () => {
      const requestId = generateRequestId();
      const traceId = 'trace_456';
      const results: string[] = [];
      let executionCount = 0;

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId, traceId }, () => {
          const timer = setIntervalWithContext(config, () => {
            const currentContext = config.storage.getStore();
            results.push(currentContext?.requestId || 'no-context');
            results.push(currentContext?.traceId || 'no-trace');
            
            executionCount++;
            if (executionCount >= 3) {
              timer.clear();
              resolve();
            }
          }, 50);

          activeTimers.push(() => timer.clear());
        });

        // Fast-forward time to trigger multiple executions
        vi.advanceTimersByTime(200);
      });

      expect(results).toEqual([
        requestId, traceId,  // First execution
        requestId, traceId,  // Second execution  
        requestId, traceId   // Third execution
      ]);
      expect(executionCount).toBe(3);
    });

    test('executes multiple times with preserved context', async () => {
      const sessionId = 'session_789';
      const executions: number[] = [];
      let executionCount = 0;

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId: 'test', sessionId }, () => {
          const timer = setIntervalWithContext(config, () => {
            const currentContext = config.storage.getStore();
            if (currentContext?.sessionId === sessionId) {
              executions.push(++executionCount);
            }
            
            if (executionCount >= 5) {
              timer.clear();
              resolve();
            }
          }, 25);

          activeTimers.push(() => timer.clear());
        });

        vi.advanceTimersByTime(150);
      });

      expect(executions).toEqual([1, 2, 3, 4, 5]);
    });

    test('can be cleared to stop execution', () => {
      const executed = vi.fn();

      runWithLoggerContext(config, { requestId: 'test' }, () => {
        const timer = setIntervalWithContext(config, executed, 50);
        
        // Let it execute twice
        vi.advanceTimersByTime(100);
        
        // Clear the timer
        timer.clear();
        
        // Advance more time
        vi.advanceTimersByTime(100);
      });

      // Should only have executed twice before being cleared
      expect(executed).toHaveBeenCalledTimes(2);
    });
  });

  describe('TimerContextManager', () => {
    let manager: TimerContextManager;

    beforeEach(() => {
      manager = createTimerContextManager(config);
    });

    test('manages setTimeout with context tracking', async () => {
      const requestId = generateRequestId();
      const results: string[] = [];

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId }, () => {
          const timer = manager.setTimeout(() => {
            const currentContext = config.storage.getStore();
            results.push(currentContext?.requestId || 'no-context');
            resolve();
          }, 100);

          expect(manager.getActiveTimerCount()).toBe(1);
          
          const activeTimers = manager.getActiveTimers();
          expect(activeTimers).toHaveLength(1);
          expect(activeTimers[0].context?.requestId).toBe(requestId);
        });

        vi.advanceTimersByTime(100);
      });

      expect(results).toEqual([requestId]);
      expect(manager.getActiveTimerCount()).toBe(0); // Auto-removed after execution
    });

    test('manages setInterval with context tracking', async () => {
      const requestId = generateRequestId();
      let executionCount = 0;

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId }, () => {
          const timer = manager.setInterval(() => {
            executionCount++;
            if (executionCount >= 3) {
              timer.clear();
              resolve();
            }
          }, 50);

          expect(manager.getActiveTimerCount()).toBe(1);
        });

        vi.advanceTimersByTime(200);
      });

      expect(executionCount).toBe(3);
      expect(manager.getActiveTimerCount()).toBe(0); // Auto-removed after clearing
    });

    test('clearAllTimers clears all active timers', () => {
      const executed1 = vi.fn();
      const executed2 = vi.fn();
      const executed3 = vi.fn();

      runWithLoggerContext(config, { requestId: 'test' }, () => {
        manager.setTimeout(executed1, 100);
        manager.setInterval(executed2, 50);
        manager.setTimeout(executed3, 200);

        expect(manager.getActiveTimerCount()).toBe(3);

        const clearedCount = manager.clearAllTimers();
        expect(clearedCount).toBe(3);
        expect(manager.getActiveTimerCount()).toBe(0);

        // Advance time - nothing should execute
        vi.advanceTimersByTime(300);
      });

      expect(executed1).not.toHaveBeenCalled();
      expect(executed2).not.toHaveBeenCalled();
      expect(executed3).not.toHaveBeenCalled();
    });

    test('tracks multiple concurrent timers', () => {
      const requestId1 = generateRequestId();
      const requestId2 = generateRequestId();

      runWithLoggerContext(config, { requestId: requestId1 }, () => {
        manager.setTimeout(() => {}, 100);
      });

      runWithLoggerContext(config, { requestId: requestId2 }, () => {
        manager.setInterval(() => {}, 50);
      });

      expect(manager.getActiveTimerCount()).toBe(2);

      const activeTimers = manager.getActiveTimers();
      expect(activeTimers).toHaveLength(2);
      
      const contexts = activeTimers.map(t => t.context?.requestId).sort();
      expect(contexts).toEqual([requestId1, requestId2].sort());
    });

    test('handles timer completion and cleanup', async () => {
      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId: 'test' }, () => {
          manager.setTimeout(() => {
            // Timer should auto-remove itself after execution
            expect(manager.getActiveTimerCount()).toBe(0);
            resolve();
          }, 100);

          expect(manager.getActiveTimerCount()).toBe(1);
        });

        vi.advanceTimersByTime(100);
      });
    });
  });

  describe('Nested Context Scenarios', () => {
    test('preserves correct context in nested timer scenarios', async () => {
      const outerRequestId = generateRequestId();
      const innerRequestId = generateRequestId();
      const results: string[] = [];

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId: outerRequestId }, () => {
          // Outer timeout
          setTimeoutWithContext(config, () => {
            const outerContext = config.storage.getStore();
            results.push(`outer:${outerContext?.requestId}`);

            // Inner context with different requestId
            runWithLoggerContext(config, { requestId: innerRequestId }, () => {
              // Inner timeout should preserve inner context
              setTimeoutWithContext(config, () => {
                const innerContext = config.storage.getStore();
                results.push(`inner:${innerContext?.requestId}`);
                resolve();
              }, 50);
            });
          }, 100);
        });

        vi.advanceTimersByTime(200);
      });

      expect(results).toEqual([
        `outer:${outerRequestId}`,
        `inner:${innerRequestId}`
      ]);
    });

    test('handles rapid successive timer creation with different contexts', async () => {
      const results: string[] = [];
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 5; i++) {
        const requestId = `request_${i}`;
        
        const promise = new Promise<void>((resolve) => {
          runWithLoggerContext(config, { requestId }, () => {
            setTimeoutWithContext(config, () => {
              const currentContext = config.storage.getStore();
              results.push(currentContext?.requestId || 'no-context');
              resolve();
            }, 50 + i * 10); // Staggered timing
          });
        });

        promises.push(promise);
      }

      vi.advanceTimersByTime(150);
      await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results).toEqual([
        'request_0', 'request_1', 'request_2', 'request_3', 'request_4'
      ]);
    });
  });

  describe('Error Handling', () => {
    test('handles errors in timer callbacks gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId: 'test' }, () => {
          setTimeoutWithContext(config, () => {
            throw new Error('Timer callback error');
          }, 50);

          // This timer should still execute despite the error in the previous one
          setTimeoutWithContext(config, () => {
            resolve();
          }, 100);
        });

        vi.advanceTimersByTime(150);
      });

      consoleSpy.mockRestore();
    });

    test('maintains context even when callback throws', async () => {
      const requestId = generateRequestId();
      const results: string[] = [];

      await new Promise<void>((resolve) => {
        runWithLoggerContext(config, { requestId }, () => {
          setTimeoutWithContext(config, () => {
            const currentContext = config.storage.getStore();
            results.push(currentContext?.requestId || 'no-context');
            throw new Error('Intentional error');
          }, 50);

          setTimeoutWithContext(config, () => {
            resolve();
          }, 100);
        });

        vi.advanceTimersByTime(150);
      });

      expect(results).toEqual([requestId]);
    });
  });
});