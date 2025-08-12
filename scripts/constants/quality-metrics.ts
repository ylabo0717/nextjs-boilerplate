/**
 * Unified quality metrics constants for all quality check scripts
 * This file serves as the single source of truth for all quality thresholds
 */

/**
 * Time conversion constants
 */
export const TIME_UNITS = {
  /**
   * Milliseconds in one minute
   */
  MS_PER_MINUTE: 60000,
  /**
   * Milliseconds in one second
   */
  MS_PER_SECOND: 1000,
} as const;

/**
 * Size conversion constants
 */
export const SIZE_UNITS = {
  /** Bytes in one Kilobyte */
  BYTES_PER_KB: 1024,
  /** Bytes in one Megabyte */
  BYTES_PER_MB: 1024 * 1024,
} as const;

/**
 * Performance thresholds for build and test operations
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Maximum acceptable build time in milliseconds (5 minutes)
   */
  BUILD_TIME_MAX: 300000,
  /**
   * Target build time in milliseconds (2 minutes)
   */
  BUILD_TIME_TARGET: 120000,
  /**
   * Maximum acceptable test time in milliseconds (3 minutes)
   */
  TEST_TIME_MAX: 180000,
  /**
   * Maximum acceptable bundle size in bytes (100MB)
   */
  BUNDLE_SIZE_MAX: 104857600,
  /**
   * Warning threshold for total bundle size in bytes (50MB)
   */
  BUNDLE_SIZE_WARNING: 52428800,
  /**
   * Target (recommended) total bundle size in bytes (5MB)
   * Used for displaying ✅/⚠️ in reports
   */
  BUNDLE_SIZE_TARGET: 5242880,
} as const;

/**
 * Lighthouse score thresholds
 */
export const LIGHTHOUSE_THRESHOLDS = {
  /**
   * Minimum performance score
   */
  PERFORMANCE: 75,
  /**
   * Minimum accessibility score
   */
  ACCESSIBILITY: 90,
  /**
   * Minimum best practices score
   */
  BEST_PRACTICES: 90,
  /**
   * Minimum SEO score
   */
  SEO: 90,
} as const;

/**
 * Complexity level definitions with thresholds
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
 */
export const COMPLEXITY_THRESHOLDS = {
  /**
   * Individual file thresholds
   */
  INDIVIDUAL: {
    /**
     * Warning threshold - triggers warning in quality gate
     */
    WARNING: 15,
    /**
     * Maximum threshold - triggers error in quality gate
     */
    MAXIMUM: 20,
  },
  /**
   * Project average thresholds
   */
  AVERAGE: {
    /**
     * Warning threshold for average complexity
     */
    WARNING: 8,
    /**
     * Maximum threshold for average complexity
     */
    MAXIMUM: 10,
  },
} as const;

/**
 * ESLintCC rank configuration
 * Maps complexity values to letter grades for ESLintCC
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
 */
export const SCORE_RATINGS = {
  /**
   * A rating threshold
   */
  A: 90,
  /**
   * B rating threshold
   */
  B: 80,
  /**
   * C rating threshold
   */
  C: 70,
  /**
   * D rating threshold
   */
  D: 60,
} as const;
/**
 * Maintainability Index thresholds
 * Based on industry standards and Microsoft's Maintainability Index
 */
export const MAINTAINABILITY_INDEX_THRESHOLDS = {
  /**
   * Excellent maintainability (green zone)
   */
  EXCELLENT: 80,
  /**
   * Good maintainability (yellow zone)
   */
  GOOD: 70,
  /**
   * Fair maintainability (orange zone)
   */
  FAIR: 50,
  /**
   * Poor maintainability (red zone) - anything below FAIR
   */
  POOR: 30,
} as const;

/**
 * Quality gate scoring weights
 */
export const QUALITY_GATE_WEIGHTS = {
  /**
   * Build time penalty for exceeding threshold
   */
  BUILD_TIME_PENALTY: 5,
  /**
   * Test coverage bonus for good coverage
   */
  TEST_COVERAGE_BONUS: 10,
  /**
   * Lighthouse score weight
   */
  LIGHTHOUSE_WEIGHT: 0.25,
} as const;

/**
 * Quality Gate default conditions (aligned with Sonar way for overall code fallback)
 *
 * Purpose:
 * - Binary quality gate thresholds independent from the health score.
 * - Approximate Sonar Way new-code criteria as an overall-code fallback.
 */
export const QUALITY_GATE_CONDITIONS = {
  /** Minimum acceptable overall coverage percentage */
  COVERAGE_MIN: 80,
  /** Maximum acceptable duplication percentage for overall code */
  DUPLICATION_MAX: 3,
} as const;
/**
 * Unified quality report thresholds
 */
export const UNIFIED_REPORT_THRESHOLDS = {
  /**
   * Maximum acceptable lint warnings count
   */
  LINT_WARN_MAX: 10,
  /**
   * Maximum acceptable duplication percentage for individual files
   */
  DUPLICATION_MAX: 10,
} as const;

/**
 * Health Score weights for normalized metrics (sum should be 1.0)
 *
 * Purpose:
 * - Express relative importance of normalized metrics.
 * - Align with ISO/IEC 25010 (Maintainability/Performance) and Sonar gate practices.
 *
 * Note:
 * - If MI is unavailable, reallocate its weight to CC_AVG.
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
 */
export const HEALTH_SCORE_THRESHOLDS = {
  /** Excellent threshold */
  EXCELLENT: 80,
  /** Good threshold */
  GOOD: 60,
  /** Fair threshold (below this is Poor) */
  FAIR: 40,
} as const;

/**
 * Cap applied to health score when Quality Gate fails
 */
export const QUALITY_GATE_FAILURE_CAP = 59 as const;

/**
 * Display/format defaults for reports
 */
export const DISPLAY_FORMATS = {
  /** Decimal places for bundle size in table */
  BUNDLE_SIZE_TABLE_DECIMALS: 2,
  /** Decimal places for bundle size target hint */
  BUNDLE_SIZE_HINT_DECIMALS: 0,
} as const;

/**
 * Get complexity level for a given value
 */
export function getComplexityLevel(value: number): {
  label: string;
  emoji: string;
  description: string;
} {
  if (value <= COMPLEXITY_LEVELS.EXCELLENT.maxValue) {
    return COMPLEXITY_LEVELS.EXCELLENT;
  }
  if (value <= COMPLEXITY_LEVELS.GOOD.maxValue) {
    return COMPLEXITY_LEVELS.GOOD;
  }
  if (value <= COMPLEXITY_LEVELS.FAIR.maxValue) {
    return COMPLEXITY_LEVELS.FAIR;
  }
  if (value <= COMPLEXITY_LEVELS.WARNING.maxValue) {
    return COMPLEXITY_LEVELS.WARNING;
  }
  if (value <= COMPLEXITY_LEVELS.CRITICAL.maxValue) {
    return COMPLEXITY_LEVELS.CRITICAL;
  }
  return COMPLEXITY_LEVELS.DANGEROUS;
}

/**
 * Get indicator emoji for quality gate
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
