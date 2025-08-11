#!/usr/bin/env tsx

/**
 * Advanced code quality analysis script
 * Uses ESLint with complexity plugins to analyze TypeScript code
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

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
 * Analyze files in the source directory
 */
function analyzeSourceFiles(): {
  files: string[];
  fileMetrics: CodeQualityMetrics['fileMetrics'];
} {
  const srcDir = path.join(process.cwd(), 'src');
  const files: string[] = [];
  const lineCounts: number[] = [];
  const largeFiles: string[] = [];

  function walkDir(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        const relativePath = path.relative(process.cwd(), fullPath);
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
 * Calculate complexity metrics from file analysis
 */
function calculateComplexityMetrics(
  files: string[],
  _eslintComplexity: CodeQualityMetrics['eslintComplexity']
): CodeQualityMetrics['complexity'] {
  // Simple heuristic based on file size and ESLint issues
  const complexityScores: number[] = [];
  const highComplexityFiles: Array<{ file: string; complexity: number; functions: number }> = [];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;

      // Count function-like constructs
      const functionMatches =
        content.match(/function\s+\w+|=>\s*{|async\s+\w+|constructor\s*\(/g) || [];
      const functions = functionMatches.length;

      // Simple complexity score based on lines and functions
      const complexity = Math.round(lines / 50 + functions * 2);
      complexityScores.push(complexity);

      if (complexity > 10) {
        highComplexityFiles.push({
          file: path.relative(process.cwd(), file),
          complexity,
          functions,
        });
      }
    }
  }

  const averageComplexity =
    complexityScores.length > 0
      ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length
      : 0;

  const maxComplexity = complexityScores.length > 0 ? Math.max(...complexityScores) : 0;

  return {
    highComplexityFiles: highComplexityFiles
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10),
    averageComplexity,
    maxComplexity,
  };
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
  if (complexity.averageComplexity > 5) {
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
  if (index >= 90) rating = 'A';
  else if (index >= 80) rating = 'B';
  else if (index >= 70) rating = 'C';
  else if (index >= 60) rating = 'D';
  else rating = 'F';

  // Find low maintainability files
  const lowMaintainabilityFiles = complexity.highComplexityFiles
    .filter((f) => f.complexity > 15)
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
  if (metrics.complexity.averageComplexity > 10) {
    score -= 15;
  } else if (metrics.complexity.averageComplexity > 5) {
    score -= 5;
  }

  // Maintainability penalty
  if (metrics.maintainability.index < 70) {
    score -= 20;
  } else if (metrics.maintainability.index < 85) {
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

  // Analyze source files
  const { files, fileMetrics } = analyzeSourceFiles();

  // Run ESLint complexity analysis
  const eslintComplexity = runESLintComplexityAnalysis(files);

  // Calculate complexity metrics
  const complexity = calculateComplexityMetrics(files, eslintComplexity);

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

// Execute script
main().catch((error) => {
  console.error('❌ Error running code quality analysis:', error);
  process.exit(1);
});
