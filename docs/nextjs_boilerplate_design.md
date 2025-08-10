# Next.js 社内向け Web サービス共通 Boilerplate 設計書

## 1. 概要

本ドキュメントは、社内向け Web サービスの開発において共通利用可能な Next.js ベースの Boilerplate 設計を示す。  
UI フレームワーク、認証基盤、データ取得層、可観測性、デプロイ構成を標準化することで、開発初速・品質・運用性を向上させることを目的とする。

---

## 2. 採用技術スタック

| 分類           | 採用技術                                             | 理由                                                                             |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| **UI**         | shadcn/ui + Tailwind CSS v4                          | Tailwindとの完全互換・カスタマイズ性・バンドルサイズ最小・ベンダーロックインなし |
| **認証/認可**  | next-auth (httpOnly Cookie必須)                      | 柔軟なProvider対応・セッション管理・XSS対策                                      |
| **データ取得** | TanStack Query + apiClient + Zod                     | 型安全・キャッシュ・エラー整形共通化                                             |
| **フォーム**   | React Hook Form + Zod                                | パフォーマンス・shadcn/ui formコンポーネントとの統合                             |
| **可観測性**   | OpenTelemetry(10% sampling) + Tempo + Loki + Grafana | トレース・ログの統合管理、OSSベースでコスト抑制                                  |
| **構造化ログ** | Pino                                                 | 高速・JSON出力・OTel trace_id連携可                                              |
| **API型定義**  | OpenAPI codegen (openapi-typescript)                 | API変更時の型更新自動化                                                          |
| **配布形態**   | GitHubテンプレート                                   | 横展開が容易                                                                     |
| **CI/CD**      | GitHub Actions + Husky + lint-staged + Playwright    | 品質ゲートの自動化                                                               |
| **デプロイ**   | Docker Compose                                       | 小規模運用・オンプレ/AWS両対応、将来K8s移行可能                                  |

---

## 3. 認証/認可設計

### 3.1 基本方針

- **フレームワーク**: next-auth v5
- **セッション管理**: JWT (httpOnly Cookie)
- **Provider**: 柔軟に選択可能（OAuth、OIDC、Credentials等）

### 3.2 実装時の考慮事項

#### Provider選択例

```typescript
// プロジェクトに応じて選択
// 例1: Google OAuth
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// 例2: Keycloak (OIDC)
KeycloakProvider({
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  issuer: process.env.KEYCLOAK_ISSUER,
});

// 例3: 独自認証
CredentialsProvider({
  // カスタム認証ロジック
});
```

#### ロール設計（実装例）

プロジェクトごとにロールを定義：

```typescript
// 例: 基本的な3階層
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}
```

### 3.3 next-auth 設定要件

```ts
session: {
  strategy: "jwt",
  maxAge: 60 * 60 * 8
}
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,    // 必須
      sameSite: 'lax',   // 必須
      secure: true       // 本番環境で必須
    }
  }
}
必須クレーム: sub, email, name, roles
```

---

## 4. データ取得レイヤー設計

### 4.1 採用理由

- TanStack Query により、キャッシュ・再検証・エラー管理を統一
- `apiClient` で認証ヘッダ付与・エラー整形・Zodバリデーションを共通化

### 4.2 実装方針

- APIレスポンスは必ずZodスキーマで検証
- エラーUIは共通Toast & Retryボタンで対応
- `queryKey` は機能単位で一貫性ある命名規則を使用

---

## 5. UI/UX設計

### 5.1 shadcn/ui設定

- フォント: `"Inter","Noto Sans JP",sans-serif`
- 角丸: Tailwind CSS変数 `--radius: 0.75rem` (12px)
- カラーシステム: CSS変数ベース（ダークモード対応）
- コンポーネント: 必要なものだけ選択的にインストール

### 5.2 コンポーネント利用ルール

- コンポーネントは `@/components/ui` に配置
- shadcn/uiのコンポーネントはソースコードとして管理（直接カスタマイズ可能）
- Tailwind CSS v4のユーティリティクラスで統一的にスタイリング
- DataTableは `@tanstack/react-table` をベースに実装

---

## 6. 可観測性設計

### 6.1 構成

- OpenTelemetry SDK（Node/Browser）
- OTel Collector → Tempo（トレース）/ Loki（ログ）
- Grafanaで統合可視化

### 6.2 設定値

