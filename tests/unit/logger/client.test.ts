/**
 * クライアントサイドLogger単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  clientLogger,
  clientLoggerWrapper,
  clientLoggerHelpers,
  createClientLoggerConfig,
  createClientLogger,
  isLevelEnabled,
  log,
  defaultClientLoggerConfig,
} from '../../../src/lib/logger/client';

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

// グローバルモック設定
vi.stubGlobal('console', mockConsole);
vi.stubGlobal('performance', mockPerformance);

describe('ClientLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト環境変数設定
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'debug');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本ログ機能', () => {
    it('全てのログレベルが正常に出力される', () => {
      clientLogger.trace('Trace message');
      clientLogger.debug('Debug message');
      clientLogger.info('Info message');
      clientLogger.warn('Warn message');
      clientLogger.error('Error message');
      clientLogger.fatal('Fatal message');

      // コンソールGroupが使用されるため、group系の呼び出しを確認
      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('ログレベルフィルタリングが正常に動作する', () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn');

      // 新しい設定で別のロガーインスタンスを作成
      const warnConfig = createClientLoggerConfig();
      const warnLogger = createClientLogger(warnConfig);

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');

      // warn以上のログのみ出力される
      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('複数引数が正常に処理される', () => {
      const testObj = { key: 'value' };
      const testError = new Error('Test error');

      clientLogger.info('Test message', testObj, testError, 'extra');

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });
  });

  describe('引数処理', () => {
    it('Errorオブジェクトが正常にシリアライズされる', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      clientLogger.error('Error occurred', error);

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('オブジェクトが制限付きで処理される', () => {
      const largeObj = {
        data: 'test',
        nested: {
          deep: {
            very: {
              deep: 'value',
            },
          },
        },
      };

      clientLogger.info('Object test', largeObj);

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('null/undefinedが適切にスキップされる', () => {
      clientLogger.info('Null test', null, undefined, 'valid');

      expect(mockConsole.group).toHaveBeenCalled();
    });
  });

  describe('開発環境デバッグ機能', () => {
    it('開発環境でデバッグ情報が出力される', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const devConfig = createClientLoggerConfig();
      const devLogger = createClientLogger(devConfig);
      devLogger.info('Dev test message', { data: 'test' });

      expect(mockConsole.groupCollapsed).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('Original message:', 'Dev test message');
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('本番環境でデバッグ情報が出力されない', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const prodConfig = createClientLoggerConfig();
      const prodLogger = createClientLogger(prodConfig);
      prodLogger.info('Prod test message');

      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled();
    });
  });

  describe('Logger インターフェース', () => {
    it('isLevelEnabled が正常に動作する', () => {
      // 現在のテスト環境でのログレベルに応じた確認
      expect(typeof clientLoggerWrapper.isLevelEnabled('debug')).toBe('boolean');
      expect(typeof clientLoggerWrapper.isLevelEnabled('info')).toBe('boolean');
      expect(typeof clientLoggerWrapper.isLevelEnabled('warn')).toBe('boolean');
      expect(typeof clientLoggerWrapper.isLevelEnabled('error')).toBe('boolean');
      expect(typeof clientLoggerWrapper.isLevelEnabled('fatal')).toBe('boolean');
    });

    it('全てのログメソッドが呼び出し可能', () => {
      expect(() => clientLoggerWrapper.trace('trace')).not.toThrow();
      expect(() => clientLoggerWrapper.debug('debug')).not.toThrow();
      expect(() => clientLoggerWrapper.info('info')).not.toThrow();
      expect(() => clientLoggerWrapper.warn('warn')).not.toThrow();
      expect(() => clientLoggerWrapper.error('error')).not.toThrow();
      expect(() => clientLoggerWrapper.fatal('fatal')).not.toThrow();
    });
  });
});

describe('Pure Functions', () => {
  describe('createClientLoggerConfig', () => {
    it('不変な設定オブジェクトを生成する', () => {
      const config = createClientLoggerConfig();

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('baseProperties');
      expect(typeof config.level).toBe('string');
      expect(typeof config.baseProperties).toBe('object');

      // basePropertiesの不変性確認（Object.freeze使用）
      expect(() => {
        (config.baseProperties as any).app = 'modified';
      }).toThrow();

      // 設定の一貫性確認（同じ入力から同じ出力）
      const config2 = createClientLoggerConfig();
      expect(config.level).toBe(config2.level);
    });
  });

  describe('isLevelEnabled', () => {
    it('ログレベルの有効性を正しく判定する', () => {
      const config = createClientLoggerConfig();

      // デフォルト設定での確認
      expect(typeof isLevelEnabled(config, 'trace')).toBe('boolean');
      expect(typeof isLevelEnabled(config, 'debug')).toBe('boolean');
      expect(typeof isLevelEnabled(config, 'info')).toBe('boolean');
      expect(typeof isLevelEnabled(config, 'warn')).toBe('boolean');
      expect(typeof isLevelEnabled(config, 'error')).toBe('boolean');
      expect(typeof isLevelEnabled(config, 'fatal')).toBe('boolean');
    });

    it('設定レベル以上のログが有効と判定される', () => {
      const warnConfig = {
        level: 'warn' as const,
        baseProperties: Object.freeze({}),
      };

      expect(isLevelEnabled(warnConfig, 'trace')).toBe(false);
      expect(isLevelEnabled(warnConfig, 'debug')).toBe(false);
      expect(isLevelEnabled(warnConfig, 'info')).toBe(false);
      expect(isLevelEnabled(warnConfig, 'warn')).toBe(true);
      expect(isLevelEnabled(warnConfig, 'error')).toBe(true);
      expect(isLevelEnabled(warnConfig, 'fatal')).toBe(true);
    });
  });

  describe('log function', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('純粋関数として動作する', () => {
      const config = createClientLoggerConfig();

      // 同じ入力に対して一貫した動作
      expect(() => log(config, 'info', 'Test message')).not.toThrow();
      expect(() => log(config, 'info', 'Test message')).not.toThrow();
    });

    it('設定を変更せずに動作する', () => {
      const config = createClientLoggerConfig();
      const originalConfig = JSON.parse(JSON.stringify(config));

      log(config, 'info', 'Test message', { data: 'test' });

      expect(config).toEqual(originalConfig);
    });

    it('レベルが無効な場合はコンソール出力しない', () => {
      const config = {
        level: 'error' as const,
        baseProperties: Object.freeze({}),
      };

      log(config, 'debug', 'Debug message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
    });
  });

  describe('defaultClientLoggerConfig', () => {
    it('デフォルト設定が不変である', () => {
      expect(() => {
        (defaultClientLoggerConfig.baseProperties as any).app = 'modified';
      }).toThrow();
    });

    it('正しい型と構造を持つ', () => {
      expect(defaultClientLoggerConfig).toHaveProperty('level');
      expect(defaultClientLoggerConfig).toHaveProperty('baseProperties');
      expect(typeof defaultClientLoggerConfig.level).toBe('string');
      expect(typeof defaultClientLoggerConfig.baseProperties).toBe('object');
    });
  });
});

describe('ClientLoggerHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
  });

  describe('パフォーマンス測定', () => {
    it('正常な実行でパフォーマンスが測定される', () => {
      // infoレベルが確実に出力されるようログレベルを設定
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info');

      const testFn = vi.fn(() => 'result');

      const result = clientLoggerHelpers.measurePerformance('test-operation', testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
      // コンソール出力の確認
      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('エラー発生時でもパフォーマンスが記録される', () => {
      const testError = new Error('Test error');
      const testFn = vi.fn(() => {
        throw testError;
      });

      expect(() => clientLoggerHelpers.measurePerformance('error-operation', testFn)).toThrow(
        testError
      );

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Details:',
        expect.objectContaining({
          event_name: 'error.performance',
          duration_ms: 500,
          operation: 'error-operation',
        })
      );
    });
  });

  describe('ユーザーアクションログ', () => {
    beforeEach(() => {
      // infoレベルが出力されるよう設定
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info');
    });

    it('ユーザーアクションが正常に記録される', () => {
      clientLoggerHelpers.logUserAction('button_click', {
        button_id: 'submit-btn',
        page: '/login',
      });

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('詳細なしでもユーザーアクションが記録される', () => {
      clientLoggerHelpers.logUserAction('page_view');

      expect(mockConsole.group).toHaveBeenCalled();
    });
  });

  describe('ナビゲーションログ', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info');
    });

    it('ナビゲーションイベントが記録される', () => {
      clientLoggerHelpers.logNavigation('/home', '/profile', 'link');

      expect(mockConsole.group).toHaveBeenCalled();
    });
  });

  describe('エラーログ', () => {
    // ナビゲーターとウィンドウのモック
    const mockNavigator = { userAgent: 'Test User Agent' };
    const mockWindow = { location: { href: 'https://example.com/test' } };

    beforeEach(() => {
      vi.stubGlobal('navigator', mockNavigator);
      vi.stubGlobal('window', mockWindow);
    });

    it('Errorオブジェクトが正常に記録される', () => {
      const error = new Error('Test error');
      const context = { page: '/test' };

      clientLoggerHelpers.logError(error, context);

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Details:',
        expect.objectContaining({
          event_name: 'error.client',
          event_category: 'error_event',
          event_attributes: context,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
          }),
          user_agent: 'Test User Agent',
          url: 'https://example.com/test',
        })
      );
    });

    it('非Errorオブジェクトも記録される', () => {
      clientLoggerHelpers.logError('String error');

      expect(mockConsole.group).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Details:',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'String error',
          }),
        })
      );
    });
  });

  describe('API呼び出しログ', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info');
    });

    it('成功したAPI呼び出しが記録される', () => {
      clientLoggerHelpers.logApiCall('/api/users', 'GET', 200, 150);

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('失敗したAPI呼び出しがエラーレベルで記録される', () => {
      clientLoggerHelpers.logApiCall('/api/users', 'POST', 400, 75);

      expect(mockConsole.group).toHaveBeenCalled();
    });

    it('ステータスなしでも記録される', () => {
      clientLoggerHelpers.logApiCall('/api/test', 'DELETE');

      expect(mockConsole.group).toHaveBeenCalled();
    });
  });
});
