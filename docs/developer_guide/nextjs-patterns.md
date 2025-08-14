# Next.js 開発パターンとReact設計

このドキュメントは、Next.js 15.x + React 19 + TypeScript プロジェクトにおけるNext.js固有の開発パターンとReactコンポーネント設計のベストプラクティスを定義します。

## 目次

1. [Server Components と Client Components の使い分け](#server-components-と-client-components-の使い分け)
2. [ルーティングとナビゲーション](#ルーティングとナビゲーション)
3. [データ取得パターン](#データ取得パターン)
4. [React コンポーネント設計](#react-コンポーネント設計)
5. [Compound Components パターン](#compound-components-パターン)
6. [カスタムフック](#カスタムフック)

---

## Server Components と Client Components の使い分け

**目的**: パフォーマンス、SEO、セキュリティを最適化する。

**原則**:

1. **デフォルトはServer Components** - インタラクションが不要な限り
2. **Client Componentsは最小限** - 必要な部分のみ
3. **境界を明確に** - 'use client'ディレクティブの配置を慎重に

**Decision チャート（簡易）**:

- UI イベント（onClick / onChange / focus 管理）が必要? → Client
- ブラウザ専用 API (window / localStorage / IntersectionObserver / DOM) を直接利用? → Client
- 機密データアクセス / シークレット / DB / サーバー FS? → Server
- 取得データが SEO に寄与 or 初期表示最適化が重要? → Server
- 表示のみ / 静的 + インタラクション不要? → Server
- それ以外で局所的なインタラクションのみ? → 小さな Client Component に分離し親は Server を維持

> Client へ昇格する場合は “どの UI 要件が必要か” をコメントで簡潔に残すと後で Server 化を再検討しやすい。

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

---

## ルーティングとナビゲーション

**目的**: App Routerの機能を最大活用し、最適なユーザー体験を提供する。

**Next.js 15での重要な変更点**:

- `params`と`searchParams`が非同期（Promise）になった
- 従来の同期的アクセス`const { id } = params`ではなく`const { id } = await params`が必要
- この変更により、動的ルートとクエリパラメータの処理がより安全になった

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

---

## データ取得パターン

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

### 並列データ取得

```tsx
// ✅ Good - 並列データ取得
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 並列でデータ取得（I/O 待ちを短縮）
  // NOTE: それぞれの fetch 内で `cache: 'force-cache' | 'no-store'` や
  // `revalidate: 60` 等の戦略を明示すると意図が共有しやすい。
  const [user, posts, comments] = await Promise.all([
    getUser(id),
    getUserPosts(id),
    getUserComments(id),
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <UserPosts posts={posts} />
      <UserComments comments={comments} />
    </div>
  );
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

### Propsの設計パターン

```tsx
// ✅ Good - 明確なProps設計
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  actions?: {
    onEdit?: (user: User) => void;
    onDelete?: (user: User) => void;
  };
  variant?: 'default' | 'compact';
  className?: string;
}

export const UserCard = ({ user, actions, variant = 'default', className }: UserCardProps) => {
  return (
    <div className={cn('user-card', variant === 'compact' && 'compact', className)}>
      {user.avatar && <img src={user.avatar} alt={`${user.name}のアバター`} />}
      <div>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
      {actions && (
        <div className="actions">
          {actions.onEdit && <button onClick={() => actions.onEdit(user)}>編集</button>}
          {actions.onDelete && <button onClick={() => actions.onDelete(user)}>削除</button>}
        </div>
      )}
    </div>
  );
};
```

---

## Compound Components パターン

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

### より高度なCompound Components

```tsx
// ✅ Good - Context を活用した Compound Components
import { createContext, useContext, useState } from 'react';

interface AccordionContextType {
  activeItem: string | null;
  setActiveItem: (item: string | null) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

export const Accordion = ({ children }: { children: React.ReactNode }) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  return (
    <AccordionContext.Provider value={{ activeItem, setActiveItem }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
};

Accordion.Item = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('Accordion.Item must be used within Accordion');

  const isActive = context.activeItem === id;

  return <div className={cn('accordion-item', isActive && 'active')}>{children}</div>;
};

Accordion.Trigger = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('Accordion.Trigger must be used within Accordion');

  return (
    <button
      onClick={() => context.setActiveItem(context.activeItem === id ? null : id)}
      aria-expanded={context.activeItem === id}
    >
      {children}
    </button>
  );
};

Accordion.Content = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('Accordion.Content must be used within Accordion');

  const isActive = context.activeItem === id;

  return isActive ? <div className="accordion-content">{children}</div> : null;
};
```

---

## カスタムフック

**目的**: ロジックの再利用とコンポーネントの責任分離を実現する。

### 基本的なカスタムフック

```tsx
// ✅ Good - useLocalStorage hook
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

### Server State管理のカスタムフック

```tsx
// ✅ Good - useFetch hook
import { useState, useEffect } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string): UseFetchState<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await fetch(url, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error as Error,
          }));
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return state;
}
```

### フォーム管理のカスタムフック

```tsx
// ✅ Good - useForm hook
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // エラーをクリア
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
  };
}
```

---

## まとめ

このNext.js開発パターンとReact設計ガイドラインに従うことで：

1. **最適なパフォーマンス** - Server/Client Componentsの適切な使い分け
2. **スケーラブルな設計** - Compound Componentsとカスタムフックによる再利用性
3. **型安全性** - TypeScriptを活用した堅牢なコンポーネント設計
4. **保守性** - 明確な責任分離と一貫したパターン

Next.js 15の新機能を活用しながら、Reactのベストプラクティスに従った開発を行うことで、高品質なアプリケーションを効率的に構築できます。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針とSSOT原則
- [TypeScript](./typescript-guidelines.md) - 型安全なコンポーネント設計
- [アーキテクチャ](./architecture-guidelines.md) - 関数型優先アプローチ
- [パフォーマンス](./performance-guidelines.md) - 最適化テクニック
