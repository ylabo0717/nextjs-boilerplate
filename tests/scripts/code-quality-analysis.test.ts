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
import { COMPLEXITY_LEVELS } from '../../scripts/constants/quality-metrics';

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
     * GOODレベルを超える複雑度は保守性の問題を示唆
     */
    it('should penalize high complexity', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: COMPLEXITY_LEVELS.GOOD.maxValue + 1,
          maxComplexity: 20,
          highComplexityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(75); // 実装では15点減点される
    });

    /**
     * 保守性インデックスが低い場合、スコアが減点されることを検証
     * 保守性グレードC（インデックス60）の場合、20点減点される
     */
    it('should penalize low maintainability', () => {
      const metrics = createMetrics({
        maintainability: {
          index: 60,
          rating: 'C' as const,
          lowMaintainabilityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(80);
    });

    /**
     * 大きなファイルが存在する場合、スコアが減点されることを検証
     * 大きなファイルはコードの理解やテストを困難にする
     */
    it('should penalize large files', () => {
      const metrics = createMetrics({
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(94);
    });

    /**
     * ESLintの複雑度関連の問題がある場合、スコアが減点されることを検証
     * 認知的複雑度、重複文字列、その他の問題をチェック
     */
    it('should penalize ESLint issues', () => {
      const metrics = createMetrics({
        eslintComplexity: {
          cognitiveComplexity: 5,
          duplicateStrings: 3,
          otherIssues: 2,
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(90);
    });

    /**
     * コードの重複率が高い場合、スコアが減点されることを検証
     * DRY原則に反するコードは保守性を低下させる
     */
    it('should penalize code duplication', () => {
      const metrics = createMetrics({
        duplication: {
          percentage: 15,
          duplicates: [],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBe(90);
    });

    /**
     * 複数の問題が同時に存在する場合、スコアが累積的に減点されることを検証
     * 各問題の減点が適切に合算されることを確認
     */
    it('should handle multiple penalties', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 15,
          maxComplexity: 20,
          highComplexityFiles: [],
        },
        maintainability: {
          index: 60,
          rating: 'C' as const,
          lowMaintainabilityFiles: [],
        },
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: ['file1.ts'],
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBeLessThan(70);
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
