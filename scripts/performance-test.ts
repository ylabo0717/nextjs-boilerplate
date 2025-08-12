/**
 * Performance test script for E2E scheduled workflow
 *
 * SECURITY WARNING: This script is designed for CI environments only.
 * It starts a server process with hardcoded commands to prevent injection attacks.
 * Do not use with untrusted input or in production environments.
 */

import { chromium } from 'playwright';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import * as http from 'node:http';
import { PERFORMANCE_THRESHOLDS, RETRY_CONFIG } from '../tests/constants/test-constants';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Server process variable
 * Will be initialized in the main execution block for proper error handling
 */
let server: ChildProcess | null = null;
// Guard flags to avoid double cleanup/exit
let isCleaningUp = false;
let exitScheduled = false;

/**
 * Run performance tests against the application.
 * Navigates to BASE_URL and collects browser performance timing metrics.
 * Fails the process when thresholds are exceeded.
 */
async function runPerformanceTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start measuring
  await page.goto(BASE_URL);

  // Collect performance metrics
  const metrics = await page.evaluate(() => {
    const perf = window.performance;
    const perfEntries = perf?.getEntriesByType?.('navigation') as
      | PerformanceNavigationTiming[]
      | undefined;

    // Check if navigation performance data is available (and is an Array)
    if (!Array.isArray(perfEntries) || perfEntries.length === 0) {
      // Fallback: legacy Navigation Timing (Level 1)
      const t = perf?.timing;
      // Ensure required legacy timing fields are valid
      if (
        t &&
        typeof t.loadEventEnd === 'number' &&
        t.loadEventEnd > 0 &&
        typeof t.fetchStart === 'number' &&
        t.fetchStart > 0
      ) {
        // Order check: fetchStart should be <= loadEventEnd
        if (t.fetchStart > t.loadEventEnd) {
          console.warn(
            'Invalid legacy timing order: fetchStart is greater than loadEventEnd. Returning safe zeros.'
          );
          return {
            domContentLoaded: 0,
            loadComplete: 0,
            totalTime: 0,
            error: 'Invalid legacy timing order',
          };
        }
        const domContentLoaded = Math.max(
          0,
          (t.domContentLoadedEventEnd ?? 0) - (t.domContentLoadedEventStart ?? 0)
        );
        const loadComplete = Math.max(0, (t.loadEventEnd ?? 0) - (t.loadEventStart ?? 0));
        const totalTime = Math.max(0, (t.loadEventEnd ?? 0) - (t.fetchStart ?? 0));
        return {
          domContentLoaded,
          loadComplete,
          totalTime,
          warning: 'Used legacy performance.timing fallback',
        };
      }

      console.warn('No navigation performance data available');
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        totalTime: 0,
        error: 'No navigation performance data available',
      };
    }

    const perfData = perfEntries[0] as PerformanceNavigationTiming;
    // Ensure required fields on NavigationTiming are valid
    if (
      typeof perfData.loadEventEnd !== 'number' ||
      typeof perfData.fetchStart !== 'number' ||
      perfData.loadEventEnd <= 0 ||
      perfData.fetchStart <= 0
    ) {
      console.warn('Invalid navigation timing numeric values. Returning safe zeros.');
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        totalTime: 0,
        error: 'Invalid navigation timing numeric values',
      };
    }

    if (perfData.fetchStart > perfData.loadEventEnd) {
      console.warn(
        'Invalid navigation timing order: fetchStart is greater than loadEventEnd. Returning safe zeros.'
      );
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        totalTime: 0,
        error: 'Invalid navigation timing order',
      };
    }
    const domContentLoaded = Math.max(
      0,
      (perfData.domContentLoadedEventEnd ?? 0) - (perfData.domContentLoadedEventStart ?? 0)
    );
    const loadComplete = Math.max(0, (perfData.loadEventEnd ?? 0) - (perfData.loadEventStart ?? 0));
    const totalTime = Math.max(0, (perfData.loadEventEnd ?? 0) - (perfData.fetchStart ?? 0));
    return { domContentLoaded, loadComplete, totalTime };
  });

  console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));

  // Check thresholds using centralized constants
  const MAX_TOTAL_TIME = PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME;
  const MAX_DOM_CONTENT_LOADED = PERFORMANCE_THRESHOLDS.DOM_CONTENT_LOADED_TIME;

  const failed = [];
  if (metrics.totalTime > MAX_TOTAL_TIME) {
    failed.push(`Total load time (${metrics.totalTime}ms) exceeds threshold (${MAX_TOTAL_TIME}ms)`);
  }
  if (metrics.domContentLoaded > MAX_DOM_CONTENT_LOADED) {
    failed.push(
      `DOM content loaded time (${metrics.domContentLoaded}ms) exceeds threshold (${MAX_DOM_CONTENT_LOADED}ms)`
    );
  }

  await browser.close();

  if (failed.length > 0) {
    console.error('Performance thresholds exceeded:');
    failed.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('✅ All performance checks passed');
}

