/**
 * Common type definitions
 * Shared TypeScript interfaces and types used across the application
 */

/** User entity interface */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's role in the system */
  role?: string;
}

/**
 * Standard API response format
 * Generic type for consistent API responses
 */
export interface ApiResponse<T = unknown> {
  /** Response data payload */
  data?: T;
  /** Error information if request failed */
  error?: {
    /** Error code */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: Record<string, unknown>;
  };
  /** Pagination and response metadata */
  meta?: {
    /** Current page number (1-based) */
    page?: number;
    /** Total number of pages */
    totalPages?: number;
    /** Total number of items */
    totalItems?: number;
  };
}
