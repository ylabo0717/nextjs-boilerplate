# Docker Compose 設計レビュー（2025-08-17, by Copilot）

本レビューは `docs/work_dir/docker_compose` の以下3文書を対象に実施しました。

- docker-compose-design.md
- environment-configurations.md
- implementation-plan.md

合わせて現状リポジトリの設定（package.json / Playwright / Vitest / 既存 docker-compose.loki.yml 等）と整合性を確認しています。

## 結論（サマリ）

- 全体方針（段階的移行・環境パリティ・監視の継続・セキュリティ強化・Multi-stage）は妥当で、アーキテクチャの筋が良い。
- ただし、いくつかの致命的な不整合と実装前提の穴があり、このまま着手するとハマりどころが多い。下記の「ブロッカー」を先に解消してから実装に入ることを推奨。

## 良い点（Strengths）

- 段階的なコンテナ化の方針が明確（並行運用・ロールバック設計が考慮済み）
- 環境ごとの Compose 分離と profiles 活用で、運用柔軟性とメンテ性が高い
- Loki/Grafana の既存資産を活かしつつ監視を継続する設計
- Multi-stage build 前提、キャッシュ・ボリューム戦略が提示されている
- Secrets 管理（本番）と .env 管理（開発/テスト）の住み分けが明確

## ブロッカー（着手前に要対応）

1. アプリのヘルスチェック `/api/health` が実装に存在しない

- 影響: すべての healthcheck が失敗し、依存関係の起動順や監視が破綻。
- 対応案: Next.js App Router にヘルスエンドポイントを追加（例: `src/app/api/health/route.ts` で 200 を返却）。

1. Grafana ポート衝突（現行ファイルと設計の不一致）

- 設計: Grafana を 3001 にバインド（ポート衝突回避）
- 現状: `docker-compose.loki.yml` は `3000:3000` で、アプリ `3000` と衝突
- 対応案: 既存 `docker-compose.loki.yml` を 3001 に変更、もしくはアプリ側をずらす。設計と実物を統一。

1. `deploy:` セクションは Docker Compose（単ノード）では無効

- `deploy.replicas` や `deploy.resources` は Swarm 専用。Compose 単体では効かない。
- 対応案:
  - Swarm/Kubernetes を採用する（運用要件次第）
  - もしくは Compose 運用に寄せて、`--scale app=N` を手順として統一し、リソース制限は（必要なら）Compose 互換の `mem_limit`/`cpus` 等に置換。

1. Redis のパスワード受け渡しが機能しない

- 定義: `REDIS_PASSWORD_FILE` のみ。`command: redis-server --requirepass $REDIS_PASSWORD` は未定義変数。
- 対応案: `command: ["sh", "-c", "redis-server --requirepass \"$(cat /run/secrets/redis_password)\""]`

1. Postgres healthcheck が `_FILE` 変数と不整合

- `POSTGRES_*_FILE` を使うと `$POSTGRES_USER`/`$POSTGRES_DB` が未定義の可能性。
- 対応案: `pg_isready -U "$(cat /run/secrets/postgres_user)" -d "$(cat /run/secrets/postgres_db)"` などに修正。

1. Playwright の BASE_URL 変数名不一致

- 設計: `PLAYWRIGHT_BASE_URL`
- 実装: `playwright.config.ts` は `process.env.BASE_URL` を参照
- 対応案: どちらかに統一（推奨: 実装側に `PLAYWRIGHT_BASE_URL ?? BASE_URL` の両対応分岐を追加）。

7. Playwright バージョンの乖離

- Compose イメージ: `mcr.microsoft.com/playwright:v1.45.1`
- リポジトリ: `@playwright/test` などは `^1.54.2`
- 対応案: イメージタグを依存関係に合わせて更新。

8. テスト Compose の `node_modules` マウントが破壊的

- `app-test` に `- node_modules_test:/app/node_modules` をマウントすると、イメージ内にインストール済みの依存が空ボリュームで上書きされ、テストが失敗する恐れ。
- 対応案: テスト系サービスでは `node_modules` マウントを撤去し、イメージ内の依存を使用。

9. Nginx の設定パスが公式イメージと齟齬

- 設計: `/etc/nginx/sites-available/default`（Debian系）
- 公式イメージ標準: `/etc/nginx/conf.d/default.conf`
- 対応案: 公式に合わせた配置/命名に修正。

10. `curl` 前提の healthcheck

- Node/Alpine ベースだと `curl` が無い場合が多い。
- 対応案: Dockerfile で `curl`/`wget` を導入、もしくは `CMD-SHELL` で `wget -qO-` 等に変更。

## 中優先（Should fix）

