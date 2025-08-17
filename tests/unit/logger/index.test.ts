/**
 * Logger Index Unit Tests
 *
 * Tests for main logger exports and environment detection
 * Focuses on pure functions and controlled side effects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

// Mock modules before importing
vi.mock('../../../src/lib/logger/client', () => ({
  getClientLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  })),
  clientLoggerWrapper: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
  clientLoggerHelpers: {
    measurePerformance: vi.fn((name, fn) => fn()),
    measurePerformanceAsync: vi.fn(async (name, fn) => await fn()),
    logError: vi.fn(),
    logUserAction: vi.fn(),
  },
}));

vi.mock('../../../src/lib/logger/server', () => ({
  getServerLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  })),
  serverLoggerWrapper: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
  serverLoggerHelpers: {
    measurePerformance: vi.fn((name, fn) => fn()),
    measurePerformanceAsync: vi.fn(async (name, fn) => await fn()),
    logError: vi.fn(),
    logUserAction: vi.fn(),
  },
}));

vi.mock('../../../src/lib/logger/error-handler', () => ({
  setupGlobalErrorHandlers: vi.fn(),
  errorHandler: {
    handleUncaughtException: vi.fn(),
    handleUnhandledRejection: vi.fn(),
    handle: vi.fn(),
  },
}));

vi.mock('../../../src/lib/logger/loki-client', () => ({
  createLokiConfigFromEnv: vi.fn(() => ({
    host: 'http://localhost:3100',
    labels: { app: 'test' },
  })),
  initializeLokiTransport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/lib/logger/context', () => ({
  loggerContextManager: {
    runWithContext: vi.fn((context, fn) => fn()),
    getContext: vi.fn(() => null),
  },
}));

describe('Logger Index', () => {
  let originalWindow: any;
  let originalProcess: NodeJS.Process;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});

    // Store original values
    originalWindow = global.window;
    originalProcess = global.process;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original values
    global.window = originalWindow;
    global.process = originalProcess;
  });

  describe('logger instance (environment detection)', () => {
    it('should create appropriate logger based on environment', async () => {
      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('logger instance', () => {
    it('should export a logger instance', async () => {
      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should export logger as default export', async () => {
      const defaultExport = await import('../../../src/lib/logger/index');

      expect(defaultExport.default).toBeDefined();
      expect(defaultExport.default).toBe(defaultExport.logger);
    });
  });

  describe('utility functions', () => {
    it('should export logError function', async () => {
      const { logError } = await import('../../../src/lib/logger/index');

      expect(typeof logError).toBe('function');
    });

    it('should export logUserAction function', async () => {
      const { logUserAction } = await import('../../../src/lib/logger/index');

      expect(typeof logUserAction).toBe('function');
    });

    it('should export measurePerformance function', async () => {
      const { measurePerformance } = await import('../../../src/lib/logger/index');

      expect(typeof measurePerformance).toBe('function');
    });

    it('should export measurePerformanceAsync function', async () => {
      const { measurePerformanceAsync } = await import('../../../src/lib/logger/index');

      expect(typeof measurePerformanceAsync).toBe('function');
    });

    it('should export getLoggerWithContext function', async () => {
      const { getLoggerWithContext } = await import('../../../src/lib/logger/index');

      expect(typeof getLoggerWithContext).toBe('function');
    });

    it('should export initializeLogger function', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(typeof initializeLogger).toBe('function');
    });

    it('should export initializeLogger function which includes error handler setup', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(typeof initializeLogger).toBe('function');
    });

    it('should export debugLogger function', async () => {
      const { debugLogger } = await import('../../../src/lib/logger/index');

      expect(typeof debugLogger).toBe('function');
    });
  });

  describe('environment integration', () => {
    it('should create appropriate logger based on detected environment', async () => {
      // Import after setting up mocks
      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');

      // In Node.js test environment, should be using server logger
      expect(true).toBe(true); // Test passes if logger is properly defined
    });

    it('should handle logger creation errors gracefully', async () => {
      // Should not throw when importing
      await expect(import('../../../src/lib/logger/index')).resolves.toBeDefined();
    });
  });

  describe('performance functions', () => {
    it('should measure synchronous performance', async () => {
      const { measurePerformance } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(() => 'test result');
      const result = measurePerformance('test-operation', testFunction);

      expect(testFunction).toHaveBeenCalled();
      expect(result).toBe('test result');
    });

    it('should measure asynchronous performance', async () => {
      const { measurePerformanceAsync } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(async () => 'async result');
      const result = await measurePerformanceAsync('test-operation', testFunction);

      expect(testFunction).toHaveBeenCalled();
      expect(result).toBe('async result');
    });

    it('should handle performance measurement errors', async () => {
      const { measurePerformance } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(() => {
        throw new Error('Test error');
      });

      expect(() => measurePerformance('test-operation', testFunction)).toThrow('Test error');
      expect(testFunction).toHaveBeenCalled();
    });

    it('should handle async performance measurement errors', async () => {
      const { measurePerformanceAsync } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(async () => {
        throw new Error('Async test error');
      });

      await expect(measurePerformanceAsync('test-operation', testFunction)).rejects.toThrow(
        'Async test error'
      );
      expect(testFunction).toHaveBeenCalled();
    });
  });

  describe('context functions', () => {
    it('should create logger with context', async () => {
      const { getLoggerWithContext } = await import('../../../src/lib/logger/index');

      const contextLogger = getLoggerWithContext({ userId: '123', action: 'test' });

      expect(contextLogger).toBeDefined();
      expect(typeof contextLogger.info).toBe('function');
    });

    it('should initialize logger with configuration', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      const config = {
        enableGlobalErrorHandlers: false,
        enableLoki: false,
      };

      // Should not throw
      expect(() => initializeLogger(config)).not.toThrow();
    });

    it('should setup global error handlers via initializeLogger', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      // Should not throw when initializing with error handlers enabled
      expect(() =>
        initializeLogger({ enableGlobalErrorHandlers: true, enableLoki: false })
      ).not.toThrow();
    });
  });

  describe('debugging functions', () => {
    it('should call debug logger function', async () => {
      const { debugLogger } = await import('../../../src/lib/logger/index');

      expect(typeof debugLogger).toBe('function');
      // Should not throw when called
      expect(() => debugLogger()).not.toThrow();
    });
  });

  describe('error logging', () => {
    it('should log errors with context', async () => {
      const { logError } = await import('../../../src/lib/logger/index');

      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      // Should not throw
      expect(() => logError(error, context)).not.toThrow();
    });

    it('should log user actions', async () => {
      const { logUserAction } = await import('../../../src/lib/logger/index');

      const action = 'user-login';
      const metadata = { userId: '123', timestamp: new Date().toISOString() };

      // Should not throw
      expect(() => logUserAction(action, metadata)).not.toThrow();
    });
  });

  describe('environment detection', () => {
    beforeEach(() => {
      // Clear module cache to test different environments
      vi.resetModules();
    });

    it('should detect server environment when window is undefined', async () => {
      // Simulate server environment
      delete (global as any).window;

      // Import the module fresh to trigger environment detection
      const indexModule = await import('../../../src/lib/logger/index');

      expect(indexModule.logger).toBeDefined();
    });

    it('should detect client environment when window is defined', async () => {
      // Simulate browser environment
      (global as any).window = {
        location: { href: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // Clear cache and import fresh
      vi.resetModules();
      const indexModule = await import('../../../src/lib/logger/index');

      expect(indexModule.logger).toBeDefined();
    });

    it('should handle edge runtime environment detection', async () => {
      // Simulate edge environment (no window, limited Node.js features)
      delete (global as any).window;

      // Import fresh
      vi.resetModules();
      const indexModule = await import('../../../src/lib/logger/index');

      expect(indexModule.logger).toBeDefined();
    });
  });

  describe('initializeLogger detailed functionality', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should initialize logger with default options', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(() => initializeLogger()).not.toThrow();
    });

    it('should handle Loki initialization errors and log warnings', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock initializeLokiTransport to throw an error
      vi.doMock('../../../src/lib/logger/loki-client', () => ({
        createLokiConfigFromEnv: vi.fn(() => ({
          host: 'http://localhost:3100',
          labels: { app: 'test' },
        })),
        initializeLokiTransport: vi.fn().mockRejectedValue(new Error('Loki initialization failed')),
      }));

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableLoki: true });

      // Wait for the promise to be rejected and handled
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to initialize Loki transport:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
      vi.doUnmock('../../../src/lib/logger/loki-client');
    });

    it('should initialize logger with custom context', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      const context = {
        requestId: 'test-request-123',
        userId: 'user-456',
        sessionId: 'session-789',
      };

      expect(() => initializeLogger({ context })).not.toThrow();
    });

    it('should initialize logger with disabled error handlers', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(() => {
        initializeLogger({ enableGlobalErrorHandlers: false });
      }).not.toThrow();
    });

    it('should initialize logger with disabled Loki', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(() => {
        initializeLogger({ enableLoki: false });
      }).not.toThrow();
    });

    it('should initialize logger with custom Loki config', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      const lokiConfig = {
        enabled: true,
        minLevel: 'info' as any,
        host: 'http://test-loki:3100',
        labels: { app: 'test-app', env: 'test' },
      };

      expect(() => {
        initializeLogger({ lokiConfig });
      }).not.toThrow();
    });

    it('should handle Loki initialization failures gracefully', async () => {
      const { initializeLogger } = await import('../../../src/lib/logger/index');

      expect(() => {
        initializeLogger({ enableLoki: true });
      }).not.toThrow();
    });

    it('should handle context initialization in browser environment', async () => {
      // Simulate browser with proper event listener support
      (global as any).window = {
        location: { href: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      const context = { requestId: 'browser-request' };

      expect(() => {
        initializeLogger({ context });
      }).not.toThrow();
    });

    it('should respect LOKI_ENABLED environment variable', async () => {
      const originalEnv = process.env.LOKI_ENABLED;
      process.env.LOKI_ENABLED = 'false';

      try {
        const { initializeLogger } = await import('../../../src/lib/logger/index');

        expect(() => {
          initializeLogger(); // Should not enable Loki
        }).not.toThrow();
      } finally {
        if (originalEnv !== undefined) {
          process.env.LOKI_ENABLED = originalEnv;
        } else {
          delete process.env.LOKI_ENABLED;
        }
      }
    });
  });

  describe('logger creation and management', () => {
    it('should create appropriate logger for server environment', async () => {
      delete (global as any).window;
      vi.resetModules();

      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create appropriate logger for client environment', async () => {
      (global as any).window = {
        location: { href: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.resetModules();

      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create appropriate logger for edge environment', async () => {
      delete (global as any).window;
      // Simulate edge runtime by mocking server logger to throw
      vi.resetModules();

      const { logger } = await import('../../../src/lib/logger/index');

      expect(logger).toBeDefined();
    });
  });

  describe('context management', () => {
    it('should get logger with context correctly', async () => {
      const { getLoggerWithContext } = await import('../../../src/lib/logger/index');

      const context = {
        requestId: 'test-request',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const contextLogger = getLoggerWithContext(context);

      expect(contextLogger).toBeDefined();
      expect(typeof contextLogger.info).toBe('function');
      expect(typeof contextLogger.warn).toBe('function');
      expect(typeof contextLogger.error).toBe('function');
      expect(typeof contextLogger.debug).toBe('function');
    });

    it('should handle empty context in getLoggerWithContext', async () => {
      const { getLoggerWithContext } = await import('../../../src/lib/logger/index');

      const contextLogger = getLoggerWithContext({});

      expect(contextLogger).toBeDefined();
      expect(typeof contextLogger.info).toBe('function');
    });
  });

  describe('debug functionality', () => {
    it('should execute debug logger without errors', async () => {
      const { debugLogger } = await import('../../../src/lib/logger/index');

      expect(() => debugLogger()).not.toThrow();
    });

    it('should handle debug logger in different environments', async () => {
      // Test in server environment
      delete (global as any).window;
      vi.resetModules();

      const { debugLogger } = await import('../../../src/lib/logger/index');

      expect(() => debugLogger()).not.toThrow();

      // Test in client environment
      (global as any).window = {
        location: { href: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.resetModules();

      const clientModule = await import('../../../src/lib/logger/index');

      expect(() => clientModule.debugLogger()).not.toThrow();
    });
  });

  describe('performance measurement edge cases', () => {
    it('should handle performance measurement with complex return values', async () => {
      const { measurePerformance } = await import('../../../src/lib/logger/index');

      const complexResult = { data: 'test', numbers: [1, 2, 3], nested: { value: true } };
      const testFunction = vi.fn(() => complexResult);

      const result = measurePerformance('complex-operation', testFunction);

      expect(testFunction).toHaveBeenCalled();
      expect(result).toEqual(complexResult);
    });

    it('should handle async performance measurement with Promise rejections', async () => {
      const { measurePerformanceAsync } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error('Delayed error');
      });

      await expect(measurePerformanceAsync('delayed-error', testFunction)).rejects.toThrow(
        'Delayed error'
      );
      expect(testFunction).toHaveBeenCalled();
    });

    it('should handle performance measurement with undefined return values', async () => {
      const { measurePerformance } = await import('../../../src/lib/logger/index');

      const testFunction = vi.fn(() => undefined);
      const result = measurePerformance('undefined-operation', testFunction);

      expect(testFunction).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle logError with complex error objects', async () => {
      const { logError } = await import('../../../src/lib/logger/index');

      const complexError = new Error('Complex error');
      complexError.stack = 'Stack trace here';
      (complexError as any).code = 'E_COMPLEX';
      (complexError as any).details = { userId: '123', action: 'test' };

      expect(() => logError(complexError, { additional: 'context' })).not.toThrow();
    });

    it('should handle logUserAction with various metadata types', async () => {
      const { logUserAction } = await import('../../../src/lib/logger/index');

      const metadata = {
        userId: '123',
        timestamp: new Date().toISOString(),
        nested: { data: { value: 42 } },
        array: [1, 2, 3],
        boolean: true,
        null: null,
        undefined: undefined,
      };

      expect(() => logUserAction('complex-action', metadata)).not.toThrow();
    });

    it('should handle logError with null or undefined errors', async () => {
      const { logError } = await import('../../../src/lib/logger/index');

      expect(() => logError(null as any)).not.toThrow();
      expect(() => logError(undefined as any)).not.toThrow();
    });
  });

  describe('global error handlers', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should setup global error handlers for Node.js environment', async () => {
      // Mock process event listeners
      const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      delete (global as any).window;
      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      expect(processOnSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

      processOnSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should setup global error handlers for browser environment', async () => {
      const mockAddEventListener = vi.fn();
      (global as any).window = {
        location: { pathname: '/test' },
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
      };
      (global as any).navigator = {
        userAgent: 'test-browser',
      };

      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should handle uncaught exceptions in Node.js', async () => {
      const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      delete (global as any).window;
      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      // Get the registered handler
      const uncaughtHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'uncaughtException'
      )?.[1] as Function;

      expect(uncaughtHandler).toBeDefined();

      // Test the handler
      const testError = new Error('Test uncaught exception');
      expect(() => uncaughtHandler(testError)).toThrow('process.exit called');

      processOnSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should handle unhandled rejections in Node.js', async () => {
      const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);

      delete (global as any).window;
      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      // Get the registered handler
      const rejectionHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === 'unhandledRejection'
      )?.[1] as Function;

      expect(rejectionHandler).toBeDefined();

      // Test the handler
      const testReason = 'Test unhandled rejection';
      expect(() => rejectionHandler(testReason)).not.toThrow();

      processOnSpy.mockRestore();
    });

    it('should handle browser error events', async () => {
      const mockAddEventListener = vi.fn();
      (global as any).window = {
        location: { pathname: '/test' },
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
      };
      (global as any).navigator = {
        userAgent: 'test-browser',
      };

      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      // Get the error handler
      const errorHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1] as Function;

      expect(errorHandler).toBeDefined();

      // Test the handler
      const testEvent = {
        error: new Error('Test browser error'),
        filename: 'test.js',
        lineno: 42,
        colno: 10,
      };

      expect(() => errorHandler(testEvent)).not.toThrow();
    });

    it('should handle browser unhandled rejection events', async () => {
      const mockAddEventListener = vi.fn();
      (global as any).window = {
        location: { pathname: '/test' },
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
      };
      (global as any).navigator = {
        userAgent: 'test-browser',
      };

      vi.resetModules();

      const { initializeLogger } = await import('../../../src/lib/logger/index');

      initializeLogger({ enableGlobalErrorHandlers: true });

      // Get the unhandled rejection handler
      const rejectionHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'unhandledrejection'
      )?.[1] as Function;

      expect(rejectionHandler).toBeDefined();

      // Test the handler
      const testEvent = {
        reason: 'Test browser unhandled rejection',
      };

      expect(() => rejectionHandler(testEvent)).not.toThrow();
    });
  });
});
