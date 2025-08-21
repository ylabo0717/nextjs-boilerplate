/**
 * Users API Integration Testing Suite
 *
 * Integration tests for the /api/users endpoint using Mock Service Worker (MSW)
 * to simulate API responses. Validates API functionality, response format,
 * and runtime type safety using Zod schema validation patterns.
 *
 * @remarks
 * These tests demonstrate proper API testing patterns with runtime type validation,
 * ensuring both functional correctness and type safety in API interactions.
 */

/// <reference types="vitest/globals" />
import { assert } from 'vitest';

import { UsersSchema } from '@/types/user';

/**
 * Test suite for the GET /api/users endpoint with mocked responses.
 *
 * Uses MSW (Mock Service Worker) to simulate API responses and validates
 * both the HTTP response and the data structure using Zod schema validation.
 * This ensures type safety and proper API contract compliance.
 */
describe('GET /api/users (mocked)', () => {
  /**
   * Tests that the users endpoint returns valid data with proper type validation.
   *
   * Verifies the /api/users endpoint returns successful response and validates
   * the response data against the UsersSchema using Zod. This test ensures
   * runtime type safety and validates that the API contract is properly
   * implemented with the expected data structure and types.
   *
   * @example
   * ```typescript
   * // Zod schema validation pattern
   * const data = await res.json();
   * const parseResult = UsersSchema.safeParse(data);
   * assert(parseResult.success, 'Schema validation should succeed');
   * const users = parseResult.data; // Now type-safe
   * ```
   */
  it('returns users from MSW', async () => {
    const res = await fetch('/api/users');
    expect(res.ok).toBeTruthy();

    // Perform runtime type validation using Zod schema
    const data = await res.json();
    const parseResult = UsersSchema.safeParse(data);

    // Verify that schema validation succeeded
    expect(parseResult.success).toBeTruthy();

    // Use TypeScript type guard with assert to ensure type safety
    // This makes parseResult.data safely usable with proper typing
    assert(parseResult.success, 'Schema validation should succeed');

    // Use the validated, type-safe data
    const users = parseResult.data;
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: 'Alice' });
  });
});
