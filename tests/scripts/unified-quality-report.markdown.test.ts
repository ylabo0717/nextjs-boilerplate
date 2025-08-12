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
      buildTime: 150_000,
      testTime: 90_000,
      bundleSize: { total: 3 * 1024 * 1024, javascript: 0, css: 0 },
    },
    basicQuality: { typeErrors: 0, lintErrors: 0, lintWarnings: 0, coverage: 90 },
    advancedQuality: {
      complexity: { average: 6, max: 15 },
      maintainability: { index: 85, rating: 'B' },
      duplication: { percentage: 2 },
    },
    healthScore: 0,
    recommendations: [],
    ...partial,
  } as UnifiedQualityReport;
}

describe('generateMarkdownReport sections', () => {
  it('includes Performance, Code Quality, and Advanced sections with table headers', () => {
    const report = makeReport();
    report.healthScore = calculateHealthScore(report);
    const md = generateMarkdownReport(report);

    expect(md).toContain('## ⚡ Performance Metrics');
    expect(md).toContain('## 🎨 Code Quality');
    expect(md).toContain('## 🔬 Advanced Metrics');

    // table header
    expect(md).toContain('| Metric | Value | Status |');

    // representative rows
    expect(md).toContain('Build Time');
    expect(md).toContain('ESLint Errors');
    expect(md).toContain('Avg Complexity');
  });
});