- Dev 用ポート `24678` は Vite 既定のWSポート。Next.js（Turbopack）では不要の可能性が高い。要確認/削除。
- Playwright の `webServer` 二重起動防止ガード（例: `if (BASE_URL 提供済みなら webServer 無効化)` もしくは `PLAYWRIGHT_SKIP_WEBSERVER` を導入）。
- `pnpm` キャッシュパスは非 root 実行に合わせて調整（非 root 化の方針に連動）。
- `.dockerignore` の整備（`node_modules`, `.next`, `coverage`, `playwright-report` 等）。
- 設計で参照しているが未作成のアセット: `docker/nginx/**`, `docker/postgres/**`, `scripts/backup.sh`, `secrets/*.txt`。
- Loki ネットワークを他 Compose と接続する方針の明文化（`external: true` で共通ネットワーク名を使う、または `--project-name` で連携する等）。
- 監視/ロギングのローテーション設定（Compose の `logging` オプションで `max-size`, `max-file` を設定）。

## 現状との整合性チェック（エビデンス）

- `/api/health` ルート: 検索の結果、実装に存在せず（`src/**` に該当なし）。
- 既存 `docker-compose.loki.yml`: Grafana は `3000:3000`（設計では 3001）。
- Playwright: `playwright.config.ts` は `process.env.BASE_URL` を参照。設計側は `PLAYWRIGHT_BASE_URL` を注入。
- テスト構成: Vitest（unit/integration）は Testcontainers を活用。Compose ベースの DB/Redis と競合しないように運用分離が必要（設計では分離されているが、実装ガード未記載）。

## 推奨修正（スニペット例）

これらは「方針例」です。実際の反映は設計/実装側で調整してください。

### 1) Next.js ヘルスエンドポイント（App Router）

```ts
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
```

### 2) Playwright の BASE_URL 両対応

```ts
// playwright.config.ts 抜粋
const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
export default defineConfig({
  use: { baseURL: BASE /* ... */ },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: process.env.CI ? 'pnpm start' : 'pnpm dev',
        url: BASE,
        reuseExistingServer: !process.env.CI,
      },
});
```

### 3) Redis requirepass（Secrets から読み取り）

```yaml
# docker-compose.prod.yml の redis サービス
command: ['sh', '-c', 'redis-server --requirepass "$(cat /run/secrets/redis_password)"']
```

### 4) Postgres healthcheck（Secrets と整合）

```yaml
healthcheck:
  test:
    [
      'CMD-SHELL',
      'pg_isready -U "$(cat /run/secrets/postgres_user)" -d "$(cat /run/secrets/postgres_db)"',
    ]
  interval: 30s
  timeout: 10s
  retries: 5
```

### 5) Loki/Grafana ポート統一

```yaml
# docker-compose.loki.yml（例）
services:
  grafana:
    ports:
      - '3001:3000'
```

### 6) Node デバッガ（必要な場合）

```yaml
# docker-compose.override.yml の app
environment:
  - NODE_OPTIONS=--inspect=0.0.0.0:9229
ports:
  - '9229:9229'
```

## 運用・テスト分離の補足

- Integration Tests は既存の Testcontainers を維持し、Compose の DB/Redis と二重起動しないよう profile/フラグで分岐（設計に明記しておく）。
- E2E は Compose 側で `app-e2e` を起動し、Playwright は `PLAYWRIGHT_SKIP_WEBSERVER=1` と `PLAYWRIGHT_BASE_URL=http://app-e2e:3000` で外部サーバーに接続する運用が安全。

## セキュリティ・非 root 実行

- 本番イメージは `USER node` など非 root 化、必要権限のみ付与。
- `cap_drop: ["ALL"]` + 必要なもののみ `cap_add`（必要時）。
- Secrets/証明書は volumes ではなく secrets での配布を基本に（Nginx の certs も検討）。

## 次アクション（ToDo）

- [ ] `/api/health` ルートを実装し、すべての healthcheck 参照先を一致させる
- [ ] `docker-compose.loki.yml` の Grafana ポートを 3001 へ変更（またはアプリ側の調整）。設計と実ファイルを統一
- [ ] `deploy:` セクションの扱いを決定（Swarm 採用 or Compose 運用に合わせて削除/置換）
- [ ] Redis/Postgres の secrets 連携（command/healthcheck）を修正
- [ ] Playwright の BASE_URL 変数名を実装と統一し、webServer ガードを追加
- [ ] Playwright コンテナのバージョンを依存関係に合わせて更新
- [ ] テスト Compose の `node_modules` マウントを撤去
- [ ] Nginx 設定パスを公式イメージに合わせて再設計
- [ ] `curl/wget` 前提の healthcheck を Dockerfile/コマンドで成立させる
- [ ] `.dockerignore` 整備、および未作成の参照ファイル（nginx, postgres, backup.sh, secrets）を作成
- [ ] ログローテーション設定（`logging` オプション）を追加

## 参考（確認した主なファイル）

- `package.json`（scripts, test コマンド）
- `playwright.config.ts`（BASE_URL 参照, webServer 設定）
- `vitest.config.ts` / `vitest.integration.config.ts`（Testcontainers 設定）
- 既存 `docker-compose.loki.yml`（Grafana ポート/ヘルスチェック）

---

以上。指摘事項のうちブロッカーを先行で解消できれば、設計どおり段階的に Compose 化を進められる状態です。
