#!/usr/bin/env tsx

/**
 * Unified quality report generator
 * Combines all quality metrics into a single comprehensive report
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  TIME_UNITS,
  SIZE_UNITS,
  DISPLAY_FORMATS,
  PERFORMANCE_THRESHOLDS,
  QUALITY_GATE_CONDITIONS,
  QUALITY_SCORE_WEIGHTS,
  COMPLEXITY_THRESHOLDS,
  UNIFIED_REPORT_THRESHOLDS,
  HEALTH_SCORE_THRESHOLDS,
  QUALITY_GATE_FAILURE_CAP,
  SCORING_CONSTANTS,
} from './constants/quality-metrics';

// Status symbols and shared thresholds
const STATUS = {
  OK: '✅',
  WARN: '⚠️',
  ERROR: '🔴',
} as const;

/**
 * Combined quality metrics from all sources
 */
export interface UnifiedQualityReport {
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

    const { errors, warnings } = (parsed as EslintJsonReportEntry[]).reduce(
      (acc, r) => ({
        errors: acc.errors + Number(r?.errorCount ?? 0),
        warnings: acc.warnings + Number(r?.warningCount ?? 0),
      }),
      { errors: 0, warnings: 0 }
    );
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
 * Clamp a numeric value to the inclusive range [min, max].
 *
 * @param n - Input number
 * @param min - Lower bound (inclusive)
 * @param max - Upper bound (inclusive)
 * @returns The clamped value within [min, max]
 */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Linearly map a value from one interval to another, clamped to [x1, x2].
 *
 * Example: linearMap(15, 10, 0, 20, 100) -> 50
 *
 * @param x - Input value
 * @param x1 - Domain start (maps to y1)
 * @param y1 - Range start
 * @param x2 - Domain end (maps to y2)
 * @param y2 - Range end
 * @returns Interpolated value in [y1, y2]
 */
function linearMap(x: number, x1: number, y1: number, x2: number, y2: number): number {
  if (x1 === x2) return y1;
  const t = clamp((x - x1) / (x2 - x1), 0, 1);
  return y1 + (y2 - y1) * t;
}

type ScoreKey =
  | 'MI'
  | 'CC_AVG'
  | 'CC_MAX'
  | 'DUPLICATION'
  | 'COVERAGE'
  | 'TS_ERRORS'
  | 'LINT_ERRORS'
  | 'LINT_WARNINGS'
  | 'BUILD_TIME'
  | 'BUNDLE_SIZE';

type ScoreMap = Partial<Record<ScoreKey, number>>;

/** Normalize basic quality scores */
function normalizeBasic(b?: UnifiedQualityReport['basicQuality']): ScoreMap {
  const out: ScoreMap = {};
  if (!b) return out;
  out.TS_ERRORS = b.typeErrors === 0 ? 100 : clamp(100 - 30 * Math.log10(b.typeErrors + 1), 0, 100);
  out.LINT_ERRORS =
    b.lintErrors === 0
      ? 100
      : clamp(100 - SCORING_CONSTANTS.LINT_ERROR_LOG_DECAY * Math.log10(b.lintErrors + 1), 0, 100);
  out.LINT_WARNINGS =
    b.lintWarnings <= UNIFIED_REPORT_THRESHOLDS.LINT_WARN_MAX
      ? 100
      : clamp(
          100 -
            SCORING_CONSTANTS.LINT_WARNING_PENALTY *
              (b.lintWarnings - UNIFIED_REPORT_THRESHOLDS.LINT_WARN_MAX),
          0,
          100
        );
  // Use constants for log decay
  out.TS_ERRORS =
    b.typeErrors === 0
      ? 100
      : clamp(100 - SCORING_CONSTANTS.TS_ERROR_LOG_DECAY * Math.log10(b.typeErrors + 1), 0, 100);
  if (typeof b.coverage === 'number') {
    const cov = clamp(b.coverage, 0, 100);
    const BP = SCORING_CONSTANTS.COVERAGE_BREAKPOINTS;
    const S = SCORING_CONSTANTS.COVERAGE_SCORES;
    let s = 0;
    if (cov <= BP.ZERO) s = 0;
    else if (cov <= QUALITY_GATE_CONDITIONS.COVERAGE_MIN)
      s = linearMap(cov, BP.ZERO, 0, QUALITY_GATE_CONDITIONS.COVERAGE_MIN, S.AT_GOOD);
    else if (cov <= BP.GREAT)
      s = linearMap(cov, QUALITY_GATE_CONDITIONS.COVERAGE_MIN, S.AT_GOOD, BP.GREAT, S.AT_GREAT);
    else s = linearMap(cov, BP.GREAT, S.AT_GREAT, 100, S.AT_MAX);
    out.COVERAGE = clamp(s, 0, 100);
  }
  return out;
}

/** Normalize performance scores */
function normalizePerformance(p?: UnifiedQualityReport['performance']): ScoreMap {
  const out: ScoreMap = {};
  if (!p) return out;
  if (typeof p.buildTime === 'number') {
    const t = p.buildTime;
    const target = PERFORMANCE_THRESHOLDS.BUILD_TIME_TARGET;
    const max = PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX;
    const s = t <= target ? 100 : 100 - linearMap(t, target, 0, max, 100);
    out.BUILD_TIME = clamp(s, 0, 100);
  }
  if (p.bundleSize && typeof p.bundleSize.total === 'number') {
    const size = p.bundleSize.total;
    const target = PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET;
    const max = PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_MAX;
    const s = size <= target ? 100 : 100 - linearMap(size, target, 0, max, 100);
    out.BUNDLE_SIZE = clamp(s, 0, 100);
  }
  return out;
}

/** Normalize advanced quality scores */
function normalizeAdvanced(a?: UnifiedQualityReport['advancedQuality']): ScoreMap {
  // Small helpers to keep this function simple
  const scoreAvgComplexity = (c: number): number => {
    const B = SCORING_CONSTANTS.CC_AVG_BREAKPOINTS;
    const S = SCORING_CONSTANTS.CC_AVG_SCORES;
    if (c <= B.EXCELLENT) return S.EXCELLENT;
    if (c <= B.GOOD) return clamp(linearMap(c, B.EXCELLENT, S.EXCELLENT, B.GOOD, S.GOOD), 0, 100);
    if (c <= B.FAIR) return clamp(linearMap(c, B.GOOD, S.GOOD, B.FAIR, S.FAIR), 0, 100);
    if (c <= B.WARNING) return clamp(linearMap(c, B.FAIR, S.FAIR, B.WARNING, S.WARNING), 0, 100);
    if (c <= B.CRITICAL)
      return clamp(linearMap(c, B.WARNING, S.WARNING, B.CRITICAL, S.CRITICAL), 0, 100);
    return 0;
  };

  const scoreMaxComplexity = (cmax: number): number => {
    const limit = COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM;
    if (cmax <= limit) return 100;
    if (cmax <= limit + SCORING_CONSTANTS.MAX_COMPLEXITY_PENALTY_RANGE)
      return clamp(
        100 -
          linearMap(
            cmax,
            limit,
            0,
            limit + SCORING_CONSTANTS.MAX_COMPLEXITY_PENALTY_RANGE,
            SCORING_CONSTANTS.MAX_COMPLEXITY_MAX_DEDUCT
          ),
        0,
        100
      );
    return 0;
  };

  const scoreDuplication = (dupPct: number): number => {
    const d = clamp(dupPct, 0, 100);
    if (d <= 0) return 100;
    const T = UNIFIED_REPORT_THRESHOLDS.DUPLICATION_MAX;
    const BP = SCORING_CONSTANTS.DUPLICATION_BREAKPOINTS;
    const S = SCORING_CONSTANTS.DUPLICATION_SCORES;
    if (d <= T) return clamp(linearMap(d, 0, 100, T, S.THRESHOLD), 0, 100);
    if (d <= BP.MID) return clamp(linearMap(d, T, S.THRESHOLD, BP.MID, S.MID), 0, 100);
    if (d <= BP.HIGH) return clamp(linearMap(d, BP.MID, S.MID, BP.HIGH, S.HIGH), 0, 100);
    return 0;
  };

  const out: ScoreMap = {};
  if (!a) return out;
  out.CC_AVG = scoreAvgComplexity(a.complexity.average);
  out.CC_MAX = scoreMaxComplexity(a.complexity.max);
  out.DUPLICATION = scoreDuplication(a.duplication.percentage);

  if (typeof a.maintainability?.index === 'number') {
    out.MI = clamp(a.maintainability.index, 0, 100);
  }
  return out;
}

/** Merge multiple partial score maps */
function mergeScores(...parts: ScoreMap[]): ScoreMap {
  return Object.assign({}, ...parts);
}

/**
 * Normalize report metrics to 0–100 as per the documented scheme in docs/code-quality-metrics.md.
 *
 * @param report - UnifiedQualityReport input
 * @returns A dictionary of normalized scores in the range [0, 100]
 */
export function normalizeScores(report: UnifiedQualityReport): Record<string, number> {
  const basic = normalizeBasic(report.basicQuality);
  const perf = normalizePerformance(report.performance);
  const adv = normalizeAdvanced(report.advancedQuality);
  return mergeScores(basic, perf, adv) as Record<string, number>;
}

/**
 * Determine Quality Gate status (true = pass, false = fail).
 *
 * Conditions (defaults):
 * - TypeScript errors = 0
 * - ESLint errors = 0
 * - Coverage ≥ QUALITY_GATE_CONDITIONS.COVERAGE_MIN (default: 80%)
 * - Duplication ≤ QUALITY_GATE_CONDITIONS.DUPLICATION_MAX (default: 3%)
 *
 * @param report - UnifiedQualityReport
 * @returns true if gate passes, false otherwise
 */
export function isQualityGatePass(report: UnifiedQualityReport): boolean {
  const b = report.basicQuality;
  if ((b?.typeErrors ?? 0) > 0) return false;
  if ((b?.lintErrors ?? 0) > 0) return false;
  if (typeof b?.coverage === 'number' && b.coverage < QUALITY_GATE_CONDITIONS.COVERAGE_MIN)
    return false;

  const a = report.advancedQuality;
  if ((a?.duplication?.percentage ?? 0) > QUALITY_GATE_CONDITIONS.DUPLICATION_MAX) return false;

  return true;
}

/**
 * Compute the health score (0–100).
 *
 * Algorithm:
 * 1) Normalize metrics to [0,100] via normalizeScores().
 * 2) Compute weighted average using QUALITY_SCORE_WEIGHTS (re-normalize when some metrics are missing).
 * 3) If Quality Gate fails, cap the score at 59.
 *
 * Notes:
 * - If Maintainability Index (MI) is unavailable, its weight is reallocated to CC_AVG.
 * - The final score is rounded to an integer.
 *
 * @param report - UnifiedQualityReport
 * @returns healthScore in [0,100], capped at 59 on gate failure
 */
export function calculateHealthScore(report: UnifiedQualityReport): number {
  const scores = normalizeScores(report) as Partial<
    Record<
      | 'MI'
      | 'CC_AVG'
      | 'CC_MAX'
      | 'DUPLICATION'
      | 'COVERAGE'
      | 'TS_ERRORS'
      | 'LINT_ERRORS'
      | 'BUILD_TIME'
      | 'BUNDLE_SIZE',
      number
    >
  >;

  // Local weights (allow reallocation when MI is missing)
  let wMI: number = QUALITY_SCORE_WEIGHTS.MI;
  let wCC_AVG: number = QUALITY_SCORE_WEIGHTS.CC_AVG;
  const wCC_MAX: number = QUALITY_SCORE_WEIGHTS.CC_MAX;
  const wDUP: number = QUALITY_SCORE_WEIGHTS.DUPLICATION;
  const wCOV: number = QUALITY_SCORE_WEIGHTS.COVERAGE;
  const wTS: number = QUALITY_SCORE_WEIGHTS.TS_ERRORS;
  const wLINT: number = QUALITY_SCORE_WEIGHTS.LINT_ERRORS;
  const wBUILD: number = QUALITY_SCORE_WEIGHTS.BUILD_TIME;
  const wBUNDLE: number = QUALITY_SCORE_WEIGHTS.BUNDLE_SIZE;

  if (scores.MI === undefined) {
    // Reallocate MI weight to average complexity when MI is not provided
    wCC_AVG += wMI;
    wMI = 0;
  }

  // Accumulate only available metrics using a local helper to keep complexity low
  let accWeight = 0;
  let accScore = 0;
  const add = (value: number | undefined, weight: number) => {
    if (value === undefined) return;
    accWeight += weight;
    accScore += weight * value;
  };

  add(scores.MI, wMI);
  add(scores.CC_AVG, wCC_AVG);
  add(scores.CC_MAX, wCC_MAX);
  add(scores.DUPLICATION, wDUP);
  add(scores.COVERAGE, wCOV);
  add(scores.TS_ERRORS, wTS);
  add(scores.LINT_ERRORS, wLINT);
  add(scores.BUILD_TIME, wBUILD);
  add(scores.BUNDLE_SIZE, wBUNDLE);

  const base = accWeight > 0 ? accScore / accWeight : 0;
  let health = clamp(base, 0, 100);

  // Apply Quality Gate cap (recommended)
  if (!isQualityGatePass(report)) {
    health = Math.min(health, QUALITY_GATE_FAILURE_CAP);
  }

  return Math.round(health);
}

/**
 * Generate recommendations based on metrics
 */
/**
 * Add recommendations based on basic quality metrics.
 * @param b - Basic quality metrics (type/lint/coverage) or undefined when unavailable
 * @param recs - Mutable array to push recommendation strings into
 */
function addBasicRecommendations(
  b: UnifiedQualityReport['basicQuality'] | undefined,
  recs: string[]
): void {
  if (!b) return;
  if (b.typeErrors > 0) recs.push(`${STATUS.ERROR} Fix TypeScript errors immediately`);
  if (b.lintErrors > 0) recs.push(`${STATUS.ERROR} Resolve ESLint errors`);
  if (b.lintWarnings > UNIFIED_REPORT_THRESHOLDS.LINT_WARN_MAX)
    recs.push(`${STATUS.WARN} Reduce ESLint warnings`);
  if (b.coverage !== undefined && b.coverage < QUALITY_GATE_CONDITIONS.COVERAGE_MIN)
    recs.push(
      `${STATUS.WARN} Increase test coverage to at least ${QUALITY_GATE_CONDITIONS.COVERAGE_MIN}%`
    );
}

/**
 * Add recommendations based on performance metrics.
 * @param p - Performance metrics or undefined when unavailable
 * @param recs - Mutable array to push recommendation strings into
 */
function addPerformanceRecommendations(
  p: UnifiedQualityReport['performance'] | undefined,
  recs: string[]
): void {
  if (!p) return;
  if (p.buildTime && p.buildTime > PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX)
    recs.push(
      `${STATUS.WARN} Optimize build time (currently > ${
        PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX / TIME_UNITS.MS_PER_MINUTE
      } minutes)`
    );
  if (p.bundleSize && p.bundleSize.total > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET) {
    const targetMB = (PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET / SIZE_UNITS.BYTES_PER_MB).toFixed(
      DISPLAY_FORMATS.BUNDLE_SIZE_HINT_DECIMALS
    );
    recs.push(`${STATUS.WARN} Reduce bundle size (currently > ${targetMB}MB)`);
  }
}

/**
 * Add recommendations based on advanced code quality metrics.
 * @param a - Advanced quality metrics (complexity/maintainability/duplication) or undefined
 * @param recs - Mutable array to push recommendation strings into
 */
function addAdvancedRecommendations(
  a: UnifiedQualityReport['advancedQuality'] | undefined,
  recs: string[]
): void {
  if (!a) return;
  if (a.complexity.average > COMPLEXITY_THRESHOLDS.AVERAGE.MAXIMUM)
    recs.push('🟠 Refactor complex functions to improve readability');
  if (a.complexity.max > COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM)
    recs.push(`${STATUS.ERROR} Critical: Some functions are too complex (>20)`);
  if (a.maintainability.index < UNIFIED_REPORT_THRESHOLDS.MAINTAINABILITY_MIN)
    recs.push('🟠 Improve code maintainability');
  if (a.duplication.percentage > UNIFIED_REPORT_THRESHOLDS.DUPLICATION_MAX)
    recs.push(`${STATUS.WARN} Extract duplicated code into shared functions`);
}

/**
 * Generate all recommendations from the report.
 * @param report - Combined quality report
 * @returns Array of human-readable recommendation strings
 */
export function generateRecommendations(report: UnifiedQualityReport): string[] {
  const recs: string[] = [];
  addBasicRecommendations(report.basicQuality, recs);
  addPerformanceRecommendations(report.performance, recs);
  addAdvancedRecommendations(report.advancedQuality, recs);
  if (recs.length === 0)
    recs.push(`${STATUS.OK} Code quality is excellent! Keep up the good work!`);
  return recs;
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(report: UnifiedQualityReport): string {
  const lines: string[] = [
    '# 📊 Unified Quality Report',
    '',
    `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
    '',
    `## 🎯 Overall Health Score: ${report.healthScore}/100`,
    '',
  ];

  // Health score interpretation
  if (report.healthScore >= HEALTH_SCORE_THRESHOLDS.EXCELLENT) {
    lines.push(`${STATUS.OK} **Excellent** - Code quality is high`);
  } else if (report.healthScore >= HEALTH_SCORE_THRESHOLDS.GOOD) {
    lines.push(`${STATUS.WARN} **Good** - Some improvements needed`);
  } else if (report.healthScore >= HEALTH_SCORE_THRESHOLDS.FAIR) {
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

/**
 * Render performance metrics section as Markdown lines.
 * @param report - Combined quality report
 * @returns Markdown lines (possibly empty) for the performance section
 */
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
    const sizeMB = (perf.bundleSize.total / SIZE_UNITS.BYTES_PER_MB).toFixed(
      DISPLAY_FORMATS.BUNDLE_SIZE_TABLE_DECIMALS
    );
    const status =
      perf.bundleSize.total < PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_TARGET ? STATUS.OK : STATUS.WARN;
    out.push(`| Bundle Size | ${sizeMB} MB | ${status} |`);
  }
  out.push('');
  return out;
}

/**
 * Render basic code quality section as Markdown lines.
 * @param report - Combined quality report
 * @returns Markdown lines (possibly empty) for the code quality section
 */
function renderCodeQualitySection(report: UnifiedQualityReport): string[] {
  const b = report.basicQuality;
  if (!b) return [];
  const out: string[] = ['## 🎨 Code Quality', '', ...TABLE_HEADER];
  const typeStatus = b.typeErrors === 0 ? STATUS.OK : STATUS.ERROR;
  out.push(`| TypeScript Errors | ${b.typeErrors} | ${typeStatus} |`);
  const lintStatus = b.lintErrors === 0 ? STATUS.OK : STATUS.ERROR;
  out.push(`| ESLint Errors | ${b.lintErrors} | ${lintStatus} |`);
  const warnStatus =
    b.lintWarnings <= UNIFIED_REPORT_THRESHOLDS.LINT_WARN_MAX ? STATUS.OK : STATUS.WARN;
  out.push(`| ESLint Warnings | ${b.lintWarnings} | ${warnStatus} |`);
  if (b.coverage !== undefined) {
    const covStatus = b.coverage >= QUALITY_GATE_CONDITIONS.COVERAGE_MIN ? STATUS.OK : STATUS.WARN;
    out.push(`| Test Coverage | ${b.coverage.toFixed(1)}% | ${covStatus} |`);
  }
  out.push('');
  return out;
}

/**
 * Render advanced metrics section as Markdown lines.
 * @param report - Combined quality report
 * @returns Markdown lines (possibly empty) for the advanced metrics section
 */
function renderAdvancedSection(report: UnifiedQualityReport): string[] {
  const a = report.advancedQuality;
  if (!a) return [];
  const out: string[] = ['## 🔬 Advanced Metrics', '', ...TABLE_HEADER];
  const complexityStatus =
    a.complexity.average <= COMPLEXITY_THRESHOLDS.AVERAGE.MAXIMUM ? STATUS.OK : STATUS.WARN;
  out.push(`| Avg Complexity | ${a.complexity.average.toFixed(2)} | ${complexityStatus} |`);
  out.push(`| Max Complexity | ${a.complexity.max} | - |`);
  const maintStatus =
    a.maintainability.index >= UNIFIED_REPORT_THRESHOLDS.MAINTAINABILITY_MIN
      ? STATUS.OK
      : STATUS.WARN;
  out.push(
    `| Maintainability | ${a.maintainability.index.toFixed(1)} (${a.maintainability.rating}) | ${maintStatus} |`
  );
  const dupStatus =
    a.duplication.percentage <= UNIFIED_REPORT_THRESHOLDS.DUPLICATION_MAX ? STATUS.OK : STATUS.WARN;
  out.push(`| Code Duplication | ${a.duplication.percentage.toFixed(1)}% | ${dupStatus} |`);
  out.push('');
  return out;
}

/**
 * Main entrypoint for generating the unified report.
 * Reads latest metrics, computes health score, writes JSON/Markdown, and sets CI outputs.
 * Exits with non-zero status when health score is below threshold.
 * @returns Promise<void>
 */
export async function main() {
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

  if (report.healthScore >= HEALTH_SCORE_THRESHOLDS.EXCELLENT) {
    console.log('✅ Excellent code quality!');
  } else if (report.healthScore >= HEALTH_SCORE_THRESHOLDS.GOOD) {
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
  if (report.healthScore < HEALTH_SCORE_THRESHOLDS.FAIR) {
    process.exit(1);
  }
}

// Execute script (skip during tests)
if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error('❌ Error generating unified report:', error);
    process.exit(1);
  });
}
