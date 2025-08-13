# Next.js TypeScript コーディングガイドライン

このドキュメントは、Next.jsとTypeScriptを使用したプロジェクトにおける包括的なコーディングガイドラインです。

## 1. 基本方針

### フレームワークネイティブ・アプローチ

**目的**: エコシステムとの完全な統合と長期的な保守性の確保

- **eslint-config-next を基盤**とする設定を採用
- Next.js公式が推奨するパターンに従う
- サードパーティ製設定よりもフレームワーク標準を優先

**理由**: 
- 依存関係の競合リスクを回避
- フレームワークのアップデートに追随
- コミュニティサポートの確実性

## 2. Single Source of Truth (SSOT) 原則

### 定数と設定値の一元管理

**原則**: すべての定数、設定値、閾値は単一の権威ある場所で定義する

```typescript
// ❌ 悪い例 - 複数箇所で同じ値を定義
// components/Header.tsx
const HEADER_HEIGHT = 64;

// components/Layout.tsx  
const HEADER_HEIGHT = 64;

// ✅ 良い例 - 単一のソースで定義
// constants/layout.ts
export const LAYOUT_CONSTANTS = {
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 100,
} as const;
```

**適用範囲**:
- UIの寸法・間隔
- タイムアウト値
- API エンドポイント
- 設定値・閾値

**効果**:
- 一箇所の変更で全体に反映
- 設定の重複や不整合を防止
- メンテナンスコストの削減

## 3. TypeScript ガイドライン

### 型定義の基本原則

**目的**: 実行時エラーの防止と開発効率の向上

```typescript
// ✅ 厳密な型定義
interface User {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ ユニオン型の適切な使用
type Status = 'pending' | 'approved' | 'rejected';

// ❌ any型の使用を避ける
const data: any = response.data; // 避ける

// ✅ 適切な型アサーション
const data = response.data as User[];
```

### 命名規則

**目的**: コードの可読性と一貫性の確保

- **Variables**: camelCase (`userName`, `isLoading`)
- **Functions**: camelCase (`fetchUser`, `handleSubmit`)
- **Types/Interfaces**: PascalCase (`User`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRY_COUNT`)
- **Components**: PascalCase (`UserProfile`, `NavigationMenu`)

### エクスポート規約

**基本方針**: Named exports を優先、default exports は限定的に使用

```typescript
// ✅ 推奨: Named exports
export const UserService = {
  async fetchUser(id: string): Promise<User> {
    // implementation
  }
};

export { UserProfile } from './UserProfile';

// ✅ 許可: Pages/Layout components のdefault export
export default function HomePage() {
  return <div>...</div>;
}
```

## 4. Next.js 開発パターン

### Server/Client Components の使い分け

**基本方針**: Server Components をデフォルト、Client Components は必要最小限

#### Server Components（デフォルト）

**使用場面**:
- 静的コンテンツの表示
- データベースからのデータ取得
- SEOが重要なページ
- セキュアな処理（認証情報含む）

```typescript
// ✅ Server Component
async function UserProfile({ userId }: { userId: string }) {
  // サーバーサイドでデータ取得
  const user = await db.user.findUnique({ where: { id: userId } });
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

#### Client Components

**使用場面**:
- インタラクティブな要素（useState, useEffect等）
- ブラウザAPIの使用（localStorage等）
- イベントハンドラー
- リアルタイム更新

```typescript
'use client';

// ✅ Client Component
function InteractiveCounter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(prev => prev + 1)}>
      Count: {count}
    </button>
  );
}
```

### データ取得戦略

**Server Components でのデータ取得**:

```typescript
// ✅ 推奨: Server Component内でのデータ取得
async function ProductList() {
  const products = await fetch('/api/products').then(res => res.json());
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

## 5. React コンポーネント設計

### 単一責任の原則

**目的**: コンポーネントの再利用性と保守性の向上

```typescript
// ❌ 悪い例 - 複数の責任を持つ
function UserDashboard() {
  // ユーザー情報取得
  // 通知の管理
  // ナビゲーションの処理
  // データの表示
  return <div>...</div>;
}

// ✅ 良い例 - 単一責任に分割
function UserProfile({ user }: { user: User }) {
  return <div>...</div>;
}

function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  return <div>...</div>;
}

function UserDashboard() {
  return (
    <div>
      <UserProfile user={user} />
      <NotificationCenter notifications={notifications} />
    </div>
  );
}
```

### 合成パターン（Composition Pattern）

**目的**: 柔軟で再利用可能なコンポーネント設計

```typescript
// ✅ 合成可能な設計
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-lg border p-4', className)}>{children}</div>;
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// 使用例
function UserCard() {
  return (
    <Card>
      <CardHeader>
        <h3>User Information</h3>
      </CardHeader>
      <CardContent>
        <p>User details...</p>
      </CardContent>
    </Card>
  );
}
```

### カスタムフック

**目的**: ロジックの分離と再利用

```typescript
// ✅ カスタムフック
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  return { user, loading, error };
}
```

## 6. セキュリティガイドライン

### クライアントサイド実装禁止事項

**重要**: 以下の処理は絶対にクライアントサイドで実装してはいけません

#### 認証処理の禁止

```typescript
// ❌ 絶対禁止 - クライアントサイドでの認証
function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    // データベースに直接アクセス - 危険
    const user = await db.user.findFirst({ 
      where: { email, password } 
    });
    
    if (user) {
      localStorage.setItem('token', user.token); // 危険
    }
  };
}

