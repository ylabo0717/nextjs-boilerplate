/**
 * Performance test script for E2E scheduled workflow
 *
 * SECURITY WARNING: This script is designed for CI environments only.
 * It starts a server process with hardcoded commands to prevent injection attacks.
 * Do not use with untrusted input or in production environments.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SERVER_START_RETRIES = parseInt(process.env.SERVER_START_RETRIES || '3', 10);
const SERVER_START_RETRY_DELAY = parseInt(process.env.SERVER_START_RETRY_DELAY || '5000', 10);
const SERVER_POLLING_INTERVAL = parseInt(process.env.SERVER_POLLING_INTERVAL || '1000', 10);
const SERVER_FORCE_KILL_TIMEOUT = parseInt(process.env.SERVER_FORCE_KILL_TIMEOUT || '5000', 10);

/**
 * Run performance tests against the application
 */
async function runPerformanceTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start measuring
  await page.goto(BASE_URL);

  // Collect performance metrics
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      totalTime: perfData.loadEventEnd - perfData.fetchStart,
    };
  });

  console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));

  // Check thresholds (configurable via environment variables)
  const MAX_TOTAL_TIME = parseInt(process.env.MAX_TOTAL_TIME || '3000', 10);
  const MAX_DOM_CONTENT_LOADED = parseInt(process.env.MAX_DOM_CONTENT_LOADED || '1500', 10);

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
 * Wait for server to be ready by polling the endpoint
 */
function waitForServerReady(url, timeoutMs = 30000, intervalMs = SERVER_POLLING_INTERVAL) {
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
 * Start server with retry logic
 */
async function startServerWithRetry() {
  let retries = SERVER_START_RETRIES;
  let lastError;

  while (retries > 0) {
    try {
      console.log(
        `Attempting to start server (attempt ${SERVER_START_RETRIES - retries + 1}/${SERVER_START_RETRIES})...`
      );
      await waitForServerReady(BASE_URL);
      console.log('Server is ready');
      return;
    } catch (error) {
      lastError = error;
      retries--;

      if (retries > 0) {
        console.log(
          `Server not ready, retrying in ${SERVER_START_RETRY_DELAY}ms... (${retries} retries left)`
        );
        await new Promise((resolve) => setTimeout(resolve, SERVER_START_RETRY_DELAY));
      }
    }
  }

  throw new Error(
    `Failed to start server after ${SERVER_START_RETRIES} attempts: ${lastError.message}`
  );
}

/**
 * Start the app in test mode
 * Using start:test instead of start to:
 * - Use test-specific configurations
 * - Ensure proper cleanup on test completion
 * - Avoid conflicts with production settings
 *
 * Security Note: This script is intended for CI environments only.
 * The command is hardcoded to prevent command injection vulnerabilities.
 */
// Use spawn instead of exec for better security and control
const server = spawn('pnpm', ['start:test'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false, // Disable shell to prevent command injection
  env: { ...process.env, NODE_ENV: 'test' },
});

// Capture server output for debugging
server.stdout.on('data', (data) => {
  console.log(`[Server]: ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`[Server Error]: ${data.toString().trim()}`);
});

/**
 * Ensure server cleanup on any exit
 */
function cleanupServer() {
  if (server && !server.killed) {
    console.log('Cleaning up server process...');
    try {
      // Try graceful shutdown first
      server.kill('SIGTERM');

      // Force kill after timeout if still running
      const forceKillTimer = setTimeout(() => {
        if (!server.killed) {
          console.log(`Force killing server process after ${SERVER_FORCE_KILL_TIMEOUT}ms...`);
          try {
            server.kill('SIGKILL');
          } catch (killErr) {
            console.error('Failed to force kill server:', killErr);
            // Try using process.kill as fallback
            if (server.pid) {
              try {
                process.kill(server.pid, 'SIGKILL');
              } catch (pidErr) {
                console.error('Failed to kill process by PID:', pidErr);
              }
            }
          }
        }
      }, SERVER_FORCE_KILL_TIMEOUT);

      // Clear timer if process exits before timeout
      server.on('exit', () => {
        clearTimeout(forceKillTimer);
        console.log('Server process exited gracefully');
      });
    } catch (err) {
      console.error('Error during server cleanup:', err);
      // Force kill as last resort
      try {
        server.kill('SIGKILL');
      } catch (finalErr) {
        console.error('Failed to kill server process:', finalErr);
      }
    }
  }
}

// Register cleanup handlers
process.on('exit', cleanupServer);
process.on('SIGINT', () => {
  cleanupServer();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupServer();
  process.exit(143);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  cleanupServer();
  process.exit(1);
});

// Main execution
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
    cleanupServer();
    // Give cleanup time to complete
    setTimeout(() => {
      process.exit(exitCode);
    }, 1000);
  }
})();
