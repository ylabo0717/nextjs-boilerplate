/**
 * Logger Context Integration Tests
 * 
 * Tests logger context functionality 
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Logger Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic context operations', () => {
    it('should run context operations without errors', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      const testContext = {
        requestId: 'test-request-123',
        userId: 'test-user-456',
      };

      let contextInsideRun;
      await loggerContextManager.runWithContext(testContext, async () => {
        contextInsideRun = loggerContextManager.getContext();
      });

      // Context should be captured
      expect(contextInsideRun).toBeDefined();
    });

    it('should handle context without errors', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      // Should not throw when getting context outside of a run
      expect(() => loggerContextManager.getContext()).not.toThrow();
    });

    it('should create contextual logger', async () => {
      const { createContextualLogger, defaultLoggerContextConfig } = await import('../../../src/lib/logger/context');

      const baseLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };

      const logger = createContextualLogger(defaultLoggerContextConfig, baseLogger);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should log events without errors', async () => {
      const { logUserAction, logSystemEvent, logSecurityEvent, logErrorEvent, defaultLoggerContextConfig } = await import('../../../src/lib/logger/context');

      // Should not throw when logging events
      const mockLogger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
      };
      expect(() => logUserAction(defaultLoggerContextConfig, mockLogger, 'test-action', { data: 'test' })).not.toThrow();
      expect(() => logSystemEvent(defaultLoggerContextConfig, mockLogger, 'test-event', { data: 'test' })).not.toThrow();
      expect(() => logSecurityEvent(defaultLoggerContextConfig, mockLogger, 'test-security', { data: 'test' })).not.toThrow();
      expect(() => logErrorEvent(defaultLoggerContextConfig, mockLogger, new Error('test'), { data: 'test' })).not.toThrow();
    });

    it('should create logger context config', async () => {
      const { createLoggerContextConfig } = await import('../../../src/lib/logger/context');

      const config = createLoggerContextConfig();

      expect(config).toBeDefined();
      expect(config.storage).toBeDefined();
    });

    it('should set trace context', async () => {
      const { loggerContextManager } = await import('../../../src/lib/logger/context');

      await loggerContextManager.runWithContext({ requestId: 'test' }, async () => {
        // Should not throw when setting trace context
        expect(() => loggerContextManager.setTraceContext('trace-123', 'span-456')).not.toThrow();
      });
    });
  });
});