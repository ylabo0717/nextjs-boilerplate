/**
 * Loki Test Helpers
 * Lokiテスト用のヘルパー関数とユーティリティ
 */

import { LokiTransport } from '@/lib/logger/loki-transport';

export interface LokiQueryResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      stream: Record<string, string>;
      values: Array<[string, string]>; // [timestamp, message]
    }>;
  };
}

/**
 * 一意なテストIDを生成
 */
export function generateUniqueTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * テスト用のLokiTransportを作成
 */
export async function createTestTransport(
  lokiUrl: string,
  testId?: string
): Promise<LokiTransport> {
  const transport = new LokiTransport({
    url: lokiUrl,
    batchSize: 1, // テスト用：即座に送信
    flushInterval: 100, // 短い間隔でフラッシュ
    defaultLabels: {
      service: 'testcontainer-integration-test',
      test_run: testId || generateUniqueTestId(),
      environment: 'test',
    },
  });

  await transport.initialize();
  return transport;
}

/**
 * 指定されたラベルでLokiからログをクエリ
 */
export async function queryLokiLogs(
  lokiUrl: string,
  labels: string,
  timeRangeMinutes = 5
): Promise<LokiQueryResult | null> {
  try {
    const query = `{${labels}}`;
    const url = new URL(`${lokiUrl}/loki/api/v1/query_range`);

    const endTime = Date.now() * 1_000_000; // ナノ秒
    const startTime = endTime - timeRangeMinutes * 60 * 1000 * 1_000_000; // ナノ秒

    url.searchParams.set('query', query);
    url.searchParams.set('start', startTime.toString());
    url.searchParams.set('end', endTime.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to query Loki logs:', error);
    return null;
  }
}

/**
 * 特定の条件でログが送信されるまで待機
 */
export async function waitForLogs(
  lokiUrl: string,
  labels: string,
  expectedCount: number,
  timeoutMs = 10_000,
  retryInterval = 500
): Promise<LokiQueryResult | null> {
  console.log(`⏳ Waiting for ${expectedCount} logs with labels: ${labels}`);

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await queryLokiLogs(lokiUrl, labels, 1);

    if (result?.data?.result) {
      const totalLogs = result.data.result.reduce((sum, stream) => sum + stream.values.length, 0);

      console.log(`📊 Found ${totalLogs} logs, expecting ${expectedCount}`);

      if (totalLogs >= expectedCount) {
        console.log(`✅ Found expected logs: ${totalLogs}/${expectedCount}`);
        return result;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }

  console.warn(`⚠️ Timeout waiting for logs. Expected: ${expectedCount}`);
  return null;
}

/**
 * Lokiに直接ログを送信（デバッグ用）
 */
export async function sendDirectLog(
  lokiUrl: string,
  level: string,
  message: string,
  labels: Record<string, string> = {}
): Promise<boolean> {
  try {
    const payload = {
      streams: [
        {
          stream: {
            level,
            ...labels,
          },
          values: [
            [(Date.now() * 1_000_000).toString(), message], // ナノ秒タイムスタンプ
          ],
        },
      ],
    };

    const response = await fetch(`${lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send direct log:', error);
    return false;
  }
}

/**
 * ログメッセージを検索
 */
export function findLogMessage(
  queryResult: LokiQueryResult,
  messagePattern: string | RegExp
): boolean {
  if (!queryResult?.data?.result) {
    return false;
  }

  for (const stream of queryResult.data.result) {
    for (const [timestamp, message] of stream.values) {
      if (typeof messagePattern === 'string') {
        if (message.includes(messagePattern)) {
          return true;
        }
      } else {
        if (messagePattern.test(message)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * ストリームラベルを検証
 */
export function validateStreamLabels(
  queryResult: LokiQueryResult,
  expectedLabels: Record<string, string>
): boolean {
  if (!queryResult?.data?.result) {
    return false;
  }

  for (const stream of queryResult.data.result) {
    let allLabelsMatch = true;

    for (const [key, expectedValue] of Object.entries(expectedLabels)) {
      if (stream.stream[key] !== expectedValue) {
        allLabelsMatch = false;
        break;
      }
    }

    if (allLabelsMatch) {
      return true;
    }
  }

  return false;
}

/**
 * パフォーマンス測定用のログバッチ送信
 */
export async function sendLogBatch(
  transport: LokiTransport,
  count: number,
  messagePrefix = 'Batch test message'
): Promise<{ startTime: number; endTime: number; duration: number }> {
  const startTime = Date.now();

  console.log(`📊 Sending ${count} logs...`);

  for (let i = 0; i < count; i++) {
    await transport.sendLog('info', `${messagePrefix} ${i + 1}/${count}`);
  }

  // 全てのログが送信されるまで待機
  await transport.shutdown();

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(
    `📈 Sent ${count} logs in ${duration}ms (${((count / duration) * 1000).toFixed(1)} logs/sec)`
  );

  return { startTime, endTime, duration };
}

/**
 * テスト実行後のクリーンアップ
 */
export async function cleanupTestTransport(transport: LokiTransport): Promise<void> {
  try {
    await transport.shutdown();
    console.log('✅ Test transport cleaned up successfully');
  } catch (error) {
    console.warn('⚠️ Error cleaning up test transport:', error);
  }
}