/**
 * Wait for server to be ready by polling the endpoint.
 * @param url - Health-check URL to poll (e.g., http://localhost:3000)
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param intervalMs - Polling interval in milliseconds
 * @returns Promise that resolves when server returns 200 OK, rejects on timeout
 */
function waitForServerReady(
  url: string,
  timeoutMs = RETRY_CONFIG.SERVER_READY_TIMEOUT,
  intervalMs = RETRY_CONFIG.SERVER_POLLING_INTERVAL
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          resolve();
        } else {
          res.resume();
          retry();
        }
      });
      req.on('error', retry);
      function retry() {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Server did not become ready in time'));
        } else {
          setTimeout(check, intervalMs);
        }
      }
    }
    check();
  });
}

/**
 * Check if a command exists in the system PATH (cross-platform).
 * @param command - Command name, e.g., "pnpm" | "npm" | "yarn"
 * @returns true if found in PATH, otherwise false
 */
function commandExists(command: string): boolean {
  try {
    const isWindows = process.platform === 'win32';
    const checkCommand = isWindows ? `where ${command}` : `which ${command}`;
    execSync(checkCommand, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start the server process using the available package manager.
 * Uses spawn with shell=false for safety, sets NODE_ENV=test.
 * @returns ChildProcess handle for the started server
 */
function startServer(): ChildProcess {
  console.log('Starting server process...');

  // Determine which package manager to use
  let packageManager = 'pnpm';
  let startCommand = ['start:test'];

  if (!commandExists('pnpm')) {
    console.warn('pnpm not found, checking for alternatives...');

    if (commandExists('npm')) {
      packageManager = 'npm';
      startCommand = ['run', 'start:test'];
      console.log('Using npm as fallback package manager');
    } else if (commandExists('yarn')) {
      packageManager = 'yarn';
      startCommand = ['start:test'];
      console.log('Using yarn as fallback package manager');
    } else {
      throw new Error('No package manager found (pnpm, npm, or yarn). Please install one of them.');
    }
  }

  console.log(`Starting server with ${packageManager}...`);

  // Use spawn instead of exec for better security and control
  server = spawn(packageManager, startCommand, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false, // Disable shell to prevent command injection
    env: { ...process.env, NODE_ENV: 'test' },
  });

  // Capture server output for debugging
  if (server.stdout) {
    server.stdout.on('data', (data) => {
      console.log(`[Server]: ${data.toString().trim()}`);
    });
  }

  if (server.stderr) {
    server.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });
  }

  server.on('error', (error) => {
    console.error(`Failed to start server process: ${error.message}`);
  });

  return server;
}

/**
 * Start server with retry logic and readiness polling.
 * Attempts to start once and polls BASE_URL until ready or timeout.
 */
