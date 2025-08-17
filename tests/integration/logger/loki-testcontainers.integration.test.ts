/**
 * Loki Testcontainers Integration Tests
 * Testcontainersを使用した実際のLokiサーバーとの統合テスト
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, vi, inject } from 'vitest';
import { runWithLoggerContext, defaultLoggerContextConfig } from '@/lib/logger/context';
import { LokiClient, LokiTransport } from '@/lib/logger/loki-transport';
import { generateRequestId } from '@/lib/logger/utils';
import {
  generateUniqueTestId,
  createTestTransport,
  queryLokiLogs,
  waitForLogs,
  sendDirectLog,
  findLogMessage,
  validateStreamLabels,
  sendLogBatch,
  cleanupTestTransport,
} from '../../utils/loki-test-helpers';
import { isTestcontainersAvailable, logTestEnvironmentInfo } from '../../utils/docker-environment';

// 環境変数でのスキップチェック
const shouldSkip = process.env.SKIP_LOKI_TESTS === 'true';

// 早期スキップ
if (shouldSkip) {
  describe('Loki Testcontainers Integration Tests', () => {
    test('should skip all tests when SKIP_LOKI_TESTS=true', () => {
      console.log(
        '⏭️ SKIP_LOKI_TESTS=true のため、すべてのLoki Testcontainersテストをスキップしました'
      );
    });
  });
} else {
  // グローバルセットアップからLoki URL取得
  const getLokiUrl = (): string => {
    const globalData = (inject as any)('lokiUrl') as string | undefined;
    if (!globalData) {
      throw new Error('Loki URL not available. Global setup may have failed.');
    }
    return globalData;
  };

  describe('Loki Testcontainers Integration Tests', () => {
    let lokiUrl: string;

    beforeAll(async () => {
      // 環境情報表示
      logTestEnvironmentInfo();

      if (!isTestcontainersAvailable()) {
        console.log('⏭️ Docker Compose環境のため、Lokiテストをスキップします');
        return;
      }

      try {
        lokiUrl = getLokiUrl();
        console.log(`🎯 Running tests against Loki at: ${lokiUrl}`);

        // Lokiサーバーの健全性を確認
        const healthResponse = await fetch(`${lokiUrl}/ready`);
        expect(healthResponse.ok).toBe(true);
        console.log('✅ Loki server is healthy');
      } catch (error) {
        if (!isTestcontainersAvailable()) {
          console.log('⏭️ Testcontainersが利用できないため、Lokiテストをスキップします');
          return;
        }
        throw error;
      }
    }, 30_000); // 30秒のタイムアウト

    beforeEach(() => {
      // Real timersを使用（Testcontainersとの互換性のため）
      vi.useRealTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('Basic Connectivity', () => {
      test('should connect to Loki container successfully', async () => {
        const client = new LokiClient({
          url: lokiUrl,
          batchSize: 1,
          defaultLabels: {
            service: 'connectivity-test',
            test_id: generateUniqueTestId(),
          },
        });

        // ログを送信
        await client.pushLog('info', `Connectivity test - ${new Date().toISOString()}`);

        // 少し待ってからshutdown
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.shutdown();

        // 例外が投げられなければ成功
        expect(true).toBe(true);
      }, 15_000); // 15秒のタイムアウト

      test('should send logs successfully through LokiClient', async () => {
        const testId = generateUniqueTestId();
        const client = new LokiClient({
          url: lokiUrl,
          batchSize: 3,
          defaultLabels: {
            service: 'client-test',
            test_id: testId,
          },
        });

        // 複数のログを送信
        await client.pushLog('info', `Client test message 1 - ${testId}`);
        await client.pushLog('warn', `Client test message 2 - ${testId}`);
        await client.pushLog('error', `Client test message 3 - ${testId}`);

        // バッチが送信されるまで少し待つ
        await new Promise((resolve) => setTimeout(resolve, 200));
        await client.shutdown();

        // ログがLokiに送信されたかクエリで確認
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Lokiでの処理待ち

        const result = await queryLokiLogs(lokiUrl, `service="client-test", test_id="${testId}"`);
        expect(result).toBeTruthy();

        if (result) {
          const totalLogs = result.data.result.reduce(
            (sum, stream) => sum + stream.values.length,
            0
          );
          expect(totalLogs).toBe(3);

          // メッセージ内容を確認
          expect(findLogMessage(result, `Client test message 1 - ${testId}`)).toBe(true);
          expect(findLogMessage(result, `Client test message 2 - ${testId}`)).toBe(true);
          expect(findLogMessage(result, `Client test message 3 - ${testId}`)).toBe(true);
        }
      });

      test('should handle direct log sending via HTTP API', async () => {
        const testId = generateUniqueTestId();
        const message = `Direct HTTP test - ${testId}`;

        const success = await sendDirectLog(lokiUrl, 'info', message, {
          service: 'direct-http-test',
          test_id: testId,
        });

        expect(success).toBe(true);

        // ログが実際に送信されたか確認
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = await queryLokiLogs(
          lokiUrl,
          `service="direct-http-test", test_id="${testId}"`
        );
        expect(result).toBeTruthy();

        if (result) {
          expect(findLogMessage(result, message)).toBe(true);
        }
      });
    });

    describe('LokiTransport Integration', () => {
      test('should send logs through LokiTransport', async () => {
        const testId = generateUniqueTestId();
        const transport = await createTestTransport(lokiUrl, testId);

        try {
          // ログを送信
          await transport.sendLog('info', `Transport test 1 - ${testId}`);
          await transport.sendLog('warn', `Transport test 2 - ${testId}`);
          await transport.sendLog('error', `Transport test 3 - ${testId}`);

          // トランスポートをシャットダウンして全てのログを送信
          await transport.shutdown();

          // ログが送信されたか確認
          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(3);
          expect(stats.failedLogs).toBe(0);

          // Lokiクエリで実際のログを確認
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, 3, 5000);
          expect(result).toBeTruthy();

          if (result) {
            expect(findLogMessage(result, `Transport test 1 - ${testId}`)).toBe(true);
            expect(findLogMessage(result, `Transport test 2 - ${testId}`)).toBe(true);
            expect(findLogMessage(result, `Transport test 3 - ${testId}`)).toBe(true);
          }
        } finally {
          await cleanupTestTransport(transport);
        }
      });

      test('should propagate context through AsyncLocalStorage', async () => {
        const testId = generateUniqueTestId();
        const requestId = generateRequestId();
        const traceId = `trace-${testId}`;
        const userId = `user-${testId}`;

        const transport = await createTestTransport(lokiUrl, testId);

        try {
          // コンテキスト付きでログを送信
          await runWithLoggerContext(
            defaultLoggerContextConfig,
            {
              requestId,
              traceId,
              userId,
            },
            async () => {
              await transport.sendLog('info', `Context test message - ${testId}`);
            }
          );

          await transport.shutdown();

          // ログが送信されたか確認
          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(1);

          // Lokiクエリでコンテキスト情報を確認
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, 1, 5000);
          expect(result).toBeTruthy();

          if (result) {
            expect(
              validateStreamLabels(result, {
                request_id: requestId,
                trace_id: traceId,
                user_id: userId,
              })
            ).toBe(true);
          }
        } finally {
          await cleanupTestTransport(transport);
        }
      });

      test('should handle different log levels correctly', async () => {
        const testId = generateUniqueTestId();

        // 全レベルを受け入れるトランスポートを作成
        const transport = new LokiTransport({
          url: lokiUrl,
          batchSize: 1,
          minLevel: 'debug', // 全レベルを受け入れ
          defaultLabels: {
            service: 'level-test',
            test_run: testId,
            environment: 'test',
          },
        });

        await transport.initialize();

        try {
          // 異なるレベルのログを送信
          await transport.sendLog('debug', `Debug message - ${testId}`);
          await transport.sendLog('info', `Info message - ${testId}`);
          await transport.sendLog('warn', `Warning message - ${testId}`);
          await transport.sendLog('error', `Error message - ${testId}`);

          await transport.shutdown();

          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(4);

          // Lokiクエリで各レベルのログを確認
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, 4, 5000);
          expect(result).toBeTruthy();

          if (result) {
            // 各レベルのログが存在することを確認
            const levels = result.data.result.map((stream) => stream.stream.level);
            expect(levels).toContain('debug');
            expect(levels).toContain('info');
            expect(levels).toContain('warn');
            expect(levels).toContain('error');
          }
        } finally {
          await transport.shutdown();
        }
      });
    });

    describe('Error Handling', () => {
      test('should handle network errors gracefully', async () => {
        const invalidUrl = 'http://localhost:9999'; // 存在しないサーバー
        const transport = new LokiTransport({
          url: invalidUrl,
          batchSize: 1,
          maxRetries: 2,
          retryDelay: 100,
          defaultLabels: { service: 'error-test' },
        });

        await transport.initialize();

        try {
          // エラーが発生するログを送信
          await transport.sendLog('error', 'This will fail to send');

          // 短時間待機してエラー処理を完了させる
          await new Promise((resolve) => setTimeout(resolve, 500));

          const stats = transport.getStats();
          expect(stats.failedLogs).toBeGreaterThan(0);
          expect(stats.lastError).toBeDefined();
        } finally {
          await transport.shutdown();
        }
      });

      test('should continue working after partial failures', async () => {
        const testId = generateUniqueTestId();
        const transport = await createTestTransport(lokiUrl, testId);

        try {
          // 正常なログ送信
          await transport.sendLog('info', `Success message 1 - ${testId}`);

          // 一時的にURLを変更してエラーを発生させる
          // @ts-ignore - プライベートプロパティアクセス（テスト用）
          const originalUrl = transport.client.config.url;
          // @ts-ignore
          transport.client.config.url = 'http://localhost:9999';

          await transport.sendLog('error', `This will fail - ${testId}`);

          // URLを元に戻す
          // @ts-ignore
          transport.client.config.url = originalUrl;

          // 再び正常なログ送信
          await transport.sendLog('info', `Success message 2 - ${testId}`);

          await transport.shutdown();

          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(2); // 成功したログ
          expect(stats.failedLogs).toBe(1); // 失敗したログ

          // 成功したログがLokiに送信されているか確認
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, 2, 5000);
          expect(result).toBeTruthy();

          if (result) {
            expect(findLogMessage(result, `Success message 1 - ${testId}`)).toBe(true);
            expect(findLogMessage(result, `Success message 2 - ${testId}`)).toBe(true);
          }
        } finally {
          await cleanupTestTransport(transport);
        }
      });
    });

    describe('Performance Testing', () => {
      test('should handle high-volume logging efficiently', async () => {
        const testId = generateUniqueTestId();
        const logCount = 50; // CI環境を考慮して50ログに調整

        const transport = new LokiTransport({
          url: lokiUrl,
          batchSize: 10,
          flushInterval: 1000,
          defaultLabels: {
            service: 'performance-test',
            test_run: testId,
          },
        });

        await transport.initialize();

        try {
          const { duration } = await sendLogBatch(transport, logCount, `Perf test`);

          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(logCount);
          expect(stats.failedLogs).toBe(0);

          // パフォーマンスチェック（30ログ/秒以上）
          const logsPerSecond = (logCount / duration) * 1000;
          console.log(`📈 Performance: ${logsPerSecond.toFixed(1)} logs/second`);
          expect(logsPerSecond).toBeGreaterThan(30);

          // 実際にLokiに送信されたか確認
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, logCount, 10000);
          expect(result).toBeTruthy();
        } finally {
          await cleanupTestTransport(transport);
        }
      });

      test('should batch logs efficiently', async () => {
        const testId = generateUniqueTestId();
        const batchSize = 5;

        const transport = new LokiTransport({
          url: lokiUrl,
          batchSize,
          flushInterval: 10000, // 長い間隔でバッチングをテスト
          defaultLabels: {
            service: 'batch-test',
            test_run: testId,
          },
        });

        await transport.initialize();

        try {
          // バッチサイズ分のログを送信
          for (let i = 1; i <= batchSize; i++) {
            await transport.sendLog('info', `Batch message ${i}/${batchSize} - ${testId}`);
          }

          // バッチが自動的に送信されることを確認
          await new Promise((resolve) => setTimeout(resolve, 500));

          const stats = transport.getStats();
          expect(stats.successfulLogs).toBe(batchSize);

          // 追加で1つログを送信（新しいバッチ）
          await transport.sendLog('info', `Additional message - ${testId}`);

          await transport.shutdown(); // 残りのログをフラッシュ

          const finalStats = transport.getStats();
          expect(finalStats.successfulLogs).toBe(batchSize + 1);

          // Lokiで実際のログを確認
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const result = await waitForLogs(lokiUrl, `test_run="${testId}"`, batchSize + 1, 5000);
          expect(result).toBeTruthy();
        } finally {
          await cleanupTestTransport(transport);
        }
      });
    });

    describe('Query and Verification', () => {
      test('should query and validate sent logs', async () => {
        const testId = generateUniqueTestId();
        const uniqueMessage = `Query validation test - ${testId}`;

        const transport = await createTestTransport(lokiUrl, testId);

        try {
          await transport.sendLog('info', uniqueMessage);
          await transport.shutdown();

          // ログが反映されるまで待機
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // ログをクエリ
          const result = await queryLokiLogs(lokiUrl, `test_run="${testId}"`);

          expect(result).toBeTruthy();
          expect(result!.status).toBe('success');

          // メッセージとラベルを検証
          expect(findLogMessage(result!, uniqueMessage)).toBe(true);
          expect(
            validateStreamLabels(result!, {
              service: 'testcontainer-integration-test',
              test_run: testId,
              environment: 'test',
            })
          ).toBe(true);
        } finally {
          await cleanupTestTransport(transport);
        }
      });

      test('should handle complex LogQL queries', async () => {
        const testId = generateUniqueTestId();
        const transport = await createTestTransport(lokiUrl, testId);

        try {
          // 複数の異なるレベルとメッセージを送信
          await transport.sendLog('info', `INFO: User login successful - ${testId}`);
          await transport.sendLog('warn', `WARN: High memory usage detected - ${testId}`);
          await transport.sendLog('error', `ERROR: Database connection failed - ${testId}`);

          await transport.shutdown();

          await new Promise((resolve) => setTimeout(resolve, 1000));

          // エラーレベルのみをクエリ
          const errorResult = await queryLokiLogs(lokiUrl, `test_run="${testId}", level="error"`);
          expect(errorResult).toBeTruthy();

          if (errorResult) {
            const errorLogs = errorResult.data.result.reduce(
              (sum, stream) => sum + stream.values.length,
              0
            );
            expect(errorLogs).toBe(1);
            expect(findLogMessage(errorResult, 'Database connection failed')).toBe(true);
          }

          // 特定のメッセージパターンをクエリ
          const patternResult = await queryLokiLogs(lokiUrl, `test_run="${testId}"`);
          expect(patternResult).toBeTruthy();

          if (patternResult) {
            const totalLogs = patternResult.data.result.reduce(
              (sum, stream) => sum + stream.values.length,
              0
            );
            expect(totalLogs).toBe(3);
          }
        } finally {
          await cleanupTestTransport(transport);
        }
      });
    });
  });
}
