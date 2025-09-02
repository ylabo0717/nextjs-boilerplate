/**
 * Server Logger Basic Tests
 *
 * Basic tests for server logger to improve coverage
 * Focuses on key functionality verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

describe('Server Logger Basic', () => {
  beforeEach(() => {
    // Clear environment for clean tests
    delete process.env.NEXT_RUNTIME;
  });

  afterEach(() => {
    // Restore any environment changes
  });

  describe('serverLogger exports', () => {
    it('should export serverLogger instance', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      expect(serverLogger).toBeDefined();
      expect(typeof serverLogger.info).toBe('function');
      expect(typeof serverLogger.error).toBe('function');
      expect(typeof serverLogger.warn).toBe('function');
      expect(typeof serverLogger.debug).toBe('function');
      expect(typeof serverLogger.trace).toBe('function');
      expect(typeof serverLogger.fatal).toBe('function');
    });

    it('should export default logger', async () => {
      const module = await import('@/lib/logger/server');

      expect(module.default).toBeDefined();
      // Default export should be a logger instance
      expect(typeof module.default.info).toBe('function');
      expect(typeof module.default.error).toBe('function');
    });
  });

  describe('serverLoggerWrapper', () => {
    it('should export wrapped logger functions', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      expect(serverLoggerWrapper).toBeDefined();
      expect(typeof serverLoggerWrapper.info).toBe('function');
      expect(typeof serverLoggerWrapper.error).toBe('function');
      expect(typeof serverLoggerWrapper.warn).toBe('function');
      expect(typeof serverLoggerWrapper.debug).toBe('function');
    });

    it('should execute wrapper methods without throwing', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      expect(() => {
        serverLoggerWrapper.info('Test info message');
        serverLoggerWrapper.error('Test error message');
        serverLoggerWrapper.warn('Test warn message');
        serverLoggerWrapper.debug('Test debug message');
      }).not.toThrow();
    });
  });

  describe('serverLoggerHelpers', () => {
    it('should export helper functions', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      expect(serverLoggerHelpers).toBeDefined();
      expect(typeof serverLoggerHelpers.measurePerformance).toBe('function');
      expect(typeof serverLoggerHelpers.measurePerformanceAsync).toBe('function');
      expect(typeof serverLoggerHelpers.logSecurityEvent).toBe('function');
      expect(typeof serverLoggerHelpers.logUserAction).toBe('function');
      expect(typeof serverLoggerHelpers.logSystemEvent).toBe('function');
    });

    it('should execute helper methods without throwing', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      expect(() => {
        serverLoggerHelpers.logUserAction('test-action', { test: 'data' });
        serverLoggerHelpers.logSystemEvent('test-event', { test: 'data' });
        serverLoggerHelpers.logSecurityEvent('test-security', { test: 'data' });
      }).not.toThrow();
    });

    it('should measure performance synchronously', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const testFunction = () => {
        let sum = 0;
        for (let i = 0; i < LOGGER_TEST_DATA.PERFORMANCE_LOOP_ITERATIONS; i++) {
          sum += i;
        }
        return sum;
      };

      const result = serverLoggerHelpers.measurePerformance('test-sync', testFunction);

      expect(result).toBe(LOGGER_TEST_DATA.PERFORMANCE_EXPECTED_SUM);
    });

    it('should measure performance asynchronously', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const asyncFunction = async () => {
        await new Promise((resolve) => setTimeout(resolve, LOGGER_TEST_DATA.ASYNC_DELAY_SHORT));
        return 'async-result';
      };

      const result = await serverLoggerHelpers.measurePerformanceAsync('test-async', asyncFunction);

      expect(result).toBe('async-result');
    });

    it('should handle performance measurement errors', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const errorFunction = () => {
        throw new Error('Performance test error');
      };

      expect(() => {
        serverLoggerHelpers.measurePerformance('error-test', errorFunction);
      }).toThrow('Performance test error');
    });

    it('should handle async performance measurement errors', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const asyncErrorFunction = async () => {
        throw new Error('Async performance test error');
      };

      await expect(
        serverLoggerHelpers.measurePerformanceAsync('async-error-test', asyncErrorFunction)
      ).rejects.toThrow('Async performance test error');
    });
  });

  describe('Logger basic functionality', () => {
    it('should handle basic logging without errors', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info('Basic info test');
        serverLogger.error('Basic error test');
        serverLogger.warn('Basic warn test');
        serverLogger.debug('Basic debug test');
        serverLogger.trace('Basic trace test');
        serverLogger.fatal('Basic fatal test');
      }).not.toThrow();
    });

    it('should handle logging with objects', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info({ userId: '123', action: 'test' }, 'User action test');
        serverLogger.error({ error: 'test-error', code: 500 }, 'Error test');
      }).not.toThrow();
    });

    it('should handle logging with various data types', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info('String message');
        serverLogger.info({ object: 'data' }, 'Object with message');
        serverLogger.info({ extra: 'data' }, 'Message with extras');
        serverLogger.info(null as any, 'Null test');
        serverLogger.info(undefined as any, 'Undefined test');
      }).not.toThrow();
    });
  });

  describe('Environment handling', () => {
    it('should work in Node.js environment', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';

      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info('Node.js environment test');
      }).not.toThrow();
    });

    it('should work in Edge environment', async () => {
      process.env.NEXT_RUNTIME = 'edge';

      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info('Edge environment test');
      }).not.toThrow();
    });

    it('should work with undefined environment', async () => {
      delete process.env.NEXT_RUNTIME;

      const { serverLogger } = await import('@/lib/logger/server');

      expect(() => {
        serverLogger.info('Undefined environment test');
      }).not.toThrow();
    });
  });

  describe('server logger edge cases and coverage', () => {
    it('should handle pino-pretty initialization failure', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalRuntime = process.env.NEXT_RUNTIME;

      // Set development environment but clear NEXT_RUNTIME
      (process.env as any).NODE_ENV = 'development';
      delete process.env.NEXT_RUNTIME;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        // Re-import to trigger initialization in dev mode without Next runtime
        vi.resetModules();
        const { serverLogger } = await import('@/lib/logger/server');

        expect(serverLogger).toBeDefined();
        expect(typeof serverLogger.info).toBe('function');

        // Should be able to log without throwing
        expect(() => {
          serverLogger.info('Test message in dev environment');
        }).not.toThrow();
      } finally {
        // Restore environment
        (process.env as any).NODE_ENV = originalEnv;
        if (originalRuntime !== undefined) {
          process.env.NEXT_RUNTIME = originalRuntime;
        }
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle serializer edge cases', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      // Test with null and undefined objects
      expect(() => {
        serverLoggerWrapper.info('Test with null', null);
        serverLoggerWrapper.info('Test with undefined', undefined);
      }).not.toThrow();

      // Test with complex nested objects
      const complexObject = {
        user: { id: 123, name: 'Test User' },
        nested: { data: { values: [1, 2, 3] } },
        error: new Error('Test error'),
      };

      expect(() => {
        serverLoggerWrapper.info('Test with complex object', complexObject);
      }).not.toThrow();
    });

    it('should test mergeLogArguments with various argument types', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      // Test with error objects
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';

      expect(() => {
        serverLoggerWrapper.error('Error test', testError);
      }).not.toThrow();

      // Test with mixed argument types
      expect(() => {
        serverLoggerWrapper.info('Mixed args', 'string', 123, true, { object: 'data' });
      }).not.toThrow();

      // Test with arrays and primitive types (cast as object)
      expect(() => {
        serverLoggerWrapper.warn('Array test', { data: [1, 2, 3] }, 'after array');
      }).not.toThrow();
    });

    it('should test extractErrorType functionality', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      // Test with named error
      const namedError = new Error('Test error');
      namedError.name = 'CustomError';

      expect(() => {
        serverLoggerWrapper.error('Named error test', namedError);
      }).not.toThrow();

      // Test with error code
      const codedError = new Error('Coded error');
      (codedError as any).code = 'E_TEST';

      expect(() => {
        serverLoggerWrapper.error('Coded error test', codedError);
      }).not.toThrow();

      // Test with event name in args
      expect(() => {
        serverLoggerWrapper.error('Event error test', { event_name: 'user_action_failed' });
      }).not.toThrow();

      // Test with args array containing error
      expect(() => {
        serverLoggerWrapper.fatal('Fatal error test', { args: [new Error('Fatal')] });
      }).not.toThrow();
    });

    it('should handle performance measurement errors', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const errorFunction = () => {
        throw new Error('Performance test error');
      };

      expect(() => {
        serverLoggerHelpers.measurePerformance('error-test', errorFunction);
      }).toThrow('Performance test error');
    });

    it('should handle async performance measurement errors', async () => {
      const { serverLoggerHelpers } = await import('@/lib/logger/server');

      const asyncErrorFunction = async () => {
        throw new Error('Async performance test error');
      };

      await expect(
        serverLoggerHelpers.measurePerformanceAsync('async-error-test', asyncErrorFunction)
      ).rejects.toThrow('Async performance test error');
    });

    it('should handle production environment setup', async () => {
      const originalEnv = process.env.NODE_ENV;

      (process.env as any).NODE_ENV = 'production';

      try {
        vi.resetModules();
        const { serverLogger } = await import('@/lib/logger/server');

        expect(serverLogger).toBeDefined();
        expect(() => {
          serverLogger.info('Production environment test');
        }).not.toThrow();
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('should handle Next.js runtime environment', async () => {
      const originalRuntime = process.env.NEXT_RUNTIME;

      process.env.NEXT_RUNTIME = 'edge';

      try {
        vi.resetModules();
        const { serverLogger } = await import('@/lib/logger/server');

        expect(serverLogger).toBeDefined();
        expect(() => {
          serverLogger.info('Next.js runtime test');
        }).not.toThrow();
      } finally {
        if (originalRuntime !== undefined) {
          process.env.NEXT_RUNTIME = originalRuntime;
        } else {
          delete process.env.NEXT_RUNTIME;
        }
      }
    });

    it('should handle logMethod hook with no arguments', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      // Test with empty args (should hit the early return path)
      expect(() => {
        (serverLogger as any).info();
      }).not.toThrow();
    });

    it('should handle logMethod hook with object first argument', async () => {
      const { serverLogger } = await import('@/lib/logger/server');

      // Test with object as first argument followed by string
      expect(() => {
        (serverLogger as any).info({ userId: 123 }, 'User action');
      }).not.toThrow();
    });

    it('should handle various log levels with context', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      // Test all log levels to increase coverage
      expect(() => {
        serverLoggerWrapper.trace('Trace message', { trace: 'data' });
        serverLoggerWrapper.debug('Debug message', { debug: 'data' });
        serverLoggerWrapper.info('Info message', { info: 'data' });
        serverLoggerWrapper.warn('Warn message', { warn: 'data' });
        serverLoggerWrapper.error('Error message', { error: 'data' });
        serverLoggerWrapper.fatal('Fatal message', { fatal: 'data' });
      }).not.toThrow();
    });

    it('should test isLevelEnabled function', async () => {
      const { serverLoggerWrapper } = await import('@/lib/logger/server');

      expect(typeof serverLoggerWrapper.isLevelEnabled('info')).toBe('boolean');
      expect(typeof serverLoggerWrapper.isLevelEnabled('debug')).toBe('boolean');
      expect(typeof serverLoggerWrapper.isLevelEnabled('error')).toBe('boolean');
    });
  });
});
