/**
 * Test timeout constants
 * Centralized timeout values for integration and E2E tests
 */

/**
 * Wait times for UI interactions and animations
 */
export const UI_WAIT_TIMES = {
  /**
   * Minimum wait time for UI updates (milliseconds)
   */
  MINIMAL: 100,

  /**
   * Short wait time for quick animations (milliseconds)
   */
  SHORT: 300,

  /**
   * Standard wait time for most UI operations (milliseconds)
   */
  STANDARD: 500,

  /**
   * Long wait time for complex operations (milliseconds)
   */
  LONG: 1000,

  /**
   * Extra long wait time for heavy operations (milliseconds)
   */
  EXTRA_LONG: 2000,
} as const;

/**
 * Network-related wait times
 */
export const NETWORK_WAIT_TIMES = {
  /**
   * Wait time for API responses (milliseconds)
   */
  API_RESPONSE: 3000,

  /**
   * Wait time for page load completion (milliseconds)
   */
  PAGE_LOAD: 5000,

  /**
   * Wait time for network idle state (milliseconds)
   */
  NETWORK_IDLE: 2000,
} as const;

/**
 * Test-specific timeouts
 */
export const TEST_TIMEOUTS = {
  /**
   * Default timeout for test cases (milliseconds)
   */
  DEFAULT: 30000,

  /**
   * Extended timeout for slow operations (milliseconds)
   */
  EXTENDED: 60000,

  /**
   * Quick timeout for fast operations (milliseconds)
   */
  QUICK: 10000,
} as const;

/**
 * Retry configuration for flaky operations
 */
export const RETRY_CONFIG = {
  /**
   * Maximum number of retry attempts
   */
  MAX_RETRIES: 3,

  /**
   * Delay between retry attempts (milliseconds)
   */
  RETRY_DELAY: 1000,
} as const;

/**
 * Animation and transition durations
 */
export const ANIMATION_DURATIONS = {
  /**
   * CSS transition duration (milliseconds)
   */
  TRANSITION: 300,

  /**
   * Modal open/close animation (milliseconds)
   */
  MODAL: 400,

  /**
   * Dropdown animation (milliseconds)
   */
  DROPDOWN: 200,
} as const;

/**
 * Web server timeouts for Playwright configuration
 */
export const WEBSERVER_TIMEOUT = {
  /**
   * Timeout for web server startup (milliseconds)
   */
  STARTUP: 120000,
} as const;

/**
 * Scroll position constants for testing
 */
export const SCROLL_POSITIONS = {
  /**
   * Standard scroll position for testing (pixels)
   */
  STANDARD: 500,
} as const;

/**
 * Performance metrics thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * First Contentful Paint threshold (milliseconds)
   */
  FCP_GOOD: 1800,

  /**
   * Maximum acceptable memory increase (MB)
   */
  MEMORY_INCREASE_MAX: 50,
} as const;

/**
 * Viewport sizes for responsive testing
 */
export const VIEWPORT_SIZES = {
  /**
   * Desktop viewport
   */
  DESKTOP: { width: 1920, height: 1080 },

  /**
   * Mobile viewport
   */
  MOBILE: { width: 375, height: 667 },
} as const;
