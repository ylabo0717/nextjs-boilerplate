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

describe('code-quality-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('calculateHealthScore', () => {
    /**
     * Test helper function to create metrics object
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

    it('should return 100 for perfect metrics', () => {
      const metrics = createMetrics();
      const score = calculateHealthScore(metrics);
      // 実装では、デフォルトでは100点から始まり、
      // eslintComplexityとduplicationがundefinedの場合はペナルティが適用されない
      expect(score).toBe(100);
    });

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

    it('should not exceed 100', () => {
      const metrics = createMetrics();

      const score = calculateHealthScore(metrics);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeCodeQuality', () => {
    it('should handle missing src directory gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await analyzeCodeQuality();

      expect(result).toBeDefined();
      // analyzeCodeQualityAsyncはhealthScoreを返さない、complexityやmaintainabilityを確認
      expect(result.complexity).toBeDefined();
      expect(result.maintainability).toBeDefined();
    });

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
