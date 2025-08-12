import { describe, it, expect } from 'vitest';

import {
  calculateHealthScore,
  normalizeScores,
  isQualityGatePass,
  type UnifiedQualityReport,
} from '../../scripts/unified-quality-report';

function makeReport(partial: Partial<UnifiedQualityReport> = {}): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: undefined,
    basicQuality: {
      typeErrors: 0,
      lintErrors: 0,
      lintWarnings: 0,
      coverage: 85,
    },
    advancedQuality: {
      complexity: { average: 5, max: 10 },
      maintainability: { index: 80, rating: 'B' },
      duplication: { percentage: 2 },
    },
    healthScore: 0,
    recommendations: [],
    ...partial,
  } as UnifiedQualityReport;
}

describe('unified-quality-report core functions', () => {
  it('normalizeScores returns 0-100 for known metrics', () => {
    const report = makeReport();
    const scores = normalizeScores(report);
    // basic sanity checks
    expect(scores.COVERAGE).toBeGreaterThanOrEqual(0);
    expect(scores.COVERAGE).toBeLessThanOrEqual(100);
    expect(scores.CC_AVG).toBeGreaterThanOrEqual(0);
    expect(scores.CC_AVG).toBeLessThanOrEqual(100);
  });

  it('isQualityGatePass passes when metrics meet gate conditions', () => {
    const report = makeReport({
      basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 85 },
      advancedQuality: {
        complexity: { average: 6, max: 12 },
        maintainability: { index: 80, rating: 'B' },
        duplication: { percentage: 2 },
      },
    });
    expect(isQualityGatePass(report)).toBeTruthy();
  });

  it('isQualityGatePass fails when coverage below threshold', () => {
    const report = makeReport({
      basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 60 },
    });
    expect(isQualityGatePass(report)).toBeFalsy();
  });

  it('calculateHealthScore caps when gate fails', () => {
    const report = makeReport({
      basicQuality: { typeErrors: 1, lintErrors: 0, lintWarnings: 0, coverage: 85 },
    });
    const score = calculateHealthScore(report);
    expect(score).toBeLessThanOrEqual(59);
  });

  it('calculateHealthScore improves with better coverage', () => {
    const low = calculateHealthScore(
      makeReport({ basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 60 } })
    );
    const high = calculateHealthScore(
      makeReport({ basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 90 } })
    );
    expect(high).toBeGreaterThanOrEqual(low);
  });
});
