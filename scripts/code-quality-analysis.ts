#!/usr/bin/env tsx

/**
 * Advanced code quality analysis script
 * Uses ESLintCC for accurate complexity measurement
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { Complexity } from 'eslintcc';
import {
  ESLINTCC_RANKS,
  ESLINT_COMPLEXITY_RULES,
  COMPLEXITY_LEVELS,
  SCORE_RATINGS,
} from './constants/quality-metrics';

/**
 * SonarQube quality rating grades based on technical debt ratio.
 * These grades follow the industry-standard SonarQube methodology.
 * @see https://docs.sonarqube.org/latest/user-guide/metric-definitions/
 */
const _SONARQUBE_RATINGS = {
  A: { maxDebtRatio: 0.05, label: 'A', color: '🟢' },
  B: { maxDebtRatio: 0.1, label: 'B', color: '🟡' },
  C: { maxDebtRatio: 0.2, label: 'C', color: '🟠' },
  D: { maxDebtRatio: 0.5, label: 'D', color: '🔴' },
  E: { maxDebtRatio: Infinity, label: 'E', color: '⚫' },
} as const;

/**
 * Default remediation costs in minutes based on SonarQube standards.
 * These values represent the estimated time needed to fix various code issues.
 */
const _REMEDIATION_COSTS = {
  /** Minutes required to fix each point of complexity exceeding threshold */
  COMPLEXITY_PER_POINT: 30,
  /** Minutes required to fix each duplicated code block */
  DUPLICATION_PER_BLOCK: 120,
  /** Minutes required to add tests for each 1% of missing coverage */
  COVERAGE_PER_PERCENT: 10,
  /** Minutes required to refactor each large file */
  LARGE_FILE: 60,
  /** Minutes required to improve each file with low maintainability */
  LOW_MAINTAINABILITY: 90,
} as const;

/**
 * SonarQube quality gate thresholds.
 * These are the standard thresholds used to determine if code meets quality standards.
 */
const _QUALITY_GATE_THRESHOLDS = {
  /** Maximum acceptable cyclomatic complexity per function */
  COMPLEXITY: 10,
  /** Maximum acceptable cognitive complexity per function */
  COGNITIVE_COMPLEXITY: 15,
  /** Maximum acceptable code duplication percentage */
  DUPLICATION: 3,
  /** Minimum required test coverage percentage */
  COVERAGE: 80,
  /** Maximum acceptable lines per file */
  FILE_LINES: 500,
  /** Maximum acceptable lines per function */
  FUNCTION_LINES: 50,
} as const;

/**
 * Technical debt information calculated based on SonarQube methodology.
 * Technical debt represents the effort required to fix all code issues.
 */
interface _TechnicalDebt {
  /** Total remediation time in minutes */
  totalMinutes: number;
  /** Technical debt breakdown by category */
  byCategory: {
    complexity: number;
    duplication: number;
    coverage: number;
    fileSize: number;
    maintainability: number;
  };
  /** Estimated development cost in minutes */
  developmentCost: number;
  /** Technical debt ratio (remediation cost / development cost) */
  debtRatio: number;
  /** Overall quality rating (A-E) */
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
}

/**
 * Code quality metrics
 */
