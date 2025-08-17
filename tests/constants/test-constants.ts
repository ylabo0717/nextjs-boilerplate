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

/**
 * Logger test data configuration
 *
 * @public
 */
export const LOGGER_TEST_DATA = {
  /**
   * Large object array size for performance testing
   *
   * @remarks
   * Unit: count
   */
  LARGE_OBJECT_ARRAY_SIZE: 1000,

  /**
   * Deep object nesting level for testing sanitization depth
   *
   * @remarks
   * Unit: count
   */
  DEEP_OBJECT_NESTING_LEVEL: 20,

  /**
   * Performance loop iterations for timing tests
   *
   * @remarks
   * Unit: count
   */
  PERFORMANCE_LOOP_ITERATIONS: 100,

  /**
   * Expected sum result for performance calculation verification
   *
   * @remarks
   * Unit: numeric result (sum of 0-99)
   */
  PERFORMANCE_EXPECTED_SUM: 4950,

  /**
   * Object size limit for sanitization testing
   *
   * @remarks
   * Unit: depth limit
   */
  OBJECT_SIZE_DEPTH_LIMIT: 15,

  /**
   * Object size property limit for sanitization testing
   *
   * @remarks
   * Unit: property count
   */
  OBJECT_SIZE_PROPERTY_LIMIT: 50,

  /**
   * KV storage TTL for testing expiration
   *
   * @remarks
   * Unit: milliseconds
   */
  KV_STORAGE_TTL: 1000,

  /**
   * Short delay for async testing operations
   *
   * @remarks
   * Unit: milliseconds
   */
  ASYNC_DELAY_SHORT: 1,

  /**
   * Medium delay for TTL and timing tests
   *
   * @remarks
   * Unit: milliseconds
   */
  ASYNC_DELAY_MEDIUM: 10,

  /**
   * Long delay for TTL expiration tests
   *
   * @remarks
   * Unit: milliseconds
   */
  ASYNC_DELAY_LONG: 1100,

  /**
   * Default TTL for storage configuration tests
   *
   * @remarks
   * Unit: seconds
   */
  STORAGE_TTL_DEFAULT: 3600,

  /**
   * Extended TTL for storage configuration tests
   *
   * @remarks
   * Unit: seconds
   */
  STORAGE_TTL_EXTENDED: 7200,

  /**
   * Storage timeout for configuration tests
   *
   * @remarks
   * Unit: milliseconds
   */
  STORAGE_TIMEOUT_MS: 5000,

  /**
   * Extended storage timeout for configuration tests
   *
   * @remarks
   * Unit: milliseconds
   */
  STORAGE_TIMEOUT_EXTENDED: 10000,

  /**
   * Concurrent operations count for storage stress tests
   *
   * @remarks
   * Unit: count
   */
  CONCURRENT_OPERATIONS_COUNT: 100,

  /**
   * Large value size for storage tests
   *
   * @remarks
   * Unit: character count
   */
  LARGE_VALUE_SIZE: 10000,

  /**
   * Concurrent requests count for stress testing
   *
   * @remarks
   * Unit: count
   */
  CONCURRENT_REQUESTS_STANDARD: 100,

  /**
   * High concurrency requests count for stress testing
   *
   * @remarks
   * Unit: count
   */
  CONCURRENT_REQUESTS_HIGH: 1000,

  /**
   * Batch size for batch processing tests
   *
   * @remarks
   * Unit: count
   */
  BATCH_SIZE: 100,

  /**
   * Iteration count for performance stress tests
   *
   * @remarks
   * Unit: count
   */
  STRESS_TEST_ITERATIONS: 10000,

  /**
   * String repetition count for large string tests
   *
   * @remarks
   * Unit: count
   */
  STRING_REPEAT_COUNT: 1000,

  /**
   * Large string multiplier for memory tests
   *
   * @remarks
   * Unit: count
   */
  LARGE_STRING_MULTIPLIER: 600,

  /**
   * Memory size threshold (1MB)
   *
   * @remarks
   * Unit: bytes
   */
  MEMORY_THRESHOLD_1MB: 1024 * 1024,

  /**
   * Performance timeout threshold
   *
   * @remarks
   * Unit: milliseconds
   */
  PERFORMANCE_TIMEOUT_5S: 5000,

  /**
   * Performance timeout threshold (1 second)
   *
   * @remarks
   * Unit: milliseconds
   */
  PERFORMANCE_TIMEOUT_1S: 1000,

  /**
   * Performance timeout threshold (3 seconds)
   *
   * @remarks
   * Unit: milliseconds
   */
  PERFORMANCE_TIMEOUT_3S: 3000,

  /**
   * Performance timeout threshold (100ms)
   *
   * @remarks
   * Unit: milliseconds
   */
  PERFORMANCE_TIMEOUT_100MS: 100,

  /**
   * Very large string size (1 million characters)
   *
   * @remarks
   * Unit: character count
   */
  VERY_LARGE_STRING_SIZE: 1000000,

  /**
   * Large string size (100k characters)
   *
   * @remarks
   * Unit: character count
   */
  LARGE_STRING_SIZE: 100000,

  /**
   * String length limit (2000 characters)
   *
   * @remarks
   * Unit: character count
   */
  STRING_LENGTH_LIMIT: 2000,

  /**
   * Expected truncated string length
   *
   * @remarks
   * Unit: character count
   */
  TRUNCATED_STRING_LENGTH: 1015,

  /**
   * Object property count limit (150)
   *
   * @remarks
   * Unit: count
   */
  OBJECT_PROPERTY_LIMIT: 150,

  /**
   * Object property count limit + 1 (for truncation marker)
   *
   * @remarks
   * Unit: count
   */
  OBJECT_PROPERTY_LIMIT_PLUS_ONE: 101,

  /**
   * Edge context test depth
   *
   * @remarks
   * Unit: count
   */
  EDGE_CONTEXT_DEPTH: 100,

  /**
   * Test timeout threshold (150ms)
   *
   * @remarks
   * Unit: milliseconds
   */
  TEST_TIMEOUT_150MS: 150,

  /**
   * Test timeout threshold (200ms)
   *
   * @remarks
   * Unit: milliseconds
   */
  TEST_TIMEOUT_200MS: 200,

  /**
   * Test timeout threshold (300ms)
   *
   * @remarks
   * Unit: milliseconds
   */
  TEST_TIMEOUT_300MS: 300,
} as const;

