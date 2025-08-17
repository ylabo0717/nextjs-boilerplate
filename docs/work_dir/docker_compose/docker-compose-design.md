# Docker Compose設計ドキュメント

## 1. 現状分析

### 1.1 既存のDocker設定

**現在の状況**：

- Lokiログシステム用の`docker-compose.loki.yml`が存在
- サービス構成：Loki + Grafana
- 監視・ログ可視化環境として運用中

**既存ファイル**：

```
docker-compose.loki.yml          # Loki + Grafana構成
docker/
├── loki/
│   └── loki-config.yaml        # Loki設定
└── grafana/
    ├── datasources.yml         # データソース設定
    ├── dashboards.yml          # ダッシュボード設定
    └── dashboards/
        └── nextjs-app-logging.json
```

### 1.2 プロジェクト技術スタック

**メインアプリケーション**：

- Next.js 15.4.6 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 4.0
- pnpm（パッケージマネージャー）

**テスト環境**：

- Vitest (Unit/Integration)
- Playwright (E2E)
- Testcontainers (Loki統合テスト用)

**品質管理**：

- ESLint + Prettier
- TypeScript type checking
- Husky (pre-commit hooks)
- Lighthouse (パフォーマンス)

## 2. Docker Compose全体設計

### 2.1 設計原則

1. **環境分離**: 開発・テスト・本番用の明確な設定分離
2. **スケーラビリティ**: サービス単位での独立したスケーリング
3. **セキュリティ**: 環境変数によるシークレット管理
4. **保守性**: 設定の再利用性とモジュール化
5. **テスト対応**: 既存テストスイートとの完全互換性

### 2.2 提案するファイル構成

```
# メインCompose設定
docker-compose.yml              # 開発環境用ベース設定
docker-compose.override.yml     # 開発環境オーバーライド
docker-compose.test.yml         # テスト環境設定
docker-compose.prod.yml         # 本番環境設定

# 既存（保持）
docker-compose.loki.yml         # Loki専用環境（保持）

# Docker設定
docker/
├── app/
│   ├── Dockerfile              # Next.jsアプリ用
│   ├── Dockerfile.dev          # 開発用（ホットリロード対応）
│   └── .dockerignore
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── sites/
│       ├── default.dev.conf
│       ├── default.test.conf
│       └── default.prod.conf
├── postgres/                   # データベース（必要に応じて）
│   ├── init.sql
│   └── postgresql.conf
├── redis/                      # キャッシュ（必要に応じて）
│   └── redis.conf
├── loki/                       # 既存（保持）
│   └── loki-config.yaml
└── grafana/                    # 既存（保持）
    ├── datasources.yml
    ├── dashboards.yml
    └── dashboards/
```

### 2.3 サービス構成

#### 開発環境サービス

1. **app** - Next.jsアプリケーション（開発モード）
2. **nginx** - リバースプロキシ（オプション）
3. **postgres** - データベース（必要に応じて）
4. **redis** - キャッシュ・セッション（必要に応じて）

#### テスト環境追加サービス

5. **app-test** - テスト用アプリケーション
6. **playwright** - E2Eテスト実行環境

#### 監視・ログサービス（既存保持）

7. **loki** - ログ集約
8. **grafana** - 監視ダッシュボード

## 3. 環境別設定戦略

### 3.1 開発環境 (`docker-compose.yml` + `docker-compose.override.yml`)

**特徴**：

- ホットリロード対応
- デバッグポート開放
- ローカルファイルマウント
- 高速な起動・リビルド

**主要設定**：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile.dev
    ports:
      - '3000:3000' # Next.js dev server
      - '9229:9229' # Node.js debug port
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
    command: pnpm dev
```

### 3.2 テスト環境 (`docker-compose.test.yml`)

**特徴**：

- CI/CD最適化
- テストデータベース
- 並列テスト実行対応
- 既存テストとの互換性

**主要設定**：

```yaml
services:
  app-test:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: test
    environment:
      - NODE_ENV=test
      - CI=true
    command: pnpm test

  playwright:
    image: mcr.microsoft.com/playwright:v1.x.x
    volumes:
      - .:/work
    working_dir: /work
    command: pnpm test:e2e
