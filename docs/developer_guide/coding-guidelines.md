# コーディングガイドライン

このドキュメントは、Next.js 15.4.6 + React 19.1.0 + TypeScript プロジェクトのコーディング標準とベストプラクティスを定義します。

## 目次

1. [基本方針](#基本方針)
2. [Single Source of Truth (SSOT) 原則](#single-source-of-truth-ssot-原則)
3. [TypeScript ガイドライン](#typescript-ガイドライン)
4. [Next.js 開発パターン](#nextjs-開発パターン)
5. [React コンポーネント設計](#react-コンポーネント設計)
6. [セキュリティガイドライン](#セキュリティガイドライン)
7. [パフォーマンス最適化](#パフォーマンス最適化)
8. [アクセシビリティガイドライン](#アクセシビリティガイドライン)
9. [状態管理](#状態管理)
10. [エラーハンドリング](#エラーハンドリング)
11. [スタイリング (Tailwind CSS)](#スタイリング-tailwind-css)
12. [テスト戦略](#テスト戦略)
13. [インポート・エクスポート規約](#インポートエクスポート規約)
14. [禁止事項](#禁止事項)

---

## 基本方針

### フレームワークネイティブ・アプローチ

**目的**: エコシステムとの統合性と長期的なメンテナンス性を確保する。

**理由**: サードパーティ製のスタイルガイド（Airbnb等）は依存関係の競合リスクがあり、Next.jsの進化に追従できない場合がある。

```javascript
// ✅ Good - Next.js推奨の設定
// eslint.config.mjs
...compat.extends('next/core-web-vitals', 'next/typescript')

// ❌ Bad - サードパーティ設定の全面採用
...compat.extends('airbnb-typescript')  // 依存関係競合リスク
```

### セキュリティファースト

**目的**: アプリケーションのセキュリティを最優先に考慮した開発パターンを確立する。

**効果**:

- データ漏洩の防止
- XSS、CSRF等の攻撃からの保護
- 認証・認可の適切な実装

---

## Single Source of Truth (SSOT) 原則

**目的**: すべての設定値、定数、閾値に単一の信頼できるソースを確立する。

**効果**:

- **一貫性**: 同じ値がプロジェクト全体で使用される
- **保守性**: 一箇所の更新で全体に反映される
- **明確性**: 各値の出所が明確
- **型安全性**: TypeScriptによる正しい使用の保証

### 実装パターン

```typescript
// ✅ Good - 定数の一元管理
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

// 使用例
import { API_CONFIG } from '@/constants';
const response = await fetch(API_CONFIG.BASE_URL, {
  signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
});
```

```typescript
// ❌ Bad - 重複する値
// components/UserList.tsx
const PAGE_SIZE = 20;

// components/ProductList.tsx
const PAGE_SIZE = 20; // 重複！

// services/api.ts
const TIMEOUT = 5000;

// utils/http.ts
const TIMEOUT = 5000; // 重複！
```

### 環境変数の使い分け

```typescript
// ✅ Good - 環境固有の値のみ環境変数を使用
// デプロイメント固有の設定
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;

// アプリケーション定数は定数ファイルで管理
const MAX_RETRY_ATTEMPTS = 3; // constants/index.ts に定義

// ❌ Bad - 定数を環境変数で上書き
const MAX_RETRY_ATTEMPTS = process.env.MAX_RETRY_ATTEMPTS ?? 3;
```

---

## TypeScript ガイドライン

### 型定義の原則

**目的**: 実行時エラーを防ぎ、開発者体験を向上させる。

**効果**:

- コンパイル時でのバグ検出
- IDEによる自動補完とリファクタリング支援
- 仕様の明文化

```typescript
// ✅ Good - 明示的で具体的な型定義
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

// ❌ Bad - any の使用
interface User {
  id: any;
  data: any;
  metadata: any;
}
```

### 命名規則

**目的**: コードの可読性と一貫性を確保する。

```typescript
// ✅ Good - 一貫した命名規則
// 型名: PascalCase
interface UserProfile {}
type ApiResponse<T> = {};

// 変数・関数: camelCase
const userName = 'john';
const getUserProfile = () => {};

// 定数: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 1024;
const API_ENDPOINTS = {};

// コンポーネント: PascalCase
const UserProfileCard = () => {};

// ファイル名: kebab-case または camelCase
// user-profile.tsx または userProfile.tsx
```

### エクスポート規約

**目的**: モジュール境界を明確にし、リファクタリングを安全にする。

```typescript
// ✅ Good - named exports を優先
// utils/format.ts
export const formatCurrency = (amount: number) => {};
export const formatDate = (date: Date) => {};

// コンポーネントも named export を推奨
// components/Button.tsx
export const Button = ({ children }: ButtonProps) => {};

// ❌ Bad - default export (リファクタリング時に名前が不安定)
export default function Button() {}
```

### 型ガード

**目的**: 型安全性を実行時まで保証する。

```typescript
// ✅ Good - 型ガードの活用
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj && 'email' in obj;
}

// 使用例
const data: unknown = await fetchUser();
if (isUser(data)) {
  // dataは確実にUser型
  console.log(data.name); // 型安全
}

// ❌ Bad - 型アサーション
const data = (await fetchUser()) as User; // 危険！
```

---

## Next.js 開発パターン

### Server Components と Client Components の使い分け

**目的**: パフォーマンス、SEO、セキュリティを最適化する。

**原則**:

1. **デフォルトはServer Components** - インタラクションが不要な限り
2. **Client Componentsは最小限** - 必要な部分のみ
3. **境界を明確に** - 'use client'ディレクティブの配置を慎重に

```tsx
// ✅ Good - Server Component（デフォルト）
// app/users/page.tsx
import { getUsersFromDatabase } from '@/lib/database';
import { UserList } from '@/components/UserList';

async function UsersPage() {
  // サーバーサイドでデータ取得
  const users = await getUsersFromDatabase();

  return (
    <div>
      <h1>ユーザー一覧</h1>
      <UserList users={users} />
    </div>
  );
}

export default UsersPage;
```

```tsx
// ✅ Good - Client Component（必要な部分のみ）
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
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="検索..." />
      <button type="submit">検索</button>
    </form>
  );
};
```

```tsx
// ❌ Bad - 不要なClient Component
'use client';

// インタラクションがないのにClient Componentにしている
export const StaticContent = ({ title }: { title: string }) => {
  return <h1>{title}</h1>;
};
```

### ルーティングとナビゲーション

**目的**: App Routerの機能を最大活用し、最適なユーザー体験を提供する。

```tsx
// ✅ Good - App Routerのベストプラクティス
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

// メタデータ生成
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  return {
    title: product?.name ?? 'Product Not Found',
    description: product?.description,
  };
}
```

### データ取得パターン

**目的**: Next.js 15のサーバーコンポーネントとキャッシュ機能を活用する。

```tsx
// ✅ Good - Server Componentsでのデータ取得
// app/dashboard/page.tsx
import { getUserDashboard } from '@/services/dashboard';
import { Suspense } from 'react';

export default async function DashboardPage() {
  return (
    <div>
      <h1>ダッシュボード</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  // サーバーサイドでデータ取得（自動キャッシュ）
  const dashboard = await getUserDashboard();

  return (
    <div>
      <StatsCards stats={dashboard.stats} />
      <RecentActivity activities={dashboard.activities} />
    </div>
  );
}

// ❌ Bad - Client Componentでの不要なuseEffect
('use client');
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    // クライアントサイドでデータ取得（非効率）
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then(setDashboard);
  }, []);

  // ...
}
```

---

## React コンポーネント設計

### コンポーネント分割の原則

**目的**: 再利用可能で保守しやすいコンポーネント設計を実現する。

**原則**:

1. **単一責任の原則** - 1つのコンポーネントは1つの責任
2. **合成優先** - 継承より合成を選択
3. **Props型の明確化** - インターフェースを明示

```tsx
// ✅ Good - 適切なコンポーネント分割
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ variant, size, disabled = false, children, onClick }: ButtonProps) => {
  return (
    <button
      className={cn(
        'rounded font-medium transition-colors',
        {
          'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
          'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
        },
        {
          'px-2 py-1 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        {
          'opacity-50 cursor-not-allowed': disabled,
        }
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Compound Components パターン

**目的**: 関連するコンポーネント群を効率的に管理する。

```tsx
// ✅ Good - Compound Components
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => {
  return <div className={cn('rounded-lg border bg-white shadow-sm', className)}>{children}</div>;
};

Card.Header = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4 border-b', className)}>{children}</div>
);

Card.Content = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

Card.Footer = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4 border-t', className)}>{children}</div>
);

// 使用例
<Card>
  <Card.Header>
    <h2>ユーザー情報</h2>
  </Card.Header>
  <Card.Content>
    <UserProfile user={user} />
  </Card.Content>
  <Card.Footer>
    <Button onClick={onEdit}>編集</Button>
  </Card.Footer>
</Card>;
```

### カスタムフック

**目的**: ロジックの再利用とコンポーネントの責任分離を実現する。

```tsx
// ✅ Good - カスタムフック
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// 使用例
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

---

## セキュリティガイドライン

### クライアントサイドで実装してはいけないもの（絶対禁止）

**目的**: セキュリティ脆弱性を防ぎ、機密データを保護する。

#### 1. 認証処理

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
  });

  return response;
}
```

#### 2. 機密情報の直接操作

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

#### 3. 権限チェック

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

### セキュアな実装パターン

#### 入力値のサニタイゼーション

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

#### CSRF対策

```tsx
// ✅ Good - CSRF トークンの実装
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  // POSTリクエストにはCSRFトークンを要求
  if (request.method === 'POST') {
    const csrfToken = request.headers.get('x-csrf-token');
    if (!isValidCSRFToken(csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  return NextResponse.next();
}
```

---

## パフォーマンス最適化

### 動的インポート

**目的**: バンドルサイズを最適化し、初期読み込み時間を短縮する。

```tsx
// ✅ Good - 動的インポートの活用
import { lazy, Suspense } from 'react';

// 重いコンポーネントを動的インポート
const HeavyChart = lazy(() => import('@/components/HeavyChart'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

export const Dashboard = ({ userRole }: { userRole: string }) => {
  return (
    <div>
      <h1>ダッシュボード</h1>

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

// ❌ Bad - すべて事前にインポート
import HeavyChart from '@/components/HeavyChart';
import AdminPanel from '@/components/AdminPanel';
```

### 画像最適化

**目的**: Core Web Vitalsを改善し、ページ読み込み速度を向上させる。

```tsx
// ✅ Good - Next.js Image コンポーネントの活用
import Image from 'next/image';

export const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="product-card">
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={300}
        height={200}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={product.featured} // ファーストビューの画像のみ
      />
      <h2>{product.name}</h2>
    </div>
  );
};

// ❌ Bad - 通常のimg要素
<img src={product.imageUrl} alt={product.name} />;
```

### メモ化戦略

**目的**: 不要な再レンダリングを防ぎ、パフォーマンスを向上させる。

```tsx
// ✅ Good - 適切なメモ化
import { memo, useMemo, useCallback } from 'react';

interface UserListProps {
  users: User[];
  onUserClick: (userId: string) => void;
}

export const UserList = memo(({ users, onUserClick }: UserListProps) => {
  // 重い計算をメモ化
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // コールバック関数をメモ化
  const handleUserClick = useCallback(
    (userId: string) => {
      onUserClick(userId);
    },
    [onUserClick]
  );

  return (
    <div>
      {sortedUsers.map((user) => (
        <UserCard key={user.id} user={user} onClick={handleUserClick} />
      ))}
    </div>
  );
});

// ❌ Bad - 過度なメモ化
const SimpleComponent = memo(() => {
  return <div>Simple text</div>; // メモ化する必要なし
});
```

---

## アクセシビリティガイドライン

### 基本原則

**目的**: すべてのユーザーがアプリケーションを利用できるようにする。

**効果**:

- 障害を持つユーザーの利用体験向上
- SEOの改善
- 法的コンプライアンスの確保

### 実装パターン

```tsx
// ✅ Good - アクセシブルなフォーム
export const ContactForm = () => {
  return (
    <form>
      <div>
        <label htmlFor="name">名前 *</label>
        <input
          id="name"
          type="text"
          required
          aria-describedby="name-error"
          aria-invalid={hasError}
        />
        {hasError && (
          <div id="name-error" role="alert" className="error">
            名前は必須です
          </div>
        )}
      </div>

      <div>
        <fieldset>
          <legend>お問い合わせ種別</legend>
          <label>
            <input type="radio" name="type" value="general" />
            一般的なお問い合わせ
          </label>
          <label>
            <input type="radio" name="type" value="support" />
            サポート
          </label>
        </fieldset>
      </div>

      <button type="submit">
        送信
        <span className="sr-only">お問い合わせフォームを</span>
      </button>
    </form>
  );
};

// ❌ Bad - アクセシビリティを考慮していない
export const ContactForm = () => {
  return (
    <form>
      <div>名前</div>
      <input type="text" />
      <div onClick={handleSubmit}>送信</div> {/* buttonを使用すべき */}
    </form>
  );
};
```

### キーボードナビゲーション

```tsx
// ✅ Good - キーボード操作対応
export const DropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          handleSelect(items[focusedIndex]);
        }
        break;
    }
  };

  return (
    <div>
      <button aria-expanded={isOpen} aria-haspopup="menu" onClick={() => setIsOpen(!isOpen)}>
        メニュー
      </button>
      {isOpen && (
        <ul role="menu" onKeyDown={handleKeyDown} tabIndex={-1}>
          {items.map((item, index) => (
            <li
              key={item.id}
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## 状態管理

### Local State vs Global State

**目的**: 適切なスコープで状態を管理し、複雑性を抑制する。

**原則**:

1. **Local First** - まずローカル状態を検討
2. **必要最小限のGlobal State** - 本当に共有が必要な状態のみ
3. **Server State の分離** - サーバーデータとクライアント状態を分ける

```tsx
// ✅ Good - ローカル状態で十分な場合
export const SearchForm = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState(''); // ローカル状態
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
      <input value={query} onChange={(e) => setQuery(e.target.value)} disabled={isLoading} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? '検索中...' : '検索'}
      </button>
    </form>
  );
};

// ❌ Bad - 不要なグローバル状態
// すべてをグローバル状態にする必要はない
const useGlobalStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearchLoading: false,
  setIsSearchLoading: (loading) => set({ isSearchLoading: loading }),
}));
```

### Context の適切な使用

```tsx
// ✅ Good - 適切なContext使用
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

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ❌ Bad - 巨大なContext
interface AppContextType {
  user: User;
  theme: string;
  language: string;
  notifications: Notification[];
  cart: CartItem[];
  // ... 30個のプロパティ
}
// 1つのContextに詰め込みすぎ
```

---

## エラーハンドリング

### 統一されたエラー処理

**目的**: 一貫したエラー体験を提供し、デバッグを容易にする。

```tsx
// ✅ Good - 統一されたエラー型
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// API エラーハンドリング
export async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new AppError('ユーザーの取得に失敗しました', 'USER_FETCH_FAILED', response.status, {
        userId: id,
      });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('ネットワークエラーが発生しました', 'NETWORK_ERROR', 500, {
      originalError: error.message,
    });
  }
}
```

### Error Boundary

```tsx
// ✅ Good - Error Boundary実装
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログサービスに送信
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ error }: { error: Error }) => (
  <div className="error-boundary">
    <h2>エラーが発生しました</h2>
    <p>申し訳ございません。予期しないエラーが発生しました。</p>
    <details>
      <summary>エラー詳細</summary>
      <pre>{error.message}</pre>
    </details>
    <button onClick={() => window.location.reload()}>ページを再読み込み</button>
  </div>
);

// 使用例
<ErrorBoundary fallback={CustomErrorFallback}>
  <UserDashboard />
</ErrorBoundary>;
```

---

## スタイリング (Tailwind CSS)

### Tailwind CSS 4.0 ベストプラクティス

**目的**: 一貫したデザインシステムを構築し、保守性を向上させる。

```tsx
// ✅ Good - cnユーティリティの活用
import { cn } from '@/utils/cn';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button = ({ variant, size, className, children }: ButtonProps) => {
  return (
    <button
      className={cn(
        // ベースクラス
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',

        // バリエーション
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90':
            variant === 'danger',
        },

        // サイズ
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },

        // カスタムクラス
        className
      )}
    >
      {children}
    </button>
  );
};

// ❌ Bad - 文字列連結
export const Button = ({ variant, className }: ButtonProps) => {
  let classes = 'btn ';
  if (variant === 'primary') classes += 'btn-primary ';
  if (className) classes += className;

  return <button className={classes}>{children}</button>;
};
```

### レスポンシブデザイン

```tsx
// ✅ Good - モバイルファーストアプローチ
export const ResponsiveGrid = ({ items }: { items: Item[] }) => {
  return (
    <div className={cn(
      // モバイル（デフォルト）
      'grid grid-cols-1 gap-4 p-4',

      // タブレット
      'sm:grid-cols-2 sm:gap-6 sm:p-6',

      // デスクトップ
      'lg:grid-cols-3 lg:gap-8 lg:p-8',

      // 大画面
      'xl:grid-cols-4'
    )}>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

// ❌ Bad - デスクトップファースト
<div className="grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
```

---

## テスト戦略

### テストピラミッド

**目的**: 効率的で信頼性の高いテストスイートを構築する。

**構成**:

1. **Unit Tests (70%)** - 個別の関数・コンポーネント
2. **Integration Tests (20%)** - コンポーネント間の連携
3. **E2E Tests (10%)** - ユーザーシナリオ

```typescript
// ✅ Good - Unit Test例
// utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from './format';

describe('formatCurrency', () => {
  it('should format number as Japanese yen', () => {
    expect(formatCurrency(1000)).toBe('¥1,000');
    expect(formatCurrency(0)).toBe('¥0');
    expect(formatCurrency(1234567)).toBe('¥1,234,567');
  });

  it('should handle decimal numbers', () => {
    expect(formatCurrency(99.99)).toBe('¥100'); // 四捨五入
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-¥500');
  });
});
```

```typescript
// ✅ Good - Integration Test例
// components/UserForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should submit form with valid data', async () => {
    render(<UserForm onSubmit={mockOnSubmit} />);

    // フォーム入力
    fireEvent.change(screen.getByLabelText('名前'), {
      target: { value: '田中太郎' }
    });
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'tanaka@example.com' }
    });

    // 送信
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    // 検証
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '田中太郎',
        email: 'tanaka@example.com'
      });
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<UserForm onSubmit={mockOnSubmit} />);

    // 無効なメールアドレスで送信
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid-email' }
    });
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

```typescript
// ✅ Good - E2E Test例
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete user registration successfully', async ({ page }) => {
    // ページにアクセス
    await page.goto('/register');

    // フォーム入力
    await page.fill('[data-testid="name-input"]', '田中太郎');
    await page.fill('[data-testid="email-input"]', 'tanaka@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');

    // 利用規約同意
    await page.check('[data-testid="terms-checkbox"]');

    // 送信
    await page.click('[data-testid="submit-button"]');

    // 成功メッセージの確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/dashboard');

    // ユーザー名の表示確認
    await expect(page.locator('[data-testid="user-name"]')).toHaveText('田中太郎');
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');

    // 既存のメールアドレスで登録試行
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.click('[data-testid="submit-button"]');

    // エラーメッセージの確認
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'このメールアドレスは既に使用されています'
    );
  });
});
```

---

## インポート・エクスポート規約

### インポート順序

**目的**: 依存関係を明確にし、コードの可読性を向上させる。

```tsx
// ✅ Good - 推奨インポート順序
// 1. React関連
import React, { useState, useEffect } from 'react';

// 2. Next.js関連
import Link from 'next/link';
import Image from 'next/image';

// 3. 外部ライブラリ
import { z } from 'zod';
import { clsx } from 'clsx';

// 4. 内部モジュール（@/から始まる）
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { formatDate } from '@/utils/format';

// 5. 相対インポート
import './component.css';

// 6. 型インポート（最後）
import type { User } from '@/types/user';
import type { ComponentProps } from 'react';
```

### エクスポート規約

```typescript
// ✅ Good - Named Exports（推奨）
// utils/validation.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

// コンポーネントもnamed exportを推奨
// components/UserCard.tsx
interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

export const UserCard = ({ user, onClick }: UserCardProps) => {
  return (
    <div onClick={() => onClick?.(user)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};

// 型も一緒にエクスポート
export type { UserCardProps };

// ❌ Avoid - Default Exports
export default function UserCard() {} // リファクタリング時に名前が不安定
```

### 再エクスポート

```typescript
// ✅ Good - インデックスファイルでの再エクスポート
// components/ui/index.ts
export { Button } from './button';
export { Input } from './input';
export { Card } from './card';
export { Dialog } from './dialog';

export type { ButtonProps } from './button';
export type { InputProps } from './input';
export type { CardProps } from './card';
export type { DialogProps } from './dialog';

// 使用側
import { Button, Input, Card } from '@/components/ui';
```

---

## 禁止事項

### セキュリティ関連

1. **機密情報のクライアントサイド露出**

   ```tsx
   // ❌ 絶対禁止
   const API_SECRET = 'sk-123456789';
   const DATABASE_PASSWORD = 'secret123';
   ```

2. **認証のクライアントサイド実装**

   ```tsx
   // ❌ 絶対禁止
   localStorage.setItem('isAuthenticated', 'true');
   ```

3. **SQLインジェクション脆弱性**
   ```tsx
   // ❌ 絶対禁止
   const query = `SELECT * FROM users WHERE id = ${userId}`;
   ```

### パフォーマンス関連

1. **大きなライブラリの不要な全体インポート**

   ```tsx
   // ❌ Bad
   import * as lodash from 'lodash';

   // ✅ Good
   import { debounce } from 'lodash';
   ```

2. **無限ループを引き起こすuseEffect**

   ```tsx
   // ❌ Bad
   useEffect(() => {
     setData([...data, newItem]); // dataが依存配列にある場合
   }, [data]);

   // ✅ Good
   useEffect(() => {
     setData((prev) => [...prev, newItem]);
   }, [newItem]);
   ```

### 型安全性関連

1. **any型の使用**

   ```tsx
   // ❌ Bad
   const userData: any = fetchUserData();

   // ✅ Good
   const userData: User = fetchUserData();
   ```

2. **型アサーションの乱用**

   ```tsx
   // ❌ Bad
   const user = data as User; // 危険

   // ✅ Good
   if (isUser(data)) {
     // dataは確実にUser型
   }
   ```

### アクセシビリティ関連

1. **div要素でのクリック可能領域**

   ```tsx
   // ❌ Bad
   <div onClick={handleClick}>クリック</div>

   // ✅ Good
   <button onClick={handleClick}>クリック</button>
   ```

2. **alt属性のない画像**

   ```tsx
   // ❌ Bad
   <img src="profile.jpg" />

   // ✅ Good
   <img src="profile.jpg" alt="ユーザーのプロフィール画像" />
   ```

### コード品質関連

1. **マジックナンバーの使用**

   ```tsx
   // ❌ Bad
   setTimeout(() => {}, 3000);

   // ✅ Good
   import { UI_WAIT_TIMES } from '@/constants';
   setTimeout(() => {}, UI_WAIT_TIMES.STANDARD);
   ```

2. **console.logの本番環境残留**

   ```tsx
   // ❌ Bad
   console.log('Debug info'); // 本番環境で残ってはいけない

   // ✅ Good
   if (process.env.NODE_ENV === 'development') {
     console.log('Debug info');
   }
   ```

---

## まとめ

このコーディングガイドラインは、Next.js 15 + React 19 + TypeScript プロジェクトにおける品質、セキュリティ、パフォーマンス、アクセシビリティを確保するための実践的な指針です。

### 重要な原則

1. **セキュリティファースト** - 機密情報は常にサーバーサイドで処理
2. **Single Source of Truth** - 定数と設定値の一元管理
3. **型安全性** - TypeScriptの機能を最大活用
4. **パフォーマンス重視** - Core Web Vitalsの改善
5. **アクセシビリティ** - すべてのユーザーへの配慮
6. **保守性** - 長期的なメンテナンスを考慮した設計

これらの原則に従うことで、チーム全体が一貫した高品質なコードを効率的に開発できるようになります。

---

_このガイドラインは定期的に更新され、プロジェクトの成長とともに進化します。疑問や改善提案がある場合は、チームで議論して継続的に改善していきましょう。_
