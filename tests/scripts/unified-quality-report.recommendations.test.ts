import { describe, it, expect } from 'vitest';

import {
  generateRecommendations,
  type UnifiedQualityReport,
} from '../../scripts/unified-quality-report';

function makeReport(partial: Partial<UnifiedQualityReport> = {}): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: {
      buildTime: 6 * 60 * 1000,
      testTime: undefined,
      bundleSize: { total: 8 * 1024 * 1024, javascript: 0, css: 0 },
    },
    basicQuality: { typeErrors: 1, lintErrors: 2, lintWarnings: 20, coverage: 60 },
    advancedQuality: {
      complexity: { average: 12, max: 25 },
      maintainability: { index: 65, rating: 'C' },
      duplication: { percentage: 12 },
    },
    healthScore: 0,
    recommendations: [],
    ...partial,
  } as UnifiedQualityReport;
}

describe('generateRecommendations', () => {
  it('emits warnings and errors based on metrics', () => {
    const recs = generateRecommendations(makeReport());
    expect(recs.some((r) => r.includes('TypeScript errors'))).toBeTruthy();
    expect(recs.some((r) => r.includes('ESLint errors'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Reduce ESLint warnings'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Increase test coverage'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Optimize build time'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Reduce bundle size'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Refactor complex functions'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Critical: Some functions are too complex'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Improve code maintainability'))).toBeTruthy();
    expect(recs.some((r) => r.includes('Extract duplicated code'))).toBeTruthy();
  });

  it('says excellent when no recommendations', () => {
    const recs = generateRecommendations(
      makeReport({
        performance: {
          buildTime: 60_000,
          testTime: 30_000,
          bundleSize: { total: 2 * 1024 * 1024, javascript: 0, css: 0 },
        },
        basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 95 },
        advancedQuality: {
          complexity: { average: 4, max: 10 },
          maintainability: { index: 90, rating: 'A' },
          duplication: { percentage: 1 },
        },
      })
    );
    expect(recs).toHaveLength(1);
    expect(recs[0]).toContain('Code quality is excellent');
  });
});
