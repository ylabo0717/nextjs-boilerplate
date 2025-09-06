# Security Guidelines

This document defines security best practices for Next.js + React + TypeScript projects.

## Table of Contents

1. [Things You Must Not Implement on Client Side](#things-you-must-not-implement-on-client-side)
2. [Secure Implementation Patterns](#secure-implementation-patterns)
3. [Authentication & Authorization Implementation](#authentication--authorization-implementation)
4. [Data Validation and Sanitization](#data-validation-and-sanitization)
5. [CSRF Protection](#csrf-protection)
6. [Security Headers](#security-headers)

---

## Things You Must Not Implement on Client Side

**Purpose**: Prevent security vulnerabilities and protect confidential data.

### 1. Authentication Processing (Absolutely Forbidden)

```tsx
// ❌ Dangerous - Client-side authentication
'use client';
export const LoginForm = () => {
  const handleLogin = async (email: string, password: string) => {
    // Client-side authentication - Absolutely NO!
    if (email === 'admin@example.com' && password === 'secret') {
      localStorage.setItem('isAuthenticated', 'true');
    }
  };
};

// ✅ Safe - Server-side authentication
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Server-side authentication
  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Secure session management
  const sessionToken = await createSession(user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 86400, // 24 hours
  });

  return response;
}
```

### 2. Direct Manipulation of Confidential Information (Absolutely Forbidden)

```tsx
// ❌ Dangerous - Client-side confidential data processing
'use client';
const API_SECRET = 'sk-123456789'; // Absolutely NO!
const DATABASE_URL = 'postgresql://...'; // Absolutely NO!

// ✅ Safe - Server-side confidential data processing
// app/api/users/route.ts
export async function GET() {
  // Retrieve from environment variables on server side
  const apiSecret = process.env.API_SECRET;
  const response = await fetch('https://api.example.com/users', {
    headers: { Authorization: `Bearer ${apiSecret}` },
  });

  const users = await response.json();

  // Send only necessary information to client
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      // email: user.email - Exclude confidential information
    })),
  });
}
```

### 3. Permission Checks (Absolutely Forbidden)

```tsx
// ❌ Dangerous - Client-side permission checks
'use client';
export const AdminPanel = () => {
  const user = useUser();

  // Client-side permission checks are unreliable
  if (user.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return <AdminInterface />; // Still accessible via DevTools
};

// ✅ Safe - Server-side permission checks
// app/admin/page.tsx (Server Component)
export default async function AdminPage() {
  const session = await getServerSession();

  // Server-side permission check
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <AdminInterface />;
}

// API routes also need server-side checks
// app/api/admin/users/route.ts
export async function GET() {
  const session = await getServerSession();

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with admin operation
  const users = await getAllUsers();
  return NextResponse.json({ users });
}
```

---

## Secure Implementation Patterns

### 1. Server Components for Sensitive Data

```tsx
// ✅ Good - Server Component for sensitive operations
// app/dashboard/page.tsx
export default async function Dashboard() {
  // Server-side data fetching with authentication
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const userData = await getUserData(session.user.id);

  return (
    <div>
      <h1>Welcome, {userData.name}</h1>
      <UserProfile data={userData} />
    </div>
  );
}
```

### 2. API Route Security

```tsx
// ✅ Good - Secure API route implementation
// app/api/profile/route.ts
export async function GET() {
  try {
    // 1. Authentication check
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Input validation (if any)
    // 3. Authorization check (if needed)

    // 4. Secure data retrieval
    const profile = await getProfileData(session.user.id);

    // 5. Data sanitization before response
    const sanitizedProfile = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      // Exclude sensitive fields
    };

    return NextResponse.json({ profile: sanitizedProfile });
  } catch (error) {
    // 6. Secure error handling
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Environment Variables Management

```typescript
// ✅ Good - Environment variable configuration
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public variables (can be sent to client)
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),

  // Private variables (server-only)
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  API_SECRET_KEY: z.string(),
});

export const env = envSchema.parse(process.env);

// Usage in API routes
// app/api/auth/route.ts
import { env } from '@/config/env';

export async function POST() {
  // ✅ Safe - server-side access to secrets
  const token = jwt.sign(payload, env.JWT_SECRET);
  // ...
}
```

---

## Authentication & Authorization Implementation

### 1. JWT Token Security

```typescript
// ✅ Good - Secure JWT implementation
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createToken(payload: { userId: string; role: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('your-app')
    .setAudience('your-users')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'your-app',
      audience: 'your-users',
    });
    return payload as { userId: string; role: string };
  } catch {
    throw new Error('Invalid token');
  }
}
```

### 2. Session Management

```typescript
// ✅ Good - Secure session implementation
// lib/session.ts
export async function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });

  return sessionId;
}