// ✅ 正しい実装 - サーバーサイドAPI経由
function LoginForm() {
  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      // サーバーサイドでセッション管理
      router.push('/dashboard');
    }
  };
}
```

#### 機密情報の露出禁止

```typescript
// ❌ 禁止 - クライアントサイドでの機密情報
const API_SECRET = 'sk-1234567890abcdef'; // 危険
const DATABASE_URL = 'postgresql://...'; // 危険

// ✅ 正しい実装 - 環境変数（サーバーサイドのみ）
// .env.local (サーバーサイドでのみアクセス可能)
// DATABASE_URL=postgresql://...
// API_SECRET=sk-1234567890abcdef

// サーバーサイドでのみ使用
async function handler() {
  const apiSecret = process.env.API_SECRET; // OK
  const dbUrl = process.env.DATABASE_URL; // OK
}
```

#### 権限チェックの厳格な実装

```typescript
// ❌ 禁止 - クライアントサイドでの権限チェック
function AdminPanel() {
  const user = useUser();
  
  if (user?.role !== 'admin') {
    return <div>Access denied</div>; // 不十分
  }
  
  return <AdminDashboard />; // 危険
}

// ✅ 正しい実装 - サーバーサイドでの権限チェック
async function AdminPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'admin') {
    notFound(); // サーバーサイドでリダイレクト
  }
  
  return <AdminDashboard />;
}
```

### 入力値の検証

**目的**: XSS攻撃やインジェション攻撃の防止

```typescript
// ✅ Zodを使用した厳密な検証
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120),
});

function createUser(data: unknown) {
  const validatedData = UserSchema.parse(data); // 検証
  // validatedDataは型安全
  return db.user.create({ data: validatedData });
}
```

## 7. パフォーマンス最適化

### 動的インポートによるコード分割

**目的**: 初期ロード時間の短縮とCore Web Vitalsの改善

```typescript
// ✅ 重いコンポーネントの動的インポート
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // クライアントサイドでのみロード
});

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart data={data} />
    </div>
  );
}
```

### Next.js Image コンポーネント

**目的**: 画像最適化とCore Web Vitalsの向上

```typescript
import Image from 'next/image';

