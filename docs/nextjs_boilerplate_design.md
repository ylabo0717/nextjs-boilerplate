# Next.js 社内向け Web サービス共通 Boilerplate 設計書

## 1. 概要
本ドキュメントは、社内向け Web サービスの開発において共通利用可能な Next.js ベースの Boilerplate 設計を示す。  
UI フレームワーク、認証基盤、データ取得層、可観測性、デプロイ構成を標準化することで、開発初速・品質・運用性を向上させることを目的とする。

---

## 2. 採用技術スタック

| 分類 | 採用技術 | 理由 |
|------|----------|------|
| **UI** | shadcn/ui + Tailwind CSS v4 | Tailwindとの完全互換・カスタマイズ性・バンドルサイズ最小・ベンダーロックインなし |
| **認証/認可** | Keycloak + LDAP連携 (OIDC) + next-auth (httpOnly Cookie必須) | 社内LDAP利用・RBACが容易・OIDC標準対応・XSS対策 |
| **データ取得** | TanStack Query + apiClient + Zod | 型安全・キャッシュ・エラー整形共通化 |
| **フォーム** | React Hook Form + Zod | パフォーマンス・shadcn/ui formコンポーネントとの統合 |
| **可観測性** | OpenTelemetry(10% sampling) + Tempo + Loki + Grafana | トレース・ログの統合管理、OSSベースでコスト抑制 |
| **構造化ログ** | Pino | 高速・JSON出力・OTel trace_id連携可 |
| **API型定義** | OpenAPI codegen (openapi-typescript) | API変更時の型更新自動化 |
| **配布形態** | GitHubテンプレート | 横展開が容易 |
| **CI/CD** | GitHub Actions + Husky + lint-staged + Playwright | 品質ゲートの自動化 |
| **デプロイ** | Docker Compose | 小規模運用・オンプレ/AWS両対応、将来K8s移行可能 |

---

## 3. 認証/認可設計

### 3.1 構成
- **IdP**: Keycloak
- **ユーザーディレクトリ**: 社内LDAP
- **プロトコル**: OIDC
- **Next.js**: next-auth (JWTセッション)

### 3.2 RBAC設計
| ロール | 権限概要 |
|--------|----------|
| admin  | 全機能管理、ユーザー管理 |
| editor | データ編集、参照 |
| viewer | データ参照のみ |

- Keycloak: LDAPグループ → ロールマッピング
- OIDCトークン: `realm_access.roles` → next-auth session へ格納

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
`

// middleware.tsで設定
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\n/g, ''))
  return response
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
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,      // 必須: XSS対策
        sameSite: 'lax',     // 必須: CSRF対策
        path: '/',
        secure: true         // 必須: HTTPS環境で必須
      }
    }
  }
}
```

#### なぜhttpOnly Cookieが必須なのか
- **XSS攻撃への耐性**: JavaScriptからアクセス不可能なため、XSS攻撃でトークンが盗まれない
- **自動送信**: Fetchやaxiosで毎回手動でトークンを付与する必要がない
- **SSR対応**: サーバーサイドレンダリング時もCookieが自動送信される
- **セキュリティベストプラクティス**: OWASP推奨の実装方法

#### 絶対に使用してはいけない実装
```typescript
// ❌ 危険: localStorageへの保存（禁止）
localStorage.setItem('token', jwt)

// ❌ 危険: sessionStorageへの保存（禁止）
sessionStorage.setItem('token', jwt)

// ❌ 危険: 通常のCookie（httpOnlyなし）（禁止）
document.cookie = `token=${jwt}`
```

### 7.3 XSS対策

#### 1. 入力値のサニタイゼーション
```typescript
// Zodによる入力検証
const userSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s]+$/),
  email: z.string().email(),
  bio: z.string().max(500).transform((val) => 
    DOMPurify.sanitize(val, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] })
  )
})
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
const allowedDomains = ['localhost:3000', 'example.com']
const isValidRedirect = (url: string) => {
  try {
    const urlObj = new URL(url, window.location.origin)
    return allowedDomains.includes(urlObj.host)
  } catch {
    return false
  }
}
```

