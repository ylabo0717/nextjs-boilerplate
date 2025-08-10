/**
 * Performance test script for E2E scheduled workflow
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const { exec } = require('child_process');
const http = require('http');

/**
 * Run performance tests against the application
 */
async function runPerformanceTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start measuring
  await page.goto('http://localhost:3000');

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

  // Check thresholds
  const failed = [];
  if (metrics.totalTime > 3000) {
    failed.push(`Total load time (${metrics.totalTime}ms) exceeds threshold (3000ms)`);
  }
  if (metrics.domContentLoaded > 1500) {
    failed.push(
      `DOM content loaded time (${metrics.domContentLoaded}ms) exceeds threshold (1500ms)`
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
function waitForServerReady(url, timeoutMs = 30000, intervalMs = 500) {
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

// Start the app
const server = exec('pnpm start');

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
      setTimeout(() => {
        if (!server.killed) {
          console.log('Force killing server process...');
          server.kill('SIGKILL');
        }
      }, 5000);
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
    console.log('Waiting for server to be ready...');
    await waitForServerReady('http://localhost:3000');
    console.log('Server is ready, starting performance tests');
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
