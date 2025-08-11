#!/usr/bin/env tsx

/**
 * Metrics measurement script for build performance monitoring
 * Measures build time, test execution time, bundle size, and other performance metrics
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TIME_UNITS } from './constants/quality-metrics';

/**
 * Route information from Next.js build output
 */
interface RouteInfo {
  /** Route path */
  route: string;
  /** Page-specific size */
  size: string;
  /** First Load JS size */
  firstLoadJS: string;
}

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
    /** First Load JS metrics */
    firstLoadJS?: {
      /** Maximum First Load JS across all routes in KB */
      max: number;
      /** Route with the maximum First Load JS */
      maxRoute: string;
      /** All routes with their First Load JS sizes */
      routes: RouteInfo[];
    };
  };
  /** ISO timestamp when metrics were collected */
  timestamp: string;
}

/**
 * Measures the execution time of a command
 * @param command - The command to execute
 * @returns Execution time in milliseconds
 * @throws Error if command execution fails
 */
function measureExecutionTime(command: string): number {
  const startTime = Date.now();
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
  return Date.now() - startTime;
}

/**
 * Parses First Load JS from Next.js build output
 * @param buildOutput - The build output string
 * @returns Parsed route information
 */
function parseFirstLoadJS(buildOutput: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const lines = buildOutput.split('\n');

  // Find the routes section in the build output
  let inRoutesSection = false;
  for (const line of lines) {
    if (line.includes('Route (')) {
      inRoutesSection = true;
      continue;
    }

    if (inRoutesSection) {
      // Parse route lines - handle various formats with multiple spaces
      // Example: "┌ ○ /                                    5.44 kB         105 kB"
      const routeMatch = line.match(/[├└┌]\s+[○●λ]\s+(\/\S*)\s+(\S+\s+\S+)\s+(\S+\s+\S+)/);
      if (routeMatch) {
        routes.push({
          route: routeMatch[1],
          size: routeMatch[2],
          firstLoadJS: routeMatch[3],
        });
      }

      // Stop parsing after the routes section
      if (
        line.includes('+ First Load JS shared by all') ||
        line.includes('First Load JS shared by all')
      ) {
        break;
      }
    }
  }

  return routes;
}

/**
 * Converts size string (e.g., "105 kB") to number in KB
 * @param sizeStr - Size string from build output
 * @returns Size in KB
 */
function parseSizeToKB(sizeStr: string): number {
  // Limit input length for safety
  if (sizeStr.length > 20) return 0;

  // Safe regex with limited input - only parsing Next.js build output
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = sizeStr.match(/^(\d{1,6}(?:\.\d{1,2})?)\s*(kB|KB|MB|B)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'B':
      return value / 1024;
    case 'KB':
    case 'KB':
      return value;
    case 'MB':
      return value * 1024;
    default:
      return value;
  }
}

/**
 * First Load JS metrics structure
 */
interface FirstLoadJSMetrics {
  /** Maximum First Load JS in KB */
  max: number;
  /** Route with maximum First Load JS */
  maxRoute: string;
  /** All routes with their sizes */
  routes: RouteInfo[];
}

/**
 * Measures the build time and extracts First Load JS metrics
 * @returns Object containing build time and First Load JS metrics
 */
function measureBuildTime(): { buildTime: number; firstLoadJS?: FirstLoadJSMetrics } {
  console.log('📊 Measuring build time...');

  const startTime = Date.now();
  let buildOutput = '';

  try {
    // Capture build output for parsing - both stdout and stderr as Next.js outputs to stderr
    buildOutput = execSync('pnpm build 2>&1', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log(buildOutput);
  } catch (error) {
    // Even on error, we might have useful output
    const execError = error as { stdout?: string; message?: string };
    if (execError.stdout) {
      buildOutput = execError.stdout;
      console.log(buildOutput);
    }
    console.error('Error executing build command:', execError.message);
    throw error;
  }

  const buildTime = Date.now() - startTime;

  // Parse First Load JS from build output
  const routes = parseFirstLoadJS(buildOutput);

  if (routes.length > 0) {
    // Find the maximum First Load JS
    let maxSize = 0;
    let maxRoute = '';

    for (const route of routes) {
      const size = parseSizeToKB(route.firstLoadJS);
      if (size > maxSize) {
        maxSize = size;
        maxRoute = route.route;
      }
    }

    return {
      buildTime,
      firstLoadJS: {
        max: maxSize,
        maxRoute,
        routes,
      },
    };
  }

  return { buildTime };
}

/**
 * Measures the test execution time
 * @returns Test execution time in milliseconds
 */
function measureTestTime(): number {
  console.log('📊 Measuring test execution time...');
  return measureExecutionTime('pnpm test');
}

/**
 * Measures the bundle size by analyzing the .next directory
 * @returns Object containing total, JavaScript, and CSS sizes in bytes
 * @throws Error if build directory is not found
 */
function measureBundleSize(): { total: number; javascript: number; css: number } {
  console.log('📊 Measuring bundle size...');

  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    throw new Error('Build directory not found. Run build first.');
  }

  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;

  /**
   * Recursively walks through directory to calculate file sizes
   * @param dir - Directory path to walk through
   */
  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (stat.isFile()) {
        const size = stat.size;
        totalSize += size;

        if (file.endsWith('.js') || file.endsWith('.mjs')) {
          jsSize += size;
        } else if (file.endsWith('.css')) {
          cssSize += size;
        }
      }
    }
  }

  walkDir(nextDir);

  return {
    total: totalSize,
    javascript: jsSize,
    css: cssSize,
  };
}

