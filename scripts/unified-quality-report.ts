#!/usr/bin/env tsx

/**
 * Unified quality report generator
 * Combines all quality metrics into a single comprehensive report
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { TIME_UNITS, PERFORMANCE_THRESHOLDS } from './constants/quality-metrics';

// Status symbols and shared thresholds
const STATUS = {
  OK: '✅',
  WARN: '⚠️',
  ERROR: '🔴',
} as const;

const THRESHOLDS = {
  COVERAGE_MIN: 60,
  LINT_WARN_MAX: 10,
  COMPLEXITY_AVG_MAX: 10,
  COMPLEXITY_MAX_MAX: 20,
  MAINTAINABILITY_MIN: 70,
  DUPLICATION_MAX: 10,
} as const;

/**
 * Combined quality metrics from all sources
 */
interface UnifiedQualityReport {
  /** Timestamp of report generation */
  timestamp: string;
  /** Performance metrics from measure-metrics.ts */
  performance?: {
    buildTime?: number;
    testTime?: number;
    bundleSize?: {
      total: number;
      javascript: number;
      css: number;
    };
  };
  /** Basic quality metrics from quality-gate.ts */
  basicQuality?: {
    typeErrors: number;
    lintErrors: number;
    lintWarnings: number;
    coverage?: number;
  };
  /** Advanced code quality from code-quality-analysis.ts */
  advancedQuality?: {
    complexity: {
      average: number;
      max: number;
    };
    maintainability: {
      index: number;
      rating: string;
    };
    duplication: {
      percentage: number;
    };
  };
  /** Overall health score */
  healthScore: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Load latest performance metrics
 */
function loadPerformanceMetrics(): UnifiedQualityReport['performance'] {
  const metricsPath = path.join(process.cwd(), 'metrics', 'latest.json');

  if (!fs.existsSync(metricsPath)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    return {
      buildTime: metrics.buildTime,
      testTime: metrics.testTime,
      bundleSize: metrics.bundleSize,
    };
  } catch {
    return undefined;
  }
}

/**
 * Load code quality metrics
 */
function loadCodeQualityMetrics(): UnifiedQualityReport['advancedQuality'] {
  const qualityPath = path.join(process.cwd(), 'metrics', 'code-quality-latest.json');

  if (!fs.existsSync(qualityPath)) {
    return undefined;
  }

  try {
    const quality = JSON.parse(fs.readFileSync(qualityPath, 'utf-8'));
    return {
      complexity: {
        average: quality.complexity?.averageComplexity || 0,
        max: quality.complexity?.maxComplexity || 0,
      },
      maintainability: {
        index: quality.maintainability?.index || 0,
        rating: quality.maintainability?.rating || 'N/A',
      },
      duplication: {
        percentage: quality.duplication?.percentage || 0,
      },
    };
  } catch {
    return undefined;
  }
}

/**
 * Execute a command and always return stdout as string.
 * Works for both success and error exit codes, returning empty string if none.
 */
function runCmdGetStdout(cmd: string): string {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString();
  } catch (e: unknown) {
    return (e as { stdout?: Buffer | string }).stdout?.toString() ?? '';
  }
}

/**
 * Safely sum ESLint counts from a JSON string.
 * Returns 0-safe totals on parse failure or unexpected shapes.
 */
interface EslintJsonReportEntry {
  errorCount?: number;
  warningCount?: number;
}

function sumEslintCounts(json: string): { errors: number; warnings: number } {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return { errors: 0, warnings: 0 };

    let errors = 0;
    let warnings = 0;
    for (const r of parsed as EslintJsonReportEntry[]) {
      errors += Number(r?.errorCount ?? 0);
      warnings += Number(r?.warningCount ?? 0);
    }
    return { errors, warnings };
  } catch {
    return { errors: 0, warnings: 0 };
  }
}

/**
 * Run basic quality checks
 */