- サンプリング: 本番10%、開発100%
- タグ: `service.name`, `deployment.environment`, `cloud.provider`
- ログ: Pinoで構造化出力、trace_id/span_id付与
- データ保持: Tempo/Lokiともに30日

---

## 7. セキュリティ設計

### 7.1 Content Security Policy (CSP)

#### 本番環境のCSP設定

```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
`;

// middleware.tsで設定
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\n/g, ''));
  return response;
}
```

#### 開発環境での緩和設定

- `'unsafe-eval'`を許可（HMR対応）
- `connect-src`にwebsocket追加

### 7.2 JWT トークン管理戦略

#### 必須要件: httpOnly Cookie方式

```typescript
// next-auth設定（必須）
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8時間
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true, // 必須: XSS対策
        sameSite: 'lax', // 必須: CSRF対策
        path: '/',
        secure: true, // 必須: HTTPS環境で必須
      },
    },
  },
};
```

#### なぜhttpOnly Cookieが必須なのか

- **XSS攻撃への耐性**: JavaScriptからアクセス不可能なため、XSS攻撃でトークンが盗まれない
- **自動送信**: Fetchやaxiosで毎回手動でトークンを付与する必要がない
- **SSR対応**: サーバーサイドレンダリング時もCookieが自動送信される
- **セキュリティベストプラクティス**: OWASP推奨の実装方法

#### 絶対に使用してはいけない実装

```typescript
// ❌ 危険: localStorageへの保存（禁止）
localStorage.setItem('token', jwt);

// ❌ 危険: sessionStorageへの保存（禁止）
sessionStorage.setItem('token', jwt);

// ❌ 危険: 通常のCookie（httpOnlyなし）（禁止）
document.cookie = `token=${jwt}`;
```

### 7.3 XSS対策

#### 1. 入力値のサニタイゼーション

```typescript
// Zodによる入力検証
const userSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\s]+$/),
  email: z.string().email(),
  bio: z
    .string()
    .max(500)
    .transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] })),
});
```

#### 2. React の自動エスケープ活用

```tsx
// 危険な例（使用禁止）
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 安全な例
<div>{userInput}</div> // Reactが自動的にエスケープ
```

#### 3. URL パラメータの検証

```typescript
// 安全なリダイレクト処理
const allowedDomains = ['localhost:3000', 'example.com'];
const isValidRedirect = (url: string) => {
  try {
    const urlObj = new URL(url, window.location.origin);
    return allowedDomains.includes(urlObj.host);
  } catch {
    return false;
  }
};
```

### 7.4 CSRF対策

#### 1. SameSite Cookie属性

```typescript
// next-authで自動設定
sameSite: 'lax'; // フォーム送信は許可、外部サイトからの自動送信は拒否
```

#### 2. CSRFトークン実装（重要な操作時）

```typescript
// pages/api/csrf.ts
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = randomBytes(32).toString('hex');

  // セッションに保存
  req.session.csrfToken = token;

  res.json({ csrfToken: token });
}

// 検証ミドルウェア
export function validateCSRF(req: NextApiRequest) {
  const token = req.headers['x-csrf-token'];
  if (token !== req.session.csrfToken) {
    throw new Error('Invalid CSRF token');
  }
}
```

#### 3. Origin/Refererヘッダー検証

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // POSTリクエストの場合
  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
  }
}
```

### 7.5 その他のセキュリティ対策

#### セキュリティヘッダー

```typescript
// middleware.ts
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

#### Rate Limiting

```typescript
// upstashを使用した例
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10秒間に10リクエスト
});

// API Routeで使用
const { success } = await ratelimit.limit(identifier);
if (!success) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

#### 環境変数の管理

```typescript
// .env.local（Gitignore必須）
NEXTAUTH_SECRET=xxx  # 32文字以上のランダム文字列
DATABASE_URL=xxx

// 実行時検証
const envSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

---

## 8. デプロイ設計

### 8.1 基本方針

- 初期はDocker Compose（開発/小規模本番）
- 将来的にK8sへ移行可能な構成を意識（サービス単位の分離）

### 8.2 Compose構成

- `app`: Next.js（dev/prod両対応）
- `observability`: Tempo, Loki, Promtail, Grafana, OTel Collector

---

## 9. テスト設計

### 9.1 テストピラミッド戦略

```
         /\        E2E (10%)
        /  \       - ユーザージャーニー
       /    \      - クリティカルパス
      /------\
     / Integr.\    Integration (30%)
    /  ation   \   - API連携
   /            \  - コンポーネント統合
  /--------------\
 /     Unit      \ Unit (60%)
