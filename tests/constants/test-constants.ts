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
 * Test data configuration for content generation in tests
 */
export const TEST_DATA = {
  /**
   * Number of content items to generate for scroll testing
   */
  SCROLL_CONTENT_COUNT: 50,

  /**
   * Height of each generated element in pixels (without 'px' suffix)
   */
  ELEMENT_HEIGHT: 50,

  /**
   * Height of each generated element as CSS string (e.g., '50px')
   */
  ELEMENT_HEIGHT_PX: '50px',
} as const;

/**
 * Accessibility testing configuration
 */
export const ACCESSIBILITY_TEST = {
  /** Maximum number of interactive elements to test in Tab navigation */
  MAX_TAB_NAVIGATION_ELEMENTS: 5,
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
 * Memory conversion factors
 */
export const MEMORY_CONVERSION = {
  /**
   * Bytes to kilobytes
   */
  BYTES_TO_KB: 1024,

  /**
   * Bytes to megabytes (1024 * 1024)
   */
  BYTES_TO_MB: 1048576,
} as const;

/**
 * Supported locales for testing
 */
export const SUPPORTED_LOCALES = ['ja', 'en', 'en-US', 'ja-JP'] as const;

/**
 * Type for supported locales
 */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

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
