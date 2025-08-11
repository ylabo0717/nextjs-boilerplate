#!/usr/bin/env tsx

/**
 * Metrics reporting script for GitHub Pull Requests
 * Generates and posts metrics summary as PR comments
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  TIME_UNITS,
  PERFORMANCE_THRESHOLDS,
  LIGHTHOUSE_THRESHOLDS,
  SCORE_RATINGS,
} from './constants/quality-metrics';

/**
 * Metrics data structure
 */
interface Metrics {
  /** Build execution time in milliseconds */
  buildTime?: number;
  /** Test execution time in milliseconds */
  testTime?: number;
  /** Bundle size information */
  bundleSize?: {
    /** Total bundle size in bytes */
    total: number;
    /** JavaScript files size in bytes */
    javascript: number;
    /** CSS files size in bytes */
    css: number;
  };
  /** Test coverage percentage */
  coverage?: number;
  /** Number of TypeScript errors */
  typeErrors?: number;
  /** Number of ESLint errors */
  lintErrors?: number;
  /** Number of ESLint warnings */
  lintWarnings?: number;
  /** Lighthouse performance scores */
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

/**
 * Retrieves current metrics from the latest metrics file
 * @returns Current metrics object
 */
function getCurrentMetrics(): Metrics {
  const metricsPath = path.join(process.cwd(), 'metrics', 'latest.json');

  if (!fs.existsSync(metricsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Retrieves metrics from the base branch for comparison
 * @returns Base branch metrics object
 */
function getBaseMetrics(): Metrics {
  // Get base SHA from GitHub Actions context
  const baseSha = process.env.GITHUB_BASE_SHA;

  if (!baseSha) {
    return {};
  }

  try {
    // Get base branch metrics (actual implementation may need different approach)
    const baseMetricsPath = path.join(process.cwd(), 'metrics', `base-${baseSha}.json`);

    if (fs.existsSync(baseMetricsPath)) {
      return JSON.parse(fs.readFileSync(baseMetricsPath, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }

  return {};
}

/**
 * Formats metric values with difference indicators
 * @param current - Current metric value
 * @param base - Base metric value for comparison
 * @param format - Format type for display
 * @returns Formatted string with value and optional change indicator
 */
function formatDiff(
  current: number | undefined,
  base: number | undefined,
  format: 'time' | 'size' | 'percent' | 'count'
): string {
  if (current === undefined) {
    return 'N/A';
  }

  let value = '';
  let diff = '';

  switch (format) {
    case 'time':
      const minutes = Math.floor(current / TIME_UNITS.MS_PER_MINUTE);
      const seconds = ((current % TIME_UNITS.MS_PER_MINUTE) / TIME_UNITS.MS_PER_SECOND).toFixed(1);
      value = `${minutes}m ${seconds}s`;
      break;
    case 'size':
      value = `${(current / 1024 / 1024).toFixed(2)} MB`;
      break;
    case 'percent':
      value = `${current.toFixed(1)}%`;
      break;
    case 'count':
      value = current.toString();
      break;
  }

  if (base !== undefined && current !== undefined) {
    const change = current - base;

    if (Math.abs(change) > 0.01) {
      const sign = change > 0 ? '+' : '';
      const emoji = change > 0 ? '📈' : '📉';

      switch (format) {
        case 'time':
          diff = ` ${emoji} ${sign}${(change / 1000).toFixed(1)}s`;
          break;
        case 'size':
          diff = ` ${emoji} ${sign}${(change / 1024 / 1024).toFixed(2)} MB`;
          break;
        case 'percent':
          diff = ` ${emoji} ${sign}${change.toFixed(1)}%`;
          break;
        case 'count':
          diff = ` ${emoji} ${sign}${change}`;
          break;
      }
    }
  }

  return value + diff;
}

/**
 * Generates a colored badge for Lighthouse scores
 * @param score - The Lighthouse score (0-100)
 * @param threshold - The minimum acceptable score
 * @returns Formatted badge string with color indicator
 */
function getScoreBadge(score: number | undefined, threshold: number): string {
  if (score === undefined) {
    return '⬜ N/A';
  }

  if (score >= SCORE_RATINGS.A) {
    return `🟢 ${score}`;
  } else if (score >= threshold) {
    return `🟡 ${score}`;
  } else {
    return `🔴 ${score}`;
  }
}

/**
 * Generates a comprehensive metrics report in Markdown format
 * @param current - Current metrics
 * @param base - Base metrics for comparison
 * @returns Formatted Markdown report string
 */
function generateReport(current: Metrics, base: Metrics): string {
  const lines: string[] = [
    '## 📊 Build Metrics Report',
    '',
    '### ⚡ Performance Metrics',
    '',
    '| Metric | Value | Threshold | Status |',
    '|--------|-------|-----------|--------|',
  ];

  // Build time
  const buildStatus =
    current.buildTime && current.buildTime < PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX ? '✅' : '⚠️';
  lines.push(
    `| Build Time | ${formatDiff(current.buildTime, base.buildTime, 'time')} | < 5m | ${buildStatus} |`
  );

  // Test time
  const testStatus = current.testTime && current.testTime < 120000 ? '✅' : '⚠️';
  lines.push(
    `| Test Time | ${formatDiff(current.testTime, base.testTime, 'time')} | < 2m | ${testStatus} |`
  );

  // Bundle size
  if (current.bundleSize) {
    const bundleStatus = current.bundleSize.total < 5242880 ? '✅' : '⚠️';
    lines.push(
      `| Bundle Size (Total) | ${formatDiff(current.bundleSize.total, base.bundleSize?.total, 'size')} | < 5MB | ${bundleStatus} |`
    );
    lines.push(
      `| ├─ JavaScript | ${formatDiff(current.bundleSize.javascript, base.bundleSize?.javascript, 'size')} | - | - |`
    );
    lines.push(
      `| └─ CSS | ${formatDiff(current.bundleSize.css, base.bundleSize?.css, 'size')} | - | - |`
    );
  }

  lines.push('');
  lines.push('### 🎯 Code Quality');
  lines.push('');
  lines.push('| Metric | Value | Threshold | Status |');
  lines.push('|--------|-------|-----------|--------|');

  // TypeScript errors
  const typeStatus = current.typeErrors === 0 ? '✅' : '❌';
  lines.push(
    `| TypeScript Errors | ${formatDiff(current.typeErrors, base.typeErrors, 'count')} | 0 | ${typeStatus} |`
  );

  // ESLint errors
  const lintStatus = current.lintErrors === 0 ? '✅' : '❌';
  lines.push(
    `| ESLint Errors | ${formatDiff(current.lintErrors, base.lintErrors, 'count')} | 0 | ${lintStatus} |`
  );

  // ESLint warnings
  const warningStatus = (current.lintWarnings || 0) <= 10 ? '✅' : '⚠️';
  lines.push(
    `| ESLint Warnings | ${formatDiff(current.lintWarnings, base.lintWarnings, 'count')} | ≤ 10 | ${warningStatus} |`
  );

  // Test coverage
  if (current.coverage !== undefined) {
    const coverageStatus = current.coverage >= 60 ? '✅' : '❌';
    lines.push(
      `| Test Coverage | ${formatDiff(current.coverage, base.coverage, 'percent')} | ≥ 60% | ${coverageStatus} |`
    );
  }

  // Lighthouse scores
  if (current.lighthouse) {
    lines.push('');
    lines.push('### 🌟 Lighthouse Scores');
    lines.push('');
    lines.push('| Category | Score | Threshold | Status |');
    lines.push('|----------|-------|-----------|--------|');

    lines.push(
      `| Performance | ${getScoreBadge(current.lighthouse.performance, 80)} | ≥ 80 | ${current.lighthouse.performance >= 80 ? '✅' : '❌'} |`
    );
    lines.push(
      `| Accessibility | ${getScoreBadge(current.lighthouse.accessibility, LIGHTHOUSE_THRESHOLDS.ACCESSIBILITY)} | ≥ ${LIGHTHOUSE_THRESHOLDS.ACCESSIBILITY} | ${current.lighthouse.accessibility >= LIGHTHOUSE_THRESHOLDS.ACCESSIBILITY ? '✅' : '❌'} |`
    );
    lines.push(
      `| Best Practices | ${getScoreBadge(current.lighthouse.bestPractices, LIGHTHOUSE_THRESHOLDS.BEST_PRACTICES)} | ≥ ${LIGHTHOUSE_THRESHOLDS.BEST_PRACTICES} | ${current.lighthouse.bestPractices >= LIGHTHOUSE_THRESHOLDS.BEST_PRACTICES ? '✅' : '❌'} |`
    );
    lines.push(
      `| SEO | ${getScoreBadge(current.lighthouse.seo, LIGHTHOUSE_THRESHOLDS.SEO)} | ≥ ${LIGHTHOUSE_THRESHOLDS.SEO} | ${current.lighthouse.seo >= LIGHTHOUSE_THRESHOLDS.SEO ? '✅' : '❌'} |`
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  // Keep footer simple to avoid any URL-based secret scanning false positives
  lines.push('*Generated by Build Metrics Bot*');

  return lines.join('\n');
}

/**
 * Posts the metrics report as a comment on the GitHub PR
 * @param report - The formatted report to post
 */
function postComment(report: string) {
  const prNumber = process.env.GITHUB_PR_NUMBER || process.env.PR_NUMBER;

  if (!prNumber) {
    console.log('ℹ️  Not running in PR context, skipping comment post');
    return;
  }

  // Post comment using GitHub CLI
  try {
    // Search for existing metrics comment and update it
    const existingComments = execSync(
      `gh pr view ${prNumber} --json comments --jq '.comments[] | select(.body | contains("Build Metrics Report")) | .id'`,
      { stdio: 'pipe' }
    )
      .toString()
      .trim();

    if (existingComments) {
      // Update existing comment
      console.log('Updating existing metrics comment...');
      execSync(`gh pr comment ${prNumber} --edit-last --body "${report.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit',
      });
    } else {
      // Post new comment
      console.log('Posting new metrics comment...');
      execSync(`gh pr comment ${prNumber} --body "${report.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit',
      });
    }

    console.log('✅ Metrics report posted to PR');
  } catch (error) {
    console.error('Error posting comment:', error);
  }
}

/**
 * Outputs the report to GitHub Actions job summary
 * @param report - The formatted report to output
 */
function outputToSummary(report: string) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, report);
    console.log('✅ Metrics report written to GitHub Actions summary');
  }
}

/**
 * Main function that orchestrates the metrics reporting process
 * Retrieves metrics, generates report, and posts to PR/summary
 */
async function main() {
  console.log('📊 Generating metrics report...\n');

  const currentMetrics = getCurrentMetrics();
  const baseMetrics = getBaseMetrics();

  const report = generateReport(currentMetrics, baseMetrics);

  // Display report
  console.log(report);
  console.log('\n');

  // Output to GitHub Actions summary
  outputToSummary(report);

  // Post to PR comment
  if (process.env.CI) {
    postComment(report);
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'metrics', 'report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report saved to ${reportPath}`);
}

// Execute script
main().catch((error) => {
  console.error('❌ Error generating report:', error);
  process.exit(1);
});