### 7.4 CSRF対策

#### 1. SameSite Cookie属性
```typescript
// next-authで自動設定
sameSite: 'lax' // フォーム送信は許可、外部サイトからの自動送信は拒否
```

#### 2. CSRFトークン実装（重要な操作時）
```typescript
// pages/api/csrf.ts
import { randomBytes } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = randomBytes(32).toString('hex')
  
  // セッションに保存
  req.session.csrfToken = token
  
  res.json({ csrfToken: token })
}

// 検証ミドルウェア
export function validateCSRF(req: NextApiRequest) {
  const token = req.headers['x-csrf-token']
  if (token !== req.session.csrfToken) {
    throw new Error('Invalid CSRF token')
  }
}
```

#### 3. Origin/Refererヘッダー検証
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // POSTリクエストの場合
  if (request.method === 'POST') {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403 })
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
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

#### Rate Limiting
```typescript
// upstashを使用した例
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10秒間に10リクエスト
})

// API Routeで使用
const { success } = await ratelimit.limit(identifier)
if (!success) {
  return res.status(429).json({ error: "Too many requests" })
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
- `keycloak`: 検証用Keycloak（本番は別管理）

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
  await page.goto('/')
  
  // 2. 新規登録
  await page.click('text=新規登録')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'Test1234!')
  await page.click('button[type=submit]')
  
  // 3. メール確認（テスト環境のメールサービス）
  const confirmUrl = await getConfirmationUrl('test@example.com')
  await page.goto(confirmUrl)
  
  // 4. ログイン確認
  await expect(page.locator('text=ダッシュボード')).toBeVisible()
})
```

### 9.3 テスト作成ガイドライン

#### 命名規則
```typescript
// Unit Test
describe('[関数/コンポーネント名]', () => {
  it('should [期待される動作]', () => {})
  it('should not [期待されない動作]', () => {})
  it('should throw when [エラー条件]', () => {})
})

// Integration Test
describe('[機能名] Integration', () => {
  it('should [ユーザーアクション] and [結果]', () => {})
})

// E2E Test
test('[ユーザーストーリー]', async ({ page }) => {})
```

#### テストデータ管理
```typescript
// fixtures/users.ts
export const mockUsers = {
  admin: { id: '1', name: 'Admin', role: 'admin' },
  viewer: { id: '2', name: 'Viewer', role: 'viewer' }
}

// factories/user.ts
export const createUser = (overrides = {}) => ({
  id: faker.datatype.uuid(),
  name: faker.name.fullName(),
  email: faker.internet.email(),
  ...overrides
})
```

#### アサーションのベストプラクティス
```typescript
// ❌ 悪い例: 曖昧なアサーション
expect(users.length).toBeGreaterThan(0)

// ✅ 良い例: 具体的なアサーション
expect(users).toHaveLength(3)
expect(users[0]).toMatchObject({ name: 'Alice', role: 'admin' })

// ❌ 悪い例: 実装の詳細をテスト
expect(component.state.isLoading).toBe(false)

// ✅ 良い例: ユーザー視点でテスト
expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
```

### 9.4 テスト実行戦略

#### ローカル開発
```bash
# ファイル保存時に自動実行
pnpm test:watch

# カバレッジ確認
pnpm test:coverage

# 特定のファイルのみ実行
pnpm test src/utils/
```

#### CI/CD パイプライン
```yaml
# .github/workflows/test.yml
- name: Unit & Integration Tests
  run: |
    pnpm test:ci
    pnpm test:coverage
    
- name: E2E Tests
  run: |
    pnpm build
    pnpm test:e2e
```

#### Pre-commit フック
```json
// .husky/pre-commit
{
  "*.{ts,tsx}": [
    "pnpm test:related --passWithNoTests"
  ]
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
```
src/
  components/
    __tests__/
      Button.test.tsx            # Unit（表示・イベント）
  lib/
    __tests__/
      apiClient.test.ts          # Unit（APIクライアント）
  features/users/
    __tests__/UsersList.int.test.tsx  # Integration（Store+Hook+UI）
e2e/
  users.spec.ts                  # E2E（シナリオ）
