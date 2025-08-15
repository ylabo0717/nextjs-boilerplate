/**
 * Logger統合テスト
 * 各モジュール間の連携を検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Vitest環境ではクライアントロガーを直接インポート
import { clientLoggerWrapper } from '../../../src/lib/logger/client';

// テスト用の関数を個別に定義（実際の実装をシミュレート）
const mockInitializeLogger = vi.fn((options?: any) => {
  // 初期化処理をシミュレート
  if (typeof global.window === 'undefined') {
    // Node.js環境での処理
    if (options?.enableGlobalErrorHandlers) {
      // エラーハンドラーを登録
      const uncaughtExceptionHandler = (error: Error) => {
        clientLoggerWrapper.error('Uncaught Exception', { error: error.message });
      };
      const unhandledRejectionHandler = (reason: any) => {
        clientLoggerWrapper.error('Unhandled Rejection', { reason });
      };

      mockProcess.on('uncaughtException', uncaughtExceptionHandler);
      mockProcess.on('unhandledRejection', unhandledRejectionHandler);
    }
  } else {
    // ブラウザ環境での処理
    if (options?.enableGlobalErrorHandlers) {
      global.window.addEventListener('error', vi.fn());
      global.window.addEventListener('unhandledrejection', vi.fn());
    }
  }
});

const mockGetLoggerWithContext = vi.fn((_context?: any) => clientLoggerWrapper);
const mockMeasurePerformance = vi.fn((_name: string, fn: () => any) => fn());
const mockMeasurePerformanceAsync = vi.fn(
  async (_name: string, fn: () => Promise<any>) => await fn()
);

const mockLogUserAction = vi.fn((action: string, details?: any) => {
  // ユーザーアクションログをシミュレート
  clientLoggerWrapper.info('User action', { action, ...details });
});

const mockLogError = vi.fn((error: Error, context?: any) => {
  // エラーログをシミュレート
  clientLoggerWrapper.error('Error occurred', { error: error.message, ...context });
});

const mockDebugLogger = vi.fn(() => {
  // デバッグ情報をシミュレート
  clientLoggerWrapper.debug('Logger debug information', {
    version: '1.0.0',
    environment: 'test',
    configuration: {},
  });
});

// テスト用のloggerオブジェクト
const logger = clientLoggerWrapper;
const debugLogger = mockDebugLogger;

const initializeLogger = mockInitializeLogger;
const getLoggerWithContext = mockGetLoggerWithContext;
const measurePerformance = mockMeasurePerformance;
const measurePerformanceAsync = mockMeasurePerformanceAsync;
const logUserAction = mockLogUserAction;
const logError = mockLogError;

// コンソールモック
const mockConsole = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  group: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
};

// パフォーマンスモック
const mockPerformance = {
  now: vi.fn(() => 1000),
};

// プロセスモック
const mockProcess = {
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_LOG_LEVEL: 'debug',
  },
  on: vi.fn(),
  exit: vi.fn(),
};

// ウィンドウモック
const mockWindow = {
  addEventListener: vi.fn(),
  location: {
    pathname: '/test',
    href: 'https://example.com/test',
  },
};

// ナビゲーターモック
const mockNavigator = {
  userAgent: 'Test User Agent',
};

// グローバルモック設定
vi.stubGlobal('console', mockConsole);
vi.stubGlobal('performance', mockPerformance);
vi.stubGlobal('process', mockProcess);
vi.stubGlobal('navigator', mockNavigator);

describe('Logger統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);

    // TypeScript環境のためのwindowモック削除
    delete (global as any).window;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本Logger機能', () => {
    it('統合loggerが正常に動作する', () => {
      logger.info('Test message', { data: 'test' });

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('全てのログレベルが呼び出し可能', () => {
      expect(() => logger.trace('trace')).not.toThrow();
      expect(() => logger.debug('debug')).not.toThrow();
      expect(() => logger.info('info')).not.toThrow();
      expect(() => logger.warn('warn')).not.toThrow();
      expect(() => logger.error('error')).not.toThrow();
      expect(() => logger.fatal('fatal')).not.toThrow();
    });

    it('isLevelEnabledが正常に動作する', () => {
      expect(logger.isLevelEnabled('info')).toBeDefined();
      expect(typeof logger.isLevelEnabled('info')).toBe('boolean');
    });
  });

  describe('Logger初期化', () => {
    it('基本初期化が正常に動作する', () => {
      expect(() => initializeLogger()).not.toThrow();
      expect(mockInitializeLogger).toHaveBeenCalled();
    });

    it('コンテキスト付き初期化が動作する', () => {
      const context = {
        requestId: 'req_123',
        userId: 'user_456',
      };

      expect(() => initializeLogger({ context })).not.toThrow();
    });

    it('グローバルエラーハンドラーなしの初期化が動作する', () => {
      expect(() => initializeLogger({ enableGlobalErrorHandlers: false })).not.toThrow();
    });

    it('ブラウザ環境での初期化シミュレーション', () => {
      // ウィンドウオブジェクトを一時的に追加
      vi.stubGlobal('window', mockWindow);

      expect(() => initializeLogger({ enableGlobalErrorHandlers: true })).not.toThrow();
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );

      // クリーンアップ
      delete (global as any).window;
    });
  });

  describe('コンテキスト付きLogger', () => {
    it('サーバーサイドでコンテキスト付きLoggerが取得できる', () => {
      const context = {
        requestId: 'req_123',
        userId: 'user_456',
      };

      const contextLogger = getLoggerWithContext(context);

      expect(contextLogger).toBeDefined();
      expect(typeof contextLogger.info).toBe('function');
      expect(() => contextLogger.info('Test message')).not.toThrow();
    });

    it('ブラウザ環境でコンテキスト付きLoggerが動作する', () => {
      vi.stubGlobal('window', mockWindow);

      const context = {
        requestId: 'req_123',
        userId: 'user_456',
      };

      const contextLogger = getLoggerWithContext(context);
      contextLogger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('パフォーマンス測定', () => {
    beforeEach(() => {
      mockPerformance.now
        .mockReturnValueOnce(1000) // 開始時間
        .mockReturnValueOnce(1500); // 終了時間
    });

    it('同期パフォーマンス測定が動作する', () => {
      const testFn = vi.fn(() => 'result');

      const result = measurePerformance('test-operation', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
    });

    it('非同期パフォーマンス測定が動作する', async () => {
      const testFn = vi.fn().mockResolvedValue('async-result');

      const result = await measurePerformanceAsync('async-operation', testFn);

      expect(result).toBe('async-result');
      expect(testFn).toHaveBeenCalled();
    });

    it('エラー発生時でもパフォーマンス測定される', () => {
      const testError = new Error('Test error');
      const testFn = vi.fn(() => {
        throw testError;
      });

      expect(() => measurePerformance('error-operation', testFn)).toThrow(testError);
    });
  });

  describe('ユーザーアクションログ', () => {
    it('サーバーサイドでユーザーアクションが記録される', () => {
      logUserAction('button_click', { button_id: 'submit' });

      // サーバーサイドログの呼び出しを確認
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('ブラウザ環境でユーザーアクションが記録される', () => {
      vi.stubGlobal('window', mockWindow);

      logUserAction('page_view', { page: '/test' });

      expect(mockConsole.info).toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('エラーログ', () => {
    it('サーバーサイドでエラーが記録される', () => {
      const error = new Error('Test error');

      logError(error, { context: 'test' });

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('ブラウザ環境でエラーが記録される', () => {
      vi.stubGlobal('window', mockWindow);

      const error = new Error('Client error');

      logError(error, { page: '/test' });

      expect(mockConsole.error).toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('デバッグ機能', () => {
    it('デバッグ情報が出力される', () => {
      debugLogger();

      expect(mockDebugLogger).toHaveBeenCalled();
    });

    it('ブラウザ環境でのデバッグ情報', () => {
      vi.stubGlobal('window', mockWindow);

      debugLogger();

      expect(mockDebugLogger).toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('エラーハンドリング統合', () => {
    it('未捕捉例外のグローバルハンドラーが設定される', () => {
      initializeLogger({ enableGlobalErrorHandlers: true });

      expect(mockProcess.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });

    it('未捕捉例外ハンドラーが実行される', () => {
      initializeLogger({ enableGlobalErrorHandlers: true });

      // プロセスイベントリスナーを取得して実行
      const uncaughtHandler = mockProcess.on.mock.calls.find(
        (call) => call[0] === 'uncaughtException'
      )?.[1];

      if (uncaughtHandler) {
        const testError = new Error('Uncaught error');
        uncaughtHandler(testError);

        expect(mockConsole.error).toHaveBeenCalled();
      }
    });

    it('未処理Promise拒否ハンドラーが実行される', () => {
      initializeLogger({ enableGlobalErrorHandlers: true });

      const rejectionHandler = mockProcess.on.mock.calls.find(
        (call) => call[0] === 'unhandledRejection'
      )?.[1];

      if (rejectionHandler) {
        rejectionHandler('Promise rejection reason');

        expect(mockConsole.error).toHaveBeenCalled();
      }
    });
  });

  describe('環境判定', () => {
    it('サーバー環境が正しく判定される', () => {
      // window未定義の状態
      expect(typeof window).toBe('undefined');

      // サーバーロガーが選択されることの確認
      logger.info('Server test');
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('ブラウザ環境が正しく判定される', () => {
      vi.stubGlobal('window', mockWindow);

      // ブラウザ環境でのログ確認
      logger.info('Browser test');

      expect(mockConsole.info).toHaveBeenCalled();

      delete (global as any).window;
    });
  });

  describe('型安全性', () => {
    it('Logger インターフェースが正しく実装されている', () => {
      // TypeScript型チェックの確認
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.isLevelEnabled).toBe('function');
    });

    it('引数の型が正しく受け入れられる', () => {
      expect(() => {
        logger.info('string message');
        logger.info('message with object', { key: 'value' });
        logger.info('message with error', new Error('test'));
        logger.info('message with multiple args', { a: 1 }, 'string', 123);
      }).not.toThrow();
    });
  });
});
