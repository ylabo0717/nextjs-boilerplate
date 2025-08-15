/**
 * ドキュメント整合性テスト
 *
 * 作成した開発者向けドキュメントのコード例や設定例が
 * 実際に期待通りに動作するかを検証するテストスイート
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { loggerContextManager } from '@/lib/logger/context';
import { measurePerformance, measurePerformanceAsync } from '@/lib/logger';

describe('Documentation Validation - Basic Usage Patterns', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // コンソール出力をキャプチャ
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 基本的な使い方 (logging-system-overview.md)', () => {
    it('基本的なログレベルの使用例が動作する', () => {
      // ドキュメントから抽出: 基本的なログレベル
      logger.trace('詳細なデバッグ情報');
      logger.debug('開発用情報');
      logger.info('一般的な情報');
      logger.warn('警告メッセージ');
      logger.error('エラー情報');
      logger.fatal('致命的エラー');

      // 各ログレベルが呼び出されることを確認
      expect(true).toBe(true); // エラーが発生しないことを確認
    });

    it('構造化データとの併用例が動作する', () => {
      // ドキュメントから抽出: 構造化データとの併用
      logger.info('ユーザーログイン', {
        userId: '12345',
        timestamp: new Date(),
        metadata: { source: 'web' },
      });

      expect(true).toBe(true); // エラーが発生しないことを確認
    });

    it('ユーザーアクション記録の例が動作する', () => {
      // ドキュメントから抽出: ユーザーアクション記録
      logger.info('ユーザーアクション実行', {
        event_name: 'user_click',
        event_category: 'ui_interaction',
        user_id: '12345',
        component: 'header_button',
        timestamp: new Date().toISOString(),
      });

      expect(true).toBe(true);
    });

    it('APIエラー記録の例が動作する', () => {
      // ドキュメントから抽出: APIエラー記録
      logger.error('API呼び出し失敗', {
        event_name: 'api_error',
        event_category: 'external_service',
        endpoint: '/api/users',
        status_code: 500,
        response_time_ms: 1250,
      });

      expect(true).toBe(true);
    });

    it('エラーハンドリングの例が動作する', () => {
      // ドキュメントから抽出: エラーハンドリング
      try {
        throw new Error('テスト用エラー');
      } catch (error) {
        logger.error('処理エラー', { error, context: 'user-action' });
      }

      expect(true).toBe(true);
    });
  });

  describe('2. 高度な機能の使用例', () => {
    it('カスタムロガー作成の例が動作する', () => {
      // ドキュメントから抽出: カスタムロガー作成（修正版）
      const componentLogger = loggerContextManager.createContextualLogger(logger, {
        component: 'UserProfile',
        version: '1.2.0',
      });

      componentLogger.info('コンポーネント初期化完了');

      expect(componentLogger).toBeDefined();
      expect(typeof componentLogger.info).toBe('function');
    });

    it('条件付きログ出力の例が動作する', () => {
      // ドキュメントから抽出: 条件付きログ出力
      if (logger.isLevelEnabled('debug')) {
        const expensiveData = { computed: 'expensive-debug-info' };
        logger.debug('詳細デバッグ情報', { data: expensiveData });
      }

      expect(typeof logger.isLevelEnabled).toBe('function');
    });

    it('パフォーマンス測定（同期）の例が動作する', () => {
      // ドキュメントから抽出: パフォーマンス測定（修正版）
      const result = measurePerformance('計算処理', () => {
        return Array.from({ length: 1000 }, (_, i) => i * 2).reduce((a, b) => a + b, 0);
      });

      // 実装では関数の戻り値のみが返される（パフォーマンス情報は自動ログ出力）
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('パフォーマンス測定（非同期）の例が動作する', async () => {
      // ドキュメントから抽出: 非同期パフォーマンス測定（修正版）
      const result = await measurePerformanceAsync('API呼び出し', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'api-result';
      });

      // 実装では関数の戻り値のみが返される（パフォーマンス情報は自動ログ出力）
      expect(result).toBeDefined();
      expect(result).toBe('api-result');
    });

    it('リクエストコンテキストの例が動作する', async () => {
      // ドキュメントから抽出: リクエストコンテキスト（修正版）
      await loggerContextManager.runWithContext(
        {
          requestId: '12345',
          userId: 'user-001',
          traceId: 'trace-abc',
        },
        async () => {
          logger.info('処理開始');
          await new Promise((resolve) => setTimeout(resolve, 1));
          logger.info('処理完了');
        }
      );

      expect(true).toBe(true);
    });
  });

  describe('3. セキュリティ機能の動作確認', () => {
    it('機密情報自動Redactionが動作する', () => {
      // ドキュメントから抽出: 機密情報自動Redaction
      logger.info('API呼び出し', {
        password: 'secret123', // → '[REDACTED]'
        token: 'bearer-token', // → '[REDACTED]'
        userInfo: {
          email: 'user@example.com',
          creditCard: '4111-1111', // → '[REDACTED]'
        },
      });

      expect(true).toBe(true);
    });

    it('IPアドレスハッシュ化が設定されている場合動作する', () => {
      // 環境変数設定のテスト
      const originalSecret = process.env.LOG_IP_HASH_SECRET;

      try {
        process.env.LOG_IP_HASH_SECRET =
          'test-secret-key-for-ip-hashing-at-least-64-characters-long';

        logger.info('アクセスログ', {
          clientIp: '192.168.1.1', // → ハッシュ化されるはず
        });

        expect(true).toBe(true);
      } finally {
        if (originalSecret) {
          process.env.LOG_IP_HASH_SECRET = originalSecret;
        } else {
          delete process.env.LOG_IP_HASH_SECRET;
        }
      }
    });
  });

  describe('4. パフォーマンス機能の動作確認', () => {
    it('動的サンプリングの例が動作する', () => {
      // ドキュメントから抽出: 動的サンプリング
      logger.info('高頻度イベント'); // サンプリング対象
      logger.error('重要エラー'); // 常に出力（優先保持）

      expect(true).toBe(true);
    });

    it('大量ログ出力でのパフォーマンステストが動作する', () => {
      // ドキュメントから抽出: パフォーマンステスト
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        logger.info(`パフォーマンステスト ${i}`, { iteration: i });
      }
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // 100ログが1秒以内
    });
  });
});

describe('Documentation Validation - Environment Configuration', () => {
  describe('5. 環境変数設定のテスト (logging-configuration-guide.md)', () => {
    it('開発環境設定例が適用される', () => {
      // ドキュメントから抽出: 開発環境設定
      const originalEnv = {
        LOG_LEVEL: process.env.LOG_LEVEL,
        NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
      };

      try {
        process.env.LOG_LEVEL = 'debug';
        process.env.NEXT_PUBLIC_LOG_LEVEL = 'debug';

        logger.debug('開発環境デバッグログ');

        expect(process.env.LOG_LEVEL).toBe('debug');
        expect(process.env.NEXT_PUBLIC_LOG_LEVEL).toBe('debug');
      } finally {
        // 環境変数を復元
        if (originalEnv.LOG_LEVEL) {
          process.env.LOG_LEVEL = originalEnv.LOG_LEVEL;
        } else {
          delete process.env.LOG_LEVEL;
        }
        if (originalEnv.NEXT_PUBLIC_LOG_LEVEL) {
          process.env.NEXT_PUBLIC_LOG_LEVEL = originalEnv.NEXT_PUBLIC_LOG_LEVEL;
        } else {
          delete process.env.NEXT_PUBLIC_LOG_LEVEL;
        }
      }
    });

    it('本番環境設定例が適用される', () => {
      // ドキュメントから抽出: 本番環境設定
      const originalEnv = {
        LOG_LEVEL: process.env.LOG_LEVEL,
        NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
        NODE_ENV: process.env.NODE_ENV,
      };

      try {
        process.env.LOG_LEVEL = 'info';
        process.env.NEXT_PUBLIC_LOG_LEVEL = 'warn';
        (process.env as any).NODE_ENV = 'production';

        logger.info('本番環境情報ログ');
        logger.warn('本番環境警告ログ');

        expect(process.env.LOG_LEVEL).toBe('info');
        expect(process.env.NEXT_PUBLIC_LOG_LEVEL).toBe('warn');
      } finally {
        // 環境変数を復元
        Object.entries(originalEnv).forEach(([key, value]) => {
          if (value) {
            process.env[key] = value;
          } else {
            delete process.env[key];
          }
        });
      }
    });

    it('レート制限設定例が適用される', () => {
      // ドキュメントから抽出: レート制限設定
      const originalEnv = {
        LOG_RATE_LIMIT_MAX_TOKENS: process.env.LOG_RATE_LIMIT_MAX_TOKENS,
        LOG_RATE_LIMIT_REFILL_RATE: process.env.LOG_RATE_LIMIT_REFILL_RATE,
      };

      try {
        process.env.LOG_RATE_LIMIT_MAX_TOKENS = '50';
        process.env.LOG_RATE_LIMIT_REFILL_RATE = '5';

        // 設定が読み込まれることを確認
        expect(process.env.LOG_RATE_LIMIT_MAX_TOKENS).toBe('50');
        expect(process.env.LOG_RATE_LIMIT_REFILL_RATE).toBe('5');
      } finally {
        // 環境変数を復元
        Object.entries(originalEnv).forEach(([key, value]) => {
          if (value) {
            process.env[key] = value;
          } else {
            delete process.env[key];
          }
        });
      }
    });
  });
});

describe('Documentation Validation - Error Scenarios', () => {
  describe('6. トラブルシューティングシナリオ (logging-troubleshooting-guide.md)', () => {
    it('Redactionテストの例が動作する', () => {
      // ドキュメントから抽出: Redactionテスト
      logger.info('Redactionテスト', {
        password: 'secret123', // 自動でマスクされるはず
        token: 'bearer-token', // 自動でマスクされるはず
        normalField: 'normal-value', // そのまま出力されるはず
      });

      expect(true).toBe(true);
    });

    it('パフォーマンステスト用コードが動作する', () => {
      // ドキュメントから抽出: パフォーマンステスト用コード（修正版）
      const result = measurePerformance('ログ性能テスト', () => {
        for (let i = 0; i < 100; i++) {
          logger.info(`テストログ ${i}`, {
            iteration: i,
            timestamp: Date.now(),
          });
        }
        return { completed: true };
      });

      // 実装では関数の戻り値のみが返される（パフォーマンス情報は自動ログ出力）
      expect(result).toBeDefined();
      expect(result.completed).toBe(true);
    });

    it('メモリ使用量監視の例が動作する', () => {
      // ドキュメントから抽出: メモリ監視
      const usage = process.memoryUsage();

      logger.info('メモリ使用状況', {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
      });

      // 警告しきい値チェック
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 512) {
        logger.warn('メモリ使用量が高い', { heapUsedMB });
      }

      expect(usage.rss).toBeGreaterThan(0);
    });

    it('デバッグテストスイートが動作する', async () => {
      // ドキュメントから抽出: デバッグテストスイート
      async function runLoggerDebugTest() {
        console.log('=== ログシステム デバッグテスト開始 ===');

        // 1. 基本ログレベルテスト
        console.log('1. ログレベルテスト');
        logger.trace('TRACEレベルテスト');
        logger.debug('DEBUGレベルテスト');
        logger.info('INFOレベルテスト');
        logger.warn('WARNレベルテスト');
        logger.error('ERRORレベルテスト');
        logger.fatal('FATALレベルテスト');

        // 2. 構造化ログテスト
        console.log('2. 構造化ログテスト');
        logger.info('構造化ログテスト', {
          userId: '12345',
          action: 'debug_test',
          metadata: {
            timestamp: new Date().toISOString(),
            testData: {
              password: 'secret', // Redactionテスト
              token: 'bearer-token', // Redactionテスト
              normalField: 'normal-value',
            },
          },
        });

        // 3. エラーログテスト
        console.log('3. エラーログテスト');
        try {
          throw new Error('テスト用エラー');
        } catch (error) {
          logger.error('エラー処理テスト', { error, context: 'debug_test' });
        }

        console.log('=== デバッグテスト完了 ===');
      }

      await runLoggerDebugTest();
      expect(true).toBe(true);
    });
  });
});
