import { defineConfig, devices } from '@playwright/test';
import { TEST_TIMEOUTS, WEBSERVER_TIMEOUT } from './tests/constants/test-constants';

/**
 * Playwright configuration for Docker environment
 * Docker環境でのE2Eテスト実行用設定
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['html'], ['github'], ['list']] : [['html'], ['list']],

  /* Global timeout for tests in Docker */
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://app-server:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Docker環境での設定 */
    ignoreHTTPSErrors: true,

    /* Longer timeouts for Docker environment */
    actionTimeout: 30 * 1000, // 30 seconds
    navigationTimeout: 60 * 1000, // 60 seconds
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Chromium specific settings for Docker */
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        /* Firefox specific settings for Docker */
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'app-server',
            'network.dns.disableIPv6': true,
          },
        },
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        /* Mobile Chrome specific settings for Docker */
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        },
      },
    },

    /* Safari/WebKit is not supported for internal use */
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  /* Docker環境ではwebServerを無効化 */
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: process.env.CI ? 'pnpm start' : 'pnpm dev',
        url: process.env.BASE_URL || 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: WEBSERVER_TIMEOUT.STARTUP,
      },

  /* Timeout settings */
  timeout: TEST_TIMEOUTS.DEFAULT * 2, // Docker環境では2倍のタイムアウト
  expect: {
    timeout: TEST_TIMEOUTS.QUICK * 2, // Docker環境では2倍のタイムアウト
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results/',
});