interface CodeQualityMetrics {
  /** Timestamp of the analysis */
  timestamp: string;
  /** Complexity metrics */
  complexity: {
    /** Files with high complexity */
    highComplexityFiles: Array<{
      file: string;
      complexity: number;
      functions: number;
    }>;
    /** Average complexity across all files */
    averageComplexity: number;
    /** Maximum complexity found */
    maxComplexity: number;
  };
  /** Maintainability metrics */
  maintainability: {
    /** Maintainability index (0-100) */
    index: number;
    /** Letter rating (A-F) */
    rating: 'A' | 'B' | 'C' | 'D' | 'F';
    /** Files with low maintainability */
    lowMaintainabilityFiles: Array<{
      file: string;
      maintainability: number;
    }>;
  };
  /** File metrics */
  fileMetrics: {
    /** Total number of files analyzed */
    totalFiles: number;
    /** Average lines per file */
    avgLinesPerFile: number;
    /** Maximum lines in a single file */
    maxLinesPerFile: number;
    /** Files exceeding 300 lines */
    largeFiles: string[];
  };
  /** ESLint complexity issues */
  eslintComplexity?: {
    /** Cognitive complexity warnings */
    cognitiveComplexity: number;
    /** Duplicate string warnings */
    duplicateStrings: number;
    /** Other complexity-related issues */
    otherIssues: number;
  };
  /** Code duplication metrics */
  duplication?: {
    /** Estimated duplication percentage */
    percentage: number;
    /** Number of duplicate blocks */
    blocks: number;
  };
  /** Test coverage percentage */
  coverage?: number;
}

/**
 * Configuration for analysis
 */
interface AnalysisConfig {
  /** Paths to exclude from analysis */
  excludePaths?: string[];
  /** Whether to include shadcn/ui components */
  includeShadcnUI?: boolean;
}

/**
 * Analyze files in the source directory
 */
function analyzeSourceFiles(config: AnalysisConfig = {}): {
  files: string[];
  fileMetrics: CodeQualityMetrics['fileMetrics'];
} {
  const srcDir = path.join(process.cwd(), 'src');
  const files: string[] = [];
  const lineCounts: number[] = [];
  const largeFiles: string[] = [];

  // Default excludes plus user-provided excludes
  const excludePaths = [
    ...(config.includeShadcnUI === false ? ['src/components/ui/'] : []),
    ...(config.excludePaths || []),
  ];

  /**
   * Determine whether a path should be excluded from analysis.
   * @param filePath - File path relative to project root
   * @returns true when the path matches any exclude pattern
   */
  function shouldExclude(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return excludePaths.some((excludePath) => normalizedPath.includes(excludePath));
  }

  /**
   * Recursively walk a directory and collect candidate source files.
   * Also records line counts and large files for file metrics.
   * @param dir - Absolute directory path to traverse
   */
  function walkDir(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        const relativePath = path.relative(process.cwd(), fullPath);

        // Skip excluded paths
        if (shouldExclude(relativePath)) {
          continue;
        }

        files.push(relativePath);

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        lineCounts.push(lines);

        if (lines > 300) {
          largeFiles.push(relativePath);
        }
      }
    }
  }

  if (fs.existsSync(srcDir)) {
    walkDir(srcDir);
  }

  const totalFiles = files.length;
  const avgLinesPerFile = totalFiles > 0 ? lineCounts.reduce((a, b) => a + b, 0) / totalFiles : 0;
  const maxLinesPerFile = totalFiles > 0 ? Math.max(...lineCounts) : 0;

  return {
    files,
    fileMetrics: {
      totalFiles,
      avgLinesPerFile,
      maxLinesPerFile,
      largeFiles,
    },
  };
}

/**
 * Run ESLint complexity analysis
 */
