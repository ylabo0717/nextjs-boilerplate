# Performance Optimization and Accessibility Guidelines

This document defines best practices for performance optimization and accessibility in Next.js + React + TypeScript projects.

## Table of Contents

1. [Dynamic Imports](#dynamic-imports)
2. [Image Optimization](#image-optimization)
3. [Memoization Strategy](#memoization-strategy)
4. [Core Web Vitals Optimization](#core-web-vitals-optimization)
5. [Accessibility Guidelines](#accessibility-guidelines)
6. [Keyboard Navigation](#keyboard-navigation)

---

## Dynamic Imports

**Purpose**: Optimize bundle size and reduce initial loading time.

### Basic Dynamic Imports

```tsx
// ✅ Good - Utilizing dynamic imports
import { lazy, Suspense } from 'react';

// Dynamic import for heavy components
const HeavyChart = lazy(() => import('@/components/HeavyChart'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

export const Dashboard = ({ userRole }: { userRole: string }) => {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>

      {userRole === 'admin' && (
        <Suspense fallback={<AdminSkeleton />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
};

// ❌ Bad - Importing everything upfront
import HeavyChart from '@/components/HeavyChart';
import AdminPanel from '@/components/AdminPanel';
```

### Route-Level Dynamic Imports

```tsx
// ✅ Good - Conditional dynamic imports
'use client';

import { useState, Suspense } from 'react';

export const ConditionalFeature = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? 'Simple View' : 'Advanced Settings'}
      </button>

      {showAdvanced && (
        <Suspense fallback={<div>Loading...</div>}>
          <AdvancedSettings />
        </Suspense>
      )}
    </div>
  );
};

const AdvancedSettings = lazy(() =>
  import('@/components/AdvancedSettings').then((module) => ({
    default: module.AdvancedSettings,
  }))
);
```

### Library Dynamic Imports

```tsx
// ✅ Good - Dynamic import for heavy libraries
'use client';

import { useState, useEffect } from 'react';

export const ChartComponent = ({ data }: { data: any[] }) => {
  const [Chart, setChart] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadChart = async () => {
    if (!Chart) {
      setIsLoading(true);
      try {
        // Only import when needed
        const [{ Chart: ChartJS }, { Bar }] = await Promise.all([
          import('chart.js'),
          import('react-chartjs-2'),
        ]);

        setChart(() => Bar);
      } catch (error) {
        console.error('Failed to load chart library:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadChart();
  }, []);

  if (isLoading) return <ChartSkeleton />;
  if (!Chart) return <div>Chart unavailable</div>;

  return <Chart data={data} />;
};

// ❌ Bad - Always importing heavy libraries
import { Chart as ChartJS } from 'chart.js';
import { Bar } from 'react-chartjs-2';
```

---

## Image Optimization

**Purpose**: Improve loading performance and user experience.

### Next.js Image Component

```tsx
// ✅ Good - Optimized image usage
import Image from 'next/image';

export const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="product-card">
      <div className="relative aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={product.featured} // For above-the-fold images
        />
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>
        <p>${product.price}</p>
      </div>
    </div>
  );
};

// ❌ Bad - Unoptimized image usage
export const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} /> {/* No optimization */}
    </div>
  );
};
```

### Responsive Images

```tsx
// ✅ Good - Responsive image implementation
export const Hero = ({ heroImage }: { heroImage: string }) => {
  return (
    <section className="hero">
      <Image
        src={heroImage}
        alt="Hero image"
        width={1920}
        height={1080}
        priority
        sizes="100vw"
        style={{
          width: '100%',
          height: 'auto',
        }}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAhEQACAQIHAQAAAAAAAAAAAAABAgADBAUREiEiMUFRkf/aAAwDAQACEQMRAD8A0XgJOj3mXkKOgRtLjrI1k8PKQjFSQdKXJSXEsq1qxWx6FoFjCYxAQEFkUJ5AUYIByDyf/9k="
      />
    </section>
  );
};
```

### Progressive Image Loading

```tsx
// ✅ Good - Progressive loading with placeholder
'use client';

import { useState } from 'react';
import Image from 'next/image';

export const ProgressiveImage = ({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
      />

      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </div>
  );
};
```

---

## Memoization Strategy

**Purpose**: Prevent unnecessary re-renders and optimize component performance.

### React.memo Usage

```tsx
// ✅ Good - Memoizing expensive components
import { memo } from 'react';

interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard = memo(({ user, onEdit }: UserCardProps) => {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
});

UserCard.displayName = 'UserCard';

// Custom comparison function for complex props
export const UserCardOptimized = memo(
  ({ user, onEdit }: UserCardProps) => {
    return <UserCard user={user} onEdit={onEdit} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if user data actually changed
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.name === nextProps.user.name &&
      prevProps.user.email === nextProps.user.email &&
      prevProps.user.avatar === nextProps.user.avatar
    );
  }
);
```

### useMemo and useCallback

```tsx
// ✅ Good - Strategic memoization
import { useMemo, useCallback, useState } from 'react';

export const UserList = ({ users }: { users: User[] }) => {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email'>('name');

  // Memoize expensive calculations
  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.name.toLowerCase().includes(filter.toLowerCase()) ||
          user.email.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
  }, [users, filter, sortBy]);

  // Memoize callback functions
  const handleUserEdit = useCallback((id: string) => {
    // Expensive operation or API call
    editUser(id);
  }, []);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
  }, []);

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => handleFilterChange(e.target.value)}
        placeholder="Search users..."
      />

      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'email')}>
        <option value="name">Sort by Name</option>
        <option value="email">Sort by Email</option>
      </select>

      {filteredAndSortedUsers.map((user) => (
        <UserCard key={user.id} user={user} onEdit={handleUserEdit} />
      ))}
    </div>
  );
};

// ❌ Bad - Over-memoization
export const BadUserList = ({ users }: { users: User[] }) => {
  // Unnecessary memoization for simple operations
  const userCount = useMemo(() => users.length, [users]);
  const hasUsers = useMemo(() => users.length > 0, [users]);

  return <div>{/* ... */}</div>;
};
```

---

## Core Web Vitals Optimization

**Purpose**: Improve Core Web Vitals scores for better user experience and SEO.

### Largest Contentful Paint (LCP)

```tsx
// ✅ Good - LCP optimization
export default function HomePage() {
  return (
    <div>
      {/* Hero image with priority loading */}
      <Image
        src="/hero-image.jpg"
        alt="Hero"
        width={1920}
        height={1080}
        priority // Critical for LCP
        sizes="100vw"
      />

      {/* Critical above-the-fold content */}
      <h1>Welcome to Our Site</h1>
      <p>Important content visible immediately</p>

      {/* Non-critical content loaded later */}
      <Suspense fallback={<Skeleton />}>
        <BelowFoldContent />
      </Suspense>
    </div>
  );
}

// Optimize web fonts for LCP
// In layout.tsx or _document.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-inter">{children}</body>
    </html>
  );
}
```

### First Input Delay (FID)

```tsx
// ✅ Good - FID optimization with event delegation
'use client';

import { useCallback, startTransition } from 'react';

export const OptimizedList = ({ items }: { items: Item[] }) => {
  // Use event delegation for better performance
  const handleItemClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const itemId = target.closest('[data-item-id]')?.getAttribute('data-item-id');

    if (itemId) {
      // Use startTransition for non-urgent updates
      startTransition(() => {
        updateItem(itemId);
      });
    }
  }, []);

  return (
    <div onClick={handleItemClick}>
      {items.map((item) => (
        <div key={item.id} data-item-id={item.id} className="item">
          <h3>{item.title}</h3>
          <button>Action</button>
        </div>
      ))}
    </div>
  );
};

// ❌ Bad - Multiple event listeners
export const BadList = ({ items }: { items: Item[] }) => {
  return (
    <div>
      {items.map((item) => (
        <div key={item.id} className="item">
          <h3>{item.title}</h3>
          {/* Each button creates a new event listener */}
          <button onClick={() => updateItem(item.id)}>Action</button>
        </div>
      ))}
    </div>
  );
};
```

### Cumulative Layout Shift (CLS)

```tsx
// ✅ Good - CLS prevention
export const StableLayout = () => {
  return (
    <div>
      {/* Reserve space for images */}
      <div className="aspect-video relative">
        <Image
          src="/dynamic-image.jpg"
          alt="Dynamic content"
          fill
          className="object-cover"
        />
      </div>

      {/* Reserve space for dynamic content */}
      <div className="min-h-[200px]">
        <Suspense fallback={<ContentSkeleton />}>
          <DynamicContent />
        </Suspense>
      </div>

      {/* Fixed dimensions for loading states */}
      <div className="h-16 w-full">
        <Suspense fallback={<div className="h-16 bg-gray-200 animate-pulse" />}>
          <ActionBar />
        </Suspense>
      </div>
    </div>
  );
};

// CSS for aspect ratios and stable layouts
// globals.css
.aspect-video {
  aspect-ratio: 16 / 9;
}

.aspect-square {
  aspect-ratio: 1 / 1;
}

/* Stable skeleton loading */
.skeleton {
  @apply animate-pulse bg-gray-200;
}
```

---

## Accessibility Guidelines

**Purpose**: Ensure the application is usable by everyone, including users with disabilities.

### Semantic HTML

```tsx
// ✅ Good - Semantic HTML structure
export const ArticlePage = ({ article }: { article: Article }) => {
  return (
    <main>
      <article>
        <header>
          <h1>{article.title}</h1>
          <p>
            Published on{' '}
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </p>
        </header>

        <section>
          <h2>Introduction</h2>
          <p>{article.excerpt}</p>
        </section>

        <section>
          <h2>Content</h2>
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </section>

        <footer>
          <p>Author: {article.author}</p>
        </footer>
      </article>

      <aside>
        <h2>Related Articles</h2>
        <nav aria-label="Related articles">
          <ul>
            {article.relatedArticles.map((related) => (
              <li key={related.id}>
                <a href={`/articles/${related.slug}`}>{related.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </main>
  );
};

// ❌ Bad - Non-semantic structure
export const BadArticlePage = ({ article }: { article: Article }) => {
  return (
    <div>
      <div>
        <div>{article.title}</div>
        <div>{article.publishedAt}</div>
      </div>
      <div>{article.content}</div>
    </div>
  );
};
```

### ARIA Labels and Descriptions

```tsx
// ✅ Good - Proper ARIA usage
export const SearchForm = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form role="search" aria-label="Site search">
      <div>
        <label htmlFor="search-input" className="sr-only">
          Search query
        </label>
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          aria-describedby="search-description"
          aria-expanded={results.length > 0}
          aria-haspopup="listbox"
        />

        <button type="submit" aria-label="Submit search" disabled={isLoading}>
          {isLoading ? <span aria-hidden="true">⏳</span> : <span aria-hidden="true">🔍</span>}
        </button>
      </div>

      <div id="search-description" className="sr-only">
        Enter keywords to search the site
      </div>

      {results.length > 0 && (
        <ul role="listbox" aria-label="Search results" aria-live="polite">
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={false}>
              <a href={result.url}>{result.title}</a>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};
```

### Focus Management

```tsx
// ✅ Good - Focus management
'use client';

import { useRef, useEffect } from 'react';

export const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement;

      // Focus the modal
      modalRef.current?.focus();

      // Trap focus within modal
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }

        if (event.key === 'Tab') {
          trapFocus(event, modalRef.current);
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);

        // Restore focus to previous element
        if (previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} aria-hidden="true">
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}
```

---

## Keyboard Navigation

**Purpose**: Ensure full functionality is available via keyboard.

### Custom Keyboard Interactions

```tsx
// ✅ Good - Keyboard navigation support
'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface DropdownProps {
  options: { id: string; label: string }[];
  onSelect: (option: { id: string; label: string }) => void;
  placeholder?: string;
}

export const Dropdown = ({ options, onSelect, placeholder }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedOption, setSelectedOption] = useState<(typeof options)[0] | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setSelectedIndex(0);
        } else if (selectedIndex >= 0) {
          handleSelect(options[selectedIndex]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        }
        break;

      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setSelectedIndex(0);
        }
        break;

      case 'End':
        if (isOpen) {
          event.preventDefault();
          setSelectedIndex(options.length - 1);
        }
        break;
    }
  };

  const handleSelect = (option: (typeof options)[0]) => {
    setSelectedOption(option);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(option);
    buttonRef.current?.focus();
  };

  return (
    <div className="dropdown">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby="dropdown-label"
        onKeyDown={handleKeyDown}
        onClick={() => setIsOpen(!isOpen)}
        className="dropdown-trigger"
      >
        {selectedOption?.label || placeholder || 'Select an option'}
        <span aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby="dropdown-label"
          className="dropdown-list"
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={selectedIndex === index}
              className={`dropdown-option ${selectedIndex === index ? 'highlighted' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### Skip Links

```tsx
// ✅ Good - Skip navigation implementation
export const SkipNavigation = () => {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onFocus={(e) => e.target.scrollIntoView()}
    >
      Skip to main content
    </a>
  );
};

// CSS for skip link
// globals.css
.skip-link {
  @apply absolute left-0 top-0 z-50 bg-blue-600 text-white px-4 py-2 rounded;
  transform: translateY(-100%);
  transition: transform 0.3s;
}

.skip-link:focus {
  transform: translateY(0);
}
```

---

## Summary

This performance and accessibility guide emphasizes:

1. **Strategic Code Splitting** - Dynamic imports for optimal bundle sizes
2. **Image Optimization** - Next.js Image component best practices
3. **Smart Memoization** - Preventing unnecessary re-renders
4. **Core Web Vitals** - Optimizing for Google's performance metrics
5. **Universal Accessibility** - Ensuring usability for all users
6. **Keyboard Navigation** - Complete keyboard accessibility

By following these guidelines, you can create applications that are:

- Fast and performant across all devices
- Accessible to users with disabilities
- Optimized for search engines
- Compliant with web standards

---

## Related Documentation

- [Next.js Patterns](../core/nextjs-patterns.en.md) - Framework-specific optimizations
- [TypeScript Guidelines](../core/typescript-guidelines.en.md) - Type-safe performance patterns
- [Testing Guidelines](./testing-guidelines.en.md) - Performance testing strategies