export async function getSession(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}
```

### 3. Role-Based Access Control

```typescript
// ✅ Good - RBAC implementation
// lib/rbac.ts
export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
} as const;

export const ROLE_PERMISSIONS = {
  user: [PERMISSIONS.USER_READ],
  moderator: [PERMISSIONS.USER_READ, PERMISSIONS.USER_WRITE],
  admin: Object.values(PERMISSIONS),
} as const;

export function hasPermission(
  userRole: keyof typeof ROLE_PERMISSIONS,
  permission: string
): boolean {
  return ROLE_PERMISSIONS[userRole].includes(permission);
}

// Usage in API routes
export async function GET() {
  const session = await getServerSession();

  if (!hasPermission(session.user.role, PERMISSIONS.USER_READ)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with operation
}
```

---

## Data Validation and Sanitization

### 1. Input Validation with Zod

```typescript
// ✅ Good - Input validation
// lib/validations/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(['user', 'moderator', 'admin']).default('user'),
});

export const updateUserSchema = createUserSchema.partial();

// Usage in API route
// app/api/users/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate and sanitize input
    const validatedData = createUserSchema.parse(body);

    // Proceed with validated data
    const user = await createUser(validatedData);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2. XSS Prevention

```tsx
// ✅ Good - XSS prevention
import DOMPurify from 'isomorphic-dompurify';

// For user-generated content
export const SafeHTML = ({ content }: { content: string }) => {
  const sanitizedContent = DOMPurify.sanitize(content);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizedContent,
      }}
    />
  );
};

// For form inputs
export const UserCommentForm = () => {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Sanitize on client side as well (defense in depth)
    const sanitizedComment = DOMPurify.sanitize(comment);

    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: sanitizedComment }),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

---

## CSRF Protection

### 1. CSRF Token Implementation

```typescript
// ✅ Good - CSRF protection
// lib/csrf.ts
import { createHash, randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, secret: string): boolean {
  const expectedToken = createHash('sha256')
    .update(secret + process.env.CSRF_SECRET!)
    .digest('hex');

  return token === expectedToken;
}

// Middleware for CSRF protection
// middleware.ts
export function middleware(request: NextRequest) {
  // CSRF protection for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionId = request.cookies.get('session')?.value;

    if (!csrfToken || !sessionId || !validateCSRFToken(csrfToken, sessionId)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  return NextResponse.next();
}
```

### 2. SameSite Cookie Configuration

```typescript
// ✅ Good - Secure cookie configuration
// lib/cookies.ts
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 86400, // 24 hours
};

// Usage in API routes
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('session', sessionToken, COOKIE_OPTIONS);

  return response;
}
```

---

## Security Headers

### 1. Next.js Security Headers Configuration

```typescript
// ✅ Good - Security headers configuration
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2. Content Security Policy (CSP)

```typescript
// ✅ Good - Strict CSP configuration
const cspHeader = `
  default-src 'self';
  script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s+/g, ' ').trim());

  return response;
}
```

---

## Summary

Key security principles for Next.js applications:

1. **Server-Side Security**: All authentication, authorization, and sensitive operations must be performed on the server
2. **Input Validation**: Validate and sanitize all user inputs using schemas like Zod
3. **Session Management**: Use secure, HTTP-only cookies with proper expiration
4. **Environment Separation**: Keep secrets in environment variables, never in client code
5. **Defense in Depth**: Implement multiple layers of security (validation, sanitization, headers, etc.)
6. **Security Headers**: Configure proper security headers including CSP, CSRF protection
7. **Regular Updates**: Keep dependencies updated and monitor for security vulnerabilities

By following these guidelines, you can build secure Next.js applications that protect user data and prevent common security vulnerabilities.

---

## Related Documentation

- [Coding Guidelines Overview](../core/coding-guidelines-overview.en.md) - Basic security principles
- [TypeScript Guidelines](../core/typescript-guidelines.en.md) - Type-safe input validation
- [Review Checklist](../quality/review-checklist.en.md) - Security review checklist