function runESLintComplexityAnalysis(files: string[]): CodeQualityMetrics['eslintComplexity'] {
  if (files.length === 0) {
    return {
      cognitiveComplexity: 0,
      duplicateStrings: 0,
      otherIssues: 0,
    };
  }

  console.log('🔍 Running ESLint complexity checks...');

  try {
    // Run ESLint with JSON output format
    const result = execSync(`pnpm eslint ${files.join(' ')} --format json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const reports = JSON.parse(result);
    let cognitiveComplexity = 0;
    let duplicateStrings = 0;
    let otherIssues = 0;

    for (const report of reports) {
      for (const message of report.messages || []) {
        if (message.ruleId === 'sonarjs/cognitive-complexity') {
          cognitiveComplexity++;
        } else if (message.ruleId === 'sonarjs/no-duplicate-string') {
          duplicateStrings++;
        } else if (message.ruleId && message.ruleId.includes('sonarjs')) {
          otherIssues++;
        }
      }
    }

    return {
      cognitiveComplexity,
      duplicateStrings,
      otherIssues,
    };
  } catch (error: unknown) {
    // ESLint exits with non-zero code if there are any issues
    const output = (error as { stdout?: Buffer | string }).stdout?.toString() || '[]';
    try {
      const reports = JSON.parse(output);
      let cognitiveComplexity = 0;
      let duplicateStrings = 0;
      let otherIssues = 0;

      for (const report of reports) {
        for (const message of report.messages || []) {
          if (message.ruleId === 'sonarjs/cognitive-complexity') {
            cognitiveComplexity++;
          } else if (message.ruleId === 'sonarjs/no-duplicate-string') {
            duplicateStrings++;
          } else if (message.ruleId && message.ruleId.includes('sonarjs')) {
            otherIssues++;
          }
        }
      }

      return {
        cognitiveComplexity,
        duplicateStrings,
        otherIssues,
      };
    } catch {
      return {
        cognitiveComplexity: 0,
        duplicateStrings: 0,
        otherIssues: 0,
      };
    }
  }
}

/**
 * Calculate complexity metrics using ESLintCC
 */
async function calculateComplexityWithESLintCC(
  files: string[]
): Promise<CodeQualityMetrics['complexity']> {
  if (files.length === 0) {
    return {
      highComplexityFiles: [],
      averageComplexity: 0,
      maxComplexity: 0,
    };
  }

  console.log('🔍 Analyzing complexity with ESLintCC...');

  try {
    // Configure ESLintCC with TypeScript support
    const complexity = new Complexity({
      rules: 'logic', // Focus on complexity-related rules
      ranks: ESLINTCC_RANKS,
      eslintOptions: {
        useEslintrc: false,
        overrideConfig: {
          parser: '@typescript-eslint/parser',
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ecmaFeatures: {
              jsx: true,
            },
            project: false, // Disable type checking for performance
          },
          plugins: ['@typescript-eslint'],
          rules: ESLINT_COMPLEXITY_RULES,
        },
      },
    });

    // Analyze files
    const report = await complexity.lintFiles(files);

    const allFiles: Array<{ file: string; complexity: number; functions: number }> = [];

    // Process each file's report
    for (const fileReport of report.files) {
      let maxFileComplexity = 0;
      let functionCount = 0;

      // Find the maximum complexity in the file
      for (const message of fileReport.messages || []) {
        if (message.rules && message.rules.complexity) {
          const complexityValue = message.rules.complexity.value;
          if (complexityValue > maxFileComplexity) {
            maxFileComplexity = complexityValue;
          }
          functionCount++;
        }
      }

      // If no complexity found, calculate a basic metric
      if (maxFileComplexity === 0 && fs.existsSync(fileReport.file)) {
        const content = fs.readFileSync(fileReport.file, 'utf-8');
        const lines = content.split('\n').length;
        // Minimal complexity for small files
        maxFileComplexity = Math.max(1, Math.floor(lines / 100));
      }

      allFiles.push({
        file: path.relative(process.cwd(), fileReport.file),
        complexity: maxFileComplexity,
        functions: functionCount,
      });
    }

    // Sort by complexity (descending)
    allFiles.sort((a, b) => b.complexity - a.complexity);

    const complexityScores = allFiles.map((f) => f.complexity);
    const averageComplexity =
      complexityScores.length > 0
        ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length
        : 0;

    const maxComplexity = complexityScores.length > 0 ? Math.max(...complexityScores) : 0;

    return {
      highComplexityFiles: allFiles,
      averageComplexity,
      maxComplexity,
    };
  } catch (error) {
    console.error('❌ ESLintCC analysis failed:', error);
    throw new Error('Failed to analyze code complexity with ESLintCC');
  }
}

/**
 * Calculate maintainability metrics
 */
function calculateMaintainabilityMetrics(
  complexity: CodeQualityMetrics['complexity'],
  fileMetrics: CodeQualityMetrics['fileMetrics'],
  eslintComplexity?: CodeQualityMetrics['eslintComplexity']
): CodeQualityMetrics['maintainability'] {
  // Calculate maintainability index (simplified version)
  // Based on: Halstead Volume, Cyclomatic Complexity, Lines of Code

  let index = 100;

  // Penalty for high complexity
  if (complexity.averageComplexity > COMPLEXITY_LEVELS.EXCELLENT.maxValue) {
    index -= Math.min(20, complexity.averageComplexity * 2);
  }

  // Penalty for large files
  if (fileMetrics.avgLinesPerFile > 200) {
    index -= 10;
  }

  // Penalty for ESLint issues
  if (eslintComplexity) {
    const totalIssues =
      eslintComplexity.cognitiveComplexity +
      eslintComplexity.duplicateStrings +
      eslintComplexity.otherIssues;
    index -= Math.min(20, totalIssues);
  }

  index = Math.max(0, Math.min(100, index));

  // Determine rating
  let rating: 'A' | 'B' | 'C' | 'D' | 'F';
  if (index >= SCORE_RATINGS.A) rating = 'A';
  else if (index >= SCORE_RATINGS.B) rating = 'B';
  else if (index >= SCORE_RATINGS.C) rating = 'C';
  else if (index >= SCORE_RATINGS.D) rating = 'D';
  else rating = 'F';

  // Find low maintainability files
  const lowMaintainabilityFiles = complexity.highComplexityFiles
    .filter((f) => f.complexity > COMPLEXITY_LEVELS.FAIR.maxValue)
    .map((f) => ({
      file: f.file,
      maintainability: Math.max(0, 100 - f.complexity * 5),
    }));

  return {
    index,
    rating,
    lowMaintainabilityFiles,
  };
}

/**
 * Analyze code duplication using jscpd
 * Uses industry-standard token-based detection for accurate duplicate identification
 */
async function analyzeDuplication(files: string[]): Promise<CodeQualityMetrics['duplication']> {
  console.log('🔍 Analyzing code duplication with jscpd...');

  if (files.length === 0) {
    return {
      percentage: 0,
      blocks: 0,
    };
  }

  try {
    // Run jscpd via CLI for better control
    execSync('pnpm jscpd . --silent --reporters json --output ./metrics', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch {
    // jscpd exits with non-zero if duplicates found, but that's ok
  }

  // Parse the metrics file
  try {
    const metricsPath = path.join(process.cwd(), 'metrics', 'jscpd-report.json');
    if (fs.existsSync(metricsPath)) {
      const report = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      const percentage = report.statistics?.total?.percentage || 0;
      const blocks = report.duplicates?.length || 0;
      return {
        percentage: Number(percentage.toFixed(2)),
        blocks,
      };
    }
  } catch (error) {
    console.error('⚠️ Failed to parse jscpd report:', error);
  }

  return {
    percentage: 0,
    blocks: 0,
  };
}

/**
 * Export function for use in other scripts (async version)
 */
export async function analyzeCodeQualityAsync(
  config: AnalysisConfig = {}
): Promise<CodeQualityMetrics> {
  // Analyze all source files
  const { files, fileMetrics } = analyzeSourceFiles(config);

  // Run ESLint to find complexity-related issues
  const eslintComplexity = runESLintComplexityAnalysis(files);

  // Calculate detailed complexity metrics with ESLintCC
  const complexity = await calculateComplexityWithESLintCC(files);
  const maintainability = calculateMaintainabilityMetrics(
    complexity,
    fileMetrics,
    eslintComplexity
  );
  const duplication = await analyzeDuplication(files);

  const metrics: CodeQualityMetrics = {
    timestamp: new Date().toISOString(),
    complexity,
    maintainability,
    fileMetrics,
    eslintComplexity,
    duplication,
  };

  return metrics;
}
