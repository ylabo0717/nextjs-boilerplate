/**
 * Unified quality metrics constants for all quality check scripts
 *
 * @remarks
 * This file serves as the single source of truth for all quality thresholds
 *
 * @public
 */

/**
 * Time conversion constants
 *
 * @public
 */
export const TIME_UNITS = {
  /**
   * Milliseconds in one minute
   *
   * @remarks
   * Unit: milliseconds
   */
  MS_PER_MINUTE: 60000,
  /**
   * Milliseconds in one second
   *
   * @remarks
   * Unit: milliseconds
   */
  MS_PER_SECOND: 1000,
} as const;

/**
 * Size conversion constants
 *
 * @public
 */
export const SIZE_UNITS = {
  /**
   * Bytes in one Kilobyte
   *
   * @remarks
   * Unit: bytes
   */
  BYTES_PER_KB: 1024,
  /**
   * Bytes in one Megabyte
   *
   * @remarks
   * Unit: bytes
   */
  BYTES_PER_MB: 1024 * 1024,
} as const;

/**
 * Performance thresholds for build and test operations
 *
 * @public
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Maximum acceptable build time
   *
   * @remarks
   * Unit: milliseconds (5 minutes)
   */
  BUILD_TIME_MAX: 300000,
  /**
   * Target build time
   *
   * @remarks
   * Unit: milliseconds (2 minutes)
   */
  BUILD_TIME_TARGET: 120000,
  /**
   * Maximum acceptable test time
   *
   * @remarks
   * Unit: milliseconds (3 minutes)
   */
  TEST_TIME_MAX: 180000,
  /**
   * Maximum acceptable bundle size
   *
   * @remarks
   * Unit: bytes (100MB)
   */
  BUNDLE_SIZE_MAX: 104857600,
  /**
   * Warning threshold for total bundle size
   *
   * @remarks
   * Unit: bytes (50MB)
   */
  BUNDLE_SIZE_WARNING: 52428800,
  /**
   * Target (recommended) total bundle size
   *
   * @remarks
   * Unit: bytes (5MB)
   * Used for displaying ✅/⚠️ in reports
   */
  BUNDLE_SIZE_TARGET: 5242880,
} as const;

/**
 * Lighthouse score thresholds
 *
 * @public
 */
export const LIGHTHOUSE_THRESHOLDS = {
  /**
   * Minimum performance score
   *
   * @remarks
   * Unit: score (0-100)
   */
  PERFORMANCE: 75,
  /**
   * Minimum accessibility score
   *
   * @remarks
   * Unit: score (0-100)
   */
  ACCESSIBILITY: 90,
  /**
   * Minimum best practices score
   *
   * @remarks
   * Unit: score (0-100)
   */
  BEST_PRACTICES: 90,
  /**
   * Minimum SEO score
   *
   * @remarks
   * Unit: score (0-100)
   */
  SEO: 90,
} as const;

/**
 * Complexity level definitions with thresholds
 *
 * @public
 */
export const COMPLEXITY_LEVELS = {
  EXCELLENT: {
    label: 'A',
    maxValue: 5,
    emoji: '⚡',
    description: 'Excellent - Simple and easy to understand',
  },
  GOOD: {
    label: 'B',
    maxValue: 10,
    emoji: '✅',
    description: 'Good - Moderate complexity',
  },
  FAIR: {
    label: 'C',
    maxValue: 15,
    emoji: '⚠️',
    description: 'Fair - Consider refactoring',
  },
  WARNING: {
    label: 'D',
    maxValue: 20,
    emoji: '🟡',
    description: 'Warning - Should be refactored',
  },
  CRITICAL: {
    label: 'E',
    maxValue: 30,
    emoji: '🟠',
    description: 'Critical - Needs immediate refactoring',
  },
  DANGEROUS: {
    label: 'F',
    maxValue: Infinity,
    emoji: '❌',
    description: 'Dangerous - Must be refactored',
  },
} as const;

/**
 * Complexity thresholds for quality gates
 *
 * @public
 */
export const COMPLEXITY_THRESHOLDS = {
  /**
   * Individual file thresholds
   */
  INDIVIDUAL: {
    /**
     * Warning threshold - triggers warning in quality gate
     *
     * @remarks
     * Unit: complexity score
     */
    WARNING: 15,
    /**
     * Maximum threshold - triggers error in quality gate
     *
     * @remarks
     * Unit: complexity score
     */
    MAXIMUM: 20,
  },
  /**
   * Project average thresholds
   */
  AVERAGE: {
    /**
     * Warning threshold for average complexity
     *
     * @remarks
     * Unit: average complexity score
     */
    WARNING: 8,
    /**
     * Maximum threshold for average complexity
     *
     * @remarks
     * Unit: average complexity score
     */
    MAXIMUM: 10,
  },
} as const;

/**
 * ESLintCC rank configuration
 *
 * @remarks
 * Maps complexity values to letter grades for ESLintCC
 *
 * @public
 */
