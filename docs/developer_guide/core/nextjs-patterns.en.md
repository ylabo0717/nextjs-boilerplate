# Next.js Development Patterns and React Design

This document defines best practices for Next.js-specific development patterns and React component design in Next.js 15.x + React 19 + TypeScript projects.

## Table of Contents

1. [Server Components vs Client Components Usage](#server-components-vs-client-components-usage)
2. [Routing and Navigation](#routing-and-navigation)
3. [Data Fetching Patterns](#data-fetching-patterns)
4. [React Component Design](#react-component-design)
5. [Compound Components Pattern](#compound-components-pattern)
6. [Custom Hooks](#custom-hooks)

---

## Server Components vs Client Components Usage

**Purpose**: Optimize performance, SEO, and security.

**Principles**:

1. **Default to Server Components** - Unless interaction is required
2. **Minimize Client Components** - Only necessary parts
3. **Clear boundaries** - Careful placement of 'use client' directive

**Decision Chart (Simplified)**:

- Need UI events (onClick / onChange / focus management)? → Client
- Direct use of browser-only APIs (window / localStorage / IntersectionObserver / DOM)? → Client
- Access to sensitive data / secrets / DB / server FS? → Server
- Data contributes to SEO or initial display optimization is important? → Server
- Display only / static + no interaction required? → Server
- Otherwise, only local interaction? → Separate into small Client Component, keep parent as Server

> When upgrading to Client, briefly comment "what UI requirements are needed" to make it easier to reconsider Server conversion later.

```tsx
// ✅ Good - Server Component (default)
// app/users/page.tsx
import { getUsersFromDatabase } from '@/lib/database';
import { UserList } from '@/components/UserList';

async function UsersPage() {
  // Server-side data fetching
  const users = await getUsersFromDatabase();

  return (
    <div>
      <h1>User List</h1>
      <UserList users={users} />
    </div>
  );
}

export default UsersPage;
```

```tsx
// ✅ Good - Client Component (only necessary parts)
// components/SearchForm.tsx
'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSearch: (query: string) => void;
}

export const SearchForm = ({ onSearch }: SearchFormProps) => {
  const [query, setQuery] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query);
      }}
    >
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      <button type="submit">Search</button>
    </form>
  );
};
```

```tsx
// ❌ Bad - Unnecessary Client Component
'use client';

// Making it a Client Component despite no interaction
export const StaticContent = ({ title }: { title: string }) => {
  return <h1>{title}</h1>;
};
```

---

## Routing and Navigation

**Purpose**: Maximize App Router features and provide optimal user experience.

**Important Changes in Next.js 15**:

- `params` and `searchParams` are now asynchronous (Promise)
- Instead of synchronous access `const { id } = params`, now requires `const { id } = await params`
- This change makes dynamic routes and query parameter handling safer

```tsx
// ✅ Good - App Router best practices
// app/products/[id]/page.tsx
interface ProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;

  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <ProductDetails product={product} activeTab={tab} />
    </div>
  );
}

// Metadata generation
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  return {
    title: product?.name ?? 'Product Not Found',
    description: product?.description,
  };
}
```

### Navigation Patterns

```tsx
// ✅ Good - Programmatic navigation
'use client';
import { useRouter } from 'next/navigation';

export const NavigationButton = () => {
  const router = useRouter();

  const handleNavigation = () => {
    // Client-side navigation
    router.push('/dashboard');

    // With query parameters
    router.push('/products?category=electronics');

    // Replace instead of push
    router.replace('/login');
  };

  return <button onClick={handleNavigation}>Go to Dashboard</button>;
};

// ✅ Good - Link component usage
import Link from 'next/link';

export const Navigation = () => {
  return (
    <nav>
      <Link href="/about" prefetch={true}>
        About
      </Link>
      <Link href="/products" prefetch={false}>
        Products
      </Link>
    </nav>
  );
};
```

---

## Data Fetching Patterns

**Purpose**: Leverage Next.js 15's Server Components and caching features.

### 1. Server Component Data Fetching

```tsx
// ✅ Good - Server-side data fetching
// app/dashboard/page.tsx
async function DashboardPage() {
  // Parallel data fetching
  const [user, posts, analytics] = await Promise.all([getUser(), getPosts(), getAnalytics()]);

  return (
    <div>
      <UserProfile user={user} />
      <PostsList posts={posts} />
      <AnalyticsDashboard data={analytics} />
    </div>
  );
}

// With error handling
async function getUserData() {
  try {
    const user = await fetchUser();
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

### 2. Client-side Data Fetching

```tsx
// ✅ Good - Client-side data fetching with SWR
'use client';
import useSWR from 'swr';

export const UserProfile = ({ userId }: { userId: string }) => {
  const {
    data: user,
    error,
    isLoading,
  } = useSWR(`/api/users/${userId}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  if (isLoading) return <UserSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <NotFound />;

  return <UserDetails user={user} />;
};

// ✅ Good - React Query usage
('use client');
import { useQuery } from '@tanstack/react-query';

export const PostsList = () => {
  const {
    data: posts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('/api/posts').then((res) => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorBoundary error={error} />}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
```

### 3. Hybrid Patterns

```tsx
// ✅ Good - Server Component with Client Component islands
// app/posts/page.tsx
async function PostsPage() {
  // Server-side initial data
  const initialPosts = await getPosts();

  return (
    <div>
      <h1>Posts</h1>
      {/* Server Component for SEO */}
      <PostsGrid posts={initialPosts} />
      {/* Client Component for interaction */}
      <LoadMoreButton />
      {/* Client Component for real-time features */}
      <CommentSection />
    </div>
  );
}

// Client Component for progressive enhancement
('use client');
export const LoadMoreButton = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    setIsLoading(true);
    const newPosts = await fetchMorePosts();
    setPosts((prev) => [...prev, ...newPosts]);
    setIsLoading(false);
  };

  return (
    <button onClick={loadMore} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Load More'}
    </button>
  );
};
```

---

## React Component Design

**Purpose**: Create maintainable, reusable, and type-safe components.

### 1. Component Composition

```tsx
// ✅ Good - Composable component design
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
}

export const Card = ({ children, variant = 'default', className }: CardProps) => {
  return <div className={cn('card', `card--${variant}`, className)}>{children}</div>;
};

// Sub-components
export const CardHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="card__header">{children}</div>;
};

export const CardContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="card__content">{children}</div>;
};

export const CardActions = ({ children }: { children: React.ReactNode }) => {
  return <div className="card__actions">{children}</div>;
};

// Usage
export const UserCard = ({ user }: { user: User }) => {
  return (
    <Card variant="elevated">
      <CardHeader>
        <h3>{user.name}</h3>
      </CardHeader>
      <CardContent>
        <p>{user.bio}</p>
      </CardContent>
      <CardActions>
        <Button>View Profile</Button>
        <Button variant="secondary">Message</Button>
      </CardActions>
    </Card>
  );
};
```

### 2. Props Interface Design

```tsx
// ✅ Good - Well-designed props interface
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  'data-testid'?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
  'data-testid': testId,
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        { 'btn--loading': loading },
        className
      )}
      data-testid={testId}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};
```

### 3. Error Boundaries

```tsx
// ✅ Good - Error boundary implementation
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
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage
export const App = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={(error) => reportError(error)}>
      <UserDashboard />
    </ErrorBoundary>
  );
};
```

---

## Compound Components Pattern

**Purpose**: Create flexible and reusable component APIs.

```tsx
// ✅ Good - Compound components pattern
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within Tabs');
  }
  return context;
};

// Main component
interface TabsProps {
  children: React.ReactNode;
  defaultTab: string;
  onChange?: (tab: string) => void;
}

export const Tabs = ({ children, defaultTab, onChange }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
};

// Sub-components
export const TabsList = ({ children }: { children: React.ReactNode }) => {
  return <div className="tabs__list">{children}</div>;
};

export const TabsTrigger = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab, setActiveTab } = useTabs();

  return (
    <button
      className={cn('tabs__trigger', {
        'tabs__trigger--active': activeTab === value,
      })}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return <div className="tabs__content">{children}</div>;
};

// Usage
export const ProductDetails = () => {
  return (
    <Tabs defaultTab="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ProductOverview />
      </TabsContent>

      <TabsContent value="specs">
        <ProductSpecs />
      </TabsContent>

      <TabsContent value="reviews">
        <ProductReviews />
      </TabsContent>
    </Tabs>
  );
};
```

---

## Custom Hooks

**Purpose**: Extract and reuse stateful logic across components.

### 1. Data Fetching Hooks

```tsx
// ✅ Good - Custom data fetching hook
import { useState, useEffect } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export const useApi = <T>(
  url: string,
  options: UseApiOptions<T> = {}
) => {
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [url]);

  return { data, loading, error, refetch };
};

// Usage
export const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, loading, error, refetch } = useApi<User>(
    `/api/users/${userId}`,
    {
      onError: (error) => toast.error(error.message),
    }
  );

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage onRetry={refetch} />;
  if (!user) return <NotFound />;

  return <UserDetails user={user} />;
};
```

### 2. Local Storage Hook

```tsx
// ✅ Good - Local storage hook with SSR support
import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  // Initialize with a function to avoid SSR mismatch
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Usage
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 3. Form Hook

```tsx
// ✅ Good - Form management hook
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Validate
    const validationErrors = validate?.(values) || {};
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Submit
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
  };
};

// Usage
export const ContactForm = () => {
  const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm({
    initialValues: {
      name: '',
      email: '',
      message: '',
    },
    validate: (values) => {
      const errors: any = {};

      if (!values.name) errors.name = 'Name is required';
      if (!values.email) errors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(values.email)) {
        errors.email = 'Email is invalid';
      }
      if (!values.message) errors.message = 'Message is required';

      return errors;
    },
    onSubmit: async (values) => {
      await submitContactForm(values);
      toast.success('Message sent successfully!');
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Name"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <input
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <textarea
          value={values.message}
          onChange={(e) => handleChange('message', e.target.value)}
          placeholder="Message"
        />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
};
```

---

## Summary

This Next.js patterns guide emphasizes:

1. **Server-First Architecture** - Default to Server Components, upgrade to Client only when necessary
2. **Modern Data Fetching** - Leverage async params/searchParams in Next.js 15
3. **Component Composition** - Build flexible, reusable component APIs
4. **Type Safety** - Comprehensive TypeScript integration
5. **Performance Optimization** - Strategic use of caching and prefetching
6. **Developer Experience** - Custom hooks for common patterns

By following these patterns, you can build Next.js applications that are:

- Performant and SEO-friendly
- Maintainable and scalable
- Type-safe and error-resistant
- Aligned with React and Next.js best practices

---

## Related Documentation

- [TypeScript Guidelines](./typescript-guidelines.en.md) - Type-safe component patterns
- [Architecture Guidelines](./architecture-guidelines.en.md) - Pure functions and design patterns
- [Performance Guidelines](../quality/performance-guidelines.en.md) - Optimization strategies
