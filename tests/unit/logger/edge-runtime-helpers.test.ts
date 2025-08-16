import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { LoggerContext } from '@/lib/logger/types';
import {
  analyzeEdgeRuntimeCompliance,
  getEdgeRuntimeDiagnostics,
  promiseAllWithContext,
  setTimeoutWithContext,
  setIntervalWithContext,
  withEdgeContext,
  wrapWithContext,
} from '@/lib/logger/edge-runtime-helpers';

// Mock utils to control runtime environment detection
vi.mock('@/lib/logger/utils', () => ({
  detectRuntimeEnvironment: vi.fn(),
  createCompatibleStorage: vi.fn(),
}));

import { detectRuntimeEnvironment, createCompatibleStorage } from '@/lib/logger/utils';

const mockDetectRuntimeEnvironment = vi.mocked(detectRuntimeEnvironment);
const mockCreateCompatibleStorage = vi.mocked(createCompatibleStorage);

describe('Edge Runtime Helpers', () => {
  const testContext: LoggerContext = {
    requestId: 'test-request-id',
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('analyzeEdgeRuntimeCompliance', () => {
    it('should return compliant true when no context dependency', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: true,
        usesPromiseAll: true,
        usesSetTimeout: true,
        usesSetInterval: true,
        hasContextDependency: false,
      });

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should detect async operation context issues', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: true,
        usesPromiseAll: false,
        usesSetTimeout: false,
        usesSetInterval: false,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('Async operations may lose context in Edge Runtime');
      expect(result.suggestions).toContain('Use withEdgeContext() wrapper for async operations');
    });

    it('should detect Promise.all context issues', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: false,
        usesPromiseAll: true,
        usesSetTimeout: false,
        usesSetInterval: false,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('Promise.all may not preserve context in Edge Runtime');
      expect(result.suggestions).toContain('Use promiseAllWithContext() helper function');
    });

    it('should detect setTimeout context issues', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: false,
        usesPromiseAll: false,
        usesSetTimeout: true,
        usesSetInterval: false,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('setTimeout callbacks lose context in Edge Runtime');
      expect(result.suggestions).toContain('Use setTimeoutWithContext() helper function');
    });

    it('should detect setInterval context issues', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: false,
        usesPromiseAll: false,
        usesSetTimeout: false,
        usesSetInterval: true,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(false);
      expect(result.issues).toContain('setInterval callbacks lose context in Edge Runtime');
      expect(result.suggestions).toContain('Use setIntervalWithContext() helper function');
    });

    it('should provide suggestions for compliant code with context dependency', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: false,
        usesPromiseAll: false,
        usesSetTimeout: false,
        usesSetInterval: false,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toContain('Code appears to be Edge Runtime compliant');
      expect(result.suggestions).toContain(
        'Consider adding integration tests to verify context behavior'
      );
    });

    it('should handle all issues together', () => {
      const result = analyzeEdgeRuntimeCompliance({
        hasAsyncOperations: true,
        usesPromiseAll: true,
        usesSetTimeout: true,
        usesSetInterval: true,
        hasContextDependency: true,
      });

      expect(result.compliant).toBe(false);
      expect(result.issues).toHaveLength(4);
      expect(result.suggestions).toHaveLength(4);
    });
  });

  describe('getEdgeRuntimeDiagnostics', () => {
    it('should return edge runtime diagnostics', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');

      const result = getEdgeRuntimeDiagnostics();

      expect(result.runtime).toBe('edge');
      expect(result.contextStorageType).toBe('EdgeContextStorage');
      expect(result.recommendations).toContain(
        'Use explicit context binding with storage.bind() for async operations'
      );
      expect(result.recommendations).toContain(
        'Use withEdgeContext() helper for complex async flows'
      );
    });

    it('should return nodejs runtime diagnostics', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const result = getEdgeRuntimeDiagnostics();

      expect(result.runtime).toBe('nodejs');
      // Node.js環境では通常AsyncLocalStorageが利用可能
      expect(result.asyncLocalStorageAvailable).toBe(true);
      expect(result.contextStorageType).toBe('AsyncLocalStorage');
      expect(result.recommendations).toContain(
        'AsyncLocalStorage is available - use standard context management'
      );
    });

    it('should handle browser environment', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('browser');

      const result = getEdgeRuntimeDiagnostics();

      expect(result.runtime).toBe('browser');
      // テスト環境では Node.js 上で実行されるため AsyncLocalStorage が利用可能になる
      // ブラウザ環境でも AsyncLocalStorage が検出される場合の動作をテスト
      expect(['AsyncLocalStorage', 'Unknown']).toContain(result.contextStorageType);
    });

    it('should verify return structure', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');

      const result = getEdgeRuntimeDiagnostics();

      expect(result).toHaveProperty('runtime');
      expect(result).toHaveProperty('asyncLocalStorageAvailable');
      expect(result).toHaveProperty('contextStorageType');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('promiseAllWithContext', () => {
    it('should handle edge runtime with context binding', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        run: vi.fn().mockImplementation((context, fn) => fn()),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const operations = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      const result = await promiseAllWithContext(testContext, operations);

      expect(result).toEqual(['result1', 'result2']);
      expect(mockStorage.run).toHaveBeenCalledTimes(2);
      expect(operations[0]).toHaveBeenCalled();
      expect(operations[1]).toHaveBeenCalled();
    });

    it('should handle nodejs runtime without context binding', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const operations = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      const result = await promiseAllWithContext(testContext, operations);

      expect(result).toEqual(['result1', 'result2']);
      expect(operations[0]).toHaveBeenCalled();
      expect(operations[1]).toHaveBeenCalled();
      expect(mockCreateCompatibleStorage).not.toHaveBeenCalled();
    });

    it('should handle operation failures', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const operations = [
        vi.fn().mockResolvedValue('success'),
        vi.fn().mockRejectedValue(new Error('Operation failed')),
      ];

      await expect(promiseAllWithContext(testContext, operations)).rejects.toThrow(
        'Operation failed'
      );
    });
  });

  describe('setTimeoutWithContext', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle edge runtime with context binding', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        bind: vi.fn().mockImplementation((fn) => fn),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const callback = vi.fn();
      const timerId = setTimeoutWithContext(testContext, callback, 1000);

      expect(mockStorage.bind).toHaveBeenCalledWith(callback, testContext);
      expect(timerId).toBeDefined();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalled();
    });

    it('should handle nodejs runtime without context binding', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const callback = vi.fn();
      const timerId = setTimeoutWithContext(testContext, callback, 1000);

      expect(timerId).toBeDefined();
      expect(mockCreateCompatibleStorage).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('setIntervalWithContext', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle edge runtime with context binding', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        bind: vi.fn().mockImplementation((fn) => fn),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const callback = vi.fn();
      const intervalId = setIntervalWithContext(testContext, callback, 1000);

      expect(mockStorage.bind).toHaveBeenCalledWith(callback, testContext);
      expect(intervalId).toBeDefined();

      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(2);

      clearInterval(intervalId);
    });

    it('should handle nodejs runtime without context binding', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const callback = vi.fn();
      const intervalId = setIntervalWithContext(testContext, callback, 1000);

      expect(intervalId).toBeDefined();
      expect(mockCreateCompatibleStorage).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(2);

      clearInterval(intervalId);
    });
  });

  describe('withEdgeContext', () => {
    it('should handle edge runtime with context binding', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        run: vi.fn().mockImplementation((context, fn) => fn()),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const operation = vi.fn().mockResolvedValue('test-result');
      const result = await withEdgeContext(testContext, operation);

      expect(result).toBe('test-result');
      expect(mockStorage.run).toHaveBeenCalledWith(testContext, operation);
    });

    it('should handle nodejs runtime without context binding', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const operation = vi.fn().mockResolvedValue('test-result');
      const result = await withEdgeContext(testContext, operation);

      expect(result).toBe('test-result');
      expect(operation).toHaveBeenCalled();
      expect(mockCreateCompatibleStorage).not.toHaveBeenCalled();
    });

    it('should handle operation failures', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        run: vi.fn().mockImplementation((context, fn) => fn()),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withEdgeContext(testContext, operation)).rejects.toThrow('Operation failed');
    });
  });

  describe('wrapWithContext', () => {
    it('should handle edge runtime with function wrapping', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        bind: vi.fn().mockImplementation((fn) => fn),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const originalFn = vi.fn();
      const wrappedFn = wrapWithContext(originalFn, testContext);

      expect(mockStorage.bind).toHaveBeenCalledWith(originalFn, testContext);
      expect(typeof wrappedFn).toBe('function');

      wrappedFn();
      expect(originalFn).toHaveBeenCalled();
    });

    it('should handle nodejs runtime without wrapping', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('nodejs');

      const originalFn = vi.fn();
      const wrappedFn = wrapWithContext(originalFn, testContext);

      expect(wrappedFn).toBe(originalFn);
      expect(mockCreateCompatibleStorage).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle undefined context gracefully', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      
      const mockStorage = {
        run: vi.fn().mockImplementation((context, fn) => fn()),
      };
      mockCreateCompatibleStorage.mockReturnValue(mockStorage as any);

      const operations = [vi.fn().mockResolvedValue('result')];
      const result = await promiseAllWithContext(undefined as any, operations);

      expect(result).toEqual(['result']);
      expect(mockStorage.run).toHaveBeenCalled();
    });

    it('should handle empty operations array', async () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');

      const result = await promiseAllWithContext(testContext, []);

      expect(result).toEqual([]);
    });

    it('should handle storage creation failures', () => {
      mockDetectRuntimeEnvironment.mockReturnValue('edge');
      mockCreateCompatibleStorage.mockImplementation(() => {
        throw new Error('Storage creation failed');
      });

      expect(() => {
        setTimeoutWithContext(testContext, () => {}, 1000);
      }).toThrow('Storage creation failed');
    });
  });
});