# セキュリティガイドライン

このドキュメントは、Next.js + React + TypeScript プロジェクトにおけるセキュリティのベストプラクティスを定義します。

## 目次

1. [クライアントサイドで実装してはいけないもの](#クライアントサイドで実装してはいけないもの)
2. [セキュアな実装パターン](#セキュアな実装パターン)
3. [認証・認可の実装](#認証認可の実装)
4. [データ検証とサニタイゼーション](#データ検証とサニタイゼーション)
5. [CSRF対策](#csrf対策)
6. [セキュリティヘッダー](#セキュリティヘッダー)

---

## クライアントサイドで実装してはいけないもの

**目的**: セキュリティ脆弱性を防ぎ、機密データを保護する。

### 1. 認証処理（絶対禁止）

```tsx
// ❌ 危険 - クライアントサイドでの認証
'use client';
export const LoginForm = () => {
  const handleLogin = async (email: string, password: string) => {
    // クライアントで認証処理 - 絶対にNG！
    if (email === 'admin@example.com' && password === 'secret') {
      localStorage.setItem('isAuthenticated', 'true');
    }
  };
};

// ✅ 安全 - サーバーサイドでの認証
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  // サーバーサイドで認証
  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // セキュアなセッション管理
  const sessionToken = await createSession(user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 86400, // 24時間
  });

  return response;
}
```

### 2. 機密情報の直接操作（絶対禁止）

```tsx
// ❌ 危険 - クライアントでの機密データ処理
'use client';
const API_SECRET = 'sk-123456789'; // 絶対にNG！
const DATABASE_URL = 'postgresql://...'; // 絶対にNG！

// ✅ 安全 - サーバーサイドでの機密データ処理
// app/api/users/route.ts
export async function GET() {
  // 環境変数からサーバーサイドで取得
  const apiSecret = process.env.API_SECRET;
  const response = await fetch('https://api.example.com/users', {
    headers: { Authorization: `Bearer ${apiSecret}` },
  });

  const users = await response.json();

  // 必要な情報のみクライアントに送信
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      // email: user.email - 機密情報は除外
    })),
  });
}
```

### 3. 権限チェック（絶対禁止）

```tsx
// ❌ 危険 - クライアントサイドでの権限チェック
'use client';
export const AdminPanel = () => {
  const user = useUser();

  // クライアントでの権限チェックは信頼できない
  if (user.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return <SensitiveAdminContent />;
};

// ✅ 安全 - サーバーサイドでの権限チェック
// app/admin/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function AdminPage() {
  const session = await getServerSession();

  // サーバーサイドで権限チェック
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <AdminContent />;
}
```

---

## セキュアな実装パターン

### 入力値の検証とサニタイゼーション

```tsx
// ✅ Good - Zodによる入力値検証
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

// API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userData = UserSchema.parse(body); // 検証とサニタイゼーション

    // 検証済みデータのみ処理
    const user = await createUser(userData);
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### SQL インジェクション対策

```typescript
// ✅ Good - パラメータ化クエリ
import { db } from '@/lib/database';

export async function getUserByEmail(email: string) {
  // パラメータ化クエリを使用
  return await db.query('SELECT * FROM users WHERE email = $1', [email]);
}

// ✅ Good - ORMの使用
import { prisma } from '@/lib/prisma';

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

// ❌ 危険 - 文字列結合（SQLインジェクション脆弱性）
export async function getUserByEmail(email: string) {
  return await db.query(`SELECT * FROM users WHERE email = '${email}'`);
}
```

---

## 認証・認可の実装

### セッション管理

```typescript
// ✅ Good - セキュアなセッション管理
// lib/session.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(userId: string) {
  const payload = {
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
}

export async function verifySession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = cookies();
  cookieStore.delete('session');
}
```

### ミドルウェアによる認証チェック

```typescript
// ✅ Good - middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保護されたルートのチェック
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    const session = await verifySession();

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 管理者ページの追加チェック
    if (pathname.startsWith('/admin')) {
      const user = await getUserById(session.userId);
      if (user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## データ検証とサニタイゼーション

### フォーム入力の検証

```tsx
// ✅ Good - クライアント・サーバー両方での検証
'use client';

import { z } from 'zod';
import { useState } from 'react';

const ContactFormSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  message: z.string().min(10, 'メッセージは10文字以上で入力してください').max(1000),
});

type ContactFormData = z.infer<typeof ContactFormSchema>;

export const ContactForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // クライアントサイドでの事前検証
      const data: ContactFormData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        message: formData.get('message') as string,
      };

      const validatedData = ContactFormSchema.parse(data);

      // サーバーアクション呼び出し
      const result = await submitContactForm(validatedData);

      if (!result.success) {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit}>
      <div>
        <label htmlFor="name">名前</label>
        <input id="name" name="name" required />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" required />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label htmlFor="message">メッセージ</label>
        <textarea id="message" name="message" required />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '送信中...' : '送信'}
      </button>

      {errors.submit && <div className="error">{errors.submit}</div>}
    </form>
  );
};

// サーバーアクション
async function submitContactForm(data: ContactFormData) {
  try {
    // サーバーサイドでの再検証（必須）
    const validatedData = ContactFormSchema.parse(data);

    // HTMLサニタイゼーション
    const sanitizedData = {
      name: sanitizeHtml(validatedData.name),
      email: validatedData.email.toLowerCase(),
      message: sanitizeHtml(validatedData.message),
    };

    // データベースに保存
    await saveContactForm(sanitizedData);

    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    return { success: false, error: 'フォームの送信に失敗しました' };
  }
}
```

---

## CSRF対策

```typescript
// ✅ Good - CSRF トークンの実装
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, verifyCSRFToken } from '@/lib/csrf';

export async function middleware(request: NextRequest) {
  // POSTリクエストにはCSRFトークンを要求
  if (request.method === 'POST') {
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken || !csrfToken || !verifyCSRFToken(csrfToken, sessionToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  // CSRFトークンをヘッダーに追加
  const response = NextResponse.next();
  if (request.method === 'GET') {
    const sessionToken = request.cookies.get('session')?.value;
    if (sessionToken) {
      const csrfToken = generateCSRFToken(sessionToken);
      response.headers.set('x-csrf-token', csrfToken);
    }
  }

  return response;
}

// lib/csrf.ts
import crypto from 'crypto';

export function generateCSRFToken(sessionToken: string): string {
  const timestamp = Date.now().toString();
  const data = `${sessionToken}:${timestamp}`;
  const hash = crypto.createHmac('sha256', process.env.CSRF_SECRET!).update(data).digest('hex');
  return `${timestamp}:${hash}`;
}

export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  try {
    const [timestamp, hash] = token.split(':');
    const tokenAge = Date.now() - parseInt(timestamp);

    // トークンの有効期限チェック（1時間）
    if (tokenAge > 60 * 60 * 1000) {
      return false;
    }

    const data = `${sessionToken}:${timestamp}`;
    const expectedHash = crypto
      .createHmac('sha256', process.env.CSRF_SECRET!)
      .update(data)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}
```

---

## セキュリティヘッダー

```typescript
// ✅ Good - next.config.mjs でのセキュリティヘッダー設定
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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

### 環境変数の管理

```typescript
// ✅ Good - 環境変数の適切な管理
// .env.local
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secret-key
API_KEY=your-api-key

// .env.example（リポジトリにコミット）
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key

// lib/env.ts - 環境変数の検証
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

export const env = envSchema.parse(process.env);

// 使用例
import { env } from '@/lib/env';

const dbConnection = await connect(env.DATABASE_URL);
```

---

## まとめ

このセキュリティガイドラインに従うことで：

1. **機密情報の保護** - サーバーサイドでの適切な処理
2. **認証・認可の強化** - セキュアなセッション管理
3. **入力値の検証** - XSS、SQLインジェクション対策
4. **CSRF攻撃の防止** - トークンベースの保護
5. **セキュリティヘッダー** - 包括的な脆弱性対策

セキュリティは継続的な取り組みです。新機能実装時には必ずセキュリティ観点での検証を行い、定期的な脆弱性診断を実施することを推奨します。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - セキュリティファースト原則
- [TypeScript](./typescript-guidelines.md) - 型安全なセキュリティ実装
- [Next.js パターン](./nextjs-patterns.md) - セキュアなServer/Client Components
