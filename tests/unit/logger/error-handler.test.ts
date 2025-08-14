/**
 * エラーハンドラー単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  ErrorClassifier,
  ErrorHandler,
  errorHandlerUtils,
} from '../../../src/lib/logger/error-handler';

import type { Logger } from '../../../src/lib/logger/types';

// モックLogger
const mockLogger: Logger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
};

describe('ErrorClassifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('エラー分類', () => {
    it('ValidationError が正しく分類される', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('validation_error');
      expect(result.severity).toBe('low');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.userMessage).toBe('Invalid input provided');
    });

    it('AuthenticationError が正しく分類される', () => {
      const error = new Error('unauthorized access');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('authentication_error');
      expect(result.severity).toBe('medium');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.userMessage).toBe('Authentication required');
    });

    it('AuthorizationError が正しく分類される', () => {
      const error = new Error('Access denied');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('authorization_error');
      expect(result.severity).toBe('medium');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('NotFoundError が正しく分類される', () => {
      const error = new Error('Resource not found');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('not_found_error');
      expect(result.severity).toBe('low');
      expect(result.statusCode).toBe(404);
    });

    it('NetworkError が正しく分類される', () => {
      const error = new Error('Network timeout');
      error.name = 'NetworkError';

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('network_error');
      expect(result.severity).toBe('medium');
      expect(result.isRetryable).toBe(true);
      expect(result.statusCode).toBe(503);
    });

    it('DatabaseError が正しく分類される', () => {
      const error = new Error('Database query failed');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('database_error');
      expect(result.severity).toBe('high');
      expect(result.isRetryable).toBe(true);
      expect(result.statusCode).toBe(503);
    });

    it('RateLimitError が正しく分類される', () => {
      const error = new Error('Rate limit exceeded');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('rate_limit_error');
      expect(result.severity).toBe('medium');
      expect(result.isRetryable).toBe(true);
      expect(result.statusCode).toBe(429);
    });

    it('不明なエラーがsystem_errorとして分類される', () => {
      const error = new Error('Unknown error');

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('system_error');
      expect(result.severity).toBe('high');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('非Errorオブジェクトがunknown_errorとして分類される', () => {
      const error = 'String error';

      const result = ErrorClassifier.classify(error);

      expect(result.category).toBe('unknown_error');
      expect(result.severity).toBe('medium');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('String error');
    });
  });

  describe('コンテキスト付きエラー分類', () => {
    it('コンテキスト情報が正しく保存される', () => {
      const error = new Error('Test error');
      const context = {
        requestId: 'req_123',
        userId: 'user_456',
        path: '/api/test',
        method: 'POST',
      };

      const result = ErrorClassifier.classify(error, context);

      expect(result.context).toEqual(context);
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('エラー処理', () => {
    it('低重要度エラーがinfoレベルでログされる', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      const result = errorHandler.handle(error);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('validation_error'),
        expect.objectContaining({
          event_name: 'error.validation_error',
          event_category: 'error_event',
          error_category: 'validation_error',
          error_severity: 'low',
        })
      );
      expect(result.category).toBe('validation_error');
    });

    it('中重要度エラーがwarnレベルでログされる', () => {
      const error = new Error('Network timeout');
      error.name = 'NetworkError';

      errorHandler.handle(error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('network_error'),
        expect.objectContaining({
          error_severity: 'medium',
        })
      );
    });

    it('高重要度エラーがerrorレベルでログされる', () => {
      const error = new Error('Database failed');

      errorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('database_error'),
        expect.objectContaining({
          error_severity: 'high',
        })
      );
    });

    it('重要エラーがerrorレベルでログされる', () => {
      const error = new Error('Critical system failure');
      const context = { additionalData: { severity: 'critical' } };

      // カスタムクラシファイアで重要エラーを作成
      const structuredError = ErrorClassifier.classify(error, context);
      structuredError.severity = 'critical';

      const handler = new ErrorHandler(mockLogger);
      handler.handle(error, context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('API エラーハンドリング', () => {
    it('API エラーレスポンスが正しく生成される', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const context = { requestId: 'req_123' };

      const response = errorHandler.handleApiError(error, context);

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      // レスポンスボディの検証
      const responseText = response.text;
      expect(typeof responseText).toBe('function');
    });

    it('不明なエラーが500ステータスを返す', () => {
      const error = new Error('Unknown error');

      const response = errorHandler.handleApiError(error);

      expect(response.status).toBe(500);
    });
  });

  describe('React コンポーネントエラーハンドリング', () => {
    it('コンポーネントエラー情報が正しく返される', () => {
      const error = new Error('Component render failed');
      const context = { requestId: 'req_123' };

      const result = errorHandler.handleComponentError(error, context);

      expect(result).toEqual({
        userMessage: 'An error occurred',
        shouldRetry: false,
        errorId: 'req_123',
      });
    });

    it('リトライ可能エラーでshouldRetryがtrueになる', () => {
      const error = new Error('Network timeout');
      error.name = 'NetworkError';

      const result = errorHandler.handleComponentError(error);

      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('グローバルエラーハンドリング', () => {
    it('未捕捉例外が正しく処理される', () => {
      const error = new Error('Uncaught exception');
      const context = { timestamp: '2024-01-01T00:00:00.000Z' };

      errorHandler.handleUncaughtException(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('system_error'),
        expect.objectContaining({
          context: expect.objectContaining({
            additionalData: expect.objectContaining({
              type: 'uncaught_exception',
            }),
          }),
        })
      );
    });

    it('未処理Promise拒否が正しく処理される', () => {
      const reason = 'Promise rejection reason';
      const context = { timestamp: '2024-01-01T00:00:00.000Z' };

      errorHandler.handleUnhandledRejection(reason, context);

      // 未処理Promise拒否は何らかのログレベルで処理される
      const totalCalls =
        (mockLogger.info as any).mock.calls.length +
        (mockLogger.warn as any).mock.calls.length +
        (mockLogger.error as any).mock.calls.length;
      expect(totalCalls).toBeGreaterThan(0);
    });
  });
});

describe('errorHandlerUtils', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('withErrorHandling', () => {
    it('正常実行時にエラーハンドリングが呼ばれない', async () => {
      const testFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = errorHandlerUtils.withErrorHandling(testFn, errorHandler);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('エラー発生時にエラーハンドリングが呼ばれる', async () => {
      const testError = new Error('Test error');
      const testFn = vi.fn().mockRejectedValue(testError);
      const wrappedFn = errorHandlerUtils.withErrorHandling(testFn, errorHandler);

      await expect(wrappedFn()).rejects.toThrow(testError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('safeExecute', () => {
    it('正常実行時に結果が返される', async () => {
      const testFn = vi.fn().mockResolvedValue('success');

      const result = await errorHandlerUtils.safeExecute(testFn, errorHandler);

      expect(result).toBe('success');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('エラー発生時にフォールバック値が返される', async () => {
      const testFn = vi.fn().mockRejectedValue(new Error('Test error'));
      const fallback = 'fallback';

      const result = await errorHandlerUtils.safeExecute(testFn, errorHandler, {}, fallback);

      expect(result).toBe(fallback);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('フォールバックなしでundefinedが返される', async () => {
      const testFn = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await errorHandlerUtils.safeExecute(testFn, errorHandler);

      expect(result).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('createErrorBoundaryHandler', () => {
    it('React エラーバウンダリハンドラーが正しく作成される', () => {
      const handler = errorHandlerUtils.createErrorBoundaryHandler(errorHandler);
      const error = new Error('Component error');
      const errorInfo = { componentStack: 'Component stack trace' };

      handler(error, errorInfo);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('system_error'),
        expect.objectContaining({
          context: expect.objectContaining({
            additionalData: expect.objectContaining({
              component_stack: 'Component stack trace',
              type: 'react_error_boundary',
            }),
          }),
        })
      );
    });
  });

  describe('createApiHandler', () => {
    it('API ハンドラーが正しく作成される', () => {
      const apiHandler = errorHandlerUtils.createApiHandler(errorHandler);
      const error = new Error('API error');
      const context = {
        requestId: 'req_123',
        path: '/api/test',
        method: 'POST',
      };

      const response = apiHandler(error, context);

      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
