/**
 * 並行処理とパフォーマンステスト
 * 高負荷環境でのログシステムの堅牢性を検証
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { generateRequestId } from '@/lib/logger/utils';
import { sanitizeControlCharacters, limitObjectSize } from '@/lib/logger/sanitizer';
import { createLoggerContextConfig, runWithLoggerContext } from '@/lib/logger/context';
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

describe('並行処理とRequestID重複検証', () => {
  test('100並列リクエストでrequestIDの重複がないことを検証', async () => {
    const requestIds = new Set<string>();
    const concurrentRequests = LOGGER_TEST_DATA.CONCURRENT_REQUESTS_STANDARD;

    // 100個の並列リクエストIDを生成
    const promises = Array.from({ length: concurrentRequests }, async () => {
      return generateRequestId();
    });

    const results = await Promise.all(promises);

    // 重複検証
    results.forEach((id) => {
      expect(requestIds.has(id)).toBe(false);
      requestIds.add(id);
    });

    expect(requestIds.size).toBe(concurrentRequests);
    expect(results).toHaveLength(concurrentRequests);

    // IDフォーマット検証（req_タイムスタンプ_ランダム文字列）
    results.forEach((id) => {
      expect(id).toMatch(/^req_\d+_[a-z0-9]{6}$/);
    });
  });

  test('1000並列リクエストでrequestIDの重複がないことを検証', async () => {
    const requestIds = new Set<string>();
    const concurrentRequests = LOGGER_TEST_DATA.CONCURRENT_REQUESTS_HIGH;

    // バッチ処理で負荷を分散
    const batchSize = LOGGER_TEST_DATA.BATCH_SIZE;
    const batches = Math.ceil(concurrentRequests / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = Array.from(
        { length: Math.min(batchSize, concurrentRequests - batch * batchSize) },
        async () => {
          return generateRequestId();
        }
      );

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((id) => {
        expect(requestIds.has(id)).toBe(false);
        requestIds.add(id);
      });
    }

    expect(requestIds.size).toBe(concurrentRequests);
  });

  test('高頻度生成でのrequestID衝突確率を検証', () => {
    const requestIds = new Set<string>();
    const iterationCount = LOGGER_TEST_DATA.STRESS_TEST_ITERATIONS;

    // 同期的に高頻度でIDを生成
    for (let i = 0; i < iterationCount; i++) {
      const id = generateRequestId();
      expect(requestIds.has(id)).toBe(false);
      requestIds.add(id);
    }

    expect(requestIds.size).toBe(iterationCount);
  });
});

describe('コンテキスト並行処理テスト', () => {
  let contextConfig: ReturnType<typeof createLoggerContextConfig>;

  beforeEach(() => {
    contextConfig = createLoggerContextConfig();
  });

  test('並列コンテキスト実行で異なるrequestIDが維持されることを検証', async () => {
    const results: { requestId: string; order: number }[] = [];
    const concurrentContexts = 50;

    const promises = Array.from({ length: concurrentContexts }, async (_, index) => {
      const requestId = generateRequestId();

      return new Promise<void>((resolve) => {
        runWithLoggerContext(
          contextConfig,
          { requestId, userId: `user-${index}`, sessionId: `session-${index}` },
          async () => {
            // 非同期処理をシミュレート
            await new Promise((r) => setTimeout(r, Math.random() * 10));

            const currentContext = contextConfig.storage.getStore();
            results.push({
              requestId: currentContext?.requestId || 'unknown',
              order: index,
            });

            resolve();
          }
        );
      });
    });

    await Promise.all(promises);

    // 各コンテキストで異なるrequestIDが維持されていることを検証
    expect(results).toHaveLength(concurrentContexts);

    const requestIds = new Set(results.map((r) => r.requestId));
    expect(requestIds.size).toBe(concurrentContexts);

    // unknownがないことを確認
    expect(results.every((r) => r.requestId !== 'unknown')).toBe(true);
  });

  test('ネストしたコンテキストでのrequestID継承を検証', async () => {
    const results: string[] = [];
    const outerRequestId = generateRequestId();

    await new Promise<void>((resolve) => {
      runWithLoggerContext(
        contextConfig,
        { requestId: outerRequestId, userId: 'user-1', sessionId: 'session-1' },
        async () => {
          const outerContext = contextConfig.storage.getStore();
          results.push(outerContext?.requestId || 'outer-unknown');

          // ネストしたコンテキストを作成
          const innerRequestId = generateRequestId();
          await new Promise<void>((innerResolve) => {
            runWithLoggerContext(
              contextConfig,
              { requestId: innerRequestId, userId: 'user-2', sessionId: 'session-2' },
              async () => {
                const innerContext = contextConfig.storage.getStore();
                results.push(innerContext?.requestId || 'inner-unknown');

                // 最深層のコンテキスト
                const deepRequestId = generateRequestId();
                await new Promise<void>((deepResolve) => {
                  runWithLoggerContext(
                    contextConfig,
                    { requestId: deepRequestId, userId: 'user-3', sessionId: 'session-3' },
                    async () => {
                      const deepContext = contextConfig.storage.getStore();
                      results.push(deepContext?.requestId || 'deep-unknown');
                      deepResolve();
                    }
                  );
                });

                innerResolve();
              }
            );
          });

          // 外側のコンテキストに戻ったときの確認
          const finalContext = contextConfig.storage.getStore();
          results.push(finalContext?.requestId || 'final-unknown');

          resolve();
        }
      );
    });

    expect(results).toHaveLength(4);
    expect(results[0]).toBe(outerRequestId);
    expect(results[1]).not.toBe(outerRequestId);
    expect(results[2]).not.toBe(results[1]);
    expect(results[3]).toBe(outerRequestId); // 外側のコンテキストに戻る

    // すべて異なるrequestIDであることを確認
    const uniqueIds = new Set([results[0], results[1], results[2]]);
    expect(uniqueIds.size).toBe(3);
  });
});

describe('大容量データ処理のFuzzテスト', () => {
  test('1MB超の文字列データを安全に処理', () => {
    // 1MBを超える大きな文字列を生成（制御文字を含む）
    const baseString =
      'A'.repeat(LOGGER_TEST_DATA.STRING_REPEAT_COUNT) +
      '\x00\x01\x02' +
      'B'.repeat(LOGGER_TEST_DATA.STRING_REPEAT_COUNT);
    const largeString = baseString.repeat(LOGGER_TEST_DATA.LARGE_STRING_MULTIPLIER); // 約1.2MB

    expect(largeString.length).toBeGreaterThan(LOGGER_TEST_DATA.MEMORY_THRESHOLD_1MB); // 1MB以上

    const startTime = Date.now();
    const result = sanitizeControlCharacters(largeString);
    const duration = Date.now() - startTime;

    // パフォーマンス検証（5秒以内で完了）
    expect(duration).toBeLessThan(LOGGER_TEST_DATA.PERFORMANCE_TIMEOUT_5S);

    // 結果の検証
    expect(typeof result).toBe('string');
    expect(result as string).not.toContain('\x00');
    expect(result as string).toContain('\\u0000');
  });

  test('大きなネストオブジェクトの制限処理', () => {
    // 大きなネストオブジェクトを生成
    const createLargeObject = (depth: number): any => {
      if (depth === 0) return { value: 'leaf', dangerous: '\x00\x01' };

      const obj: any = {
        level: depth,
        dangerous: `data\\x0${depth % 10}`, // Control character for testing
        children: {},
      };

      // 各レベルで複数の子を作成
      for (let i = 0; i < 5; i++) {
        obj.children[`child${i}`] = createLargeObject(depth - 1);
      }

      return obj;
    };

    const largeObject = createLargeObject(8); // 深さ8の大きなオブジェクト

    const startTime = Date.now();
    const result = limitObjectSize(largeObject, 5, 50);
    const duration = Date.now() - startTime;

    // パフォーマンス検証（1秒以内で完了）
    expect(duration).toBeLessThan(LOGGER_TEST_DATA.PERFORMANCE_TIMEOUT_1S);

    // 制限が適用されていることを確認
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('大量配列の処理とメモリ効率性', () => {
    // 大量のデータを含む配列を生成
    const largeArray = Array.from({ length: LOGGER_TEST_DATA.STRESS_TEST_ITERATIONS }, (_, i) => ({
      id: i,
      data: `item${i}`,
      dangerous: `content\x00${i % 10}`, // 実際の制御文字
      nested: {
        level: 1,
        value: `nested${i}`,
        dangerous: `nested\x00${i % 5}`, // 実際の制御文字
      },
    }));

    const startTime = Date.now();
    const result = sanitizeControlCharacters(largeArray);
    const duration = Date.now() - startTime;

    // パフォーマンス検証（3秒以内で完了）
    expect(duration).toBeLessThan(LOGGER_TEST_DATA.PERFORMANCE_TIMEOUT_3S);

    // 結果の検証
    expect(Array.isArray(result)).toBe(true);
    expect((result as any[]).length).toBe(largeArray.length);

    // 一部の要素をサンプリング検証
    const sampleResult = result as any[];
    // 制御文字がエスケープされていることを確認 - 実際の形式をチェック
    const firstElement = sampleResult[0].dangerous;
    const hundredthElement =
      sampleResult[LOGGER_TEST_DATA.CONCURRENT_REQUESTS_STANDARD].nested.dangerous;

    // 制御文字 \x00 がエスケープされているかチェック（\u0000 または \\u0000 形式）
    expect(firstElement).toMatch(/\\u0000|\\\\u0000/);
    expect(hundredthElement).toMatch(/\\u0000|\\\\u0000/);
  });
});

describe('無効データと破損データの堅牢性テスト', () => {
  test('無効JSONと破損データの安全処理', () => {
    const invalidDataSamples = [
      null,
      undefined,
      NaN,
      Infinity,
      -Infinity,
      {},
      [],
      '',
      '\x00\x01\x02\x03',
      '{"invalid": json}',
      '{"unterminated": "string',
      Buffer.from('test\x00data'),
      new Date('invalid'),
      new Error('test error'),
      Symbol('test'),
      () => 'function',
    ];

    invalidDataSamples.forEach((sample, index) => {
      expect(() => {
        const result = sanitizeControlCharacters(sample);
        // 結果が存在する（クラッシュしない）、undefinedの場合も許可
        if (result !== undefined) {
          expect(result).toBeDefined();
        }
      }).not.toThrow();
    });
  });

  test('深い循環参照と破損したオブジェクト構造', () => {
    // 意図的に破損したオブジェクト構造を作成
    const brokenObj: any = {
      normal: 'value',
      dangerous: '\x00\x01\x02',
    };

    // プロトタイプチェーンの汚染を模倣
    Object.defineProperty(brokenObj, '__proto__', {
      value: { malicious: 'prototype\x00pollution' },
      writable: true,
    });

    // 循環参照の追加
    brokenObj.self = brokenObj;
    brokenObj.nested = { parent: brokenObj, dangerous: '\x03\x04' };

    expect(() => {
      const result = sanitizeControlCharacters(brokenObj);
      expect(result).toBeDefined();

      const sanitized = result as any;
      expect(sanitized.normal).toBe('value');
      expect(sanitized.dangerous).toBe('\\u0000\\u0001\\u0002');
      expect(sanitized.self._circular_reference).toBe(true);
    }).not.toThrow();
  });

  test('極端に大きなプリミティブ値の処理', () => {
    const extremeValues = [
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      '9'.repeat(LOGGER_TEST_DATA.VERY_LARGE_STRING_SIZE), // 100万桁の数字文字列
      'x'.repeat(LOGGER_TEST_DATA.LARGE_STRING_SIZE) +
        '\x00' +
        'y'.repeat(LOGGER_TEST_DATA.LARGE_STRING_SIZE), // 大きな文字列と制御文字
    ];

    extremeValues.forEach((value) => {
      expect(() => {
        const result = sanitizeControlCharacters(value);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});
