// Common type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    totalPages?: number;
    totalItems?: number;
  };
}