/________________\ - ビジネスロジック
                   - ユーティリティ関数
```

### 9.2 各テストレベルの役割とポリシー

#### Unit Test（単体テスト）

**目的**: 個々の関数・コンポーネントが正しく動作することを保証

**対象**:

- ユーティリティ関数
- カスタムフック
- 純粋なReactコンポーネント
- Zodスキーマ
- ビジネスロジック

**ポリシー**:

- 外部依存は全てモック化
- 1テスト1アサーション原則
- テスト実行時間: 各テスト50ms以内
- カバレッジ目標: 80%以上

**例**:

```typescript
// utils.test.ts
describe('formatDate', () => {
  it('should format ISO date to Japanese format', () => {
    expect(formatDate('2024-01-01')).toBe('2024年1月1日')
  })
})

// Button.test.tsx
describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

#### Integration Test（統合テスト）

**目的**: 複数のコンポーネント・モジュールが連携して正しく動作することを保証

**対象**:

- フォーム送信フロー
- API呼び出しを含むコンポーネント
- 状態管理との連携
- 認証フロー

**ポリシー**:

- APIはMSWでモック化
- 実際のルーティングを使用
- データベースはモック
- テスト実行時間: 各テスト500ms以内
- カバレッジ目標: 70%以上

**例**:

```typescript
// UserList.integration.test.tsx
describe('UserList Integration', () => {
  beforeAll(() => server.listen()) // MSW起動

  it('should fetch and display users', async () => {
    render(<UserList />, { wrapper: QueryClientProvider })

    // ローディング状態の確認
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // データ取得後の表示確認
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })
})
```

#### E2E Test（エンドツーエンドテスト）

**目的**: ユーザー視点でのシステム全体の動作を保証

**対象**:

- クリティカルなユーザージャーニー
- 認証から決済までの一連のフロー
- クロスブラウザ互換性
- パフォーマンス要件

**ポリシー**:

- 実際のブラウザで実行
- テスト環境のDBを使用（テスト後にクリーンアップ）
- 最小限のシナリオに絞る
- テスト実行時間: 各シナリオ30秒以内
- 並列実行を活用

**例**:

```typescript
// e2e/user-journey.spec.ts
test('ユーザー登録から初回ログインまで', async ({ page }) => {
  // 1. トップページアクセス
  await page.goto('/');

  // 2. 新規登録
  await page.click('text=新規登録');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'Test1234!');
  await page.click('button[type=submit]');

  // 3. メール確認（テスト環境のメールサービス）
  const confirmUrl = await getConfirmationUrl('test@example.com');
  await page.goto(confirmUrl);

  // 4. ログイン確認
  await expect(page.locator('text=ダッシュボード')).toBeVisible();
});
```

### 9.3 テスト作成ガイドライン

#### 命名規則

```typescript
// Unit Test
describe('[関数/コンポーネント名]', () => {
  it('should [期待される動作]', () => {});
  it('should not [期待されない動作]', () => {});
  it('should throw when [エラー条件]', () => {});
});

// Integration Test
describe('[機能名] Integration', () => {
  it('should [ユーザーアクション] and [結果]', () => {});
});

// E2E Test
test('[ユーザーストーリー]', async ({ page }) => {});
```

#### テストデータ管理

```typescript
// fixtures/users.ts
export const mockUsers = {
  admin: { id: '1', name: 'Admin', role: 'admin' },
  viewer: { id: '2', name: 'Viewer', role: 'viewer' },
};

// factories/user.ts
export const createUser = (overrides = {}) => ({
  id: faker.datatype.uuid(),
  name: faker.name.fullName(),
  email: faker.internet.email(),
  ...overrides,
});
```

#### アサーションのベストプラクティス

```typescript
// ❌ 悪い例: 曖昧なアサーション
expect(users.length).toBeGreaterThan(0);

// ✅ 良い例: 具体的なアサーション
expect(users).toHaveLength(3);
expect(users[0]).toMatchObject({ name: 'Alice', role: 'admin' });

// ❌ 悪い例: 実装の詳細をテスト
expect(component.state.isLoading).toBe(false);

// ✅ 良い例: ユーザー視点でテスト
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

### 9.4 テスト実行戦略

本プロジェクトのテストは `tests/` 配下に種類別で配置する。

```text
tests/
  unit/         # 単体テスト（関数・フック・純粋コンポーネント）
  integration/  # 統合テスト（APIモック、ルーティング連携等）
  e2e/          # エンドツーエンド（Playwright）
