/**
 * Test timeout constants
 *
 * @remarks
 * Centralized timeout values for integration and E2E tests
 */

/**
 * Wait times for UI interactions and animations
 *
 * @public
 */
export const UI_WAIT_TIMES = {
  /**
   * Instant feedback for micro-interactions like hover states and focus
   *
   * @remarks
   * Unit: milliseconds
   */
  MINIMAL: 100,

  /**
   * Quick transitions for dropdowns, tooltips, and accordion panels
   *
   * @remarks
   * Unit: milliseconds
   */
  SHORT: 300,

  /**
   * Standard animations for modals, page transitions, and form submissions
   *
   * @remarks
   * Unit: milliseconds
   */
  STANDARD: 500,

  /**
   * Complex UI updates like data loading, chart rendering, and lazy loading
   *
   * @remarks
   * Unit: milliseconds
   */
  LONG: 1000,

  /**
   * Heavy operations like file uploads, bulk operations, and initial page load
   *
   * @remarks
   * Unit: milliseconds
   */
  EXTRA_LONG: 2000,
} as const;

/**
 * Network-related wait times
 *
 * @public
 */
export const NETWORK_WAIT_TIMES = {
  /**
   * API call completion for REST endpoints and GraphQL queries
   *
   * @remarks
   * Unit: milliseconds
   */
  API_RESPONSE: 3000,

  /**
   * Full page load including all assets for initial render and route changes
   *
   * @remarks
   * Unit: milliseconds
   */
  PAGE_LOAD: 5000,

  /**
   * Network idle detection when no pending requests remain
   *
   * @remarks
   * Unit: milliseconds
   */
  NETWORK_IDLE: 2000,
} as const;

/**
 * Test-specific timeouts
 *
 * @public
 */
export const TEST_TIMEOUTS = {
  /**
   * Standard test case execution for most integration tests
   *
   * @remarks
   * Unit: milliseconds
   */
  DEFAULT: 30000,

  /**
   * Complex scenarios including E2E flows and multi-step workflows
   *
   * @remarks
   * Unit: milliseconds
   */
  EXTENDED: 60000,

  /**
   * Simple unit tests for component rendering and basic interactions
   *
   * @remarks
   * Unit: milliseconds
   */
  QUICK: 10000,
} as const;

/**
 * Retry configuration for flaky operations
 *
 * @public
 */
export const RETRY_CONFIG = {
  /**
   * Maximum retry attempts for network requests and element visibility checks
   *
   * @remarks
   * Unit: count
   */
  MAX_RETRIES: 3,

  /**
   * Wait between retries to prevent rate limiting and allow recovery
   *
   * @remarks
   * Unit: milliseconds
   */
  RETRY_DELAY: 1000,

  /**
   * Server startup retry attempts for performance tests
   *
   * @remarks
   * Unit: count
   */
  SERVER_START_RETRIES: 3,

  /**
   * Delay between server startup retries
   *
   * @remarks
   * Unit: milliseconds
   */
  SERVER_START_RETRY_DELAY: 5000,

  /**
   * Polling interval for server health checks
   *
   * @remarks
   * Unit: milliseconds
   */
  SERVER_POLLING_INTERVAL: 1000,

  /**
   * Timeout before force killing unresponsive server process
   *
   * @remarks
   * Unit: milliseconds
   */
  SERVER_FORCE_KILL_TIMEOUT: 5000,

  /**
   * Grace period before exiting the process to allow cleanup to run
   *
   * @remarks
   * Unit: milliseconds
   */
  EXIT_CLEANUP_GRACE_PERIOD: 1000,

  /**
   * Maximum time to wait for server to become ready
   *
   * @remarks
   * Unit: milliseconds
   */
  SERVER_READY_TIMEOUT: 30000,
} as const;

/**
 * Animation and transition durations
 *
 * @public
 */
export const ANIMATION_DURATIONS = {
  /**
   * CSS transitions for color changes, transforms, and opacity
   *
   * @remarks
   * Unit: milliseconds
   */
  TRANSITION: 300,

  /**
   * Modal animations with fade in/out and scale effects
   *
   * @remarks
   * Unit: milliseconds
   */
  MODAL: 400,

  /**
   * Dropdown menu slide down/up animations
   *
   * @remarks
   * Unit: milliseconds
   */
  DROPDOWN: 200,
} as const;

/**
 * Web server timeouts for Playwright configuration
 *
 * @public
 */
export const WEBSERVER_TIMEOUT = {
  /**
   * Dev server startup including Next.js build and dependency installation
   *
   * @remarks
   * Unit: milliseconds
   */
  STARTUP: 120000,
} as const;
/**
 * Test data configuration for content generation in tests
 *
 * @public
 */
export const TEST_DATA = {
  /**
   * Content items to generate for virtual scrolling and pagination tests
   *
   * @remarks
   * Unit: count
   */
  SCROLL_CONTENT_COUNT: 50,

  /**
   * Numeric height for scroll position and viewport calculations
   *
   * @remarks
   * Unit: pixels
   */
  ELEMENT_HEIGHT: 50,

  /**
   * CSS height value for inline styles and dynamic styling
   *
   * @remarks
   * Unit: CSS pixels
   */
  ELEMENT_HEIGHT_PX: '50px',
} as const;

/**
 * Accessibility testing configuration
 *
 * @public
 */
export const ACCESSIBILITY_TEST = {
  /**
   * Tab order verification for forms, navigation, and modals
   *
   * @remarks
   * Unit: count
   */
  MAX_TAB_NAVIGATION_ELEMENTS: 5,
} as const;

/**
 * Scroll position constants for testing
 *
 * @public
 */
export const SCROLL_POSITIONS = {
  /**
   * Scroll behavior verification for smooth scrolling and sticky headers
   *
   * @remarks
   * Unit: pixels
   */
  STANDARD: 500,
} as const;

/**
 * Performance metrics thresholds
 *
 * @public
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Good FCP score based on Core Web Vitals benchmark
   *
   * @remarks
   * Unit: milliseconds
   */
  FCP_GOOD: 1800,

  /**
   * Memory leak detection threshold to prevent excessive RAM usage
   *
   * @remarks
   * Unit: megabytes
   */
  MEMORY_INCREASE_MAX: 50,

  /**
   * Maximum acceptable page load time
   *
   * @remarks
   * Unit: milliseconds
   */
  PAGE_LOAD_TIME: 3000,

  /**
   * Maximum acceptable DOM content loaded time
   *
   * @remarks
   * Unit: milliseconds
   */
  DOM_CONTENT_LOADED_TIME: 1500,
} as const;

/**
 * Memory conversion factors
 *
 * @public
 */
export const MEMORY_CONVERSION = {
  /**
   * Conversion factor for memory usage reporting
   *
   * @remarks
   * Unit: bytes per KB
   */
  BYTES_TO_KB: 1024,

  /**
   * Conversion factor for performance metrics
   *
   * @remarks
   * Unit: bytes per MB
   */
  BYTES_TO_MB: 1048576,
} as const;

/**
 * Viewport sizes for responsive testing
 *
 * @public
 */
export const VIEWPORT_SIZES = {
  /**
   * Full HD desktop for responsive layouts and desktop-first features
   *
   * @remarks
   * Unit: pixels
   */
  DESKTOP: { width: 1920, height: 1080 },

  /**
   * iPhone SE/8 size for mobile layouts and touch interactions
   *
   * @remarks
   * Unit: pixels
   */
  MOBILE: { width: 375, height: 667 },
} as const;
