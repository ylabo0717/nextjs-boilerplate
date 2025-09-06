# TypeScript Guidelines

This document defines TypeScript-related best practices for Next.js 15.x + React 19 + TypeScript projects.

## Table of Contents

1. [Type Definition Principles](#type-definition-principles)
2. [Naming Conventions](#naming-conventions)
3. [Export Conventions](#export-conventions)
4. [Type Guards](#type-guards)
5. [Schema Validation with Zod](#schema-validation-with-zod)
6. [Import/Export Conventions](#importexport-conventions)
7. [Guidelines for any / unknown / satisfies](#guidelines-for-any--unknown--satisfies)

---

## Type Definition Principles

**Purpose**: Prevent runtime errors and improve developer experience.

**Benefits**:

- Bug detection at compile time
- IDE auto-completion and refactoring support
- Specification documentation

```typescript
// ✅ Good - Explicit and specific type definitions
interface User {
  readonly id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  settings?: UserSettings;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// ❌ Bad - Using any
interface User {
  id: any;
  data: any;
  metadata: any;
}
```

---

## Naming Conventions

**Purpose**: Ensure code readability and consistency.

```typescript
// ✅ Good - Consistent naming conventions
// Type names: PascalCase
interface UserProfile {}
type ApiResponse<T> = {};

// Variables and functions: camelCase
const userName = 'john';
const getUserProfile = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 1024;
const API_ENDPOINTS = {};

// Components: PascalCase
const UserProfileCard = () => {};

// File names: kebab-case or camelCase
// user-profile.tsx or userProfile.tsx
```

---

## Export Conventions

**Purpose**: Clarify module boundaries and make refactoring safe.

```typescript
// ✅ Good - Prefer named exports
// utils/format.ts
export const formatCurrency = (amount: number) => {};
export const formatDate = (date: Date) => {};

// Named exports recommended for components too
// components/Button.tsx
export const Button = ({ children }: ButtonProps) => {};

// ❌ Bad - default export (unstable names during refactoring)
export default function Button() {}
```

---

## Type Guards

**Purpose**: Safe type narrowing and runtime type checking.

```typescript
// ✅ Good - Custom type guards
interface User {
  id: string;
  name: string;
  email: string;
}

// Type guard function
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Usage
function handleUserData(data: unknown) {
  if (isUser(data)) {
    // data is safely typed as User here
    console.log(data.name); // ✅ Type safe
  }
}

// ❌ Bad - Type assertion without validation
function handleUserData(data: unknown) {
  const user = data as User; // Dangerous!
  console.log(user.name); // May cause runtime error
}
```

### Advanced Type Guards

```typescript
// Array type guard
function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}

// Discriminated union type guard
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

function isSuccessResponse<T>(response: ApiResponse<T>): response is { success: true; data: T } {
  return response.success === true;
}

// Usage
async function fetchUser(id: string) {
  const response: ApiResponse<User> = await api.getUser(id);

  if (isSuccessResponse(response)) {
    return response.data; // ✅ Typed as User
  } else {
    throw new Error(response.error); // ✅ Typed as string
  }
}
```

---

## Schema Validation with Zod

**Purpose**: Runtime validation with compile-time type inference.

### Basic Zod Usage

```typescript
import { z } from 'zod';

// ✅ Good - Zod schema definition
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.date(),
  settings: z
    .object({
      theme: z.enum(['light', 'dark', 'system']),
      language: z.enum(['ja', 'en']),
      notifications: z.object({
        email: z.boolean(),
        push: z.boolean(),
      }),
    })
    .optional(),
});

// Type inference from schema
type User = z.infer<typeof UserSchema>;

// Validation function
function validateUser(data: unknown): User {
  return UserSchema.parse(data); // Throws on validation failure
}

// Safe validation
function safeValidateUser(data: unknown): User | null {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

### API Response Validation

```typescript
// API response schema
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

// Usage
const UserApiResponseSchema = ApiResponseSchema(UserSchema);
type UserApiResponse = z.infer<typeof UserApiResponseSchema>;

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const rawData = await response.json();

  // Validate response structure
  const validatedResponse = UserApiResponseSchema.parse(rawData);

  if (validatedResponse.success && validatedResponse.data) {
    return validatedResponse.data;
  } else {
    throw new Error(validatedResponse.error || 'Unknown error');
  }
}
```

### Form Validation

```typescript
// Form schema
const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms',
  }),
});

type ContactFormData = z.infer<typeof ContactFormSchema>;

// React Hook Form integration
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    // data is fully typed and validated
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <textarea {...register('message')} />
      {errors.message && <span>{errors.message.message}</span>}

      <input type="checkbox" {...register('agreeToTerms')} />
      {errors.agreeToTerms && <span>{errors.agreeToTerms.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Import/Export Conventions

**Purpose**: Maintain clean module boundaries and improve maintainability.

### File Organization

```typescript
// ✅ Good - Organized exports
// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'ja' | 'en';
}

// utils/user.ts
import type { User, UserSettings } from '@/types/user';

export const createUser = (data: Partial<User>): User => {
  // Implementation
};

export const updateUserSettings = (user: User, settings: Partial<UserSettings>): User => {
  // Implementation
};

// components/UserProfile.tsx
import type { User } from '@/types/user';
import { updateUserSettings } from '@/utils/user';

export const UserProfile = ({ user }: { user: User }) => {
  // Component implementation
};
```

### Index Files

```typescript
// ✅ Good - Barrel exports with types
// components/index.ts
export { Button } from './Button';
export { UserProfile } from './UserProfile';
export { LoadingSpinner } from './LoadingSpinner';

// Re-export types
export type { ButtonProps } from './Button';
export type { UserProfileProps } from './UserProfile';

// utils/index.ts
export { formatCurrency, formatDate } from './format';
export { validateUser, createUser } from './user';
export { debounce, throttle } from './performance';
```

### Path Aliases

```typescript
// ✅ Good - Use path aliases
import { Button } from '@/components/Button';
import { formatCurrency } from '@/utils/format';
import { User } from '@/types/user';

// ❌ Bad - Relative imports from distant files
import { Button } from '../../../components/Button';
import { formatCurrency } from '../../utils/format';
```

---

## Guidelines for any / unknown / satisfies

### The `any` Type

**Rule**: Avoid `any` except in extremely rare cases.

```typescript
// ❌ Bad - Using any
function processData(data: any) {
  return data.someProperty.anotherProperty;
}

// ✅ Good - Use generics or unknown
function processData<T>(data: T): T {
  return data;
}

// Or use unknown for truly unknown data
function processUnknownData(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Type narrowing required
  }
}
```

### The `unknown` Type

**Rule**: Use `unknown` for truly unknown data that requires validation.

```typescript
// ✅ Good - Using unknown with validation
async function fetchApiData(url: string): Promise<unknown> {
  const response = await fetch(url);
  return response.json(); // Returns unknown
}

async function processApiData() {
  const data = await fetchApiData('/api/user');

  // Must validate before use
  if (isUser(data)) {
    console.log(data.name); // ✅ Safe after validation
  }
}

// ✅ Good - Unknown in error handling
try {
  // Some operation
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error occurred');
  }
}
```

### The `satisfies` Operator

**Rule**: Use `satisfies` to ensure type conformance while preserving literal types.

```typescript
// ✅ Good - Using satisfies for configuration
const themeConfig = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: {
      small: '12px',
      medium: '16px',
      large: '20px',
    },
  },
} satisfies {
  colors: Record<string, string>;
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
  };
};

// Type is preserved: themeConfig.colors.primary is '#007bff', not string
const primaryColor = themeConfig.colors.primary; // Type: '#007bff'

// ✅ Good - API endpoint configuration
const API_ENDPOINTS = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments',
} satisfies Record<string, `/${string}`>;

// Literal types preserved
const usersEndpoint = API_ENDPOINTS.users; // Type: '/api/users'
```

---

## Summary

This TypeScript guideline emphasizes:

1. **Type Safety First** - Prioritize compile-time error detection
2. **Explicit over Implicit** - Clear type definitions over inference when clarity matters
3. **Runtime Validation** - Use Zod for external data validation
4. **Consistent Naming** - Follow established conventions
5. **Module Clarity** - Clear import/export patterns
6. **Avoid `any`** - Use `unknown` and type guards instead

By following these guidelines, you can write TypeScript code that is:

- Safe from runtime type errors
- Easy to refactor and maintain
- Self-documenting through types
- Compatible with modern tooling

---

## Related Documentation

- [Coding Guidelines Overview](./coding-guidelines-overview.en.md) - Basic principles and SSOT
- [Next.js Patterns](./nextjs-patterns.en.md) - Framework-specific type usage
- [Architecture Guidelines](./architecture-guidelines.en.md) - Pure functions and type design
