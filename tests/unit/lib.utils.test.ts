/**
 * Class Name Utility Testing Suite
 *
 * Unit tests for the cn (className) utility functions that handle Tailwind CSS
 * class merging and deduplication. Validates both direct imports and re-exports
 * to ensure API consistency across different import paths.
 *
 * @remarks
 * The cn utility is built on clsx and tailwind-merge libraries to provide
 * robust class name merging with Tailwind CSS conflict resolution.
 */

/// <reference types="vitest/globals" />
import { cn as cnFromLib } from '@/lib/utils';
import { cn } from '@/utils/cn';

/**
 * Test suite for the cn (className) utility function.
 *
 * Tests the core functionality of class name merging, deduplication,
 * and conditional class application. This utility is critical for
 * managing Tailwind CSS classes throughout the application.
 */
describe('cn', () => {
  /**
   * Tests that the cn function properly merges and deduplicates Tailwind CSS classes.
   *
   * Verifies that when conflicting Tailwind classes are provided (like px-2 and px-4),
   * the function keeps the last one (px-4) and removes duplicates. Also tests that
   * falsy values are filtered out and undefined values are handled gracefully.
   *
   * @example
   * ```typescript
   * // Conflicting classes resolution
   * cn('px-2', 'px-4', 'text-sm') // Result: 'px-4 text-sm'
   * cn('bg-red-500', false && 'hidden', 'bg-blue-500') // Result: 'bg-blue-500'
   * ```
   */
  it('merges class names and dedupes Tailwind variants', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', undefined, 'text-sm')).toBe('px-4 text-sm');
  });
});

/**
 * Test suite for the lib/utils re-export functionality.
 *
 * Ensures that the cn function exported from lib/utils works identically
 * to the original function from utils/cn. This maintains API consistency
 * across different import paths in the application.
 */
describe('lib/utils re-export', () => {
  /**
   * Tests that the cn function is properly exported from lib/utils.
   *
   * Verifies that the function is defined and is of the correct type,
   * ensuring that the re-export from lib/utils maintains the expected
   * API surface for consumers of this utility.
   */
  it('exports cn function from lib/utils', () => {
    expect(cnFromLib).toBeDefined();
    expect(typeof cnFromLib).toBe('function');
  });

  /**
   * Tests that the re-exported cn function behaves identically to the original.
   *
   * Verifies that both import paths (lib/utils and utils/cn) provide
   * the same functionality and produce identical results for the same input.
   * This ensures API consistency across the application.
   */
  it('cn from lib/utils works the same as from utils/cn', () => {
    const result = cnFromLib('px-2', 'px-4', 'text-sm');
    expect(result).toBe('px-4 text-sm');
  });
});
