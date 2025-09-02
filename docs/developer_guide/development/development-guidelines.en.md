# Development & Maintenance Guidelines

This document defines best practices for daily development and maintenance tasks, including state management, error handling, and styling.

## Table of Contents

1. [State Management](#state-management)
2. [Error Handling](#error-handling)
3. [Styling (Tailwind CSS)](#styling-tailwind-css)
4. [Import/Export Conventions](#importexport-conventions)

---

## State Management

### Local State vs Global State

**Purpose**: Manage state with appropriate scope and suppress complexity.

**Principles**:

1. **Local First** - Consider local state first
2. **Minimal Global State** - Only truly shared state
3. **Server State Separation** - Separate server data from client state

```tsx
// ✅ Good - Local state is sufficient
export const SearchForm = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState(''); // Local state
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSearch(query);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        disabled={isLoading} 
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

// ❌ Bad - Unnecessary global state
// No need to make everything global state
const useGlobalStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearchLoading: false,
  setIsSearchLoading: (loading) => set({ isSearchLoading: loading }),
}));
```

### Proper Context Usage

```tsx
// ✅ Good - Appropriate Context usage
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ❌ Bad - Massive Context
interface AppContextType {
  user: User;
  theme: string;
  language: string;
  notifications: Notification[];
  cart: CartItem[];
  // ... 30 properties
}
// Too much packed into one Context
```

### Global State Management with Zustand

```tsx
// ✅ Good - Focused global state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Separate store for different concerns
interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
```

### Server State Management

```tsx
// ✅ Good - Server state with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // Update cache
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
    },
  });
};

// Usage
export const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, isLoading, error } = useUser(userId);
  const updateUserMutation = useUpdateUser();

  const handleUpdate = (userData: Partial<User>) => {
    updateUserMutation.mutate({ id: userId, ...userData });
  };

  if (isLoading) return <UserSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <NotFound />;

  return <UserForm user={user} onUpdate={handleUpdate} />;
};
```

---

## Error Handling

### Error Boundaries

```tsx
// ✅ Good - Comprehensive Error Boundary
'use client';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to error tracking service
    this.props.onError?.(error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      // Only in browser environment
      reportError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <details className="mt-4">
              <summary>Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage with different fallbacks
export const App = () => {
  return (
    <ErrorBoundary
      fallback={<GlobalErrorFallback />}
      onError={(error, errorInfo) => {
        // Report to monitoring service
        Sentry.captureException(error, { extra: errorInfo });
      }}
    >
      <Router>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary fallback={<DashboardErrorFallback />}>
                <Dashboard />
              </ErrorBoundary>
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};
```

### API Error Handling

```tsx
// ✅ Good - Structured API error handling
interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

class ApiClient {
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          errorData.code || 'UNKNOWN_ERROR',
          response.status,
          errorData
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        'Network error occurred',
        'NETWORK_ERROR',
        0,
        error
      );
    }
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// Error handling in components
export const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userData = await apiClient.getUser(userId);
        setUser(userData);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err);
          
          // Handle specific error codes
          if (err.code === 'USER_NOT_FOUND') {
            // Redirect to 404
            router.push('/404');
          } else if (err.code === 'UNAUTHORIZED') {
            // Redirect to login
            router.push('/login');
          }
        } else {
          setError(new ApiError('Unexpected error', 'UNKNOWN', 500));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  if (isLoading) return <UserSkeleton />;
  if (error) return <ErrorMessage error={error} onRetry={() => loadUser()} />;
  if (!user) return <NotFound />;

  return <UserDetails user={user} />;
};
```

### Form Validation Error Handling

```tsx
// ✅ Good - Form validation with proper error handling
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  age: z.number().min(0).max(120),
});

type UserFormData = z.infer<typeof userSchema>;

export const UserForm = ({ onSubmit }: { onSubmit: (data: UserFormData) => Promise<void> }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    age: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Validate form data
    const result = userSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof UserFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof UserFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Submit form
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle API validation errors
        if (error.details?.fields) {
          setErrors(error.details.fields);
        } else {
          // General API error
          setErrors({ email: error.message });
        }
      } else {
        setErrors({ email: 'An unexpected error occurred' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Name"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      <div>
        <input
          type="number"
          value={formData.age}
          onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
          placeholder="Age"
          className={errors.age ? 'border-red-500' : ''}
        />
        {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
};
```

---

## Styling (Tailwind CSS)

### Component-Based Styling

```tsx
// ✅ Good - Component variants with Tailwind
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className, 
  disabled,
  onClick 
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-lg',
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Usage
export const ActionButtons = () => {
  return (
    <div className="flex gap-2">
      <Button variant="primary" size="md">Save</Button>
      <Button variant="secondary" size="md">Cancel</Button>
      <Button variant="danger" size="sm">Delete</Button>
    </div>
  );
};
```

### Responsive Design Patterns

```tsx
// ✅ Good - Mobile-first responsive design
export const ProductGrid = ({ products }: { products: Product[] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square relative">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mt-4">
          <span className="font-bold text-lg text-gray-900">
            ${product.price}
          </span>
          
          <Button size="sm" variant="primary">
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Custom CSS Integration

```tsx
// ✅ Good - Custom CSS with Tailwind integration
// styles/components.css
@layer components {
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200;
  }
  
  .card-header {
    @apply px-6 py-4 border-b border-gray-200;
  }
  
  .card-content {
    @apply px-6 py-4;
  }
  
  .btn-loading {
    @apply relative text-transparent;
  }
  
  .btn-loading::after {
    @apply absolute inset-0 flex items-center justify-center text-current;
    content: '';
    background-image: url('data:image/svg+xml,...'); /* spinner SVG */
  }
}

// Component usage
export const LoadingButton = ({ children, isLoading, ...props }: ButtonProps & { isLoading?: boolean }) => {
  return (
    <Button
      className={cn(isLoading && 'btn-loading')}
      disabled={isLoading}
      {...props}
    >
      {children}
    </Button>
  );
};
```

---

## Import/Export Conventions

### File Organization

```typescript
// ✅ Good - Organized imports
// components/UserProfile/index.ts
export { UserProfile } from './UserProfile';
export { UserProfileSkeleton } from './UserProfileSkeleton';
export { UserProfileError } from './UserProfileError';
export type { UserProfileProps } from './types';

// components/UserProfile/UserProfile.tsx
import { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import type { UserProfileProps } from './types';

export const UserProfile = ({ userId, className }: UserProfileProps) => {
  // Component implementation
};
```

### Barrel Exports

```typescript
// ✅ Good - Barrel exports with types
// components/ui/index.ts
export { Button } from './Button';
export { Card, CardHeader, CardContent, CardActions } from './Card';
export { Input } from './Input';
export { Loading } from './Loading';

// Re-export types
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';
export type { InputProps } from './Input';

// utils/index.ts
export { cn } from './cn';
export { formatCurrency } from './format';
export { debounce, throttle } from './performance';
export { validateEmail, validatePassword } from './validation';

// types/index.ts
export type { User, UserRole } from './user';
export type { Product, ProductCategory } from './product';
export type { ApiResponse, ApiError } from './api';
```

### Path Aliases Usage

```typescript
// ✅ Good - Consistent path alias usage
// Instead of relative imports
import { Button } from '../../../components/ui/Button';
import { formatCurrency } from '../../utils/format';
import { User } from '../types/user';

// Use path aliases
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import { User } from '@/types/user';

// tsconfig.json configuration
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

### Dynamic Imports

```typescript
// ✅ Good - Dynamic imports for code splitting
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const UserDashboard = lazy(() => import('@/components/UserDashboard'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

// Lazy load with named exports
const ChartComponent = lazy(() => 
  import('@/components/Chart').then(module => ({ default: module.Chart }))
);

// Usage with Suspense
export const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardSkeleton />}>
              <UserDashboard />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminSkeleton />}>
              <AdminPanel />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
};

// Conditional imports
export const FeatureToggle = ({ feature }: { feature: string }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        if (feature === 'advanced-analytics') {
          const { AdvancedAnalytics } = await import('@/components/AdvancedAnalytics');
          setComponent(() => AdvancedAnalytics);
        } else if (feature === 'premium-features') {
          const { PremiumFeatures } = await import('@/components/PremiumFeatures');
          setComponent(() => PremiumFeatures);
        }
      } catch (error) {
        console.error('Failed to load feature component:', error);
      }
    };

    loadComponent();
  }, [feature]);

  if (!Component) return <FeatureSkeleton />;
  
  return <Component />;
};
```

---

## Summary

This development guideline emphasizes:

1. **State Management** - Local-first approach with appropriate global state
2. **Error Handling** - Comprehensive error boundaries and API error handling
3. **Styling** - Component-based Tailwind CSS with proper responsive design
4. **Code Organization** - Clean imports/exports with path aliases

By following these guidelines, you can maintain:
- Clean and maintainable code structure
- Robust error handling and user experience
- Consistent styling and responsive design
- Scalable project organization

---

## Related Documentation

- [TypeScript Guidelines](../core/typescript-guidelines.en.md) - Type-safe development patterns
- [Next.js Patterns](../core/nextjs-patterns.en.md) - Framework-specific patterns
- [Review Checklist](../quality/review-checklist.en.md) - Code review guidelines