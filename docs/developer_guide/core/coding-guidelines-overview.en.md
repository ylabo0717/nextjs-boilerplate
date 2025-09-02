# Coding Guidelines - Overview

This document provides an overview of coding standards and best practices for Next.js 15.x (App Router) + React 19 + TypeScript projects.

## 📚 Guidelines Structure

These guidelines are divided into the following files:

- **[Overview](./coding-guidelines-overview.en.md)** - Basic policies, SSOT principles, prohibited practices (this file)
- **[TypeScript](./typescript-guidelines.en.md)** - Type definitions, naming conventions, type guards
- **[Next.js Patterns](./nextjs-patterns.en.md)** - Server/Client Components, routing, React design
- **[Architecture Guidelines](./architecture-guidelines.en.md)** - Function-first approach, design patterns
- **[Security](../security/security-guidelines.en.md)** - Secure implementation patterns, vulnerability countermeasures
- **[Performance](../quality/performance-guidelines.en.md)** - Optimization, accessibility
- **[Development & Maintenance](../development/development-guidelines.en.md)** - State management, error handling, styling
- **[Testing](../quality/testing-guidelines.en.md)** - Test strategy, test pyramid

---

## Basic Policies

### Framework-Native Approach

**Purpose**: Ensure ecosystem integration and long-term maintainability.

**Reason**: Third-party style guides (such as Airbnb) have dependency conflict risks and may not keep up with Next.js evolution.

```javascript
// ✅ Good - Next.js recommended configuration
// config/quality/eslint.config.mjs
...compat.extends('next/core-web-vitals', 'next/typescript')

// ❌ Bad - Full adoption of third-party configuration
...compat.extends('airbnb-typescript')  // Dependency conflict risk
```

### Security First

**Purpose**: Establish development patterns that prioritize application security.

**Benefits**:

- Prevention of data breaches
- Protection against XSS, CSRF, and other attacks
- Proper implementation of authentication and authorization

---

## Single Source of Truth (SSOT) Principle

**Purpose**: Establish a single, reliable source for all configuration values, constants, and thresholds.

**Benefits**:

- **Consistency**: Same values are used throughout the project
- **Maintainability**: Updates in one place reflect across the entire project
- **Clarity**: Clear origin for each value
- **Type Safety**: TypeScript ensures correct usage

### Implementation Patterns

```typescript
// ✅ Good - Centralized constant management
// src/constants/index.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  TIMEOUT: 5000,
  RETRY_ATTEMPTS: 3,
} as const;

// src/constants/ui.ts
export const UI_CONSTANTS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  DEBOUNCE_DELAY: 300,
  PAGINATION_SIZE: 20,
} as const;

// Usage example
import { API_CONFIG } from '@/constants';
const response = await fetch(API_CONFIG.BASE_URL, {
  signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
});
```

```typescript
// ❌ Bad - Duplicated values
// components/UserList.tsx
const PAGE_SIZE = 20;

// components/ProductList.tsx
const PAGE_SIZE = 20; // Duplicate!

// services/api.ts
const TIMEOUT = 5000;

// utils/http.ts
const TIMEOUT = 5000; // Duplicate!
```

### Environment Variable Usage

```typescript
// ✅ Good - Use environment variables only for environment-specific values
// Deployment-specific configuration
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;

// Application constants managed in constant files
const MAX_RETRY_ATTEMPTS = 3; // defined in constants/index.ts

// ❌ Bad - Overriding constants with environment variables
const MAX_RETRY_ATTEMPTS = process.env.MAX_RETRY_ATTEMPTS ?? 3;
```

---

### Duplication Detection and Correction Flow

1. Detection: Identify constant literal duplications through reviews / static analysis / `grep`
2. Extraction: Decide on representative naming and add to `src/constants/` (immutabilize with `as const`)
3. Replacement: Batch replace existing locations with new constants to minimize diff
4. Verification: Run TypeScript build & tests to confirm no regressions
5. Documentation: Record change reasons in PR description and CHANGELOG (explicitly note backward compatibility impact if any)

