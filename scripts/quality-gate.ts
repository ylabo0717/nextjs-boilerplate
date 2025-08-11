#!/usr/bin/env tsx

/**
 * Quality gate check script for CI/CD pipelines
 * Validates code quality metrics and fails the build if standards are not met
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Type definition for exec error with stdout/stderr
 */
interface ExecError extends Error {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
  status?: number;
}

/**
 * Quality metrics collected during validation
 */
interface QualityMetrics {
  /** Test coverage percentage */
  coverage?: number;
  /** Number of TypeScript errors */
  typeErrors: number;
  /** Number of ESLint errors */
  lintErrors: number;
  /** Number of ESLint warnings */
  lintWarnings: number;
  /** Build time in milliseconds */
  buildTime?: number;
  /** Bundle size in bytes */
  bundleSize?: number;
  /** Lighthouse performance scores */
  lighthouseScore?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

/**
 * Quality threshold configuration
 */
interface QualityThresholds {
  coverage: {
    minimum: number;
    warning: number;
  };
  typeErrors: {
    maximum: number;
  };
  lintErrors: {
    maximum: number;
  };
  lintWarnings: {
    maximum: number;
  };
  buildTime: {
    maximum: number; // milliseconds
    warning: number;
  };
  bundleSize: {
    maximum: number; // bytes
    warning: number;
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

/**
 * Default quality thresholds for the project
 * These can be customized based on project requirements
 */
const DEFAULT_THRESHOLDS: QualityThresholds = {
  coverage: {
    minimum: 60,
    warning: 70,
  },
  typeErrors: {
    maximum: 0,
  },
  lintErrors: {
    maximum: 0,
  },
  lintWarnings: {
    maximum: 10,
  },
  buildTime: {
    maximum: 300000, // 5分
    warning: 240000, // 4分
  },
  bundleSize: {
    maximum: 5242880, // 5MB
    warning: 4194304, // 4MB
  },
  lighthouse: {
    performance: 80,
    accessibility: 90,
    bestPractices: 90,
    seo: 90,
  },
};

/**
 * Checks for TypeScript compilation errors
 * @returns Number of TypeScript errors found
 */
function checkTypeErrors(): number {
  console.log('🔍 Checking TypeScript errors...');
  try {
    execSync('pnpm typecheck', { stdio: 'pipe' });
    return 0;
  } catch (error) {
    const execError = error as ExecError;
    const output = execError.stdout?.toString() || '';
    const errorCount = (output.match(/error TS/g) || []).length;
    return errorCount;
  }
}

/**
 * Checks for ESLint errors and warnings
 * @returns Object containing error and warning counts
 */
function checkLintIssues(): { errors: number; warnings: number } {
  console.log('🔍 Checking ESLint issues...');
  try {
    const result = execSync('pnpm lint --format json', { stdio: 'pipe' }).toString();
    const reports = JSON.parse(result);

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const report of reports) {
      totalErrors += report.errorCount || 0;
      totalWarnings += report.warningCount || 0;
    }

    return { errors: totalErrors, warnings: totalWarnings };
  } catch (error) {
    // ESLintがエラーを返した場合
    const execError = error as ExecError;
    const output = execError.stdout?.toString() || '[]';
    try {
      const reports = JSON.parse(output);
      let totalErrors = 0;
      let totalWarnings = 0;

      for (const report of reports) {
        totalErrors += report.errorCount || 0;
        totalWarnings += report.warningCount || 0;
      }

      return { errors: totalErrors, warnings: totalWarnings };
    } catch {
      return { errors: 1, warnings: 0 };
    }
  }
}

/**
 * Checks test coverage from the coverage report
 * @returns Coverage percentage or undefined if report not found
 */
function checkCoverage(): number | undefined {
  console.log('🔍 Checking test coverage...');
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.log('⚠️  Coverage report not found. Run tests with coverage first.');
    return undefined;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    return coverage.total?.statements?.pct || 0;
  } catch (error) {
    console.error('Error reading coverage:', error);
    return undefined;
  }
}

/**
 * Retrieves build time from the latest metrics
 * @returns Build time in milliseconds or undefined if not available
 */
function checkBuildTime(): number | undefined {
  const metricsPath = path.join(process.cwd(), 'metrics', 'latest.json');

  if (!fs.existsSync(metricsPath)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    return metrics.buildTime;
  } catch {
    return undefined;
  }
}

/**
 * Retrieves bundle size from the latest metrics
 * @returns Bundle size in bytes or undefined if not available
 */
function checkBundleSize(): number | undefined {
  const metricsPath = path.join(process.cwd(), 'metrics', 'latest.json');

  if (!fs.existsSync(metricsPath)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    return metrics.bundleSize?.total;
  } catch {
    return undefined;
  }
}

/**
 * Evaluates quality gate results against thresholds
 * @param metrics - Collected quality metrics
 * @param thresholds - Quality thresholds to check against
 * @returns Object containing pass/fail status, failures, and warnings
 */
function evaluateQualityGate(
  metrics: QualityMetrics,
  thresholds: QualityThresholds
): { passed: boolean; failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];

  // Check TypeScript errors
  if (metrics.typeErrors > thresholds.typeErrors.maximum) {
    failures.push(
      `❌ TypeScript errors: ${metrics.typeErrors} (maximum: ${thresholds.typeErrors.maximum})`
    );
  }

