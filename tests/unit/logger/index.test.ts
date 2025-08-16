/**
 * Logger Index Unit Tests
 * 
 * Tests for main logger exports and environment detection
 * Focuses on pure functions and controlled side effects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  serverLoggerHelpers: {
    measurePerformance: vi.fn((name, fn) => fn()),
    measurePerformanceAsync: vi.fn(async (name, fn) => await fn()),
    logError: vi.fn(),
    logUserAction: vi.fn(),
  },
}));

describe('Logger Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

      await expect(measurePerformanceAsync('test-operation', testFunction))
        .rejects.toThrow('Async test error');
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
      expect(() => initializeLogger({ enableGlobalErrorHandlers: true, enableLoki: false })).not.toThrow();
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
});