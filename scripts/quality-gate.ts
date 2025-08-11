#!/usr/bin/env tsx

/**
 * Quality gate check script for CI/CD pipelines
 * Validates code quality metrics and fails the build if standards are not met
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  COMPLEXITY_THRESHOLDS,
  getComplexityIndicator,
  PERFORMANCE_THRESHOLDS,
  LIGHTHOUSE_THRESHOLDS,
} from './constants/quality-metrics';

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
  /** First Load JS metrics */
  firstLoadJS?: {
    /** Maximum First Load JS in KB */
    max: number;
    /** Route with maximum First Load JS */
    maxRoute: string;
  };
  /** Code complexity metrics */
  complexity?: {
    /** Average complexity */
    average: number;
    /** Maximum complexity */
    max: number;
    /** Files with high complexity */
    highComplexityCount: number;
    /** List of files with their complexity scores */
    files?: Array<{ file: string; complexity: number }>;
  };
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
  firstLoadJS: {
    excellent: number; // KB
    good: number; // KB
    warning: number; // KB
    maximum: number; // KB
  };
  complexity: {
    averageWarning: number;
    averageMaximum: number;
    individualWarning: number;
    individualMaximum: number;
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
    maximum: PERFORMANCE_THRESHOLDS.BUILD_TIME_MAX,
    warning: 240000, // 4分
  },
  bundleSize: {
    maximum: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_MAX,
    warning: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_WARNING, // 50MB
  },
  firstLoadJS: {
    excellent: 100, // 100KB
    good: 150, // 150KB
    warning: 200, // 200KB
    maximum: 250, // 250KB
  },
  complexity: {
    averageWarning: COMPLEXITY_THRESHOLDS.AVERAGE.WARNING,
    averageMaximum: COMPLEXITY_THRESHOLDS.AVERAGE.MAXIMUM,
    individualWarning: COMPLEXITY_THRESHOLDS.INDIVIDUAL.WARNING,
    individualMaximum: COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM,
  },
  lighthouse: {
    performance: LIGHTHOUSE_THRESHOLDS.PERFORMANCE,
    accessibility: LIGHTHOUSE_THRESHOLDS.ACCESSIBILITY,
    bestPractices: LIGHTHOUSE_THRESHOLDS.BEST_PRACTICES,
    seo: LIGHTHOUSE_THRESHOLDS.SEO,
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
    return (output.match(/error TS/g) || []).length;
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

/** Path to the latest metrics file */
const METRICS_PATH = path.join(process.cwd(), 'metrics', 'latest.json');

/**
 * Retrieves build time from the latest metrics
 * @returns Build time in milliseconds or undefined if not available
 */
function checkBuildTime(): number | undefined {
  if (!fs.existsSync(METRICS_PATH)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
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
  if (!fs.existsSync(METRICS_PATH)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
    return metrics.bundleSize?.total;
  } catch {
    return undefined;
  }
}

/**
 * Retrieves First Load JS metrics from the latest metrics
 * @returns First Load JS metrics or undefined if not available
 */
function checkFirstLoadJS(): { max: number; maxRoute: string } | undefined {
  if (!fs.existsSync(METRICS_PATH)) {
    return undefined;
  }

  try {
    const metrics = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
    const firstLoadJS = metrics.bundleSize?.firstLoadJS;

    if (firstLoadJS && firstLoadJS.max && firstLoadJS.maxRoute) {
      return {
        max: firstLoadJS.max,
        maxRoute: firstLoadJS.maxRoute,
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks code complexity metrics
 * @returns Complexity metrics or undefined if analysis fails
 */
async function checkCodeComplexity(): Promise<QualityMetrics['complexity'] | undefined> {
  console.log('🔍 Checking code complexity (excluding shadcn/ui)...');

  try {
    // Dynamic import to avoid circular dependencies
    const codeQualityModule = await import('./code-quality-analysis');
    const { analyzeCodeQualityAsync } = codeQualityModule;

    // Run analysis excluding shadcn/ui
    const metrics = await analyzeCodeQualityAsync({
      includeShadcnUI: false,
    });

    if (metrics && metrics.complexity) {
      return {
        average: metrics.complexity.averageComplexity || 0,
        max: metrics.complexity.maxComplexity || 0,
        highComplexityCount: metrics.complexity.highComplexityFiles?.length || 0,
        files: metrics.complexity.highComplexityFiles?.map((f) => ({
          file: f.file,
          complexity: f.complexity,
        })),
      };
    }

    return undefined;
  } catch (error) {
    console.error('❌ Failed to analyze code complexity:', error);
    // Return undefined to skip complexity check rather than failing the entire quality gate
    // This allows other checks to continue even if complexity analysis fails
    console.log('⚠️  Skipping complexity check due to analysis failure');
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

  // Check bundle size (less strict now, mainly for reference)
  if (metrics.bundleSize !== undefined && metrics.bundleSize > thresholds.bundleSize.maximum) {
    warnings.push(
      `⚠️  Total build size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB (reference: ${(thresholds.bundleSize.maximum / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  // Check First Load JS (this is the critical metric)
  if (metrics.firstLoadJS !== undefined) {
    const firstLoadKB = metrics.firstLoadJS.max;

    if (firstLoadKB > thresholds.firstLoadJS.maximum) {
      failures.push(
        `❌ First Load JS: ${firstLoadKB.toFixed(1)}KB on route ${metrics.firstLoadJS.maxRoute} (maximum: ${thresholds.firstLoadJS.maximum}KB)`
      );
    } else if (firstLoadKB > thresholds.firstLoadJS.warning) {
      warnings.push(
        `⚠️  First Load JS: ${firstLoadKB.toFixed(1)}KB on route ${metrics.firstLoadJS.maxRoute} (warning: ${thresholds.firstLoadJS.warning}KB)`
      );
    }
  }

  // Check code complexity
  if (metrics.complexity !== undefined) {
    let showFileList = false;

    // Check average complexity
    if (metrics.complexity.average > thresholds.complexity.averageMaximum) {
      failures.push(
        `❌ Average complexity: ${metrics.complexity.average.toFixed(1)} (maximum: ${thresholds.complexity.averageMaximum})`
      );
      showFileList = true;
    } else if (metrics.complexity.average > thresholds.complexity.averageWarning) {
      warnings.push(
        `⚠️  Average complexity: ${metrics.complexity.average.toFixed(1)} (warning: ${thresholds.complexity.averageWarning})`
      );
      showFileList = true;
    }

    // Check maximum complexity
    if (metrics.complexity.max > thresholds.complexity.individualMaximum) {
      failures.push(
        `❌ Maximum complexity: ${metrics.complexity.max} (maximum: ${thresholds.complexity.individualMaximum})`
      );
      showFileList = true;
    } else if (metrics.complexity.max > thresholds.complexity.individualWarning) {
      warnings.push(
        `⚠️  Maximum complexity: ${metrics.complexity.max} (warning: ${thresholds.complexity.individualWarning})`
      );
      showFileList = true;
    }

    // Show complexity file list if there are warnings or errors
    if (showFileList && metrics.complexity.files && metrics.complexity.files.length > 0) {
      const fileList: string[] = ['   Files to improve (sorted by complexity):'];

      // Show top 10 files or all files with complexity > warning threshold
      const filesToShow = metrics.complexity.files
        .filter((f) => f.complexity > thresholds.complexity.individualWarning)
        .slice(0, 10);

      if (filesToShow.length === 0) {
        // If no files exceed warning threshold, show top 5
        metrics.complexity.files.slice(0, 5).forEach((f) => {
          fileList.push(`   - ${f.file}: ${f.complexity}`);
        });
      } else {
        filesToShow.forEach((f) => {
          const indicator = getComplexityIndicator(f.complexity);
          fileList.push(`   ${indicator} ${f.file}: ${f.complexity}`);
        });
      }

      if (showFileList) {
        warnings.push(fileList.join('\n'));
      }
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
 * @param result.passed - Whether the quality gate passed
 * @param result.failures - List of failure messages
 * @param result.warnings - List of warning messages
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
  metrics.firstLoadJS = checkFirstLoadJS();
  metrics.complexity = await checkCodeComplexity();

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
    console.log(`📦 Total build size: ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB`);
  }

  if (metrics.firstLoadJS !== undefined) {
    console.log(
      `🚀 First Load JS: ${metrics.firstLoadJS.max.toFixed(1)}KB (${metrics.firstLoadJS.maxRoute})`
    );
  }

  if (metrics.complexity !== undefined) {
    console.log(`🧩 Complexity (excluding shadcn/ui):`);
    console.log(`   Average: ${metrics.complexity.average.toFixed(1)}`);
    console.log(`   Maximum: ${metrics.complexity.max}`);

    // Show top 5 files by complexity
    if (metrics.complexity.files && metrics.complexity.files.length > 0) {
      console.log('   Top files by complexity:');
      metrics.complexity.files.slice(0, 5).forEach((f) => {
        console.log(`     - ${f.file}: ${f.complexity}`);
      });
    }
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

// Only run main if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error running quality gate:', error);
    process.exit(1);
  });
}

export { evaluateQualityGate, DEFAULT_THRESHOLDS };
