import { describe, it, expect } from 'vitest';

import {
  calculateHealthScore,
  generateMarkdownReport,
  type UnifiedQualityReport,
} from '../../scripts/unified-quality-report';

function makeReport(partial: Partial<UnifiedQualityReport> = {}): UnifiedQualityReport {
  return {
    timestamp: new Date().toISOString(),
    performance: {
      buildTime: 120_000,
      testTime: 90_000,
      bundleSize: { total: 4 * 1024 * 1024, javascript: 0, css: 0 },
    },
    basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 88 },
    advancedQuality: {
      complexity: { average: 6, max: 15 },
      maintainability: { index: 85, rating: 'B' },
      duplication: { percentage: 3 },
    },
    healthScore: 0,
    recommendations: [],
    ...partial,
  } as UnifiedQualityReport;
}

describe('unified-quality-report integration smoke', () => {
  it('produces a markdown report including health score', () => {
    const report = makeReport();
    const health = calculateHealthScore(report);
    report.healthScore = health;
    const md = generateMarkdownReport(report);
    expect(md).toContain('# 📊 Unified Quality Report');
    expect(md).toContain('Overall Health Score');
  });
});
