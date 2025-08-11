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
 * Performance thresholds for build and test operations
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Maximum acceptable build time in milliseconds (5 minutes)
   */
  BUILD_TIME_MAX: 300000,
  /**
   * Maximum acceptable test time in milliseconds (3 minutes)
   */
  TEST_TIME_MAX: 180000,
  /**
   * Maximum acceptable bundle size in bytes (100MB)
   */
  BUNDLE_SIZE_MAX: 104857600,
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
