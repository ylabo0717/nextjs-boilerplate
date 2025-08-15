/**
 * Loki Basic Integration Tests
 * Testcontainersを使用した基本的なLoki接続テスト
 */

import { describe, test, expect, beforeAll, inject } from 'vitest';
import { LokiClient } from '@/lib/logger/loki-transport';
import { generateUniqueTestId } from '../../utils/loki-test-helpers';

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
    lokiUrl = getLokiUrl();
    console.log(`🎯 Running basic tests against Loki at: ${lokiUrl}`);
    
    // Lokiサーバーの健全性を確認
    const healthResponse = await fetch(`${lokiUrl}/ready`);
    expect(healthResponse.ok).toBe(true);
    console.log('✅ Loki server is healthy');
  }, 30_000);

  test('should connect to Loki container', async () => {
    // 健康性チェックが成功していれば接続確認完了
    expect(lokiUrl).toBeTruthy();
    expect(lokiUrl).toMatch(/^http:\/\/.*:\d+$/);
  }, 10_000);

  test('should send single log to Loki', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
    const response = await fetch(`${lokiUrl}/ready`);
    expect(response.status).toBe(200);
    
    const metricsResponse = await fetch(`${lokiUrl}/metrics`);
    expect(metricsResponse.status).toBe(200);
  }, 5_000);
});