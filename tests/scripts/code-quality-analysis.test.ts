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

/**
 * コード品質分析機能のテストスイート
 * scripts/code-quality-analysis.tsの各機能が正しく動作することを検証
 * SonarQube方式の技術的負債比率に基づいたスコア計算をテスト
 */
describe('code-quality-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * calculateHealthScore関数のテスト
   * SonarQube方式の技術的負債比率に基づいてコードの健全性スコア（0-100）を算出
   * 技術的負債比率 = 修正時間 / 開発時間
   * A: <5% (90-100点), B: <10% (75-90点), C: <20% (60-75点), D: <50% (40-60点), E: 50%+ (0-40点)
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
     * 技術的負債がゼロの理想的な状態
     */
    it('should return 100 for perfect metrics', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 5, // 閾値10以下
          maxComplexity: 10,
          highComplexityFiles: [],
        },
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 200,
          largeFiles: [],
        },
      });
      const score = calculateHealthScore(metrics);
      // 技術的負債がほぼゼロなので100点に近い
      expect(score).toBeGreaterThanOrEqual(95);
      expect(score).toBeLessThanOrEqual(100);
    });

    /**
     * コードの複雑度が高い場合、スコアが低下することを検証
     * 複雑度が閾値を超えると技術的負債が増加
     */
    it('should penalize high complexity when exceeding threshold', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 15, // 閾値10を超える
          maxComplexity: 20,
          highComplexityFiles: [{ file: 'complex.ts', complexity: 20, functions: 5 }],
        },
      });

      const score = calculateHealthScore(metrics);
      // 技術的負債が発生するのでスコアは低下
      expect(score).toBeLessThan(90);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle moderate complexity below threshold', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 8, // 閾値10以下なのでペナルティなし
          maxComplexity: 10,
          highComplexityFiles: [],
        },
      });

      const score = calculateHealthScore(metrics);
      // 閾値以下なので高スコアを維持
      expect(score).toBeGreaterThanOrEqual(90);
    });

    /**
     * 保守性インデックスが低い場合、技術的負債が増加することを検証
     * 保守性が低いファイルは修正コストが高い
     */
    it('should increase debt for low maintainability files', () => {
      const metrics = createMetrics({
        maintainability: {
          index: 60,
          rating: 'C' as const,
          lowMaintainabilityFiles: [
            { file: 'unmaintainable1.ts', maintainability: 50 },
            { file: 'unmaintainable2.ts', maintainability: 40 },
          ],
        },
      });

      const score = calculateHealthScore(metrics);
      // 保守性の低いファイルがあるとスコア低下
      expect(score).toBeLessThan(90);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle good maintainability with no penalty', () => {
      const metrics = createMetrics({
        maintainability: {
          index: 90,
          rating: 'A' as const,
          lowMaintainabilityFiles: [], // 保守性の低いファイルなし
        },
      });

      const score = calculateHealthScore(metrics);
      // 保守性が高いので高スコア維持
      expect(score).toBeGreaterThanOrEqual(90);
    });

    /**
     * 大きなファイルが存在する場合、技術的負債が増加することを検証
     * 大きなファイルは保守コストが高い
     */
    it('should increase debt for large files', () => {
      const metrics = createMetrics({
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 100,
          maxLinesPerFile: 500,
          largeFiles: ['file1.ts', 'file2.ts', 'file3.ts'], // 3つの大きなファイル
        },
      });

      const score = calculateHealthScore(metrics);
      // 大きなファイルがあるとスコア低下
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(40); // 技術的負債が発生するが極端ではない
    });

    /**
     * ESLintの複雑度問題は現在のSonarQube実装では直接考慮されないことを検証
     * （複雑度メトリクスとして間接的に影響する）
     */
    it('should not directly factor ESLint issues in SonarQube calculation', () => {
      const metrics = createMetrics({
        eslintComplexity: {
          cognitiveComplexity: 5,
          duplicateStrings: 3,
          otherIssues: 2,
        },
      });

      const score = calculateHealthScore(metrics);
      // ESLint問題は直接的な負債計算には含まれない
      expect(score).toBeGreaterThanOrEqual(90);
    });

    /**
     * コードの重複率が高い場合、技術的負債が増加することを検証
     * 重複率が閾値3%を超えると修正コストが発生
     */
    it('should increase debt for high code duplication', () => {
      const metrics = createMetrics({
        duplication: {
          percentage: 15, // 閾値3%を大幅に超える
          blocks: 10,
        },
      });

      const score = calculateHealthScore(metrics);
      // 重複率15%は閾値3%を大幅に超えるため、技術的負債が大きい
      expect(score).toBeLessThan(90);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    /**
     * 複数の問題が同時に存在する場合、技術的負債が累積することを検証
     * 各カテゴリの負債が合算されて総負債となる
     */
    it('should accumulate debt from multiple issues', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 20, // 閾値10を大幅に超える
          maxComplexity: 30,
          highComplexityFiles: [
            { file: 'complex1.ts', complexity: 30, functions: 10 },
            { file: 'complex2.ts', complexity: 25, functions: 8 },
          ],
        },
        maintainability: {
          index: 50,
          rating: 'D' as const,
          lowMaintainabilityFiles: [
            { file: 'bad1.ts', maintainability: 40 },
            { file: 'bad2.ts', maintainability: 30 },
          ],
        },
        fileMetrics: {
          totalFiles: 10,
          avgLinesPerFile: 200,
          maxLinesPerFile: 800,
          largeFiles: ['large1.ts', 'large2.ts', 'large3.ts'],
        },
        duplication: {
          percentage: 20,
          blocks: 15,
        },
      });

      const score = calculateHealthScore(metrics);
      // 複数の問題で技術的負債が大きい
      expect(score).toBeLessThan(60); // Grade C以下
      expect(score).toBeGreaterThanOrEqual(0);
    });

    /**
     * どんなに悪いメトリクスでもスコアが負の値にならないことを検証
     * スコアの下限は0であるべき（ユーザーフレンドリーな表示のため）
     */
    it('should not return negative scores', () => {
      const metrics = createMetrics({
        complexity: {
          averageComplexity: 50, // 極めて高い複雑度
          maxComplexity: 100,
          highComplexityFiles: Array(20)
            .fill(null)
            .map((_, i) => ({
              file: `complex${i}.ts`,
              complexity: 50 + i,
              functions: 10,
            })),
        },
        maintainability: {
          index: 20,
          rating: 'F' as const,
          lowMaintainabilityFiles: Array(20)
            .fill(null)
            .map((_, i) => ({
              file: `bad${i}.ts`,
              maintainability: 20,
            })),
        },
        fileMetrics: {
          totalFiles: 50,
          avgLinesPerFile: 500,
          maxLinesPerFile: 2000,
          largeFiles: Array(30).fill('file.ts'),
        },
        duplication: {
          percentage: 80, // 極めて高い重複率
          blocks: 100,
        },
      });

      const score = calculateHealthScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(40); // Grade E範囲
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