/**
 * Saves metrics to JSON files
 * @param metrics - The metrics object to save
 * @returns The saved metrics object
 */
function saveMetrics(metrics: Metrics) {
  const metricsDir = path.join(process.cwd(), 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `metrics-${timestamp}.json`;
  const filePath = path.join(metricsDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
  console.log(`✅ Metrics saved to ${filePath}`);

  // 最新のメトリクスも保存
  const latestPath = path.join(metricsDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));

  return metrics;
}

/**
 * Outputs metrics to GitHub Actions for use in workflows
 * @param metrics - The metrics object to output
 */
function outputToGitHub(metrics: Metrics) {
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `build_time=${metrics.buildTime || 0}`,
      `test_time=${metrics.testTime || 0}`,
      `bundle_size_total=${metrics.bundleSize?.total || 0}`,
      `bundle_size_js=${metrics.bundleSize?.javascript || 0}`,
      `bundle_size_css=${metrics.bundleSize?.css || 0}`,
      `first_load_js_max=${metrics.bundleSize?.firstLoadJS?.max || 0}`,
      `first_load_js_route=${metrics.bundleSize?.firstLoadJS?.maxRoute || 'unknown'}`,
    ].join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
    console.log('✅ Metrics output to GitHub Actions');
  }
}

/**
 * Displays a formatted summary of the collected metrics
 * @param metrics - The metrics object to display
 */
function displaySummary(metrics: Metrics) {
  console.log('\n📊 === Metrics Summary ===');

  if (metrics.buildTime) {
    const buildMinutes = Math.floor(metrics.buildTime / TIME_UNITS.MS_PER_MINUTE);
    const buildSeconds = (
      (metrics.buildTime % TIME_UNITS.MS_PER_MINUTE) /
      TIME_UNITS.MS_PER_SECOND
    ).toFixed(1);
    console.log(`⏱️  Build Time: ${buildMinutes}m ${buildSeconds}s`);
  }

  if (metrics.testTime) {
    const testMinutes = Math.floor(metrics.testTime / TIME_UNITS.MS_PER_MINUTE);
    const testSeconds = (
      (metrics.testTime % TIME_UNITS.MS_PER_MINUTE) /
      TIME_UNITS.MS_PER_SECOND
    ).toFixed(1);
    console.log(`🧪 Test Time: ${testMinutes}m ${testSeconds}s`);
  }

  if (metrics.bundleSize) {
    console.log(`📦 Bundle Size:`);
    console.log(`   Total: ${(metrics.bundleSize.total / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   JavaScript: ${(metrics.bundleSize.javascript / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   CSS: ${(metrics.bundleSize.css / 1024 / 1024).toFixed(2)} MB`);

    if (metrics.bundleSize.firstLoadJS) {
      console.log(`\n📊 First Load JS:`);
      console.log(`   Maximum: ${metrics.bundleSize.firstLoadJS.max.toFixed(1)} KB`);
      console.log(`   Route: ${metrics.bundleSize.firstLoadJS.maxRoute}`);
      console.log(`\n   All Routes:`);
      for (const route of metrics.bundleSize.firstLoadJS.routes) {
        console.log(`     ${route.route}: ${route.firstLoadJS}`);
      }
    }
  }

  console.log('========================\n');
}

/**
 * Main function that orchestrates metric collection
 * Accepts command line arguments:
 * - --build: Measure only build time
 * - --test: Measure only test time
 * - --bundle: Measure only bundle size
 * - No args: Measure all metrics
 */
async function main() {
  const args = process.argv.slice(2);
  const measureAll = args.length === 0;

  const metrics: Metrics = {
    timestamp: new Date().toISOString(),
  };

  try {
    let firstLoadJS: FirstLoadJSMetrics | undefined;

    if (measureAll || args.includes('--build')) {
      const buildResult = measureBuildTime();
      metrics.buildTime = buildResult.buildTime;
      firstLoadJS = buildResult.firstLoadJS;
    }

    if (measureAll || args.includes('--test')) {
      metrics.testTime = measureTestTime();
    }

    if (measureAll || args.includes('--bundle')) {
      if (!fs.existsSync('.next')) {
        console.log('Building project first...');
        const buildResult = measureBuildTime();
        metrics.buildTime = buildResult.buildTime;
        firstLoadJS = buildResult.firstLoadJS;
      }
      metrics.bundleSize = measureBundleSize();

      // Add First Load JS metrics to bundle size
      if (firstLoadJS) {
        metrics.bundleSize.firstLoadJS = firstLoadJS;
      }
    }

    saveMetrics(metrics);
    outputToGitHub(metrics);
    displaySummary(metrics);
  } catch (error) {
    console.error('❌ Error measuring metrics:', error);
    process.exit(1);
  }
}

// Execute script
main().catch(console.error);
