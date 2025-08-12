import { describe, it, expect } from 'vitest';

import { normalizeScores, type UnifiedQualityReport } from '../../scripts/unified-quality-report';

function mk(overrides: Partial<UnifiedQualityReport> = {}): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: undefined,
    basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 85 },
    advancedQuality: {
      complexity: { average: 5, max: 10 },
      maintainability: { index: 80, rating: 'B' },
      duplication: { percentage: 0 },
    },
    healthScore: 0,
    recommendations: [],
    ...overrides,
  } as UnifiedQualityReport;
}

describe('advanced boundaries: CC_AVG and Duplication', () => {
  it('CC_AVG decreases across breakpoints (5,10,15,20,30,>30)', () => {
    const cc = (avg: number) =>
      normalizeScores(
        mk({
          advancedQuality: {
            complexity: { average: avg, max: 10 },
            maintainability: { index: 80, rating: 'B' },
            duplication: { percentage: 0 },
          },
        })
      ).CC_AVG!;
    const s5 = cc(5);
    const s10 = cc(10);
    const s15 = cc(15);
    const s20 = cc(20);
    const s30 = cc(30);
    const s31 = cc(31);
    expect(s5).toBeGreaterThanOrEqual(s10);
    expect(s10).toBeGreaterThanOrEqual(s15);
    expect(s15).toBeGreaterThanOrEqual(s20);
    expect(s20).toBeGreaterThanOrEqual(s30);
    expect(s31).toBeLessThanOrEqual(s30);
    expect(s31).toBeGreaterThanOrEqual(0);
  });

  it('Duplication: 0% = 100, 10% ≈ 95, 15% < 95, 20% ≈ 30, 30% ≈ 0', () => {
    const dup = (pct: number) =>
      normalizeScores(
        mk({
          advancedQuality: {
            complexity: { average: 10, max: 10 },
            maintainability: { index: 80, rating: 'B' },
            duplication: { percentage: pct },
          },
        })
      ).DUPLICATION!;
    const d0 = dup(0);
    const d10 = dup(10);
    const d15 = dup(15);
    const d20 = dup(20);
    const d30 = dup(30);
    expect(d0).toBe(100);
    expect(Math.round(d10)).toBe(95);
    expect(d15).toBeLessThan(95);
    expect(Math.round(d20)).toBe(30);
    expect(d30).toBeGreaterThanOrEqual(0);
    expect(d30).toBeLessThanOrEqual(30);
  });
});
