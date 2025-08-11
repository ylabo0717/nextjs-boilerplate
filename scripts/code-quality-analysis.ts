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
  CODE_QUALITY_THRESHOLDS,
  SCORE_RATINGS,
} from './constants/quality-metrics';

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

  function shouldExclude(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return excludePaths.some((excludePath) => normalizedPath.includes(excludePath));
  }

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
 * Analyze code duplication
 */
function analyzeDuplication(files: string[]): CodeQualityMetrics['duplication'] {
  console.log('🔍 Analyzing code duplication...');

  const contentHashes = new Map<string, string[]>();
  let totalLines = 0;
  let duplicateLines = 0;

  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      totalLines += lines.length;

      // Create hashes of code blocks (simplified)
      for (let i = 0; i < lines.length - 3; i++) {
        const block = lines
          .slice(i, i + 4)
          .join('\n')
          .trim();
        if (block.length > 50) {
          // Only consider meaningful blocks
          const hash = block.replace(/\s+/g, ' ');
          if (!contentHashes.has(hash)) {
            contentHashes.set(hash, []);
          }
          contentHashes.get(hash)!.push(file);
        }
      }
    }
  }

  // Count duplicate blocks
  let blocks = 0;
  for (const [, occurrences] of contentHashes) {
    if (occurrences.length > 1) {
      blocks++;
      duplicateLines += occurrences.length * 4; // Approximate
    }
  }

  const percentage = totalLines > 0 ? (duplicateLines / totalLines) * 100 : 0;

  return {
    percentage: Math.min(100, percentage),
    blocks,
  };
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(metrics: CodeQualityMetrics): number {
  let score = 100;

  // Complexity penalty
  if (metrics.complexity.averageComplexity > COMPLEXITY_LEVELS.GOOD.maxValue) {
    score -= 15;
  } else if (metrics.complexity.averageComplexity > COMPLEXITY_LEVELS.EXCELLENT.maxValue) {
    score -= 5;
  }

  // Maintainability penalty
  if (metrics.maintainability.index < 70) {
    score -= 20;
  } else if (metrics.maintainability.index < CODE_QUALITY_THRESHOLDS.MAINTAINABILITY.GOOD) {
    score -= 10;
  }

  // File size penalty
  if (metrics.fileMetrics.largeFiles.length > 0) {
    score -= Math.min(10, metrics.fileMetrics.largeFiles.length * 2);
  }

  // ESLint issues penalty
  if (metrics.eslintComplexity) {
    const totalIssues =
      metrics.eslintComplexity.cognitiveComplexity +
      metrics.eslintComplexity.duplicateStrings +
      metrics.eslintComplexity.otherIssues;
    if (totalIssues > 0) {
      score -= Math.min(15, totalIssues);
    }
  }

  // Duplication penalty
  if (metrics.duplication && metrics.duplication.percentage > 10) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Display summary
 */
function displaySummary(metrics: CodeQualityMetrics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CODE QUALITY ANALYSIS REPORT');
  console.log('='.repeat(60));

  // Complexity
  console.log('\n🧩 COMPLEXITY METRICS');
  const avgComplexity =
    typeof metrics.complexity.averageComplexity === 'number' &&
    !isNaN(metrics.complexity.averageComplexity)
      ? metrics.complexity.averageComplexity
      : 0;
  const maxComplexity =
    typeof metrics.complexity.maxComplexity === 'number' &&
    isFinite(metrics.complexity.maxComplexity)
      ? metrics.complexity.maxComplexity
      : 0;
  console.log(`  Average Complexity: ${avgComplexity.toFixed(2)}`);
  console.log(`  Maximum Complexity: ${maxComplexity}`);
  if (metrics.complexity.highComplexityFiles && metrics.complexity.highComplexityFiles.length > 0) {
    console.log('  High Complexity Files:');
    metrics.complexity.highComplexityFiles.slice(0, 5).forEach((f) => {
      console.log(`    - ${f.file}: ${f.complexity || 0}`);
    });
  }

  // Maintainability
  console.log('\n🏗️  MAINTAINABILITY');
  const maintIndex =
    typeof metrics.maintainability.index === 'number' ? metrics.maintainability.index : 0;
  console.log(`  Index: ${maintIndex.toFixed(1)}/100`);
  console.log(`  Rating: ${metrics.maintainability.rating || 'N/A'}`);
  if (
    metrics.maintainability.lowMaintainabilityFiles &&
    metrics.maintainability.lowMaintainabilityFiles.length > 0
  ) {
    console.log('  Files Needing Attention:');
    metrics.maintainability.lowMaintainabilityFiles.slice(0, 3).forEach((f) => {
      console.log(`    - ${f.file}: ${(f.maintainability || 0).toFixed(1)}`);
    });
  }

  // File Metrics
  console.log('\n📁 FILE METRICS');
  console.log(`  Total Files: ${metrics.fileMetrics.totalFiles || 0}`);
  const avgLines =
    typeof metrics.fileMetrics.avgLinesPerFile === 'number' &&
    !isNaN(metrics.fileMetrics.avgLinesPerFile)
      ? metrics.fileMetrics.avgLinesPerFile
      : 0;
  console.log(`  Avg Lines/File: ${avgLines.toFixed(0)}`);
  console.log(`  Max Lines/File: ${metrics.fileMetrics.maxLinesPerFile || 0}`);
  if (metrics.fileMetrics.largeFiles && metrics.fileMetrics.largeFiles.length > 0) {
    console.log(`  Large Files (>300 lines): ${metrics.fileMetrics.largeFiles.length}`);
  }

  // ESLint Complexity
  if (metrics.eslintComplexity) {
    console.log('\n⚠️  ESLINT COMPLEXITY ISSUES');
    console.log(`  Cognitive Complexity: ${metrics.eslintComplexity.cognitiveComplexity}`);
    console.log(`  Duplicate Strings: ${metrics.eslintComplexity.duplicateStrings}`);
    console.log(`  Other Issues: ${metrics.eslintComplexity.otherIssues}`);
  }

  // Duplication
  if (metrics.duplication) {
    console.log('\n🔄 CODE DUPLICATION');
    const dupPercentage =
      typeof metrics.duplication.percentage === 'number' ? metrics.duplication.percentage : 0;
    console.log(`  Estimated: ${dupPercentage.toFixed(1)}%`);
    console.log(`  Blocks: ${metrics.duplication.blocks || 0}`);
  }

  console.log('\n' + '='.repeat(60));

  // Overall health
  const healthScore = calculateHealthScore(metrics);
  console.log(`\n🎯 OVERALL HEALTH SCORE: ${healthScore}/100`);

  if (healthScore >= 80) {
    console.log('✅ Excellent code quality!');
  } else if (healthScore >= 60) {
    console.log('⚠️  Good quality with room for improvement');
  } else if (healthScore >= 40) {
    console.log('🟠 Significant improvements recommended');
  } else {
    console.log('🔴 Code quality needs immediate attention');
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting code quality analysis...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const excludeShadcnUI = args.includes('--exclude-shadcn-ui');

  if (excludeShadcnUI) {
    console.log('📝 Excluding shadcn/ui components from analysis\n');
  }

  // Analyze source files
  const { files, fileMetrics } = analyzeSourceFiles({
    includeShadcnUI: !excludeShadcnUI,
  });

  // Run ESLint complexity analysis
  const eslintComplexity = runESLintComplexityAnalysis(files);

  // Calculate complexity metrics using ESLintCC
  const complexity = await calculateComplexityWithESLintCC(files);

  // Calculate maintainability
  const maintainability = calculateMaintainabilityMetrics(
    complexity,
    fileMetrics,
    eslintComplexity
  );

  // Analyze duplication
  const duplication = analyzeDuplication(files);

  // Build metrics object
  const metrics: CodeQualityMetrics = {
    timestamp: new Date().toISOString(),
    complexity,
    maintainability,
    fileMetrics,
    eslintComplexity,
    duplication,
  };

  // Save metrics
  const metricsDir = path.join(process.cwd(), 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const filename = `code-quality-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const filepath = path.join(metricsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));

  // Also save as latest
  const latestPath = path.join(metricsDir, 'code-quality-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));

  console.log(`✅ Metrics saved to ${filepath}`);

  // Display summary
  displaySummary(metrics);

  // Return exit code based on health score
  const healthScore = calculateHealthScore(metrics);
  if (healthScore < 40) {
    process.exit(1);
  }
}

/**
 * Export function for use in other scripts (async version)
 */
export async function analyzeCodeQualityAsync(
  config: AnalysisConfig = {}
): Promise<CodeQualityMetrics> {
  // Analyze source files
  const { files, fileMetrics } = analyzeSourceFiles(config);

  // Run ESLint complexity analysis
  const eslintComplexity = runESLintComplexityAnalysis(files);

  // Calculate complexity metrics using ESLintCC
  const complexity = await calculateComplexityWithESLintCC(files);
  const maintainability = calculateMaintainabilityMetrics(
    complexity,
    fileMetrics,
    eslintComplexity
  );
  const duplication = analyzeDuplication(files);

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

/**
 * Export function for use in other scripts (sync version - deprecated)
 * @deprecated Use analyzeCodeQualityAsync instead for accurate complexity measurement
 */
export function analyzeCodeQuality(_config: AnalysisConfig = {}): CodeQualityMetrics {
  throw new Error(
    'Synchronous analyzeCodeQuality is no longer supported. ' +
      'Use analyzeCodeQualityAsync for accurate complexity measurement with ESLintCC.'
  );
}

// Execute script only if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error running code quality analysis:', error);
    process.exit(1);
  });
}

export { calculateHealthScore };