function runBasicQualityChecks(): UnifiedQualityReport['basicQuality'] {
  const quality: UnifiedQualityReport['basicQuality'] = {
    typeErrors: 0,
    lintErrors: 0,
    lintWarnings: 0,
  };

  // Check TypeScript errors
  try {
    execSync('pnpm typecheck', { stdio: 'pipe' });
  } catch (error: unknown) {
    const output = (error as { stdout?: Buffer | string }).stdout?.toString() || '';
    quality.typeErrors = (output.match(/error TS/g) || []).length;
  }

  // Check ESLint issues
  {
    const out = runCmdGetStdout('pnpm lint --format json');
    const { errors, warnings } = sumEslintCounts(out);
    quality.lintErrors += errors;
    quality.lintWarnings += warnings;
  }

  // Check coverage if available
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      quality.coverage = coverage.total?.statements?.pct || 0;
    } catch {
      // Ignore errors
    }
  }

  return quality;
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(report: UnifiedQualityReport): number {
  const basicPenalty = (() => {
    const b = report.basicQuality;
    if (!b) return 0;
    let p = 0;
    if (b.typeErrors > 0) p += 20;
    if (b.lintErrors > 0) p += 15;
    if (b.lintWarnings > THRESHOLDS.LINT_WARN_MAX) p += 5;
    if (b.coverage !== undefined && b.coverage < THRESHOLDS.COVERAGE_MIN) p += 10;
    return p;
  })();

  const perfPenalty = (() => {
    const p = report.performance;
    if (!p) return 0;
    let pen = 0;
    if (p.buildTime && p.buildTime > PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX) pen += 5;
    if (p.bundleSize && p.bundleSize.total > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET) pen += 10;
    return pen;
  })();

  const advPenalty = (() => {
    const a = report.advancedQuality;
    if (!a) return 0;
    let p = 0;
    if (a.complexity.average > THRESHOLDS.COMPLEXITY_AVG_MAX) p += 10;
    if (a.maintainability.index < THRESHOLDS.MAINTAINABILITY_MIN) p += 15;
    if (a.duplication.percentage > THRESHOLDS.DUPLICATION_MAX) p += 5;
    return p;
  })();

  const score = 100 - basicPenalty - perfPenalty - advPenalty;
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(report: UnifiedQualityReport): string[] {
  const recs: string[] = [];

  const b = report.basicQuality;
  if (b) {
    if (b.typeErrors > 0) recs.push(`${STATUS.ERROR} Fix TypeScript errors immediately`);
    if (b.lintErrors > 0) recs.push(`${STATUS.ERROR} Resolve ESLint errors`);
    if (b.lintWarnings > THRESHOLDS.LINT_WARN_MAX)
      recs.push(`${STATUS.WARN} Reduce ESLint warnings`);
    if (b.coverage !== undefined && b.coverage < THRESHOLDS.COVERAGE_MIN)
      recs.push(`${STATUS.WARN} Increase test coverage to at least ${THRESHOLDS.COVERAGE_MIN}%`);
  }

  const p = report.performance;
  if (p) {
    if (p.buildTime && p.buildTime > PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX)
      recs.push(`${STATUS.WARN} Optimize build time (currently > 5 minutes)`);
    if (p.bundleSize && p.bundleSize.total > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET) {
      const targetMB = (PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET / 1024 / 1024).toFixed(0);
      recs.push(`${STATUS.WARN} Reduce bundle size (currently > ${targetMB}MB)`);
    }
  }

  const a = report.advancedQuality;
  if (a) {
    if (a.complexity.average > THRESHOLDS.COMPLEXITY_AVG_MAX)
      recs.push('🟠 Refactor complex functions to improve readability');
    if (a.complexity.max > THRESHOLDS.COMPLEXITY_MAX_MAX)
      recs.push(`${STATUS.ERROR} Critical: Some functions are too complex (>20)`);
    if (a.maintainability.index < THRESHOLDS.MAINTAINABILITY_MIN)
      recs.push('🟠 Improve code maintainability');
    if (a.duplication.percentage > THRESHOLDS.DUPLICATION_MAX)
      recs.push(`${STATUS.WARN} Extract duplicated code into shared functions`);
  }

  if (recs.length === 0)
    recs.push(`${STATUS.OK} Code quality is excellent! Keep up the good work!`);
  return recs;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: UnifiedQualityReport): string {
  const lines: string[] = [
    '# 📊 Unified Quality Report',
    '',
    `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
    '',
    `## 🎯 Overall Health Score: ${report.healthScore}/100`,
    '',
  ];

  // Health score interpretation
  if (report.healthScore >= 80) {
    lines.push(`${STATUS.OK} **Excellent** - Code quality is high`);
  } else if (report.healthScore >= 60) {
    lines.push(`${STATUS.WARN} **Good** - Some improvements needed`);
  } else if (report.healthScore >= 40) {
    lines.push('🟠 **Fair** - Significant improvements recommended');
  } else {
    lines.push(`${STATUS.ERROR} **Poor** - Immediate attention required`);
  }

  lines.push('', '---', '');

  lines.push(...renderPerformanceSection(report));
  lines.push(...renderCodeQualitySection(report));
  lines.push(...renderAdvancedSection(report));

  // Recommendations
  lines.push('## 💡 Recommendations', '');
  report.recommendations.forEach((rec) => {
    lines.push(`- ${rec}`);
  });

  lines.push('', '---', '');
  lines.push('*Generated by Unified Quality Report*');

  return lines.join('\n');
}

const TABLE_HEADER: readonly string[] = [
  '| Metric | Value | Status |',
  '|--------|-------|--------|',
];

function renderPerformanceSection(report: UnifiedQualityReport): string[] {
  if (!report.performance) return [];
  const out: string[] = ['## ⚡ Performance Metrics', '', ...TABLE_HEADER];
  const perf = report.performance;
  if (perf.buildTime) {
    const minutes = Math.floor(perf.buildTime / TIME_UNITS.MS_PER_MINUTE);
    const seconds = (
      (perf.buildTime % TIME_UNITS.MS_PER_MINUTE) /
      TIME_UNITS.MS_PER_SECOND
    ).toFixed(1);
    const status = perf.buildTime < PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX ? STATUS.OK : STATUS.WARN;
    out.push(`| Build Time | ${minutes}m ${seconds}s | ${status} |`);
  }
  if (perf.bundleSize) {
    const sizeMB = (perf.bundleSize.total / 1024 / 1024).toFixed(2);
    const status =
      perf.bundleSize.total < PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET ? STATUS.OK : STATUS.WARN;
    out.push(`| Bundle Size | ${sizeMB} MB | ${status} |`);
  }
  out.push('');
  return out;
}

function renderCodeQualitySection(report: UnifiedQualityReport): string[] {
  const b = report.basicQuality;
  if (!b) return [];
  const out: string[] = ['## 🎨 Code Quality', '', ...TABLE_HEADER];
  const typeStatus = b.typeErrors === 0 ? STATUS.OK : STATUS.ERROR;
  out.push(`| TypeScript Errors | ${b.typeErrors} | ${typeStatus} |`);
  const lintStatus = b.lintErrors === 0 ? STATUS.OK : STATUS.ERROR;
  out.push(`| ESLint Errors | ${b.lintErrors} | ${lintStatus} |`);
  const warnStatus = b.lintWarnings <= THRESHOLDS.LINT_WARN_MAX ? STATUS.OK : STATUS.WARN;
  out.push(`| ESLint Warnings | ${b.lintWarnings} | ${warnStatus} |`);
  if (b.coverage !== undefined) {
    const covStatus = b.coverage >= THRESHOLDS.COVERAGE_MIN ? STATUS.OK : STATUS.WARN;
    out.push(`| Test Coverage | ${b.coverage.toFixed(1)}% | ${covStatus} |`);
  }
  out.push('');
  return out;
}

function renderAdvancedSection(report: UnifiedQualityReport): string[] {
  const a = report.advancedQuality;
  if (!a) return [];
  const out: string[] = ['## 🔬 Advanced Metrics', '', ...TABLE_HEADER];
  const complexityStatus =
    a.complexity.average <= THRESHOLDS.COMPLEXITY_AVG_MAX ? STATUS.OK : STATUS.WARN;
  out.push(`| Avg Complexity | ${a.complexity.average.toFixed(2)} | ${complexityStatus} |`);
  out.push(`| Max Complexity | ${a.complexity.max} | - |`);
  const maintStatus =
    a.maintainability.index >= THRESHOLDS.MAINTAINABILITY_MIN ? STATUS.OK : STATUS.WARN;
  out.push(
    `| Maintainability | ${a.maintainability.index.toFixed(1)} (${a.maintainability.rating}) | ${maintStatus} |`
  );
  const dupStatus =
    a.duplication.percentage <= THRESHOLDS.DUPLICATION_MAX ? STATUS.OK : STATUS.WARN;
  out.push(`| Code Duplication | ${a.duplication.percentage.toFixed(1)}% | ${dupStatus} |`);
  out.push('');
  return out;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating unified quality report...\n');

  // Gather all metrics
  const report: UnifiedQualityReport = {
    timestamp: new Date().toISOString(),
    performance: loadPerformanceMetrics(),
    basicQuality: runBasicQualityChecks(),
    advancedQuality: loadCodeQualityMetrics(),
    healthScore: 0,
    recommendations: [],
  };

  // Calculate health score
  report.healthScore = calculateHealthScore(report);

  // Generate recommendations
  report.recommendations = generateRecommendations(report);

  // Save JSON report
  const metricsDir = path.join(process.cwd(), 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const jsonPath = path.join(metricsDir, 'unified-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`✅ JSON report saved to ${jsonPath}`);

  // Generate and save markdown report
  const markdownReport = generateMarkdownReport(report);
  const mdPath = path.join(metricsDir, 'unified-report.md');
  fs.writeFileSync(mdPath, markdownReport);
  console.log(`✅ Markdown report saved to ${mdPath}`);

  // Display summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 UNIFIED QUALITY REPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n🎯 Overall Health Score: ${report.healthScore}/100`);

  if (report.healthScore >= 80) {
    console.log('✅ Excellent code quality!');
  } else if (report.healthScore >= 60) {
    console.log('⚠️  Good quality with room for improvement');
  } else {
    console.log('🔴 Quality needs immediate attention');
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Top Recommendations:');
    report.recommendations.slice(0, 3).forEach((rec) => {
      console.log(`  ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Output to GitHub Actions if available
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `health_score=${report.healthScore}\n`);
  }

  // Exit with appropriate code
  if (report.healthScore < 40) {
    process.exit(1);
  }
}

// Execute script
main().catch((error) => {
  console.error('❌ Error generating unified report:', error);
  process.exit(1);
});
