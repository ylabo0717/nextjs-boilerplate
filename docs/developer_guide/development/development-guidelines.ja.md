# 開発・保守ガイドライン

このドキュメントは、状態管理、エラーハンドリング、スタイリングなど、日常的な開発・保守作業に関するベストプラクティスを定義します。

## 目次

1. [状態管理](#状態管理)
2. [エラーハンドリング](#エラーハンドリング)
3. [スタイリング (Tailwind CSS)](#スタイリング-tailwind-css)
4. [インポート・エクスポート規約](#インポートエクスポート規約)

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

### Server State管理

```tsx
// ✅ Good - Server StateとClient Stateの分離
'use client';

import { useState, useEffect } from 'react';

// Server State用のカスタムフック
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const userData = await response.json();
        setUsers(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
}

// Client State用のカスタムフック
function useUserFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email'>('name');
  const [filterBy, setFilterBy] = useState<string[]>([]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((user) => filterBy.length === 0 || filterBy.includes(user.role))
      .sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
  }, [users, searchTerm, sortBy, filterBy]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    filteredUsers,
  };
}

// 使用例
export const UserManagement = () => {
  const { users, loading, error } = useUsers(); // Server State
  const { searchTerm, setSearchTerm, filteredUsers } = useUserFilters(); // Client State

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="ユーザーを検索..."
      />
      <UserList users={filteredUsers} />
    </div>
  );
};
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

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

// API エラーハンドリング
export async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('User', id);
      }
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
  errorInfo?: ErrorInfo;
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
    this.setState({ errorInfo });

    // エラーログサービスに送信
    console.error('Error Boundary caught an error:', error, errorInfo);

    // 本番環境ではエラー監視サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
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
  <div className="error-boundary p-6 border border-red-300 rounded-lg bg-red-50">
    <h2 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h2>
    <p className="text-red-600 mb-4">申し訳ございません。予期しないエラーが発生しました。</p>
    {process.env.NODE_ENV === 'development' && (
      <details className="mb-4">
        <summary className="cursor-pointer text-red-700">エラー詳細</summary>
        <pre className="mt-2 text-sm text-red-600 overflow-auto">
          {error.message}
          {error.stack}
        </pre>
      </details>
    )}
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      ページを再読み込み
    </button>
  </div>
);

// 使用例
<ErrorBoundary fallback={CustomErrorFallback}>
  <UserDashboard />
</ErrorBoundary>;
```

### 非同期エラーハンドリング

```tsx
// ✅ Good - useErrorBoundary hook
'use client';

import { useState, useCallback } from 'react';

export function useErrorBoundary() {
  const [, setError] = useState();

  const captureError = useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return captureError;
}

// 使用例
export const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const captureError = useErrorBoundary();

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (error) {
      // Error Boundaryに委譲
      captureError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [userId, captureError]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) return <div>読み込み中...</div>;

  return user ? <UserDetails user={user} /> : null;
};
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
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ variant, size, className, children, onClick }: ButtonProps) => {
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
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// ❌ Bad - 文字列連結
export const BadButton = ({ variant, className }: ButtonProps) => {
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
    <div
      className={cn(
        // モバイル（デフォルト）
        'grid grid-cols-1 gap-4 p-4',

        // タブレット
        'sm:grid-cols-2 sm:gap-6 sm:p-6',

        // デスクトップ
        'lg:grid-cols-3 lg:gap-8 lg:p-8',

        // 大画面
        'xl:grid-cols-4'
      )}
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
};

// ❌ Bad - デスクトップファースト
<div className="grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1" />;
```

### コンポーネントバリアント

```tsx
// ✅ Good - variants の活用
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  // base classes
  'rounded-lg border shadow-sm transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        outline: 'border-2 border-input bg-background',
        filled: 'bg-muted text-muted-foreground',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      hover: {
        true: 'hover:shadow-md cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hover: false,
    },
  }
);

interface CardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  children: React.ReactNode;
}

export const Card = ({ variant, size, hover, className, children }: CardProps) => {
  return <div className={cn(cardVariants({ variant, size, hover }), className)}>{children}</div>;
};

// 使用例
<Card variant="outline" size="lg" hover className="border-blue-200">
  <h2>カードタイトル</h2>
  <p>カードの内容</p>
</Card>;
```

---

## インポート・エクスポート規約

### インポート順序

**目的**: 依存関係を明確にし、コードの可読性を向上させる。

```tsx
// ✅ Good - 推奨インポート順序
// 1. React関連
import React, { useState, useEffect, useCallback } from 'react';

// 2. Next.js関連
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// 3. 外部ライブラリ
import { z } from 'zod';
import { clsx } from 'clsx';
import { format } from 'date-fns';

// 4. 内部モジュール（@/から始まる）- 機能別にグループ化
// UI コンポーネント
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 機能コンポーネント
import { UserProfile } from '@/components/features/user';

// フック
import { useUser } from '@/hooks/useUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// ユーティリティ
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

// 定数
import { API_ENDPOINTS } from '@/constants/api';

// 5. 相対インポート
import './component.css';

// 6. 型インポート（最後）
import type { User } from '@/types/user';
import type { ComponentProps } from 'react';
```

### re-export の活用

```typescript
// ✅ Good - インデックスファイルでの再エクスポート
// components/ui/index.ts
export { Button, type ButtonProps } from './button';
export { Input, type InputProps } from './input';
export { Card, type CardProps } from './card';
export { Dialog, type DialogProps } from './dialog';

// hooks/index.ts
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useClickOutside } from './useClickOutside';

// utils/index.ts
export { cn } from './cn';
export { formatDate, formatCurrency } from './format';
export { debounce, throttle } from './performance';

// 使用側
import { Button, Input, Card } from '@/components/ui';
import { useLocalStorage, useDebounce } from '@/hooks';
import { cn, formatDate } from '@/utils';
```

### 条件付きエクスポート

```typescript
// ✅ Good - 環境に応じた条件付きエクスポート
// lib/analytics.ts
interface Analytics {
  track(event: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Record<string, any>): void;
}

class ProductionAnalytics implements Analytics {
  track(event: string, properties?: Record<string, any>) {
    // 実際の分析サービスに送信
    gtag('event', event, properties);
  }

  identify(userId: string, traits?: Record<string, any>) {
    gtag('config', 'GA_MEASUREMENT_ID', {
      user_id: userId,
      custom_map: traits,
    });
  }
}

class DevelopmentAnalytics implements Analytics {
  track(event: string, properties?: Record<string, any>) {
    console.log('Analytics Track:', event, properties);
  }

  identify(userId: string, traits?: Record<string, any>) {
    console.log('Analytics Identify:', userId, traits);
  }
}

// 環境に応じてエクスポートを切り替え
export const analytics: Analytics =
  process.env.NODE_ENV === 'production' ? new ProductionAnalytics() : new DevelopmentAnalytics();
```

---

## まとめ

この開発・保守ガイドラインに従うことで：

### 状態管理

1. **適切なスコープ** - Local First アプローチによる複雑性の軽減
2. **関心の分離** - Server StateとClient Stateの明確な分離
3. **型安全性** - TypeScriptによる状態の型保証

### エラーハンドリング

1. **一貫したエラー体験** - 統一されたエラー型と処理
2. **堅牢性** - Error Boundaryによる適切なフォールバック
3. **デバッグ性** - 詳細なエラー情報とログ

### スタイリング

1. **保守性** - Tailwind CSS と cva による一貫したスタイル管理
2. **再利用性** - バリアント駆動のコンポーネント設計
3. **レスポンシブ** - モバイルファーストアプローチ

### モジュール管理

1. **明確な依存関係** - 一貫したインポート順序
2. **効率的な管理** - re-export による簡潔なインポート
3. **環境対応** - 条件付きエクスポートによる柔軟性

これらのパターンにより、長期的に保守可能で拡張性の高いアプリケーションを構築できます。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針とSSOT原則
- [TypeScript](./typescript-guidelines.md) - 型安全な状態管理
- [Next.js パターン](./nextjs-patterns.md) - Server/Client State の使い分け
- [パフォーマンス](./performance-guidelines.md) - メモ化とスタイリング最適化
