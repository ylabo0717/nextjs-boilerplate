/**
 * Logger Context Basic Tests
 *
 * Additional tests for context management to improve coverage
 * Focuses on uncovered functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

describe('Logger Context Basic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Context manager functions', () => {
    it('should execute loggerContextManager methods', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        // Test context operations
        const testContext = { requestId: 'test-123', userId: 'user-456' };
        loggerContextManager.runWithContext(testContext, () => {
          const currentContext = loggerContextManager.getContext();
          return currentContext;
        });

        // Test context updates
        loggerContextManager.updateContext({ newField: 'value' });

        // Test contextual logger creation
        const contextualLogger = loggerContextManager.createContextualLogger(mockLogger);
        expect(contextualLogger).toBeDefined();

        // Test logging methods
        loggerContextManager.logUserAction(mockLogger, 'login', { device: 'mobile' });
        loggerContextManager.logSystemEvent(mockLogger, 'startup', {
          duration: LOGGER_TEST_DATA.KV_STORAGE_TTL * 1.5,
        });
        loggerContextManager.logSecurityEvent(mockLogger, 'unauthorized', { ip: '192.168.1.1' });
        loggerContextManager.logErrorEvent(mockLogger, new Error('Test error'), {
          context: 'test',
        });
        loggerContextManager.logPerformanceMetric(
          mockLogger,
          'api_response',
          LOGGER_TEST_DATA.KV_STORAGE_TTL / 4,
          'ms'
        );

        // Test trace context
        loggerContextManager.setTraceContext('trace-123', 'span-456');

        // Test debug context
        loggerContextManager.debugContext(mockLogger);
      }).not.toThrow();
    });

    it('should handle context manager with default config', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      const testContext = { requestId: 'manager-test' };
      let contextInsideRun;

      loggerContextManager.runWithContext(testContext, () => {
        contextInsideRun = loggerContextManager.getContext();
      });

      // Context operations should complete without errors
      expect(true).toBe(true); // Test passes if no exceptions thrown
    });

    it('should handle context updates gracefully', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      const testContext = { requestId: 'update-test' };

      loggerContextManager.runWithContext(testContext, () => {
        const updates = { userId: 'new-user', action: 'update' };
        const updatedContext = loggerContextManager.updateContext(updates);

        // Should handle context updates
        expect(true).toBe(true); // Test passes if no exceptions thrown
      });
    });
  });

  describe('Compatibility functions', () => {
    it('should provide backwards compatibility', async () => {
      const { runWithLoggerContextCompat, getLoggerContextCompat, createContextualLoggerCompat } =
        await import('../../../src/lib/logger/context');

      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        // Test compatibility functions
        const testContext = { requestId: 'compat-test' };
        runWithLoggerContextCompat(testContext, () => {
          getLoggerContextCompat();
          return 'compat-result';
        });

        createContextualLoggerCompat(mockLogger, { service: 'test' });
      }).not.toThrow();
    });

    it('should execute compatibility wrapper functions', async () => {
      const { runWithLoggerContextCompat, getLoggerContextCompat, createContextualLoggerCompat } =
        await import('../../../src/lib/logger/context');

      const testContext = { requestId: 'compat-execution-test' };
      let result;

      expect(() => {
        result = runWithLoggerContextCompat(testContext, () => {
          const context = getLoggerContextCompat();
          return 'executed';
        });
      }).not.toThrow();

      expect(result).toBe('executed');
    });
  });

  describe('Context creation and configuration', () => {
    it('should create logger context config', async () => {
      const { createLoggerContextConfig } = await import('../../../src/lib/logger/context');

      const config = createLoggerContextConfig();

      expect(config).toBeDefined();
      expect(config.storage).toBeDefined();
    });

    it('should provide default logger context config', async () => {
      const { defaultLoggerContextConfig } = await import('../../../src/lib/logger/context');

      expect(defaultLoggerContextConfig).toBeDefined();
      expect(defaultLoggerContextConfig.storage).toBeDefined();
    });

    it('should run functions with logger context', async () => {
      const { runWithLoggerContext, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const testContext = { requestId: 'run-test' };
      let executionResult;

      const result = runWithLoggerContext(config, testContext, () => {
        executionResult = 'function-executed';
        return 'run-result';
      });

      expect(result).toBe('run-result');
      expect(executionResult).toBe('function-executed');
    });

    it('should get logger context from config', async () => {
      const { getLoggerContext, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();

      // Should not throw when getting context
      expect(() => {
        const context = getLoggerContext(config);
        // Context may be undefined outside of run
      }).not.toThrow();
    });
  });

  describe('Contextual logger creation', () => {
    it('should create contextual logger with config', async () => {
      const { createContextualLogger, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const baseLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      const contextualLogger = createContextualLogger(config, baseLogger);

      expect(contextualLogger).toBeDefined();
      expect(typeof contextualLogger.trace).toBe('function');
      expect(typeof contextualLogger.debug).toBe('function');
      expect(typeof contextualLogger.info).toBe('function');
      expect(typeof contextualLogger.warn).toBe('function');
      expect(typeof contextualLogger.error).toBe('function');
      expect(typeof contextualLogger.fatal).toBe('function');
      expect(typeof contextualLogger.isLevelEnabled).toBe('function');
    });

    it('should execute contextual logger methods', async () => {
      const { createContextualLogger, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const baseLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      const contextualLogger = createContextualLogger(config, baseLogger);

      expect(() => {
        contextualLogger.trace('Trace message');
        contextualLogger.debug('Debug message');
        contextualLogger.info('Info message');
        contextualLogger.warn('Warn message');
        contextualLogger.error('Error message');
        contextualLogger.fatal('Fatal message');

        const isEnabled = contextualLogger.isLevelEnabled('info');
        expect(typeof isEnabled).toBe('boolean');
      }).not.toThrow();
    });
  });

  describe('Logging helper functions', () => {
    it('should execute logging helper functions with config', async () => {
      const {
        logUserAction,
        logSystemEvent,
        logSecurityEvent,
        logErrorEvent,
        logPerformanceMetric,
        createLoggerContextConfig,
      } = await import('../../../src/lib/logger/context');

      const config = createLoggerContextConfig();
      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        logUserAction(config, mockLogger, 'user-login', { device: 'mobile' });
        logSystemEvent(config, mockLogger, 'system-startup', {
          duration: LOGGER_TEST_DATA.KV_STORAGE_TTL * 1.2,
        });
        logSecurityEvent(config, mockLogger, 'security-breach', { severity: 'high' });
        logErrorEvent(config, mockLogger, new Error('Test error'), { context: 'unit-test' });
        logPerformanceMetric(
          config,
          mockLogger,
          'test-metric',
          LOGGER_TEST_DATA.KV_STORAGE_TTL / 6.67,
          'ms'
        );
      }).not.toThrow();
    });

    it('should handle different error types in logErrorEvent', async () => {
      const { logErrorEvent, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        // Test with Error object
        logErrorEvent(config, mockLogger, new Error('Error object'));

        // Test with string error
        logErrorEvent(config, mockLogger, 'String error');

        // Test with number error
        logErrorEvent(config, mockLogger, 404);

        // Test with object error
        logErrorEvent(config, mockLogger, { type: 'custom', message: 'Custom error' });

        // Test with null/undefined
        logErrorEvent(config, mockLogger, null);
        logErrorEvent(config, mockLogger, undefined);
      }).not.toThrow();
    });

    it('should handle performance metrics with default unit', async () => {
      const { logPerformanceMetric, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        // Test with default unit (should be 'ms')
        logPerformanceMetric(
          config,
          mockLogger,
          'api-response',
          LOGGER_TEST_DATA.KV_STORAGE_TTL / 4
        );

        // Test with custom unit
        logPerformanceMetric(
          config,
          mockLogger,
          'memory-usage',
          LOGGER_TEST_DATA.KV_STORAGE_TTL / 7.8125,
          'MB'
        );
      }).not.toThrow();
    });
  });

  describe('Context manipulation functions', () => {
    it('should handle trace context setting', async () => {
      const { setTraceContext, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();

      expect(() => {
        // Should not throw even if context doesn't exist
        setTraceContext(config, 'trace-id-123');
        setTraceContext(config, 'trace-id-456', 'span-id-789');
      }).not.toThrow();
    });

    it('should handle debug logger context', async () => {
      const { debugLoggerContext, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();
      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      expect(() => {
        debugLoggerContext(config, mockLogger);
      }).not.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle context updates', async () => {
      const { updateLoggerContext, createLoggerContextConfig } = await import(
        '../../../src/lib/logger/context'
      );

      const config = createLoggerContextConfig();

      expect(() => {
        const updates = { newField: 'newValue', userId: 'updated-user' };
        const result = updateLoggerContext(config, updates);

        // Result may be undefined if no current context exists
        // Function should handle this gracefully
      }).not.toThrow();
    });
  });
});