```

#### ローカル開発

```bash
# 全体テスト（Unit/Integration/E2Eを一括実行）
pnpm test

# 種別ごとに実行
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# ウォッチモード（主にUnit/Integration）
pnpm test:unit -- --watch

# カバレッジ（Unit/Integration 対象）
pnpm test:coverage

# 特定のテストファイルのみ
pnpm test:unit -- tests/unit/utils/formatDate.test.ts
# テスト名で絞り込み
pnpm test:unit -- -t "should format ISO date"
```

#### CI/CD パイプライン

```yaml
# .github/workflows/test.yml（例）
- name: Unit & Integration Tests
  run: |
    pnpm test:unit
    pnpm test:integration
    pnpm test:coverage

- name: E2E Tests
  run: |
    pnpm build
    pnpm test:e2e
```

#### Pre-commit フック

コミット前は軽量な検証（lint, typecheck と併せて Unit のみ）を推奨。

```json
// .husky/pre-commit（例: lint-staged連携）
{
  "*.{ts,tsx}": ["pnpm test:unit -- --passWithNoTests"]
}
```

### 9.5 テスト優先順位

**必須（P0）**:

- 認証・認可ロジック
- 決済処理
- データ永続化処理
- セキュリティ関連機能

**重要（P1）**:

- ユーザー入力バリデーション
- API通信処理
- 主要UIコンポーネント

**推奨（P2）**:

- ユーティリティ関数
- 表示フォーマット
- エラーハンドリング

### 9.6 ディレクトリ規約

```text
tests/
  unit/
    utils/formatDate.test.ts             # Unit（ユーティリティ）
    components/Button.test.tsx           # Unit（表示・イベント）
  integration/
    users/UsersList.integration.test.tsx # Integration（Store+Hook+UI+APIモック）
  e2e/
    users.spec.ts                        # E2E（シナリオ）
```

### 9.7 代表セットアップ

#### Vitest

```jsonc
// package.json (抜粋)
{
  "scripts": {
    "test": "vitest --run --dir tests/unit --dir tests/integration && playwright test",
    "test:unit": "vitest --run --dir tests/unit",
    "test:integration": "vitest --run --dir tests/integration",
    "test:coverage": "vitest --coverage --dir tests/unit --dir tests/integration",
    "test:watch": "vitest",
  },
}
```

```ts
// vitest.config.ts（例）
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
});
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom';
```

#### MSW（IntegrationでのAPIモック）

```ts
// tests/integration/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/users', () => HttpResponse.json([{ id: '1', name: 'Alice', email: 'a@a.com' }]))
);
```

#### Playwright

```jsonc
// package.json (抜粋)
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:head": "playwright test --headed",
    "test:e2e:report": "playwright show-report",
  },
}
```

```ts
// playwright.config.ts（例）
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'NODE_ENV=production node .next/standalone/server.js',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### 9.8 CI/CDとの連携

- GitHub Actions：`lint → typecheck → test(vitest) → build → e2e(playwright)`
- E2Eは `deploy/compose/app` を起動してから実行（`services:` でCompose連携）
- 失敗時は **artifact（スクショ/動画/トレース）** を保存

---

## 10. エラーハンドリング戦略

### 10.1 エラー分類と処理方針

#### エラーカテゴリ

| カテゴリ              | 説明                                               | 処理方針                                       |
| --------------------- | -------------------------------------------------- | ---------------------------------------------- |
| **Operational Error** | 予期される業務エラー（バリデーション、認証失敗等） | ユーザーへの適切なフィードバック               |
| **Programming Error** | バグ・実装ミス                                     | ログ記録、開発環境でスタックトレース表示       |
| **System Error**      | インフラ・外部サービス障害                         | リトライ、フォールバック、サーキットブレーカー |

### 10.2 グローバルエラーハンドラー実装

```typescript
// lib/errors/AppError.ts
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 定義済みエラー
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = '認証が必要です') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = '権限がありません') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}
```

### 10.3 Error Boundary実装

```typescript
// components/ErrorBoundary.tsx
'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  const router = useRouter();

  // エラーを構造化ログとして送信
  useEffect(() => {
    logger.error('ErrorBoundary caught error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      location: window.location.href,
      userAgent: navigator.userAgent
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.isOperational ? error.message : '予期しないエラーが発生しました。'}
      </p>
      <div className="flex gap-2">
        <Button onClick={resetErrorBoundary}>再試行</Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          ホームへ戻る
        </Button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

### 10.4 API エラーレスポンス統一フォーマット

```typescript
// types/api.ts
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    traceId?: string;
  };
}