async function startServerWithRetry(): Promise<void> {
  let retries = RETRY_CONFIG.SERVER_START_RETRIES;
  let lastError;

  // Start the server process once
  if (!server) {
    try {
      startServer();
    } catch (error) {
      throw new Error(
        `Failed to start server process: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Wait for server to be ready with retries
  while (retries > 0) {
    try {
      console.log(
        `Checking server readiness (attempt ${RETRY_CONFIG.SERVER_START_RETRIES - retries + 1}/${RETRY_CONFIG.SERVER_START_RETRIES})...`
      );
      await waitForServerReady(BASE_URL);
      console.log('Server is ready');
      return;
    } catch (error) {
      lastError = error;
      retries--;

      if (retries > 0) {
        console.log(
          `Server not ready, retrying in ${RETRY_CONFIG.SERVER_START_RETRY_DELAY}ms... (${retries} retries left)`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.SERVER_START_RETRY_DELAY));
      }
    }
  }

  throw new Error(
    `Failed to start server after ${RETRY_CONFIG.SERVER_START_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/** Ensure server cleanup on any exit. */
/**
 * Force kill a server process.
 * @param serverProcess - Child process to terminate
 */
function forceKillServerProcess(serverProcess: ChildProcess | null): void {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  try {
    serverProcess.kill('SIGKILL');
  } catch (killErr) {
    console.error('Failed to force kill server:', killErr);

    // Try using process.kill as fallback
    if (serverProcess.pid) {
      try {
        process.kill(serverProcess.pid, 'SIGKILL');
      } catch (pidErr) {
        console.error('Failed to kill process by PID:', pidErr);
      }
    }
  }
}

/**
 * Attempt graceful shutdown, then force kill after timeout.
 */
function cleanupServer(): void {
  if (isCleaningUp) {
    return;
  }
  isCleaningUp = true;

  if (server && !server.killed) {
    console.log('Cleaning up server process...');
    try {
      // Try graceful shutdown first
      server.kill('SIGTERM');

      // Force kill after timeout if still running
      const forceKillTimer = setTimeout(() => {
        if (server && !server.killed) {
          console.log(
            `Force killing server process after ${RETRY_CONFIG.SERVER_FORCE_KILL_TIMEOUT}ms...`
          );
          forceKillServerProcess(server);
        }
      }, RETRY_CONFIG.SERVER_FORCE_KILL_TIMEOUT);

      // Clear timer if process exits before timeout
      if (server) {
        server.on('exit', () => {
          clearTimeout(forceKillTimer);
          console.log('Server process exited gracefully');
        });
      }
    } catch (err) {
      console.error('Error during server cleanup:', err);
      // Force kill as last resort
      forceKillServerProcess(server);
    }
  }
}

// Centralized exit scheduler to avoid double cleanup/exit
/**
 * Schedule process exit after performing cleanup.
 * @param code - Process exit code (default 0)
 */
function scheduleExit(code = 0): void {
  if (exitScheduled) return;
  exitScheduled = true;
  cleanupServer();
  // Give cleanup time to complete
  setTimeout(() => {
    process.exit(code);
  }, RETRY_CONFIG.EXIT_CLEANUP_GRACE_PERIOD);
}

// Register cleanup handlers
// Keep the exit handler minimal: async work (timers) won't run in 'exit' phase
process.on('exit', () => {
  if (server && !server.killed) {
    try {
      server.kill('SIGKILL');
    } catch {}
  }
});
process.on('SIGINT', () => {
  console.error('Received SIGINT');
  scheduleExit(130);
});
process.on('SIGTERM', () => {
  console.error('Received SIGTERM');
  scheduleExit(143);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  scheduleExit(1);
});

// Main execution
/**
 * Main IIFE entrypoint for CI.
 * Starts the server, waits for readiness, runs performance tests, and cleans up.
 */
(async () => {
  let exitCode = 0;
  try {
    console.log('Starting server and waiting for it to be ready...');
    await startServerWithRetry();
    console.log('Starting performance tests...');
    await runPerformanceTest();
    console.log('Performance tests completed successfully');
  } catch (error) {
    console.error('Performance test failed:', error);
    exitCode = 1;
  } finally {
    scheduleExit(exitCode);
  }
})();