> Automation candidate: Consider adding scripts to detect frequent patterns (size thresholds, pagination lengths, etc.) for future automation.

## Prohibited Practices

### Security-Related

1. **Client-side exposure of sensitive information**

   ```tsx
   // ❌ Absolutely prohibited
   const API_SECRET = 'sk-123456789';
   const DATABASE_PASSWORD = 'secret123';
   ```

2. **Client-side authentication implementation**

   ```tsx
   // ❌ Absolutely prohibited
   localStorage.setItem('isAuthenticated', 'true');
   ```

3. **SQL injection vulnerabilities**
   ```tsx
   // ❌ Absolutely prohibited
   const query = `SELECT * FROM users WHERE id = ${userId}`;
   ```

### Performance-Related

1. **Unnecessary full imports of large libraries**

   ```tsx
   // ❌ Bad
   import * as lodash from 'lodash';

   // ✅ Good
   import { debounce } from 'lodash';
   ```

2. **useEffect causing infinite loops**

   ```tsx
   // ❌ Bad
   useEffect(() => {
     setData([...data, newItem]); // when data is in dependency array
   }, [data]);

   // ✅ Good
   useEffect(() => {
     setData((prev) => [...prev, newItem]);
   }, [newItem]);
   ```

### Type Safety-Related

1. **Use of any type**

   ```tsx
   // ❌ Bad
   const userData: any = fetchUserData();

   // ✅ Good
   const userData: User = fetchUserData();
   ```

2. **Excessive use of type assertions**

   ```tsx
   // ❌ Bad
   const user = data as User; // dangerous

   // ✅ Good
   if (isUser(data)) {
     // data is definitely User type
   }
   ```

### Accessibility-Related

1. **Clickable areas using div elements**

   ```tsx
   // ❌ Bad
   <div onClick={handleClick}>Click</div>

   // ✅ Good
   <button onClick={handleClick}>Click</button>
   ```

2. **Images without alt attributes**

   ```tsx
   // ❌ Bad
   <img src="profile.jpg" />

   // ✅ Good
   <img src="profile.jpg" alt="User profile image" />
   ```

### Code Quality-Related

1. **Use of magic numbers**

   ```tsx
   // ❌ Bad
   setTimeout(() => {}, 3000);

   // ✅ Good
   import { UI_WAIT_TIMES } from '@/constants';
   setTimeout(() => {}, UI_WAIT_TIMES.STANDARD);
   ```

2. **console.log remaining in production**

   ```tsx
   // ❌ Bad
   console.log('Debug info'); // Should not remain in production

   // ✅ Good
   if (process.env.NODE_ENV === 'development') {
     console.log('Debug info');
   }
   ```

---

## Summary

This coding guideline provides practical guidance to ensure quality, security, performance, and accessibility in Next.js 15 + React 19 + TypeScript projects.

### Key Principles

1. **Security First** - Always process sensitive information on the server side
2. **Single Source of Truth** - Centralized management of constants and configuration values
3. **Type Safety** - Maximum utilization of TypeScript features
4. **Performance Focus** - Improvement of Core Web Vitals
5. **Accessibility** - Consideration for all users
6. **Maintainability** - Design considering long-term maintenance

By following these principles, the entire team can efficiently develop consistent, high-quality code.

### Next Steps

For details on each topic, refer to the corresponding guideline files:

- Write type-safe code → [TypeScript Guidelines](./typescript-guidelines.en.md)
- Efficient Next.js development → [Next.js Patterns](./nextjs-patterns.en.md)
- Secure app development → [Security Guidelines](../security/security-guidelines.en.md)
- Performance optimization → [Performance Guidelines](../quality/performance-guidelines.en.md)

---

_These guidelines are regularly updated and evolve with project growth. If you have questions or improvement suggestions, let's discuss them as a team and continuously improve._