// lib/apiClient.ts
class ApiClient {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();

      // エラーコードに基づいた処理
      switch (errorData.error.code) {
        case 'AUTHENTICATION_ERROR':
          // 認証エラー時はログイン画面へ
          await signOut({ callbackUrl: '/login' });
          break;
        case 'RATE_LIMIT_ERROR':
          // レート制限エラー
          toast.error('リクエストが多すぎます。しばらくお待ちください。');
          break;
        default:
          // その他のエラー
          toast.error(errorData.error.message);
      }

      throw new AppError(errorData.error.message, response.status, errorData.error.code);
    }

    return response.json();
  }
}
```

### 10.5 非同期エラーハンドリング

```typescript
// hooks/useAsyncError.ts
export function useAsyncError() {
  const [, setError] = useState();

  return useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

// 使用例
function MyComponent() {
  const throwError = useAsyncError();

  const handleAsyncOperation = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      // Error Boundaryでキャッチされる
      throwError(error as Error);
    }
  };
}
```

---

## 11. APM/ログ送り先候補比較

| 項目       | Tempo        | Datadog | New Relic | Elastic APM | AWS X-Ray     |
| ---------- | ------------ | ------- | --------- | ----------- | ------------- |
| OSS/SaaS   | OSS          | SaaS    | SaaS      | OSS/SaaS    | SaaS          |
| コスト     | 無料         | 高      | 高        | 中          | AWS課金       |
| 機能幅     | トレース中心 | APM全般 | APM全般   | 検索分析強  | トレース中心  |
| UI操作性   | 中           | 高      | 高        | 中          | 中            |
| 拡張性     | 高           | 中      | 中        | 高          | 低            |
| 導入容易性 | 中           | 高      | 高        | 中          | 高（AWS環境） |

採用: **Tempo/Loki（OSSベース、Grafana統合容易、コスト低）**

---

## 11. パフォーマンス最適化

### 11.1 バンドルサイズ最適化

#### Bundle Analyzer設定

```typescript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // その他の設定
});

// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true pnpm build"
  }
}
```

#### 動的インポートによる分割

```typescript
// コンポーネントの遅延読み込み
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false // クライアントサイドのみ
  }
);

// ライブラリの遅延読み込み
const loadChart = async () => {
  const { Chart } = await import('chart.js');
  return Chart;
};
```

### 11.2 React Server Components活用

```typescript
// app/users/page.tsx (Server Component)
async function UsersPage() {
  // サーバーサイドでデータ取得
  const users = await getUsers();

  return (
    <div>
      {/* Client Componentは必要な部分のみ */}
      <UserFilters />
      {/* Server Component内でレンダリング */}
      <UsersList users={users} />
    </div>
  );
}

// components/UsersList.tsx (Server Component)
export function UsersList({ users }: Props) {
  return (
    <div>
      {users.map(user => (
        // インタラクティブな部分のみClient Component
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### 11.3 画像最適化

```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
  },
};

// 使用例
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority // LCP改善
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

### 11.4 Web Vitals監視

```typescript
// app/layout.tsx
import { WebVitalsReporter } from '@/components/WebVitalsReporter';

export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        {children}
        <WebVitalsReporter />
      </body>
    </html>
  );
}

// components/WebVitalsReporter.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // しきい値チェック
    const thresholds = {
      FCP: 1800,
      LCP: 2500,
      FID: 100,
      TTFB: 800,
      CLS: 0.1,
      INP: 200,
    };

    if (metric.value > (thresholds[metric.name as keyof typeof thresholds] || Infinity)) {
      // パフォーマンス劣化を記録
      logger.warn('Web Vitals threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold: thresholds[metric.name as keyof typeof thresholds],
        path: window.location.pathname,
      });
    }

    // OpenTelemetryに送信
    sendToAnalytics(metric);
  });

  return null;
}
```

### 11.5 キャッシュ戦略

```typescript
// TanStack Query グローバル設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分（旧cacheTime）
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// 個別のクエリ設定
const { data } = useQuery({
  queryKey: ['users', filters],
  queryFn: fetchUsers,
  staleTime: Infinity, // マスターデータは常に新鮮
  gcTime: 24 * 60 * 60 * 1000, // 24時間保持
});

// プリフェッチ
export async function prefetchUsers() {
  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}
