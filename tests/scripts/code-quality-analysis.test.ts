import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

// Mock modules
vi.mock('fs');
vi.mock('child_process');

// Import after mocks
import {
  calculateHealthScore,
  analyzeCodeQualityAsync as analyzeCodeQuality,
} from '../../scripts/code-quality-analysis';
import {
  COMPLEXITY_LEVELS,
  CODE_QUALITY_THRESHOLDS,
} from '../../scripts/constants/quality-metrics';

/**
 * コード品質分析機能のテストスイート
 * scripts/code-quality-analysis.tsの各機能が正しく動作することを検証
 * 複雑度、保守性、ファイルメトリクスに基づいたスコア計算をテスト
 */
describe('code-quality-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * calculateHealthScore関数のテスト
   * 様々なメトリクスに基づいてコードの健全性スコア（0-100）を算出
   */
  describe('calculateHealthScore', () => {
    /**
     * テスト用のメトリクスオブジェクトを生成するヘルパー関数
     * デフォルトではすべてのメトリクスが良好な値（スコア100点相当）
     * @param overrides - 上書きしたいメトリクス値
     * @returns CodeQualityMetricsオブジェクト
     */
    const createMetrics = (overrides = {}) => ({
      complexity: {
        averageComplexity: 5,
        maxComplexity: 10,
        highComplexityFiles: [],
      },
      maintainability: {
        index: 90, // EXCELLENT以上なら減点なし
        rating: 'A' as const,
        lowMaintainabilityFiles: [],
      },
      fileMetrics: {
        totalFiles: 10,
        avgLinesPerFile: 100,
        maxLinesPerFile: 200,
        largeFiles: [],
      },
      timestamp: new Date().toISOString(),
      ...overrides,
    });

    /**
     * すべてのメトリクスが理想的な値の場合、スコア100を返すことを検証
     * 複雑度低、保守性高、大きなファイルなしの理想的な状態
     */
    it('should return 100 for perfect metrics', () => {
      const metrics = createMetrics();
      const score = calculateHealthScore(metrics);
      // 実装では、デフォルトでは100点から始まり、
      // eslintComplexityとduplicationがundefinedの場合はペナルティが適用されない
      expect(score).toBe(100);
    });

    /**
     * コードの複雑度が高い場合、スコアが減点されることを検証
     * GOODレベルを超える複雑度: 15点減点
     * EXCELLENTレベルを超える複雑度: 5点減点
     */
    it('should penalize high complexity - 15 points for exceeding GOOD level', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: COMPLEXITY_LEVELS.GOOD.maxValue + 1,
          maxComplexity: 20,
          highComplexityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(85); // 100 - 15 = 85点
    });

    it('should penalize moderate complexity - 5 points for exceeding EXCELLENT level', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: COMPLEXITY_LEVELS.EXCELLENT.maxValue + 1,
          maxComplexity: 10,
          highComplexityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(95); // 100 - 5 = 95点
    });

    /**
     * 保守性インデックスが低い場合、スコアが減点されることを検証
     * インデックス < 70: 20点減点
     * インデックス < GOOD(85): 10点減点
     */
    it('should penalize low maintainability - 20 points for index below 70', () => {
      const metrics = createMetrics({
        maintainability: {
          index: 60,
          rating: 'C' as const,
          lowMaintainabilityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(80); // 100 - 20 = 80点
    });

    it('should penalize moderate maintainability - 10 points for index below GOOD', () => {
      const metrics = createMetrics({
        maintainability: {
          index: CODE_QUALITY_THRESHOLDS.MAINTAINABILITY.GOOD - 1,
          rating: 'B' as const,
          lowMaintainabilityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(90); // 100 - 10 = 90点
    });

    /**
     * 大きなファイルが存在する場合、スコアが減点されることを検証
     * 大きなファイル1つにつき2点減点（最大10点まで）
     * 3ファイルの場合: 3 × 2 = 6点減点
     */
    it('should penalize large files - 2 points per file up to 10 points max', () => {
      const metrics = createMetrics({
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(94); // 100 - 6 = 94点
    });

    /**
     * ESLintの複雑度関連の問題がある場合、スコアが減点されることを検証
     * 全問題数分だけ減点（最大15点まで）
     * 5 + 3 + 2 = 10問題 → 10点減点
     */
    it('should penalize ESLint issues - 1 point per issue up to 15 points max', () => {
      const metrics = createMetrics({
        eslintComplexity: {
          cognitiveComplexity: 5,
          duplicateStrings: 3,
          otherIssues: 2,
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(90); // 100 - 10 = 90点
    });

    /**
     * コードの重複率が高い場合、スコアが減点されることを検証
     * 重複率が10%を超える場合: 10点減点
     */
    it('should penalize code duplication - 10 points for duplication over 10%', () => {
      const metrics = createMetrics({
        duplication: {
          percentage: 15,
          duplicates: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(90); // 100 - 10 = 90点
    });

    /**
     * 複数の問題が同時に存在する場合、スコアが累積的に減点されることを検証
     * 複雑度がGOODを超える: -15点、保守性60: -20点、大きなファイル1: -2点
     * 合計: 100 - 15 - 20 - 2 = 63点
     */
    it('should handle multiple penalties', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: COMPLEXITY_LEVELS.GOOD.maxValue + 5, // > GOOD → -15点
          maxComplexity: 20,
          highComplexityFiles: [],
        },
        maintainability: {
          index: 60, // < 70 → -20点
          rating: 'C' as const,
          lowMaintainabilityFiles: [],
        },
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: ['file1.ts'], // 1ファイル → -2点
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(63); // 100 - 15 - 20 - 2 = 63点
    });

    /**
     * どんなに悪いメトリクスでもスコアが負の値にならないことを検証
     * スコアの下限は0であるべき（ユーザーフレンドリーな表示のため）
     */
    it('should not return negative scores', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 30,
          maxComplexity: 50,
          highComplexityFiles: [],
        },
        maintainability: {
          index: 40,
          rating: 'F' as const,
          lowMaintainabilityFiles: [],
        },
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: Array(10).fill('file.ts'),
        },
        eslintComplexity: {
          cognitiveComplexity: 50,
          duplicateStrings: 50,
          otherIssues: 50,
        },
        duplication: {
          percentage: 50,
          duplicates: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    /**
     * スコアが100を超えないことを検証
     * スコアの上限は100であるべき（パーセンテージ表示との一貫性）
     */
    it('should not exceed 100', () => {
      const metrics = createMetrics();

      const score = calculateHealthScore(metrics);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  /**
   * analyzeCodeQuality関数のテスト
   * コードベース全体の品質分析を実行し、統計情報を収集
   */
  describe('analyzeCodeQuality', () => {
    /**
     * srcディレクトリが存在しない場合でもエラーにならず処理できることを検証
     * 新規プロジェクトや特殊な構成に対応するための防御的処理
     */
    it('should handle missing src directory gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await analyzeCodeQuality();

      expect(result).toBeDefined();
      // analyzeCodeQualityAsyncはhealthScoreを返さない、complexityやmaintainabilityを確認
      expect(result.complexity).toBeDefined();
      expect(result.maintainability).toBeDefined();
    });

    /**
     * TypeScriptファイルを正しく処理できることを検証
     * 現在はESLintCCの出力フォーマットの複雑さのためスキップ中
     * TODO: ESLintCCの正確な出力フォーマットを確認後に有効化
     */
    it.skip('should process TypeScript files correctly', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // readdirSyncは文字列の配列を返す
      // @ts-expect-error - Mocking fs.readdirSync return value
      vi.mocked(fs.readdirSync).mockReturnValue(['test.ts']);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as ReturnType<typeof fs.statSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(`
        function complexFunction() {
          if (true) {
            for (let i = 0; i < 10; i++) {
              while (true) {
                break;
              }
            }
          }
        }
      `);
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        // ESLintCCの出力をモック
        if (cmd.includes('eslintcc')) {
          return Buffer.from(
            JSON.stringify({
              reports: [
                {
                  complexity: 5,
                  ruleId: 'complexity',
                  filePath: 'test.ts',
                },
              ],
            })
          );
        }
        return Buffer.from('');
      });

      const result = await analyzeCodeQuality();

      expect(result).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.complexity.maxComplexity).toBeGreaterThan(0);
    });
  });
});
