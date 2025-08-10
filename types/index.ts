// Common type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    totalPages?: number;
    totalItems?: number;
  };
}