```

### 11.6 メモ化とコード分割

```typescript
// コンポーネントのメモ化
const ExpensiveComponent = memo(({ data }: Props) => {
  // 高コストな計算
  const processed = useMemo(() =>
    processLargeDataset(data), [data]
  );

  // 高コストなコールバック
  const handleSubmit = useCallback((values) => {
    submitForm(values);
  }, []);

  return <div>{/* ... */}</div>;
});

// ルートベースのコード分割
// app/admin/page.tsx
const AdminDashboard = dynamic(
  () => import('@/features/admin/Dashboard'),
  { loading: () => <AdminSkeleton /> }
);
```

---

## 12. 状態管理方針

### 12.1 状態の分類と管理手法

| 状態の種類           | 管理手法            | 使用ケース                     |
| -------------------- | ------------------- | ------------------------------ |
| **サーバー状態**     | TanStack Query      | API レスポンス、キャッシュ管理 |
| **フォーム状態**     | React Hook Form     | 入力値、バリデーション         |
| **グローバルUI状態** | Zustand             | テーマ、サイドバー開閉、通知   |
| **認証状態**         | next-auth           | ユーザー情報、権限             |
| **ローカル状態**     | useState/useReducer | コンポーネント内の一時的な状態 |

### 12.2 Zustand によるグローバル状態管理

```typescript
// stores/useAppStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // UI状態
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: AppState['theme']) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'system',

        toggleSidebar: () =>
          set((state) => ({
            sidebarOpen: !state.sidebarOpen,
          })),

        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ theme: state.theme }), // 一部のみ永続化
      }
    )
  )
);
```

### 12.3 複雑なフォーム状態管理

```typescript
// 複数ステップフォーム
interface FormStore {
  step: number;
  data: Partial<FormData>;
  setStep: (step: number) => void;
  updateData: (data: Partial<FormData>) => void;
  reset: () => void;
}

const useFormStore = create<FormStore>((set) => ({
  step: 0,
  data: {},
  setStep: (step) => set({ step }),
  updateData: (data) =>
    set((state) => ({
      data: { ...state.data, ...data },
    })),
  reset: () => set({ step: 0, data: {} }),
}));

// フォームコンポーネント
function MultiStepForm() {
  const { step, data, updateData, setStep } = useFormStore();
  const form = useForm({
    defaultValues: data,
  });

  const onSubmit = (values: FieldValues) => {
    updateData(values);
    if (step < MAX_STEPS - 1) {
      setStep(step + 1);
    } else {
      // 最終送信
      submitForm({ ...data, ...values });
    }
  };
}
```

### 12.4 楽観的更新パターン

```typescript
// hooks/useOptimisticUpdate.ts
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: updateUserApi,
    onMutate: async (newUser) => {
      // キャンセル
      await queryClient.cancelQueries({ queryKey: ['users', newUser.id] });

      // 現在の値を保存
      const previousUser = queryClient.getQueryData(['users', newUser.id]);

      // 楽観的更新
      queryClient.setQueryData(['users', newUser.id], newUser);

      return { previousUser };
    },
    onError: (err, newUser, context) => {
      // ロールバック
      queryClient.setQueryData(['users', newUser.id], context?.previousUser);
    },
    onSettled: () => {
      // 再検証
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return updateUser;
}
```

---

## 13. アクセシビリティ（a11y）対応

### 13.1 基本方針

- WCAG 2.1 レベル AA 準拠
- キーボードナビゲーション完全対応
- スクリーンリーダー対応
- カラーユニバーサルデザイン

### 13.2 実装ガイドライン

#### セマンティックHTML

```tsx
// ❌ 悪い例
<div onClick={handleClick}>ボタン</div>

// ✅ 良い例
<button onClick={handleClick}>ボタン</button>

// ランドマークの使用
<header role="banner">
  <nav role="navigation" aria-label="メインナビゲーション">
    {/* ... */}
  </nav>
</header>
<main role="main">
  <section aria-labelledby="section-title">
    <h2 id="section-title">セクションタイトル</h2>
  </section>
</main>
```

#### ARIA属性の活用

```tsx
// フォームの関連付け
<label htmlFor="email">メールアドレス</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
/>
{errors.email && (
  <span id="email-error" role="alert">
    {errors.email.message}
  </span>
)}

// 動的コンテンツ
<div aria-live="polite" aria-atomic="true">
  {notification && <Alert>{notification}</Alert>}
</div>