// ✅ 最適化された画像
function ProductImage({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={500}
      height={300}
      priority={product.featured} // Above-the-fold画像にpriority
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### メモ化戦略

**目的**: 不要な再レンダリングの防止

```typescript
import { memo, useMemo, useCallback } from 'react';

// ✅ コンポーネントのメモ化
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  return <div>...</div>;
});

// ✅ 計算結果のメモ化
function ProductList({ products, filters }: Props) {
  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      filters.category ? product.category === filters.category : true
    );
  }, [products, filters.category]);

  const handleProductClick = useCallback((productId: string) => {
    router.push(`/products/${productId}`);
  }, [router]);

  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard 
          key={product.id} 
          product={product}
          onClick={handleProductClick}
        />
      ))}
    </div>
  );
}
```

## 8. アクセシビリティガイドライン

### WCAG準拠の基本原則

**目的**: すべてのユーザーが利用可能なアプリケーションの構築

#### セマンティックHTML

```typescript
// ✅ セマンティックなマークアップ
function ArticleComponent({ article }: { article: Article }) {
  return (
    <article>
      <header>
        <h1>{article.title}</h1>
        <time dateTime={article.publishedAt}>
          {formatDate(article.publishedAt)}
        </time>
      </header>
      <main>
        <p>{article.content}</p>
      </main>
    </article>
  );
}
```

#### ARIA属性の適切な使用

```typescript
// ✅ アクセシブルなボタン
function LoadingButton({ isLoading, children, ...props }: Props) {
  return (
    <button
      aria-busy={isLoading}
      aria-describedby={isLoading ? 'loading-message' : undefined}
      disabled={isLoading}
      {...props}
    >
      {children}
      {isLoading && (
        <span id="loading-message" className="sr-only">
          読み込み中...
        </span>
      )}
    </button>
  );
}
```

#### キーボードナビゲーション

```typescript
// ✅ キーボード操作対応
function Modal({ isOpen, onClose, children }: Props) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black bg-opacity-50"
    >
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}
```

## 9. 状態管理

### Local State vs Global State

**原則**: 状態は可能な限りローカルに保持し、必要な場合のみグローバル化

#### Local State（推奨）

```typescript
// ✅ コンポーネントローカルな状態
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム内容 */}
    </form>
  );
}
```

#### Global State（必要な場合のみ）

```typescript
// ✅ グローバル状態（Context）
const UserContext = createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
} | null>(null);

function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((user: User) => {
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
```

### Server State vs Client State

**区別**: サーバーから取得するデータとクライアント固有の状態を明確に分離

```typescript
// ✅ Server State - React Query/SWR等の使用
function useUser(userId: string) {
  return useSWR(`/api/users/${userId}`, fetcher, {
    revalidateOnFocus: false,
    staleTime: 5 * 60 * 1000, // 5分
  });
}

// ✅ Client State - ローカル状態
function useUIState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return {
    sidebarOpen,
    setSidebarOpen,
    theme,
    setTheme,
  };
}
```

## 10. エラーハンドリング

### 統一されたエラー型

**目的**: 一貫したエラー処理とユーザーエクスペリエンスの向上

```typescript
// ✅ 統一されたエラー型
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}
```

### Error Boundary

```typescript
// ✅ Error Boundary実装
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // エラーレポーティングサービスに送信
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}
```

### API エラーハンドリング

```typescript
// ✅ 統一されたAPIエラーハンドリング
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new AppError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'Network error occurred',
      'NETWORK_ERROR',
      0
    );
  }
}
```

## 11. スタイリング (Tailwind CSS)

### CSS 4.0 対応パターン

**基本方針**: Utility-firstアプローチでレスポンシブデザインを実現

#### レスポンシブデザイン

```typescript
// ✅ モバイルファーストのレスポンシブ
function ResponsiveCard() {
  return (
    <div className="
      p-4 
      sm:p-6 
      md:p-8 
      lg:p-10
      bg-white 
      rounded-lg 
      shadow-sm
      w-full 
      max-w-sm 
      sm:max-w-md 
      md:max-w-lg
    ">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">
        レスポンシブタイトル
      </h2>
    </div>
  );
}
```

#### カスタムコンポーネントでの一貫性

```typescript
// ✅ cn()ユーティリティでの条件付きスタイル
import { cn } from '@/utils/cn';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // ベーススタイル
        'rounded-md font-medium transition-colors focus:outline-none focus:ring-2',
        
        // サイズバリエーション
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        
        // カラーバリエーション
        {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'destructive',
        },
        
        // カスタムクラス
        className
      )}
      {...props}
    />
  );
}
```

#### ダークモード対応

```typescript
// ✅ ダークモード対応
function ThemedComponent() {
  return (
    <div className="
      bg-white 
      dark:bg-gray-900 
      text-gray-900 
      dark:text-gray-100
      border 
      border-gray-200 
      dark:border-gray-700
    ">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        ダークモード対応タイトル
      </h1>
    </div>
  );
}
```

## 12. テスト戦略

### テストピラミッド

**構成**: Unit Tests > Integration Tests > E2E Tests

#### Unit Tests（最多）

```typescript
// ✅ ユーティリティ関数のテスト
import { cn } from '@/utils/cn';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-200')).toBe('text-red-500 bg-blue-200');
  });

  it('should handle conditional classes', () => {
    expect(cn('base-class', { 'conditional-class': true })).toBe('base-class conditional-class');
  });
});
```

#### Integration Tests（中程度）

```typescript
// ✅ コンポーネント統合テスト
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactForm } from './ContactForm';

describe('ContactForm', () => {
  it('should submit form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<ContactForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('名前'), {
      target: { value: 'テストユーザー' }
    });

    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' }
    });

    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'テストユーザー',
        email: 'test@example.com'
      });
    });
  });
});
```

#### E2E Tests（最少）

```typescript
// ✅ 重要なユーザーフローのE2Eテスト
import { test, expect } from '@playwright/test';

test('user can complete login flow', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});
```

## 13. インポート・エクスポート規約

### インポート順序

**目的**: 可読性の向上と依存関係の明確化

```typescript
// ✅ 推奨インポート順序
// 1. Node.js標準ライブラリ
import { readFile } from 'fs/promises';

// 2. 外部ライブラリ
import React from 'react';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// 3. 内部ライブラリ（@/で始まる）
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/user';

// 4. 相対インポート
import './styles.css';
import { validateInput } from '../utils/validation';
```

### バレルエクスポート

**目的**: クリーンなインポート構文の実現

```typescript
// ✅ index.tsでのバレルエクスポート
// constants/index.ts
export { API_ENDPOINTS } from './api';
export { UI_CONSTANTS } from './ui';
export { VALIDATION_RULES } from './validation';

// 使用側
import { API_ENDPOINTS, UI_CONSTANTS } from '@/constants';
```

### 動的インポート

```typescript
// ✅ 条件付き動的インポート
async function loadAdvancedFeature() {
  if (process.env.NODE_ENV === 'development') {
    const { DevTools } = await import('./dev-tools');
    return DevTools;
  }
  return null;
}
```

## 14. 禁止事項

### セキュリティ観点

**絶対禁止**:

1. **クライアントサイドでの認証処理**
2. **環境変数の直接参照**（クライアントサイド）
3. **データベース接続情報の露出**
4. **APIキーのハードコーディング**

### パフォーマンス観点

**避けるべきパターン**:

```typescript
// ❌ 避ける - useEffectでの無限ループ
useEffect(() => {
  setData(data.map(item => ({ ...item, processed: true })));
}); // 依存配列がない

// ❌ 避ける - 不要な再レンダリング
function ExpensiveComponent({ data }) {
  const expensiveValue = data.map(item => complexCalculation(item));
  return <div>{expensiveValue}</div>;
}
```

### 型安全性観点

**禁止事項**:

```typescript
// ❌ 禁止
const data: any = response.data;
// @ts-ignore
const value = data.unknownProperty;
```

## まとめ

このガイドラインは、Next.js + TypeScript プロジェクトにおける包括的な開発指針を提供します。各原則は以下の目標を達成するために設計されています：

- **セキュリティ**: 脆弱性の防止と安全な実装パターン
- **パフォーマンス**: Core Web Vitals の向上とユーザーエクスペリエンス最適化
- **保守性**: 長期的なメンテナンスの容易さ
- **スケーラビリティ**: チーム開発とプロジェクト拡張への対応
- **型安全性**: 実行時エラーの防止と開発効率の向上

これらの指針に従うことで、高品質で安全、かつ保守しやすいアプリケーションを構築できます。