```

### 3.3 本番環境 (`docker-compose.prod.yml`)

**特徴**：

- 最適化されたビルド
- セキュリティ強化
- ヘルスチェック
- ログ設定

**主要設定**：

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

## 4. 既存テスト互換性

### 4.1 Unit Tests

- **現状**: Vitest使用
- **Docker化**: テストランナーコンテナ化
- **実行方法**: `docker compose -f docker-compose.test.yml run app-test pnpm test:unit`

### 4.2 Integration Tests

- **現状**: Vitest + Testcontainers (Loki)
- **Docker化**: 既存Testcontainers設定保持
- **実行方法**: `docker compose -f docker-compose.test.yml run app-test pnpm test:integration`

### 4.3 E2E Tests

- **現状**: Playwright
- **Docker化**: Playwright公式イメージ使用
- **実行方法**: `docker compose -f docker-compose.test.yml run playwright pnpm test:e2e`

### 4.4 Loki統合テスト

- **現状**: `docker-compose.loki.yml`使用
- **保持**: 既存設定を完全保持
- **統合**: 必要に応じてメインCompose設定から参照

## 5. セキュリティ考慮事項

### 5.1 環境変数管理

```bash
# 各環境用の.env設定
.env                    # 開発環境デフォルト
.env.test              # テスト環境
.env.prod              # 本番環境（secretsで管理）
.env.example           # テンプレート
```

### 5.2 シークレット管理

- 開発: `.env`ファイル
- テスト: CI/CD環境変数
- 本番: Docker Secrets または外部シークレット管理

### 5.3 ネットワーク分離

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # 外部アクセス禁止
  monitoring:
    driver: bridge
```

## 6. パフォーマンス最適化

### 6.1 ビルド最適化

- Multi-stage builds
- Layer caching
- .dockerignore最適化

### 6.2 開発体験最適化

- Bind mounts for hot reload
- Named volumes for node_modules
- Health checks for dependency management

## 7. 移行計画

### 7.1 Phase 1: 基盤構築

1. Dockerfiles作成
2. ベースcompose.yml作成
3. 開発環境での動作確認

### 7.2 Phase 2: テスト統合

1. テスト環境用compose設定
2. 既存テストの動作確認
3. CI/CD統合

### 7.3 Phase 3: 本番対応

1. 本番用compose設定
2. セキュリティ強化
3. 監視・ログ統合

## 8. 成功指標

### 8.1 技術指標

- [ ] 全てのUnit Tests パス
- [ ] 全てのIntegration Tests パス
- [ ] 全てのE2E Tests パス
- [ ] 既存のLoki統合テスト パス
- [ ] ビルド時間 < 5分
- [ ] 開発環境起動時間 < 30秒

### 8.2 開発体験指標

- [ ] ホットリロード動作
- [ ] デバッグ機能利用可能
- [ ] ログ可視化機能維持
- [ ] 既存開発フロー保持

### 8.3 運用指標

- [ ] 本番環境での安定動作
- [ ] 監視・アラート機能
- [ ] バックアップ・復旧手順
- [ ] スケーリング対応

## 9. リスク評価と対策

### 9.1 高リスク

- **既存テスト互換性**: 段階的移行、並行運用期間設定
- **パフォーマンス劣化**: ベンチマーク測定、最適化フェーズ

### 9.2 中リスク

- **開発環境の複雑化**: 簡単な起動スクリプト提供
- **Dockerファイルサイズ**: Multi-stage builds活用

### 9.3 低リスク

- **学習コスト**: ドキュメント整備、トレーニング実施

---

## 次のステップ

1. **実装計画ドキュメント作成**: 具体的な実装手順とタイムライン
2. **Dockerfiles作成**: 各サービス用のDockerfile設計
3. **Compose設定実装**: 環境別のDocker Compose設定
4. **テスト実行**: 既存テストスイートでの動作確認