// モーダル
<Dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">確認</h2>
  <p id="dialog-description">本当に削除しますか？</p>
</Dialog>
```

#### キーボードナビゲーション

```tsx
// フォーカス管理
const DialogComponent = () => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // 開いた時に閉じるボタンにフォーカス
    closeButtonRef.current?.focus();

    // ESCキーで閉じる
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div role="dialog">
      <button ref={closeButtonRef} onClick={onClose}>
        閉じる
      </button>
    </div>
  );
};

// スキップリンク
<a href="#main-content" className="sr-only focus:not-sr-only">
  メインコンテンツへスキップ
</a>;
```

#### カラーコントラスト

```css
/* colors.css */
:root {
  /* AA準拠のカラーパレット */
  --text-primary: #1a1a1a; /* 背景白に対して 15.3:1 */
  --text-secondary: #4a4a4a; /* 背景白に対して 8.5:1 */
  --text-disabled: #767676; /* 背景白に対して 4.5:1 (最小基準) */

  /* エラー・警告色 */
  --error: #d32f2f; /* コントラスト比 5.4:1 */
  --warning: #f57c00; /* コントラスト比 3.5:1 (大きいテキスト用) */
}
```

### 13.3 テスト戦略

```typescript
// a11y自動テスト
import { axe } from '@axe-core/playwright';

test('アクセシビリティチェック', async ({ page }) => {
  await page.goto('/');
  const results = await axe(page);
  expect(results.violations).toHaveLength(0);
});

// React Testing Library
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button コンポーネントのa11y', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 14. 開発環境設定

### 14.1 VSCode推奨拡張機能

```json
// .vscode/extensions.json
{
  "recommendations": [
    // 必須
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",

    // 開発効率向上
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",

    // デバッグ
    "msjsdiag.debugger-for-chrome",
    "ms-vscode.js-debug-nightly",

    // Git
    "eamodio.gitlens",
    "donjayamanne.githistory"
  ]
}
```

### 14.2 ESLint/Prettier設定

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:tailwindcss/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'tailwindcss/no-custom-classname': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
  },
};

// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx', 'cn'],
};
```

### 14.3 デバッグ設定

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev",
      "serverReadyAction": {
        "pattern": "- Local:.+(https?://\\S+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

### 14.4 Git設定

```bash
# .gitmessage
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, test, chore
# Scope: 影響範囲（オプション）
# Subject: 変更内容の要約（50文字以内）
# Body: 詳細な説明（オプション）
# Footer: Breaking changes, Issues closed（オプション）
```

```json
// .czrc (Commitizen設定)
{
  "path": "cz-conventional-changelog"
}
```

---

## 15. 監視・アラート設計

### 15.1 メトリクス定義

| メトリクス               | しきい値 | アラート条件                       |
| ------------------------ | -------- | ---------------------------------- |
| **エラー率**             | 1%       | 5分間で1%超過                      |
| **レスポンス時間 (P95)** | 500ms    | 5分間で500ms超過                   |
| **可用性**               | 99.9%    | 5分間で3回以上のヘルスチェック失敗 |
| **メモリ使用率**         | 80%      | 10分間で80%超過                    |
| **CPU使用率**            | 70%      | 10分間で70%超過                    |

### 15.2 カスタムメトリクス

```typescript
// lib/metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('app-metrics');

// ビジネスメトリクス
export const businessMetrics = {
  userSignup: meter.createCounter('user.signup', {
    description: 'Number of user signups',
  }),

  purchaseAmount: meter.createHistogram('purchase.amount', {
    description: 'Purchase amount distribution',
    unit: 'JPY',
  }),

  activeUsers: meter.createUpDownCounter('users.active', {
    description: 'Number of active users',
  }),
};

// 使用例
businessMetrics.userSignup.add(1, {
  source: 'google',
  plan: 'premium',
});
```

### 15.3 アラート設定

```yaml
# grafana/alerts.yml
groups:
  - name: application
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      - alert: SlowResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Slow response time'
          description: 'P95 response time is {{ $value }}s'