```

### 9.7 代表セットアップ

**Vitest**
```jsonc
// package.json (抜粋)
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:cov": "vitest --coverage"
  }
}
```

```ts
// vitest.config.ts（例）
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom";
```

**MSW（IntegrationでのAPIモック）**
```ts
// src/tests/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.get("/api/users", () => HttpResponse.json([{ id: "1", name: "Alice", email: "a@a.com" }]))
);
```

**Playwright**
```jsonc
// package.json (抜粋)
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:head": "playwright test --headed",
    "e2e:report": "playwright show-report"
  }
}
```

```ts
// playwright.config.ts（例）
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: { command: "NODE_ENV=production node .next/standalone/server.js", port: 3000, reuseExistingServer: true }
});
```

### 9.8 CI/CDとの連携
- GitHub Actions：`lint → typecheck → test(vitest) → build → e2e(playwright)`
- E2Eは `deploy/compose/app` を起動してから実行（`services:` でCompose連携）
- 失敗時は **artifact（スクショ/動画/トレース）** を保存

---

## 10. APM/ログ送り先候補比較

| 項目 | Tempo | Datadog | New Relic | Elastic APM | AWS X-Ray |
|------|-------|---------|-----------|-------------|-----------|
| OSS/SaaS | OSS | SaaS | SaaS | OSS/SaaS | SaaS |
| コスト | 無料 | 高 | 高 | 中 | AWS課金 |
| 機能幅 | トレース中心 | APM全般 | APM全般 | 検索分析強 | トレース中心 |
| UI操作性 | 中 | 高 | 高 | 中 | 中 |
| 拡張性 | 高 | 中 | 中 | 高 | 低 |
| 導入容易性 | 中 | 高 | 高 | 中 | 高（AWS環境） |

採用: **Tempo/Loki（OSSベース、Grafana統合容易、コスト低）**

---

## 11. 配布・運用

- 配布形態: GitHubテンプレート
- 運用ルール:
  - 新規サービスはテンプレートforkから開始
  - 共通UI/Hook/設定はnpm社内レジストリ化（将来）
- CI/CD:
  - GitHub Actionsでlint, typecheck, unit/integration(vitest), build, e2e(playwright)
  - Husky + lint-stagedでpre-commit品質ゲート
  - Renovate週次依存更新

---

## 12. 今後の拡張
- Sentry例外監視導入（eventId→ログ連携）
- OpenAPI codegen CI組み込み
- RBAC詳細化（フィールドレベル制御）
- PIIマスキング（Pino redact設定）

---

## 13. OSS参考資料

### 1. shadcn/ui
Radix UIとTailwind CSSで構築された再利用可能なコンポーネント。コピー＆ペーストでプロジェクトに導入可能。
https://ui.shadcn.com/

### 2. next-auth-boilerplate（Zulmy‑Azhary）  
Next.js 14 + next-auth v5 + PostgreSQL + Prisma + Zod を使った認証基盤のテンプレート。  
https://github.com/zulmy-azhary/next-auth-boilerplate

### 3. Next Auth v5 Boilerplate（xleron）  
Next.js 14＋next-auth v5に特化。2FAやRole Gateなど認証機能が充実。  
https://github.com/xleron/next-auth-v5-boilerplate

### 4. Next-js-Boilerplate（ixartz）  
App Router 対応の Next.js 15 テンプレート。TypeScript/Tailwind/Testing/Playwright/Sentry などが揃っており、開発体験とテスト導入の参考に。  
https://github.com/ixartz/Next-js-Boilerplate

### 5. Best Next.js Boilerplate（Maher Naija）  
shadcn/ui + React Hook Form + Zod + Pino Logging / Better Stack などを備えたバランス型のBoilerplate。  
https://medium.com/%40mahernaija/nextjs-best-boiler-plate-8a198a1aa90b

### 6. Taxonomy (Vercel)
Next.js 14 + Tailwind CSS + shadcn/ui を使った本番レベルのテンプレート。Vercel公式の実装例。
https://github.com/shadcn-ui/taxonomy

---

## 14. 付録. ディレクトリ構成例
```
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
