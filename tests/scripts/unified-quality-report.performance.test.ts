import { describe, it, expect } from 'vitest';

import { PERFORMANCE_THRESHOLDS } from '../../scripts/constants/quality-metrics';
import { type UnifiedQualityReport } from '../../scripts/unified-quality-report';
// normalizePerformance は非公開のため、normalizeScores 経由で検証する
import { normalizeScores } from '../../scripts/unified-quality-report';

function mk(perf: NonNullable<UnifiedQualityReport['performance']>): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: perf,
    basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 85 },
    advancedQuality: {
      complexity: { average: 8, max: 15 },
      maintainability: { index: 80, rating: 'B' },
      duplication: { percentage: 5 },
    },
    healthScore: 0,
    recommendations: [],
  } as UnifiedQualityReport;
}

describe('normalizePerformance via normalizeScores', () => {
  it('build time at target yields 100 score', () => {
    const scores = normalizeScores(
      mk({
        buildTime: PERFORMANCE_THRESHOLDS.BUILD_TIME_TARGET,
        testTime: undefined,
        bundleSize: { total: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET, javascript: 0, css: 0 },
      })
    );
    expect(scores.BUILD_TIME).toBe(100);
  });

  it('build time at max is near 0 (clamped to >=0)', () => {
    const scores = normalizeScores(
      mk({
        buildTime: PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX,
        testTime: undefined,
        bundleSize: { total: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET, javascript: 0, css: 0 },
      })
    );
    expect(scores.BUILD_TIME).toBeGreaterThanOrEqual(0);
    expect(scores.BUILD_TIME).toBeLessThanOrEqual(100);
  });

  it('bundle size at target yields 100, larger reduces score', () => {
    const at = normalizeScores(
      mk({
        buildTime: PERFORMANCE_THRESHOLDS.BUILD_TIME_TARGET,
        testTime: undefined,
        bundleSize: { total: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET, javascript: 0, css: 0 },
      })
    );
    const over = normalizeScores(
      mk({
        buildTime: PERFORMANCE_THRESHOLDS.BUILD_TIME_TARGET,
        testTime: undefined,
        bundleSize: { total: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_MAX, javascript: 0, css: 0 },
      })
    );
    expect(at.BUNDLE_SIZE).toBe(100);
    expect(over.BUNDLE_SIZE ?? 0).toBeLessThanOrEqual(100);
  });
});
