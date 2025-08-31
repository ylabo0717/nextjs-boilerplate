# テスト戦略ガイドライン

このドキュメントは、Next.js + React + TypeScript プロジェクトにおけるテスト戦略とベストプラクティスを定義します。

## 目次

1. [テストピラミッド](#テストピラミッド)
2. [Unit Tests (単体テスト)](#unit-tests-単体テスト)
3. [Integration Tests (統合テスト)](#integration-tests-統合テスト)
4. [E2E Tests (End-to-End テスト)](#e2e-tests-end-to-end-テスト)
5. [テストのベストプラクティス](#テストのベストプラクティス)
6. [モックとスタブ](#モックとスタブ)

---

## テストピラミッド

**目的**: 効率的で信頼性の高いテストスイートを構築する。

**構成**:

1. **Unit Tests (70%)** - 個別の関数・コンポーネント
2. **Integration Tests (20%)** - コンポーネント間の連携
3. **E2E Tests (10%)** - ユーザーシナリオ

### テスト戦略の原則

```typescript
// テスト対象の分類
/**
 * Unit Tests: 単一の関数、フック、純粋関数
 * - ビジネスロジック
 * - ユーティリティ関数
 * - カスタムフック
 * - 単一コンポーネント
 */

/**
 * Integration Tests: 複数コンポーネントの連携
 * - フォーム送信フロー
 * - API呼び出しを含むコンポーネント
 * - ページレベルのテスト
 */

/**
 * E2E Tests: ユーザージャーニー全体
 * - ログイン〜ダッシュボード表示
 * - 商品購入フロー
 * - 管理者機能
 */
```

---

## Unit Tests (単体テスト)

### ユーティリティ関数のテスト

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

  it('should handle edge cases', () => {
    expect(formatCurrency(NaN)).toBe('¥0');
    expect(formatCurrency(Infinity)).toBe('¥0');
    expect(formatCurrency(-Infinity)).toBe('¥0');
  });
});

describe('formatDate', () => {
  it('should format date in Japanese format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('2024年1月15日');
  });

  it('should handle different date formats', () => {
    const date = new Date('2024-12-31');
    expect(formatDate(date, 'yyyy/MM/dd')).toBe('2024/12/31');
  });
});
```

### カスタムフックのテスト

```typescript
// ✅ Good - カスタムフックのテスト
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('should initialize with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('should reset count', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(12);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

### ビジネスロジックのテスト

```typescript
// ✅ Good - ビジネスロジックのテスト
// domain/order.test.ts
import { describe, it, expect } from 'vitest';
import { createOrder, calculateOrderTotal, validateOrderItems } from './order';

describe('Order Domain Logic', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total correctly', () => {
      const items = [
        { productId: '1', quantity: 2, price: 1000 },
        { productId: '2', quantity: 1, price: 2500 },
      ];

      expect(calculateOrderTotal(items)).toBe(4500);
    });

    it('should handle empty items', () => {
      expect(calculateOrderTotal([])).toBe(0);
    });
  });

  describe('validateOrderItems', () => {
    it('should validate correct items', () => {
      const items = [{ productId: '1', quantity: 1, price: 1000 }];

      const result = validateOrderItems(items);
      expect(result.success).toBe(true);
    });

    it('should reject empty items', () => {
      const result = validateOrderItems([]);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('注文には最低1つの商品が必要です');
    });

    it('should reject invalid quantity', () => {
      const items = [{ productId: '1', quantity: 0, price: 1000 }];

      const result = validateOrderItems(items);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('商品の数量は1以上である必要があります');
    });
  });

  describe('createOrder', () => {
    it('should create order successfully', () => {
      const items = [{ productId: '1', quantity: 2, price: 1000 }];

      const result = createOrder('customer-1', items);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerId).toBe('customer-1');
        expect(result.data.items).toEqual(items);
        expect(result.data.status).toBe('pending');
      }
    });

    it('should reject order over limit', () => {
      const items = [
        { productId: '1', quantity: 1, price: 2000000 }, // 200万円
      ];

      const result = createOrder('customer-1', items);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('注文金額が上限を超えています');
      }
    });
  });
});
```

---

## Integration Tests (統合テスト)

### コンポーネント統合テスト

```typescript
// ✅ Good - Integration Test例
// components/UserForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserForm } from './UserForm';

// モック
const mockOnSubmit = vi.fn();

describe('UserForm Integration', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('should submit form with valid data', async () => {
    render(<UserForm onSubmit={mockOnSubmit} />);

    // フォーム入力
    await fireEvent.change(screen.getByLabelText('名前'), {
      target: { value: '田中太郎' },
    });
    await fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'tanaka@example.com' },
    });
    await fireEvent.change(screen.getByLabelText('年齢'), {
      target: { value: '30' },
    });

    // 送信
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    // 検証
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '田中太郎',
        email: 'tanaka@example.com',
        age: 30,
      });
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<UserForm onSubmit={mockOnSubmit} />);

    // 無効なデータで送信
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText('年齢'), {
      target: { value: '-5' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('年齢は0以上で入力してください')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should handle loading state', async () => {
    const slowSubmit = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<UserForm onSubmit={slowSubmit} />);

    // フォーム送信
    fireEvent.change(screen.getByLabelText('名前'), {
      target: { value: '田中太郎' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    // ローディング状態の確認
    expect(screen.getByRole('button', { name: '送信中...' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    // 完了後の状態確認
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
```

### API連携テスト

```typescript
// ✅ Good - API連携テスト
// components/UserList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserList } from './UserList';

// MSW（Mock Service Worker）を使用したAPIモック
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: '田中太郎', email: 'tanaka@example.com' },
        { id: '2', name: '佐藤花子', email: 'sato@example.com' },
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserList with API', () => {
  it('should load and display users', async () => {
    render(<UserList />);

    // ローディング状態の確認
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    // ユーザー一覧の表示確認
    await waitFor(() => {
      expect(screen.getByText('田中太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });

    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });

  it('should handle API error', async () => {
    // APIエラーのモック
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
      })
    );

    render(<UserList />);

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText('ユーザーの読み込みに失敗しました')).toBeInTheDocument();
    });
  });

  it('should handle empty user list', async () => {
    // 空のレスポンスのモック
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.json([]));
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('ユーザーが見つかりません')).toBeInTheDocument();
    });
  });
});
```

---

## E2E Tests (End-to-End テスト)

### ユーザージャーニーテスト

```typescript
// ✅ Good - E2E Test例
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';
import { UI_WAIT_TIMES, VIEWPORT_SIZES } from '../constants/test-constants';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT_SIZES.DESKTOP);
  });

  test('should complete user registration successfully', async ({ page }) => {
    // ページにアクセス
    await page.goto('/register');

    // ページの読み込み確認
    await expect(page.locator('h1')).toHaveText('アカウント登録');

    // フォーム入力
    await page.fill('[data-testid="name-input"]', '田中太郎');
    await page.fill('[data-testid="email-input"]', 'tanaka@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');

    // 利用規約同意
    await page.check('[data-testid="terms-checkbox"]');

    // 送信ボタンが有効になることを確認
    await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();

    // 送信
    await page.click('[data-testid="submit-button"]');

    // 成功メッセージの確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: UI_WAIT_TIMES.LONG,
    });

    // ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/dashboard');

    // ユーザー名の表示確認
    await expect(page.locator('[data-testid="user-name"]')).toHaveText('田中太郎');
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');

    // 既存のメールアドレスで登録試行
    await page.fill('[data-testid="name-input"]', '田中太郎');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');
    await page.check('[data-testid="terms-checkbox"]');

    await page.click('[data-testid="submit-button"]');

    // エラーメッセージの確認
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'このメールアドレスは既に使用されています'
    );

    // フォームが初期化されていないことを確認
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('田中太郎');
  });

  test('should validate form fields', async ({ page }) => {
    await page.goto('/register');

    // 空の状態で送信
    await page.click('[data-testid="submit-button"]');

    // バリデーションエラーの確認
    await expect(page.locator('[data-testid="name-error"]')).toHaveText('名前は必須です');
    await expect(page.locator('[data-testid="email-error"]')).toHaveText(
      'メールアドレスは必須です'
    );

    // 無効な形式のテスト
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', '123'); // 短すぎるパスワード

    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toHaveText(
      '有効なメールアドレスを入力してください'
    );
    await expect(page.locator('[data-testid="password-error"]')).toHaveText(
      'パスワードは8文字以上で入力してください'
    );
  });
});
```

### 認証フローのテスト

```typescript
// ✅ Good - 認証フローのE2Eテスト
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login and access protected page', async ({ page }) => {
    // ログインページにアクセス
    await page.goto('/login');

    // ログイン実行
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/dashboard');

    // 保護されたページにアクセス
    await page.goto('/profile');
    await expect(page.locator('h1')).toHaveText('プロフィール');

    // ログアウト
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/login');

    // 保護されたページへの直接アクセスがブロックされることを確認
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'メールアドレスまたはパスワードが正しくありません'
    );

    // ログインページに留まる
    await expect(page).toHaveURL('/login');
  });
});
```

---

## テストのベストプラクティス

### テストの命名規則

```typescript
// ✅ Good - わかりやすいテストの命名
describe('UserService', () => {
  describe('registerUser', () => {
    it('should create user with valid data', () => {});
    it('should reject user with invalid email', () => {});
    it('should throw error when email already exists', () => {});
  });

  describe('updateUser', () => {
    it('should update user profile successfully', () => {});
    it('should require authentication', () => {});
  });
});

// ❌ Bad - 曖昧な命名
describe('UserService', () => {
  it('test1', () => {});
  it('should work', () => {});
  it('error case', () => {});
});
```

### テストデータの管理

```typescript
// ✅ Good - テストデータのファクトリー
// tests/factories/user.factory.ts
interface UserData {
  id?: string;
  name?: string;
  email?: string;
  age?: number;
  role?: 'user' | 'admin';
}

export const createUser = (overrides: Partial<UserData> = {}): User => ({
  id: 'user-123',
  name: '田中太郎',
  email: 'tanaka@example.com',
  age: 30,
  role: 'user',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

export const createAdmin = (overrides: Partial<UserData> = {}): User =>
  createUser({ role: 'admin', ...overrides });

// 使用例
describe('UserProfile', () => {
  it('should display user information', () => {
    const user = createUser({ name: '佐藤花子', age: 25 });
    render(<UserProfile user={user} />);

    expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    expect(screen.getByText('25歳')).toBeInTheDocument();
  });
});
```

---

## モックとスタブ

### API呼び出しのモック

```typescript
// ✅ Good - APIモックの実装
// tests/mocks/api.ts
import { vi } from 'vitest';

export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// テストでの使用
describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user by id', async () => {
    const mockUser = createUser({ id: 'user-123' });
    mockApiClient.get.mockResolvedValue({ data: mockUser });

    const result = await userService.getUserById('user-123');

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-123');
    expect(result).toEqual(mockUser);
  });

  it('should handle API error', async () => {
    mockApiClient.get.mockRejectedValue(new Error('Network Error'));

    await expect(userService.getUserById('user-123')).rejects.toThrow('Network Error');
  });
});
```

### 外部ライブラリのモック

```typescript
// ✅ Good - 外部ライブラリのモック
// tests/setup.ts
import { vi } from 'vitest';

// Next.js router のモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/current-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Date のモック
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => '2024-01-01'),
  isValid: vi.fn(() => true),
}));
```

---

## まとめ

このテスト戦略ガイドラインに従うことで：

### テスト品質の向上

1. **包括的なカバレッジ** - テストピラミッドによる効率的なテスト配分
2. **信頼性の確保** - 適切なモック戦略による安定したテスト
3. **保守性の向上** - ファクトリーパターンによるテストデータ管理

### 開発効率の向上

1. **早期バグ発見** - Unit Tests による即座のフィードバック
2. **リファクタリング支援** - 包括的なテストによる安全な変更
3. **ドキュメント効果** - テストコードによる仕様の明文化

### チーム開発の効率化

1. **一貫したテスト品質** - 統一されたベストプラクティス
2. **スムーズなコードレビュー** - 標準化されたテスト構造
3. **新メンバーのオンボーディング** - 明確なテスト指針

これらのガイドラインに従い、継続的にテストを改善することで、品質の高いアプリケーションを効率的に開発できます。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針
- [TypeScript](./typescript-guidelines.md) - 型安全なテスト実装
- [アーキテクチャ](./architecture-guidelines.md) - テスタブルな設計
- [開発・保守](./development-guidelines.md) - エラーハンドリングとテスト