  // Check ESLint errors
  if (metrics.lintErrors > thresholds.lintErrors.maximum) {
    failures.push(
      `❌ ESLint errors: ${metrics.lintErrors} (maximum: ${thresholds.lintErrors.maximum})`
    );
  }

  // Check ESLint warnings
  if (metrics.lintWarnings > thresholds.lintWarnings.maximum) {
    warnings.push(
      `⚠️  ESLint warnings: ${metrics.lintWarnings} (maximum: ${thresholds.lintWarnings.maximum})`
    );
  }

  // Check test coverage
  if (metrics.coverage !== undefined) {
    if (metrics.coverage < thresholds.coverage.minimum) {
      failures.push(
        `❌ Test coverage: ${metrics.coverage.toFixed(1)}% (minimum: ${thresholds.coverage.minimum}%)`
      );
    } else if (metrics.coverage < thresholds.coverage.warning) {
      warnings.push(
        `⚠️  Test coverage: ${metrics.coverage.toFixed(1)}% (recommended: ${thresholds.coverage.warning}%)`
      );
    }
  }

  // Check build time
  if (metrics.buildTime !== undefined) {
    if (metrics.buildTime > thresholds.buildTime.maximum) {
      failures.push(
        `❌ Build time: ${(metrics.buildTime / 1000).toFixed(1)}s (maximum: ${(thresholds.buildTime.maximum / 1000).toFixed(1)}s)`
      );
    } else if (metrics.buildTime > thresholds.buildTime.warning) {
      warnings.push(
        `⚠️  Build time: ${(metrics.buildTime / 1000).toFixed(1)}s (warning: ${(thresholds.buildTime.warning / 1000).toFixed(1)}s)`
      );
    }
  }

  // Check bundle size
  if (metrics.bundleSize !== undefined) {
    if (metrics.bundleSize > thresholds.bundleSize.maximum) {
      failures.push(
        `❌ Bundle size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB (maximum: ${(thresholds.bundleSize.maximum / 1024 / 1024).toFixed(2)}MB)`
      );
    } else if (metrics.bundleSize > thresholds.bundleSize.warning) {
      warnings.push(
        `⚠️  Bundle size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB (warning: ${(thresholds.bundleSize.warning / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

/**
 * Outputs results to GitHub Actions summary and output variables
 * @param result - Quality gate evaluation result
 */
function outputToGitHub(result: { passed: boolean; failures: string[]; warnings: string[] }) {
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `quality_gate_passed=${result.passed}`,
      `quality_gate_failures=${result.failures.length}`,
      `quality_gate_warnings=${result.warnings.length}`,
    ].join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## 📊 Quality Gate Results',
      '',
      result.passed ? '✅ **Quality gate PASSED**' : '❌ **Quality gate FAILED**',
      '',
    ];

    if (result.failures.length > 0) {
      summary.push('### Failures');
      summary.push(...result.failures);
      summary.push('');
    }

    if (result.warnings.length > 0) {
      summary.push('### Warnings');
      summary.push(...result.warnings);
      summary.push('');
    }

    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n'));
  }
}

/**
 * Main function that orchestrates quality gate checks
 * Collects metrics, evaluates against thresholds, and reports results
 */
async function main() {
  console.log('🚪 Running Quality Gate Checks...\n');

  const metrics: QualityMetrics = {
    typeErrors: 0,
    lintErrors: 0,
    lintWarnings: 0,
  };

  // Collect all metrics
  metrics.typeErrors = checkTypeErrors();

  const lintResult = checkLintIssues();
  metrics.lintErrors = lintResult.errors;
  metrics.lintWarnings = lintResult.warnings;

  metrics.coverage = checkCoverage();
  metrics.buildTime = checkBuildTime();
  metrics.bundleSize = checkBundleSize();

  // Evaluate quality gate
  const result = evaluateQualityGate(metrics, DEFAULT_THRESHOLDS);

  // Display results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Quality Gate Summary');
  console.log('='.repeat(50));

  console.log(`\n✅ TypeScript errors: ${metrics.typeErrors}`);
  console.log(`✅ ESLint errors: ${metrics.lintErrors}`);
  console.log(`⚠️  ESLint warnings: ${metrics.lintWarnings}`);

  if (metrics.coverage !== undefined) {
    console.log(`📈 Test coverage: ${metrics.coverage.toFixed(1)}%`);
  }

  if (metrics.buildTime !== undefined) {
    console.log(`⏱️  Build time: ${(metrics.buildTime / 1000).toFixed(1)}s`);
  }

  if (metrics.bundleSize !== undefined) {
    console.log(`📦 Bundle size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log('\n' + '='.repeat(50));

  if (result.failures.length > 0) {
    console.log('\n❌ Failures:');
    result.failures.forEach((f) => console.log('  ' + f));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((w) => console.log('  ' + w));
  }

  if (result.passed) {
    console.log('\n✅ Quality gate PASSED! 🎉');
  } else {
    console.log('\n❌ Quality gate FAILED!');
  }

  console.log('='.repeat(50) + '\n');

  // Output to GitHub Actions
  outputToGitHub(result);

  // Exit with non-zero code if quality gate failed
  if (!result.passed) {
    process.exit(1);
  }
}

// Execute script
main().catch((error) => {
  console.error('❌ Error running quality gate:', error);
  process.exit(1);
});
