# パフォーマンス最適化とアクセシビリティガイドライン

このドキュメントは、Next.js + React + TypeScript プロジェクトにおけるパフォーマンス最適化とアクセシビリティのベストプラクティスを定義します。

## 目次

1. [動的インポート](#動的インポート)
2. [画像最適化](#画像最適化)
3. [メモ化戦略](#メモ化戦略)
4. [Core Web Vitals 最適化](#core-web-vitals-最適化)
5. [アクセシビリティガイドライン](#アクセシビリティガイドライン)
6. [キーボードナビゲーション](#キーボードナビゲーション)

---

## 動的インポート

**目的**: バンドルサイズを最適化し、初期読み込み時間を短縮する。

### 基本的な動的インポート

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

### ルートレベルでの動的インポート

```tsx
// ✅ Good - 条件に応じた動的インポート
'use client';

import { useState, Suspense } from 'react';

export const ConditionalFeature = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? '簡易表示' : '高度な設定'}
      </button>

      {showAdvanced && (
        <Suspense fallback={<div>読み込み中...</div>}>
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

### ライブラリの動的インポート

```tsx
// ✅ Good - 重いライブラリの動的インポート
'use client';

import { useState } from 'react';

export const ChartComponent = ({ data }: { data: any[] }) => {
  const [Chart, setChart] = useState<React.ComponentType<any> | null>(null);

  const loadChart = async () => {
    if (!Chart) {
      const { Chart: ChartLib } = await import('chart.js');
      const { default: ChartComponent } = await import('react-chartjs-2');
      setChart(() => ChartComponent);
    }
  };

  return (
    <div>{!Chart ? <button onClick={loadChart}>グラフを表示</button> : <Chart data={data} />}</div>
  );
};
```

---

## 画像最適化

**目的**: Core Web Vitalsを改善し、ページ読み込み速度を向上させる。

### Next.js Image コンポーネントの活用

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
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={product.featured} // ファーストビューの画像のみ
        className="object-cover rounded-lg"
      />
      <h2>{product.name}</h2>
    </div>
  );
};

// ❌ Bad - 通常のimg要素
<img src={product.imageUrl} alt={product.name} />;
```

### レスポンシブ画像の実装

```tsx
// ✅ Good - レスポンシブ画像
export const HeroImage = ({ image }: { image: ImageData }) => {
  return (
    <div className="relative w-full h-96">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
        className="object-cover"
        priority
      />
    </div>
  );
};

// ✅ Good - srcSetを使った詳細な制御
export const OptimizedImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      sizes="(max-width: 768px) 90vw, (max-width: 1200px) 60vw, 800px"
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
};
```

---

## メモ化戦略

**目的**: 不要な再レンダリングを防ぎ、パフォーマンスを向上させる。

### 適切なメモ化

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

UserList.displayName = 'UserList';

// ❌ Bad - 過度なメモ化
const SimpleComponent = memo(() => {
  return <div>Simple text</div>; // メモ化する必要なし
});
```

### useMemoとuseCallbackの使い分け

```tsx
// ✅ Good - 適切な使い分け
export const DataProcessor = ({ data, filters }: DataProcessorProps) => {
  // 重い計算処理をメモ化
  const processedData = useMemo(() => {
    return data
      .filter((item) => filters.includes(item.category))
      .map((item) => ({
        ...item,
        processedValue: complexCalculation(item.value),
      }))
      .sort((a, b) => b.processedValue - a.processedValue);
  }, [data, filters]);

  // 子コンポーネントに渡すコールバックをメモ化
  const handleItemClick = useCallback(
    (itemId: string) => {
      // 重い処理や副作用を伴う処理
      analytics.track('item_clicked', { itemId });
      router.push(`/items/${itemId}`);
    },
    [router]
  );

  // 単純な値はメモ化不要
  const itemCount = processedData.length;

  return (
    <div>
      <p>アイテム数: {itemCount}</p>
      {processedData.map((item) => (
        <ItemCard key={item.id} item={item} onClick={handleItemClick} />
      ))}
    </div>
  );
};
```

---

## Core Web Vitals 最適化

### Cumulative Layout Shift (CLS) 対策

```tsx
// ✅ Good - CLSを防ぐ実装
export const ProductGrid = ({ products }: { products: Product[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow">
          {/* 画像の高さを固定してCLSを防ぐ */}
          <div className="relative h-48 w-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover rounded-t-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-gray-600">{product.price}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ❌ Bad - CLSを引き起こす可能性
export const BadProductGrid = ({ products }: { products: Product[] }) => {
  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          {/* 高さが指定されていない画像 */}
          <img src={product.imageUrl} alt={product.name} />
          <h3>{product.name}</h3>
        </div>
      ))}
    </div>
  );
};
```

### Largest Contentful Paint (LCP) 最適化

```tsx
// ✅ Good - LCP最適化
export default async function HomePage() {
  // クリティカルなデータを事前取得
  const heroData = await getHeroData();
  const featuredProducts = await getFeaturedProducts();

  return (
    <div>
      {/* ファーストビューのコンテンツを優先 */}
      <HeroSection data={heroData} priority />

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid products={featuredProducts} />
      </Suspense>

      {/* 非クリティカルなコンテンツは遅延読み込み */}
      <Suspense fallback={<div>読み込み中...</div>}>
        <NewsletterSignup />
      </Suspense>
    </div>
  );
}

const HeroSection = ({ data, priority }: { data: HeroData; priority?: boolean }) => {
  return (
    <section className="relative h-screen">
      <Image
        src={data.backgroundImage}
        alt="Hero background"
        fill
        priority={priority}
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white">{data.title}</h1>
      </div>
    </section>
  );
};
```

---

## アクセシビリティガイドライン

**目的**: すべてのユーザーがアプリケーションを利用できるようにする。

**効果**:

- 障害を持つユーザーの利用体験向上
- SEOの改善
- 法的コンプライアンスの確保

### アクセシブルなフォーム

```tsx
// ✅ Good - アクセシブルなフォーム
export const ContactForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form>
      <div>
        <label htmlFor="name">名前 *</label>
        <input
          id="name"
          type="text"
          required
          aria-describedby="name-error"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <div id="name-error" role="alert" className="error">
            {errors.name}
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
export const BadContactForm = () => {
  return (
    <form>
      <div>名前</div>
      <input type="text" />
      <div onClick={handleSubmit}>送信</div> {/* buttonを使用すべき */}
    </form>
  );
};
```

### セマンティックHTML

```tsx
// ✅ Good - セマンティックなHTML構造
export const ArticlePage = ({ article }: { article: Article }) => {
  return (
    <article>
      <header>
        <h1>{article.title}</h1>
        <p>
          投稿日: <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
        </p>
        <p>投稿者: {article.author}</p>
      </header>

      <main>
        <p className="lead">{article.excerpt}</p>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </main>

      <aside>
        <h2>関連記事</h2>
        <nav aria-label="関連記事">
          <ul>
            {article.relatedArticles.map((related) => (
              <li key={related.id}>
                <Link href={`/articles/${related.slug}`}>{related.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </article>
  );
};

// ❌ Bad - セマンティクスが不明確
export const BadArticlePage = ({ article }: { article: Article }) => {
  return (
    <div>
      <div>{article.title}</div>
      <div>{article.content}</div>
      <div>
        {article.relatedArticles.map((related) => (
          <div key={related.id}>{related.title}</div>
        ))}
      </div>
    </div>
  );
};
```

---

## キーボードナビゲーション

### ドロップダウンメニュー

```tsx
// ✅ Good - キーボード操作対応ドロップダウン
export const DropdownMenu = ({ items }: { items: MenuItem[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          handleSelect(items[focusedIndex]);
        }
        break;
    }
  };

  const handleSelect = (item: MenuItem) => {
    item.onClick();
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const focusedElement = menuRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.focus();
    }
  }, [focusedIndex, isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        メニュー
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          className="absolute top-full left-0 bg-white border rounded shadow-lg"
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  focusedIndex === index ? 'bg-gray-100' : ''
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### モーダルダイアログ

```tsx
// ✅ Good - アクセシブルなモーダル
export const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // モーダル表示時に前のフォーカス要素を記録
      previousFocusRef.current = document.activeElement as HTMLElement;

      // モーダル内にフォーカスを移動
      modalRef.current?.focus();

      // Escapeキーでモーダルを閉じる
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        // モーダルを閉じる時に前のフォーカス要素に戻す
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full mx-4" tabIndex={-1}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
```

---

## まとめ

このパフォーマンス最適化とアクセシビリティガイドラインに従うことで：

### パフォーマンス面

1. **初期読み込み時間の短縮** - 動的インポートとコード分割
2. **Core Web Vitals の改善** - 画像最適化とレンダリング最適化
3. **ランタイムパフォーマンス向上** - 適切なメモ化戦略

### アクセシビリティ面

1. **すべてのユーザーへの配慮** - セマンティックHTMLとARIA属性
2. **キーボードナビゲーション** - 完全なキーボード操作対応
3. **スクリーンリーダー対応** - 適切なラベルと説明

これらの最適化により、高速で使いやすく、すべてのユーザーに優しいアプリケーションを構築できます。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針
- [Next.js パターン](./nextjs-patterns.md) - Server Components最適化
- [開発・保守](./development-guidelines.md) - メモ化とスタイリング
