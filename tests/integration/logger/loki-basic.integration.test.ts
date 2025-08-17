/**
 * Loki Basic Integration Tests
 * Testcontainersを使用した基本的なLoki接続テスト
 *
 * Note: Docker-in-Docker環境では制限があるため、
 * Docker環境での実行時は自動的にスキップされます。
 */

import { describe, test, expect, beforeAll, inject } from 'vitest';
import { LokiClient } from '@/lib/logger/loki-transport';
import { generateUniqueTestId } from '../../utils/loki-test-helpers';
import { isTestcontainersAvailable, logTestEnvironmentInfo } from '../../utils/docker-environment';

// 環境変数でのスキップチェック
const shouldSkip = process.env.SKIP_LOKI_TESTS === 'true';

// 早期スキップ
if (shouldSkip) {
  describe('Loki Basic Integration Tests', () => {
    test('should skip all tests when SKIP_LOKI_TESTS=true', () => {
      console.log('⏭️ SKIP_LOKI_TESTS=true のため、すべてのLokiテストをスキップしました');
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

  describe('Loki Basic Integration Tests', () => {
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
        console.log(`🎯 Running basic tests against Loki at: ${lokiUrl}`);

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
    }, 30_000);

    test('should connect to Loki container', async () => {
      if (!isTestcontainersAvailable()) {
        console.log('⏭️ Testcontainersが利用できないため、テストをスキップ');
        return;
      }

      // 健康性チェックが成功していれば接続確認完了
      expect(lokiUrl).toBeTruthy();
      expect(lokiUrl).toMatch(/^http:\/\/.*:\d+$/);
    }, 10_000);

    test('should send single log to Loki', async () => {
      if (!isTestcontainersAvailable()) {
        console.log('⏭️ Testcontainersが利用できないため、テストをスキップ');
        return;
      }

      const testId = generateUniqueTestId();
      const client = new LokiClient({
        url: lokiUrl,
        batchSize: 1,
        defaultLabels: {
          service: 'basic-test',
          test_id: testId,
        },
      });

      try {
        // ログを送信
        await client.pushLog('info', `Basic test message - ${testId}`);

        // 送信完了まで短時間待機
        await new Promise((resolve) => setTimeout(resolve, 200));

        // shutdownして全てを送信
        await client.shutdown();

        // 例外が投げられなければ成功
        expect(true).toBe(true);
      } catch (error) {
        console.error('Failed to send log:', error);
        throw error;
      }
    }, 10_000);

    test('should handle Loki health check', async () => {
      if (!isTestcontainersAvailable()) {
        console.log('⏭️ Testcontainersが利用できないため、テストをスキップ');
        return;
      }

      const response = await fetch(`${lokiUrl}/ready`);
      expect(response.status).toBe(200);

      const metricsResponse = await fetch(`${lokiUrl}/metrics`);
      expect(metricsResponse.status).toBe(200);
    }, 5_000);
  });
}
