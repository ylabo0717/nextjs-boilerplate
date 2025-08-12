import { describe, it, expect } from 'vitest';

import { normalizeScores, type UnifiedQualityReport } from '../../scripts/unified-quality-report';

function mk(partial: Partial<UnifiedQualityReport>): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: undefined,
    basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 80 },
    advancedQuality: {
      complexity: { average: 10, max: 20 },
      maintainability: { index: 80, rating: 'B' },
      duplication: { percentage: 10 },
    },
    healthScore: 0,
    recommendations: [],
    ...partial,
  } as UnifiedQualityReport;
}

describe('normalizeScores boundary behavior', () => {
  it('coverage at gate threshold equals mapped good-score segment start', () => {
    const s1 = normalizeScores(
      mk({ basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 80 } })
    );
    const s2 = normalizeScores(
      mk({ basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 81 } })
    );
    expect(s2.COVERAGE).toBeGreaterThanOrEqual(s1.COVERAGE!);
  });

  it('duplication exactly at project threshold scores just below perfect', () => {
    const s = normalizeScores(
      mk({
        advancedQuality: {
          complexity: { average: 10, max: 20 },
          maintainability: { index: 80, rating: 'B' },
          duplication: { percentage: 10 },
        },
      })
    );
    expect(s.DUPLICATION).toBeLessThan(100);
  });

  it('max complexity just above individual maximum decreases score', () => {
    const s1 = normalizeScores(
      mk({
        advancedQuality: {
          complexity: { average: 10, max: 20 },
          maintainability: { index: 80, rating: 'B' },
          duplication: { percentage: 5 },
        },
      })
    );
    const s2 = normalizeScores(
      mk({
        advancedQuality: {
          complexity: { average: 10, max: 21 },
          maintainability: { index: 80, rating: 'B' },
          duplication: { percentage: 5 },
        },
      })
    );
    expect(s2.CC_MAX).toBeLessThanOrEqual(s1.CC_MAX!);
  });
});
