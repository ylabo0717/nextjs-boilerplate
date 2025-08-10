/**
 * Test timeout constants
 * Centralized timeout values for integration and E2E tests
 */

/**
 * Wait times for UI interactions and animations
 */
export const UI_WAIT_TIMES = {
  /**
   * Instant feedback for micro-interactions like hover states and focus (unit: ms)
   */
  MINIMAL: 100,

  /**
   * Quick transitions for dropdowns, tooltips, and accordion panels (unit: ms)
   */
  SHORT: 300,

  /**
   * Standard animations for modals, page transitions, and form submissions (unit: ms)
   */
  STANDARD: 500,

  /**
   * Complex UI updates like data loading, chart rendering, and lazy loading (unit: ms)
   */
  LONG: 1000,

  /**
   * Heavy operations like file uploads, bulk operations, and initial page load (unit: ms)
   */
  EXTRA_LONG: 2000,
} as const;

/**
 * Network-related wait times
 */
export const NETWORK_WAIT_TIMES = {
  /**
   * API call completion for REST endpoints and GraphQL queries (unit: ms)
   */
  API_RESPONSE: 3000,

  /**
   * Full page load including all assets for initial render and route changes (unit: ms)
   */
  PAGE_LOAD: 5000,

  /**
   * Network idle detection when no pending requests remain (unit: ms)
   */
  NETWORK_IDLE: 2000,
} as const;

/**
 * Test-specific timeouts
 */
export const TEST_TIMEOUTS = {
  /**
   * Standard test case execution for most integration tests (unit: ms)
   */
  DEFAULT: 30000,

  /**
   * Complex scenarios including E2E flows and multi-step workflows (unit: ms)
   */
  EXTENDED: 60000,

  /**
   * Simple unit tests for component rendering and basic interactions (unit: ms)
   */
  QUICK: 10000,
} as const;

/**
 * Retry configuration for flaky operations
 */
export const RETRY_CONFIG = {
  /**
   * Maximum retry attempts for network requests and element visibility checks (unit: count)
   */
  MAX_RETRIES: 3,

  /**
   * Wait between retries to prevent rate limiting and allow recovery (unit: ms)
   */
  RETRY_DELAY: 1000,
} as const;

/**
 * Animation and transition durations
 */
export const ANIMATION_DURATIONS = {
  /**
   * CSS transitions for color changes, transforms, and opacity (unit: ms)
   */
  TRANSITION: 300,

  /**
   * Modal animations with fade in/out and scale effects (unit: ms)
   */
  MODAL: 400,

  /**
   * Dropdown menu slide down/up animations (unit: ms)
   */
  DROPDOWN: 200,
} as const;

/**
 * Web server timeouts for Playwright configuration
 */
export const WEBSERVER_TIMEOUT = {
  /**
   * Dev server startup including Next.js build and dependency installation (unit: ms)
   */
  STARTUP: 120000,
} as const;
/**
 * Test data configuration for content generation in tests
 */
export const TEST_DATA = {
  /**
   * Content items to generate for virtual scrolling and pagination tests (unit: count)
   */
  SCROLL_CONTENT_COUNT: 50,

  /**
   * Numeric height for scroll position and viewport calculations (unit: pixels)
   */
  ELEMENT_HEIGHT: 50,

  /**
   * CSS height value for inline styles and dynamic styling (unit: CSS pixels)
   */
  ELEMENT_HEIGHT_PX: '50px',
} as const;

/**
 * Accessibility testing configuration
 */
export const ACCESSIBILITY_TEST = {
  /**
   * Tab order verification for forms, navigation, and modals (unit: count)
   */
  MAX_TAB_NAVIGATION_ELEMENTS: 5,
} as const;

/**
 * Scroll position constants for testing
 */
export const SCROLL_POSITIONS = {
  /**
   * Scroll behavior verification for smooth scrolling and sticky headers (unit: pixels)
   */
  STANDARD: 500,
} as const;

/**
 * Performance metrics thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Good FCP score based on Core Web Vitals benchmark (unit: ms)
   */
  FCP_GOOD: 1800,

  /**
   * Memory leak detection threshold to prevent excessive RAM usage (unit: MB)
   */
  MEMORY_INCREASE_MAX: 50,
} as const;

/**
 * Memory conversion factors
 */
export const MEMORY_CONVERSION = {
  /**
   * Conversion factor for memory usage reporting (unit: bytes per KB)
   */
  BYTES_TO_KB: 1024,

  /**
   * Conversion factor for performance metrics (unit: bytes per MB)
   */
  BYTES_TO_MB: 1048576,
} as const;

/**
 * Viewport sizes for responsive testing
 */
export const VIEWPORT_SIZES = {
  /**
   * Full HD desktop for responsive layouts and desktop-first features (unit: pixels)
   */
  DESKTOP: { width: 1920, height: 1080 },

  /**
   * iPhone SE/8 size for mobile layouts and touch interactions (unit: pixels)
   */
  MOBILE: { width: 375, height: 667 },
} as const;
