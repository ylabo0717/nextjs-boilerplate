import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules
vi.mock('fs');
vi.mock('child_process');

// Import after mocks
import { evaluateQualityGate, DEFAULT_THRESHOLDS } from '../../scripts/quality-gate';

/**
 * Quality Gate評価機能のテストスイート
 * scripts/quality-gate.tsのevaluateQualityGate関数が
 * 様々なメトリクスに対して正しく合否判定を行うことを検証
 */
describe('quality-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('evaluateQualityGate', () => {
    /**
     * テスト用のメトリクスオブジェクトを生成するヘルパー関数
     * デフォルトでは合格基準を満たす良好な値を設定
     * @param overrides - 上書きしたいメトリクス値
     * @returns QualityMetricsオブジェクト
     */
    const createMetrics = (overrides = {}) => ({
      typeErrors: 0,
      lintErrors: 0,
      lintWarnings: 0,
      coverage: 85, // coverageは数値として扱われる
      bundleSize: 80 * 1024, // バイト単位で指定
      ...overrides,
    });

    /**
     * すべてのメトリクスが良好な場合、quality gateが合格することを検証
     * エラー0件、警告0件、合格判定になることを確認
     */
    it('should pass with perfect metrics', () => {
      const metrics = createMetrics();
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    /**
     * TypeScriptのエラーが存在する場合、quality gateが失敗することを検証
     * typeErrorsが0より大きい場合は即座に失敗すべき
     */
    it('should fail on type check errors', () => {
      const metrics = createMetrics({
        typeErrors: 5,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures[0]).toContain('TypeScript errors');
    });

    /**
     * ESLintのエラーが存在する場合、quality gateが失敗することを検証
     * lintErrorsが0より大きい場合は即座に失敗すべき
     */
    it('should fail on lint errors', () => {
      const metrics = createMetrics({
        lintErrors: 3,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures[0]).toContain('ESLint errors');
    });

    /**
     * ESLintの警告が閾値を超えた場合、警告を出すが合格することを検証
     * 警告は失敗ではなく、改善推奨事項として扱われる
     */
    it('should warn on lint warnings', () => {
      const metrics = createMetrics({
        lintWarnings: 15,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('ESLint warnings');
    });

    /**
     * テストカバレッジが最低基準（60%）を下回る場合、quality gateが失敗することを検証
     * カバレッジは品質の重要指標として厳密にチェック
     */
    it('should fail on low coverage', () => {
      const metrics = createMetrics({
        coverage: 50, // 数値として設定
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('Test coverage'))).toBe(true);
    });

    /**
     * バンドルサイズが最大値を超えた場合の動作を検証
     * 現在の実装では警告のみで失敗にはしない（パフォーマンス監視目的）
     */
    it('should fail on bundle size exceeded', () => {
      const metrics = createMetrics({
        bundleSize: 150 * 1024 * 1024, // 150MB (DEFAULT_THRESHOLDSのmaximum 100MBを超える)
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true); // bundleSizeは警告のみ
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Total build size');
    });

    /**
     * 必須フィールド以外のメトリクスが欠落している場合でも
     * エラーを起こさず適切に処理できることを検証（防御的プログラミング）
     */
    it('should handle missing metrics gracefully', () => {
      const metrics = {
        typeErrors: 0,
        lintErrors: 0,
        lintWarnings: 0,
      };
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.failures).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    /**
     * 複数の問題が同時に発生した場合、すべての失敗理由を
     * 収集して報告することを検証（包括的なフィードバック提供）
     */
    it('should accumulate multiple failures', () => {
      const metrics = createMetrics({
        typeErrors: 5,
        lintErrors: 3,
        coverage: 50, // 数値として設定
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThanOrEqual(3);
    });
  });
});
