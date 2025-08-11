#!/usr/bin/env tsx

/**
 * Unified quality report generator
 * Combines all quality metrics into a single comprehensive report
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

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
  try {
    const result = execSync('pnpm lint --format json', { stdio: 'pipe' }).toString();
    const reports = JSON.parse(result);

    for (const report of reports) {
      quality.lintErrors += report.errorCount || 0;
      quality.lintWarnings += report.warningCount || 0;
    }
  } catch (error: unknown) {
    const output = (error as { stdout?: Buffer | string }).stdout?.toString() || '[]';
    try {
      const reports = JSON.parse(output);
      // 取得した配列をその場で畳み込み、未使用コレクションの作成を避ける
      for (const r of reports) {
        quality.lintErrors += r.errorCount || 0;
        quality.lintWarnings += r.warningCount || 0;
      }
    } catch {
      // Ignore parse errors
    }
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
  let score = 100;

  // Basic quality penalties
  if (report.basicQuality) {
    if (report.basicQuality.typeErrors > 0) score -= 20;
    if (report.basicQuality.lintErrors > 0) score -= 15;
    if (report.basicQuality.lintWarnings > 10) score -= 5;
    if (report.basicQuality.coverage && report.basicQuality.coverage < 60) score -= 10;
  }

  // Performance penalties
  if (report.performance) {
    if (report.performance.buildTime && report.performance.buildTime > 300000) score -= 5;
    if (report.performance.bundleSize && report.performance.bundleSize.total > 5242880) score -= 10;
  }

  // Advanced quality penalties
  if (report.advancedQuality) {
    if (report.advancedQuality.complexity.average > 10) score -= 10;
    if (report.advancedQuality.maintainability.index < 70) score -= 15;
    if (report.advancedQuality.duplication.percentage > 10) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(report: UnifiedQualityReport): string[] {
  const recommendations: string[] = [];

  // Basic quality recommendations
  if (report.basicQuality) {
    if (report.basicQuality.typeErrors > 0) {
      recommendations.push('🔴 Fix TypeScript errors immediately');
    }
    if (report.basicQuality.lintErrors > 0) {
      recommendations.push('🔴 Resolve ESLint errors');
    }
    if (report.basicQuality.lintWarnings > 10) {
      recommendations.push('🟡 Reduce ESLint warnings');
    }
    if (report.basicQuality.coverage && report.basicQuality.coverage < 60) {
      recommendations.push('🟡 Increase test coverage to at least 60%');
    }
  }

  // Performance recommendations
  if (report.performance) {
    if (report.performance.buildTime && report.performance.buildTime > 300000) {
      recommendations.push('🟡 Optimize build time (currently > 5 minutes)');
    }
    if (report.performance.bundleSize && report.performance.bundleSize.total > 5242880) {
      recommendations.push('🟡 Reduce bundle size (currently > 5MB)');
    }
  }

  // Advanced quality recommendations
  if (report.advancedQuality) {
    if (report.advancedQuality.complexity.average > 10) {
      recommendations.push('🟠 Refactor complex functions to improve readability');
    }
    if (report.advancedQuality.complexity.max > 20) {
      recommendations.push('🔴 Critical: Some functions are too complex (>20)');
    }
    if (report.advancedQuality.maintainability.index < 70) {
      recommendations.push('🟠 Improve code maintainability');
    }
    if (report.advancedQuality.duplication.percentage > 10) {
      recommendations.push('🟡 Extract duplicated code into shared functions');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Code quality is excellent! Keep up the good work!');
  }

  return recommendations;
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
    lines.push('✅ **Excellent** - Code quality is high');
  } else if (report.healthScore >= 60) {
    lines.push('⚠️ **Good** - Some improvements needed');
  } else if (report.healthScore >= 40) {
    lines.push('🟠 **Fair** - Significant improvements recommended');
  } else {
    lines.push('🔴 **Poor** - Immediate attention required');
  }

  lines.push('', '---', '');

  // Performance Metrics
  if (report.performance) {
    lines.push('## ⚡ Performance Metrics', '');
    lines.push('| Metric | Value | Status |');
    lines.push('|--------|-------|--------|');

    if (report.performance.buildTime) {
      const minutes = Math.floor(report.performance.buildTime / 60000);
      const seconds = ((report.performance.buildTime % 60000) / 1000).toFixed(1);
      const status = report.performance.buildTime < 300000 ? '✅' : '⚠️';
      lines.push(`| Build Time | ${minutes}m ${seconds}s | ${status} |`);
    }

    if (report.performance.bundleSize) {
      const sizeMB = (report.performance.bundleSize.total / 1024 / 1024).toFixed(2);
      const status = report.performance.bundleSize.total < 5242880 ? '✅' : '⚠️';
      lines.push(`| Bundle Size | ${sizeMB} MB | ${status} |`);
    }

    lines.push('');
  }

  // Code Quality
  if (report.basicQuality) {
    lines.push('## 🎨 Code Quality', '');
    lines.push('| Metric | Value | Status |');
    lines.push('|--------|-------|--------|');

    const typeStatus = report.basicQuality.typeErrors === 0 ? '✅' : '🔴';
    lines.push(`| TypeScript Errors | ${report.basicQuality.typeErrors} | ${typeStatus} |`);

    const lintStatus = report.basicQuality.lintErrors === 0 ? '✅' : '🔴';
    lines.push(`| ESLint Errors | ${report.basicQuality.lintErrors} | ${lintStatus} |`);

    const warnStatus = report.basicQuality.lintWarnings <= 10 ? '✅' : '⚠️';
    lines.push(`| ESLint Warnings | ${report.basicQuality.lintWarnings} | ${warnStatus} |`);

    if (report.basicQuality.coverage !== undefined) {
      const covStatus = report.basicQuality.coverage >= 60 ? '✅' : '⚠️';
      lines.push(`| Test Coverage | ${report.basicQuality.coverage.toFixed(1)}% | ${covStatus} |`);
    }

    lines.push('');
  }

  // Advanced Metrics
  if (report.advancedQuality) {
    lines.push('## 🔬 Advanced Metrics', '');
    lines.push('| Metric | Value | Status |');
    lines.push('|--------|-------|--------|');

    const complexityStatus = report.advancedQuality.complexity.average <= 10 ? '✅' : '⚠️';
    lines.push(
      `| Avg Complexity | ${report.advancedQuality.complexity.average.toFixed(2)} | ${complexityStatus} |`
    );

    lines.push(`| Max Complexity | ${report.advancedQuality.complexity.max} | - |`);

    const maintStatus = report.advancedQuality.maintainability.index >= 70 ? '✅' : '⚠️';
    lines.push(
      `| Maintainability | ${report.advancedQuality.maintainability.index.toFixed(1)} (${report.advancedQuality.maintainability.rating}) | ${maintStatus} |`
    );

    const dupStatus = report.advancedQuality.duplication.percentage <= 10 ? '✅' : '⚠️';
    lines.push(
      `| Code Duplication | ${report.advancedQuality.duplication.percentage.toFixed(1)}% | ${dupStatus} |`
    );

    lines.push('');
  }

  // Recommendations
  lines.push('## 💡 Recommendations', '');
  report.recommendations.forEach((rec) => {
    lines.push(`- ${rec}`);
  });

  lines.push('', '---', '');
  lines.push('*Generated by Unified Quality Report*');

  return lines.join('\n');
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
