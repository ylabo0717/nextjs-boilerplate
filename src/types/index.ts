/**
 * Represents a user in the system
 *
 * @public
 */
export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;
  /**
   * User's email address
   */
  email: string;
  /**
   * User's display name
   */
  name: string;
  /**
   * User's role in the system
   *
   * @remarks
   * Optional field that defines user permissions
   */
  role?: string;
}

/**
 * Standard API response wrapper
 *
 * @typeParam T - The type of data in the response
 *
 * @public
 */
export interface ApiResponse<T = unknown> {
  /**
   * Response data payload
   */
  data?: T;
  /**
   * Error information if the request failed
   */
  error?: {
    /**
     * Error code for programmatic handling
     */
    code: string;
    /**
     * Human-readable error message
     */
    message: string;
    /**
     * Additional error details
     */
    details?: Record<string, unknown>;
  };
  /**
   * Metadata for pagination and other response information
   */
  meta?: {
    /**
     * Current page number
     */
    page?: number;
    /**
     * Total number of pages available
     */
    totalPages?: number;
    /**
     * Total number of items across all pages
     */
    totalItems?: number;
  };
}
