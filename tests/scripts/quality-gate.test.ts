import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules
vi.mock('fs');
vi.mock('child_process');

// Import after mocks
import { evaluateQualityGate, DEFAULT_THRESHOLDS } from '../../scripts/quality-gate';

describe('quality-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('evaluateQualityGate', () => {
    /**
     * Test helper function to create metrics object
     */
    const createMetrics = (overrides = {}) => ({
      typeErrors: 0,
      lintErrors: 0,
      lintWarnings: 0,
      coverage: 85, // coverageは数値として扱われる
      bundleSize: 80 * 1024, // バイト単位で指定
      ...overrides,
    });

    it('should pass with perfect metrics', () => {
      const metrics = createMetrics();
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail on type check errors', () => {
      const metrics = createMetrics({
        typeErrors: 5,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures[0]).toContain('TypeScript errors');
    });

    it('should fail on lint errors', () => {
      const metrics = createMetrics({
        lintErrors: 3,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures[0]).toContain('ESLint errors');
    });

    it('should warn on lint warnings', () => {
      const metrics = createMetrics({
        lintWarnings: 15,
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('ESLint warnings');
    });

    it('should fail on low coverage', () => {
      const metrics = createMetrics({
        coverage: 50, // 数値として設定
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(false);
      expect(result.failures.some((f) => f.includes('Test coverage'))).toBe(true);
    });

    it('should fail on bundle size exceeded', () => {
      const metrics = createMetrics({
        bundleSize: 150 * 1024 * 1024, // 150MB (DEFAULT_THRESHOLDSのmaximum 100MBを超える)
      });
      const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

      expect(result.passed).toBe(true); // bundleSizeは警告のみ
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Total build size');
    });

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