export const ESLINTCC_RANKS = {
  complexity: {
    A: COMPLEXITY_LEVELS.EXCELLENT.maxValue,
    B: COMPLEXITY_LEVELS.GOOD.maxValue,
    C: COMPLEXITY_LEVELS.FAIR.maxValue,
    D: COMPLEXITY_LEVELS.WARNING.maxValue,
    E: COMPLEXITY_LEVELS.CRITICAL.maxValue,
    F: COMPLEXITY_LEVELS.DANGEROUS.maxValue,
  },
  'max-depth': {
    A: 2,
    B: 3,
    C: 4,
    D: 5,
    E: 6,
    F: Infinity,
  },
  'max-params': {
    A: 3,
    B: 4,
    C: 5,
    D: 6,
    E: 7,
    F: Infinity,
  },
} as const;

/**
 * ESLint rule configuration for complexity
 *
 * @public
 */
export const ESLINT_COMPLEXITY_RULES = {
  complexity: ['error', COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM],
  'max-depth': ['error', 4],
  'max-params': ['error', 5],
  'max-statements': ['error', 30],
  'max-nested-callbacks': ['error', 3],
} as const;

/**
 * Score ratings for quality metrics
 *
 * @public
 */
export const SCORE_RATINGS = {
  /**
   * A rating threshold
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  A: 90,
  /**
   * B rating threshold
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  B: 80,
  /**
   * C rating threshold
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  C: 70,
  /**
   * D rating threshold
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  D: 60,
} as const;
/**
 * Maintainability Index thresholds
 *
 * @remarks
 * Based on industry standards and Microsoft's Maintainability Index
 *
 * @public
 */
export const MAINTAINABILITY_INDEX_THRESHOLDS = {
  /**
   * Excellent maintainability (green zone)
   *
   * @remarks
   * Unit: maintainability score (0-100)
   */
  EXCELLENT: 80,
  /**
   * Good maintainability (yellow zone)
   *
   * @remarks
   * Unit: maintainability score (0-100)
   */
  GOOD: 70,
  /**
   * Fair maintainability (orange zone)
   *
   * @remarks
   * Unit: maintainability score (0-100)
   */
  FAIR: 50,
  /**
   * Poor maintainability (red zone) - anything below FAIR
   *
   * @remarks
   * Unit: maintainability score (0-100)
   */
  POOR: 30,
} as const;

/**
 * Quality Gate default conditions (aligned with Sonar way for overall code fallback)
 *
 * @remarks
 * Purpose:
 * - Binary quality gate thresholds independent from the health score.
 * - Approximate Sonar Way new-code criteria as an overall-code fallback.
 *
 * @public
 */
export const QUALITY_GATE_CONDITIONS = {
  /**
   * Minimum acceptable overall coverage percentage
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  COVERAGE_MIN: 80,
  /**
   * Maximum acceptable duplication percentage for overall code
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  DUPLICATION_MAX: 3,
} as const;
/**
 * Unified quality report thresholds
 *
 * @public
 */
export const UNIFIED_REPORT_THRESHOLDS = {
  /**
   * Maximum acceptable lint warnings count
   *
   * @remarks
   * Unit: count
   */
  LINT_WARN_MAX: 10,
  /**
   * Maximum acceptable duplication percentage for individual files
   *
   * @remarks
   * Unit: percentage (0-100)
   */
  DUPLICATION_MAX: 10,
} as const;
/**
 * File size thresholds for code analysis
 *
 * @public
 */
export const FILE_SIZE_THRESHOLDS = {
  /**
   * Warning threshold for large files
   *
   * @remarks
   * Unit: lines of code
   */
  LARGE_FILE_LINES: 300,
  /**
   * Warning threshold for average lines per file
   *
   * @remarks
   * Unit: lines of code
   */
  AVG_LINES_WARNING: 200,
  /**
   * Maximum recommended lines per file
   *
   * @remarks
   * Unit: lines of code
   */
  MAX_RECOMMENDED_LINES: 500,
  /**
   * Maximum recommended lines per function
   *
   * @remarks
   * Unit: lines of code
   */
  MAX_FUNCTION_LINES: 50,
} as const;

/**
 * Display limits for reports and analysis
 *
 * @public
 */
export const DISPLAY_LIMITS = {
  /**
   * Maximum number of files to show in detailed reports
   *
   * @remarks
   * Unit: count
   */
  TOP_FILES_DETAILED: 10,
  /**
   * Maximum number of files to show in summary reports
   *
   * @remarks
   * Unit: count
   */
  TOP_FILES_SUMMARY: 5,
  /**
   * Maximum number of recommendations to show
   *
   * @remarks
   * Unit: count
   */
  TOP_RECOMMENDATIONS: 3,
} as const;

/**
 * First Load JS bundle size thresholds
 *
 * @remarks
 * Unit: kilobytes
 *
 * @public
 */
export const FIRST_LOAD_JS_THRESHOLDS = {
  /**
   * Excellent bundle size
   *
   * @remarks
   * Unit: kilobytes
   */
  EXCELLENT: 100,
  /**
   * Good bundle size
   *
   * @remarks
   * Unit: kilobytes
   */
  GOOD: 150,
  /**
   * Warning threshold
   *
   * @remarks
   * Unit: kilobytes
   */
  WARNING: 200,
  /**
   * Maximum acceptable size
   *
   * @remarks
   * Unit: kilobytes
   */
  MAXIMUM: 250,
} as const;

/**
 * Health Score weights for normalized metrics (sum should be 1.0)
 *
 * @remarks
 * Purpose:
 * - Express relative importance of normalized metrics.
 * - Align with ISO/IEC 25010 (Maintainability/Performance) and Sonar gate practices.
 *
 * Note:
 * - If MI is unavailable, reallocate its weight to CC_AVG.
 *
 * @public
 */
export const QUALITY_SCORE_WEIGHTS = {
  // Maintainability block
  MI: 0.25,
  CC_AVG: 0.15,
  CC_MAX: 0.05,
  DUPLICATION: 0.1,
  // Test quality
  COVERAGE: 0.15,
  // Static defects
  TS_ERRORS: 0.06,
  LINT_ERRORS: 0.04,
  // Performance
  BUILD_TIME: 0.1,
  BUNDLE_SIZE: 0.1,
} as const;

/**
 * Health score bands and gate cap
 *
 * @public
 */
export const HEALTH_SCORE_THRESHOLDS = {
  /**
   * Excellent threshold
   *
   * @remarks
   * Unit: score (0-100)
   */
  EXCELLENT: 80,
  /**
   * Good threshold
   *
   * @remarks
   * Unit: score (0-100)
   */
  GOOD: 60,
  /**
   * Fair threshold (below this is Poor)
   *
   * @remarks
   * Unit: score (0-100)
   */
  FAIR: 40,
} as const;

/**
 * Cap applied to health score when Quality Gate fails
 *
 * @remarks
 * Unit: score (0-100)
 *
 * @public
 */
export const QUALITY_GATE_FAILURE_CAP = 59 as const;

/**
 * Display/format defaults for reports
 *
 * @public
 */
export const DISPLAY_FORMATS = {
  /**
   * Decimal places for bundle size in table
   *
   * @remarks
   * Unit: decimal places
   */
  BUNDLE_SIZE_TABLE_DECIMALS: 2,
  /**
   * Decimal places for bundle size target hint
   *
   * @remarks
   * Unit: decimal places
   */
  BUNDLE_SIZE_HINT_DECIMALS: 0,
} as const;

/**
 * Get indicator emoji for quality gate
 *
 * @param value - The complexity value to evaluate
 * @returns The appropriate emoji indicator
 *
 * @public
 */
export function getComplexityIndicator(value: number): string {
  if (value > COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM) {
    return '❌';
  }
  if (value > COMPLEXITY_THRESHOLDS.INDIVIDUAL.WARNING) {
    return '⚠️';
  }
  return '';
}

/**
 * Scoring constants used by unified quality report normalization
 *
 * @public
 */
export const SCORING_CONSTANTS = {
  /** Decay factor for TS error penalty (log10-based) */
  TS_ERROR_LOG_DECAY: 30,
  /** Decay factor for ESLint error penalty (log10-based) */
  LINT_ERROR_LOG_DECAY: 20,
  /** Linear penalty per ESLint warning above threshold */
  LINT_WARNING_PENALTY: 2,
  /** Range beyond individual CC limit used for max complexity penalty */
  MAX_COMPLEXITY_PENALTY_RANGE: 20,
  /** Max deduction applied at end of CC max penalty range (100 - 40 = 60) */
  MAX_COMPLEXITY_MAX_DEDUCT: 60,
  /** Breakpoints for duplication scoring beyond project threshold */
  DUPLICATION_BREAKPOINTS: {
    MID: 10,
    HIGH: 20,
  },
  /** Target scores for duplication segments */
  DUPLICATION_SCORES: {
    THRESHOLD: 95,
    MID: 60,
    HIGH: 30,
  },
  /** Coverage piecewise breakpoints */
  COVERAGE_BREAKPOINTS: {
    ZERO: 50,
    GOOD: 80,
    GREAT: 90,
  },
  /** Coverage target scores at breakpoints */
  COVERAGE_SCORES: {
    AT_GOOD: 80,
    AT_GREAT: 90,
    AT_MAX: 100,
  },
  /** Average complexity breakpoints (aligned to COMPLEXITY_LEVELS) */
  CC_AVG_BREAKPOINTS: {
    EXCELLENT: COMPLEXITY_LEVELS.EXCELLENT.maxValue, // 5
    GOOD: COMPLEXITY_LEVELS.GOOD.maxValue, // 10
    FAIR: COMPLEXITY_LEVELS.FAIR.maxValue, // 15
    WARNING: COMPLEXITY_LEVELS.WARNING.maxValue, // 20
    CRITICAL: COMPLEXITY_LEVELS.CRITICAL.maxValue, // 30
  },
  /** Target scores for average complexity segments */
  CC_AVG_SCORES: {
    EXCELLENT: 100,
    GOOD: 80,
    FAIR: 60,
    WARNING: 40,
    CRITICAL: 20,
  },
} as const;