```

---

## 16. データ永続化層の考慮事項

### 16.1 ボイラープレートの方針

本ボイラープレートではデータ永続化層（ORM、データベース）は **含まない** 設計とする。

理由：

- プロジェクトごとにDB要件が異なる（RDB、NoSQL、外部API等）
- ORM選択もプロジェクト依存（Prisma、Drizzle、TypeORM等）
- 不要な依存関係を避ける

### 16.2 データ層実装時の推奨事項

プロジェクトでデータ層を追加する際の推奨事項：

#### ORM選定の観点

- **Prisma**: 型安全性重視、開発効率優先
- **Drizzle**: パフォーマンス重視、SQL制御優先
- **TypeORM**: エンタープライズ向け、機能豊富

#### ディレクトリ構造例

```text
src/
  lib/
    db/           # DB接続設定
  repositories/   # データアクセス層
  services/       # ビジネスロジック層
```

#### 環境変数管理

```typescript
// 実装時に追加する環境変数例
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

---

## 17. 段階的導入計画

### 17.1 フェーズ分け

#### Phase 1: 開発基盤構築（1週間）

- [x] 基本的なNext.js セットアップ
- [x] TypeScript設定
- [x] ESLint/Prettier設定
- [x] Tailwind CSS v4 設定
- [x] shadcn/ui 導入と基本コンポーネント
- [x] ディレクトリ構造の確立
- [x] Husky + lint-staged設定

#### Phase 2: 品質・CI/CD基盤（1週間）

- [ ] Vitest環境構築（単体テスト）
- [ ] GitHub Actions CI設定
- [ ] Playwright環境構築（E2E）
- [ ] コミット規約設定（Conventional Commits）

#### Phase 3: インフラ・運用基盤（1週間）

- [ ] Docker Compose環境構築
- [ ] 環境変数管理設定
- [ ] OpenTelemetry基本設定
- [ ] Pino構造化ログ設定
- [ ] エラーハンドリング基盤
- [ ] Grafana/Tempo/Loki設定

#### Phase 4: アプリケーション基盤（1週間）

- [ ] TanStack Query設定
- [ ] Zustand状態管理設定
- [ ] React Hook Form設定
- [ ] APIクライアント基盤構築
- [ ] Zod スキーマ定義基盤

#### Phase 5: 認証・セキュリティ（1週間）

- [ ] next-auth基本実装
- [ ] Provider設定（開発用モック認証）
- [ ] セッション管理実装
- [ ] CSP/セキュリティヘッダー設定
- [ ] Rate Limiting実装

#### Phase 6: 機能実装・最適化（1週間）

- [ ] サンプルページ実装（ダッシュボード、設定画面）
- [ ] モックAPIとの連携サンプル
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ対応
- [ ] Web Vitals監視設定
- [ ] ドキュメント整備

### 17.2 チェックリスト

```markdown
## 開発開始前チェックリスト

### 環境準備

- [ ] Node.js 20.x インストール
- [ ] pnpm インストール
- [ ] Docker Desktop インストール
- [ ] VSCode + 推奨拡張機能

### アカウント準備

- [ ] GitHub組織アカウント
- [ ] 監視システムアクセス（必要に応じて）

### 初期設定

- [ ] テンプレートからリポジトリ作成
- [ ] 環境変数設定（.env.local）
- [ ] pre-commit hook確認
- [ ] ローカル動作確認
```

---

## 18. 配布・運用

- 配布形態: GitHubテンプレート
- 運用ルール:
  - 新規サービスはテンプレートforkから開始
  - 共通UI/Hook/設定はnpm社内レジストリ化（将来）
- CI/CD:
  - GitHub Actionsでlint, typecheck, unit/integration(vitest), build, e2e(playwright)
  - Husky + lint-stagedでpre-commit品質ゲート
  - Renovate週次依存更新

---

## 12. 今後の拡張（プロジェクトごとに検討）

### ボイラープレート拡張候補

- Sentry例外監視導入（eventId→ログ連携）
- OpenAPI codegen CI組み込み
- PIIマスキング（Pino redact設定）
- MSW（Mock Service Worker）統合

### プロジェクト固有の拡張

- 特定IdPとの連携（Keycloak、Auth0、Azure AD等）
- データベース層の追加（Prisma、Drizzle、TypeORM等）
- 認可の詳細化（RBAC、ABAC、フィールドレベル制御）
- ビジネス固有の機能実装

---

---

## 14. 付録. ディレクトリ構成例

```text
src/
  app/
    api/auth/[...nextauth]/
    layout.tsx
  components/
    ui/               # shadcn/uiコンポーネント
      button.tsx
      form.tsx
      dialog.tsx
      ...
  hooks/
  lib/
    apiClient.ts
    rbac.ts
    utils.ts          # shadcn/ui用ユーティリティ
deploy/
  compose/
    app/
    observability/
    keycloak/ (任意)
```
