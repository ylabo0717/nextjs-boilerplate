/**
 * Example Test Suite
 *
 * Basic unit tests demonstrating fundamental testing patterns and Vitest functionality.
 * These tests serve as examples for proper test structure and common assertion patterns
 * used throughout the codebase.
 */

import { describe, it, expect } from 'vitest';

/**
 * Example test suite demonstrating basic testing patterns and Vitest assertions.
 *
 * This suite provides examples of fundamental testing concepts including
 * basic assertions, string operations, and array handling. These tests serve
 * as templates for writing effective unit tests throughout the application.
 */
describe('Example Test Suite', () => {
  /**
   * Tests basic arithmetic operations to verify test framework functionality.
   *
   * This is a smoke test that ensures the testing environment is properly
   * configured and basic assertions work as expected. It validates that
   * simple mathematical operations produce correct results.
   */
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  /**
   * Tests string manipulation and content validation functionality.
   *
   * Verifies that string operations work correctly and demonstrates
   * the use of string content assertions. This pattern is commonly used
   * when testing text processing, message formatting, and content validation.
   */
  it('should handle string operations', () => {
    const message = 'Hello, GitHub Actions!';
    expect(message).toContain('GitHub Actions');
  });

  /**
   * Tests array operations and collection-based assertions.
   *
   * Demonstrates testing patterns for arrays including length validation
   * and element presence checking. These patterns are essential for testing
   * data structures, collections, and list-based functionality.
   */
  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });
});