/**
 * Rate limiter test configuration
 *
 * @public
 */
export const RATE_LIMITER_TEST = {
  /**
   * Sampling rate for 50% sampling tests
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  SAMPLING_RATE_50_PERCENT: 0.5,

  /**
   * Sampling rate for 30% sampling tests
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  SAMPLING_RATE_30_PERCENT: 0.3,

  /**
   * Random function return value for testing (30%)
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  RANDOM_VALUE_30_PERCENT: 0.3,

  /**
   * Random function return value for testing (70%)
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  RANDOM_VALUE_70_PERCENT: 0.7,

  /**
   * Random function return value for testing (20%)
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  RANDOM_VALUE_20_PERCENT: 0.2,

  /**
   * Random function return value for testing (25%)
   *
   * @remarks
   * Unit: rate (0.0 - 1.0)
   */
  RANDOM_VALUE_25_PERCENT: 0.25,

  /**
   * Low error threshold for testing adaptive sampling
   *
   * @remarks
   * Unit: errors per minute
   */
  LOW_ERROR_THRESHOLD: 5,

  /**
   * High error count for testing adaptive sampling
   *
   * @remarks
   * Unit: count
   */
  HIGH_ERROR_COUNT: 60,

  /**
   * Loop iterations for randomness testing
   *
   * @remarks
   * Unit: count
   */
  RANDOMNESS_TEST_ITERATIONS: 100,

  /**
   * Loop iterations for deterministic testing
   *
   * @remarks
   * Unit: count
   */
  DETERMINISTIC_TEST_ITERATIONS: 10,
} as const;
