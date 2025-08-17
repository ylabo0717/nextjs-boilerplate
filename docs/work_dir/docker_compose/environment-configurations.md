# 環境別Docker Compose設定詳細

## 1. 設定戦略概要

### 1.1 環境分離の方針

**階層化アプローチ**：

```
docker-compose.yml              # ベース設定（開発環境）
docker-compose.override.yml     # 開発環境オーバーライド（自動適用）
docker-compose.test.yml         # テスト環境（明示的指定）
docker-compose.prod.yml         # 本番環境（明示的指定）
docker-compose.loki.yml         # 監視環境（既存保持）
```

### 1.2 設定継承ルール

1. **ベース** + **オーバーライド** = 開発環境
2. **ベース** + **テスト** = テスト環境
3. **ベース** + **本番** = 本番環境
4. **Loki** = 独立監視環境（既存保持）

## 2. 開発環境設定

### 2.1 docker-compose.yml（ベース設定）

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile.dev
      target: development
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - node_modules:/app/node_modules
      - next_cache:/app/.next
    environment:
      - NODE_ENV=development
      - NEXT_TELEMETRY_DISABLED=1
    command: pnpm dev
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - app_network

  # オプション: リバースプロキシ
  nginx:
    build:
      context: docker/nginx
      dockerfile: Dockerfile
    ports:
      - '80:80'
    depends_on:
      app:
        condition: service_healthy
    volumes:
      - ./docker/nginx/sites/default.dev.conf:/etc/nginx/sites-available/default
    networks:
      - app_network
    profiles:
      - nginx

volumes:
  node_modules:
  next_cache:

networks:
  app_network:
    driver: bridge
```

### 2.2 docker-compose.override.yml（開発環境強化）

```yaml
version: '3.8'

services:
  app:
    # デバッグポート開放
    ports:
      - '9229:9229' # Node.js debugger
      - '24678:24678' # Next.js dev server WebSocket

    # 開発用環境変数
    environment:
      - DEBUG=*
      - LOGGING_LEVEL=debug
      - HOT_RELOAD=true
      - FAST_REFRESH=true

    # 開発ツール有効化
    stdin_open: true
    tty: true

    # 高速化のためのキャッシュ設定
    volumes:
      - .:/app
      - node_modules:/app/node_modules
      - next_cache:/app/.next
      - pnpm_cache:/root/.pnpm-store

    # 開発用コマンド
    command: >
      sh -c "
        pnpm install &&
        pnpm dev --hostname 0.0.0.0
      "

  # 開発用データベース（オプション）
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: nextjs_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    profiles:
      - database

  # 開発用Redis（オプション）
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_dev_data:/data
    profiles:
      - redis

volumes:
  pnpm_cache:
  postgres_dev_data:
  redis_dev_data:
```

### 2.3 .env（開発環境用）

```bash
# 開発環境設定
NODE_ENV=development
DEBUG=true

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# データベース設定（オプション）
DATABASE_URL=postgresql://dev_user:dev_password@postgres:5432/nextjs_dev

# Redis設定（オプション）
REDIS_URL=redis://redis:6379

# ログ設定
LOGGING_LEVEL=debug
LOKI_ENABLED=false
LOKI_URL=http://localhost:3100

# セキュリティ（開発用）
JWT_SECRET=dev_jwt_secret_key
SESSION_SECRET=dev_session_secret_key

# 外部サービス（モック）
EXTERNAL_API_URL=http://mockserver:3001
```

## 3. テスト環境設定

### 3.1 docker-compose.test.yml

```yaml
version: '3.8'

services:
  app-test:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: test
    environment:
      - NODE_ENV=test
      - CI=true
      - SKIP_ENV_VALIDATION=true
    volumes:
      - .:/app
      # node_modules マウントを削除（依存関係破壊防止）
      - test_cache:/app/.next
    command: pnpm test
    networks:
      - test_network

  # Unit Tests実行
  test-unit:
    extends: app-test
    command: pnpm test:unit
    profiles:
      - unit

  # Integration Tests実行
  test-integration:
    extends: app-test
    command: pnpm test:integration
    depends_on:
      - postgres-test
      - redis-test
    environment:
      - DATABASE_URL=postgresql://test_user:test_password@postgres-test:5432/test_db
      - REDIS_URL=redis://redis-test:6379
    profiles:
      - integration

  # E2E Tests実行
  playwright:
    # バージョンを依存関係に合わせて更新
    image: mcr.microsoft.com/playwright:v1.54.2
    working_dir: /workspace
    volumes:
      - .:/workspace
      - playwright_cache:/workspace/.cache
    environment:
      - CI=true
      - PLAYWRIGHT_BASE_URL=http://app-e2e:3000
      - PLAYWRIGHT_SKIP_WEBSERVER=1 # 外部サーバー接続
    command: pnpm test:e2e
    depends_on:
      app-e2e:
        condition: service_healthy
    networks:
      - test_network
    profiles:
      - e2e

  # E2E用アプリケーション
  app-e2e:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: production
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://test_user:test_password@postgres-test:5432/test_db
    depends_on:
      postgres-test:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - test_network
    profiles:
      - e2e

  # テスト用データベース
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    volumes:
      - ./docker/postgres/init-test.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U test_user -d test_db']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - test_network
    profiles:
      - integration
      - e2e

  # テスト用Redis
  redis-test:
    image: redis:7-alpine
    networks:
      - test_network
    profiles:
      - integration

  # Code Coverage生成
  coverage:
    extends: app-test
    command: pnpm test:coverage
    volumes:
      - ./coverage:/app/coverage
    profiles:
      - coverage

volumes:
  node_modules_test:
  test_cache:
  playwright_cache:

networks:
  test_network:
    driver: bridge
```

### 3.2 .env.test

```bash
# テスト環境設定
NODE_ENV=test
CI=true

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# データベース設定
DATABASE_URL=postgresql://test_user:test_password@postgres-test:5432/test_db

# Redis設定
REDIS_URL=redis://redis-test:6379

# ログ設定
LOGGING_LEVEL=warn
LOKI_ENABLED=false

# テスト設定
SKIP_ENV_VALIDATION=true
JEST_WORKERS=1
TEST_TIMEOUT=30000

# セキュリティ（テスト用）
JWT_SECRET=test_jwt_secret_key
SESSION_SECRET=test_session_secret_key

# 外部サービス（モック）
EXTERNAL_API_URL=http://mockserver:3001
```

## 4. 本番環境設定

### 4.1 docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.prod
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - frontend
      - backend
    # Note: deploy セクションはSwarm専用のため削除
    # リソース制限はCompose互換の設定を使用
    mem_limit: 512m
    cpus: 0.5

  # Nginx（リバースプロキシ・ロードバランサー）
  nginx:
    build:
      context: docker/nginx
      dockerfile: Dockerfile
    ports:
      - '80:80'
      - '443:443'
    restart: unless-stopped
    depends_on:
      - app
    volumes:
      # 公式イメージの標準パスに変更
      - ./docker/nginx/conf.d/default.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs:ro
      - nginx_logs:/var/log/nginx
    networks:
      - frontend
    # リソース制限をCompose互換形式に変更
    mem_limit: 128m
    cpus: 0.25

  # 本番用PostgreSQL
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB_FILE: /run/secrets/postgres_db
      POSTGRES_USER_FILE: /run/secrets/postgres_user
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_db
      - postgres_user
      - postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_backups:/backups
    healthcheck:
      # Secrets対応のhealthcheck
      test:
        [
          'CMD-SHELL',
          'pg_isready -U "$(cat /run/secrets/postgres_user)" -d "$(cat /run/secrets/postgres_db)"',
        ]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - backend
    # リソース制限をCompose互換形式に変更
    mem_limit: 256m
    cpus: 0.25

  # 本番用Redis
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    # Secrets対応のコマンド
    command: ['sh', '-c', 'redis-server --requirepass "$(cat /run/secrets/redis_password)"']
    secrets:
      - redis_password
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - backend
    # リソース制限をCompose互換形式に変更
    mem_limit: 128m
    cpus: 0.25

  # バックアップサービス
  backup:
    image: postgres:15-alpine
    restart: 'no'
    environment:
      PGPASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - postgres_backups:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    command: ['sh', '/backup.sh']
    depends_on:
      - postgres
    networks:
      - backend
    profiles:
      - backup

secrets:
  postgres_db:
    file: ./secrets/postgres_db.txt
  postgres_user:
    file: ./secrets/postgres_user.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
  redis_password:
    file: ./secrets/redis_password.txt

volumes:
  postgres_data:
  postgres_backups:
  redis_data:
  nginx_logs:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### 4.2 .env.prod.example

```bash
# 本番環境設定テンプレート
NODE_ENV=production

# アプリケーション設定
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# データベース設定（Docker Secretsで管理）
# DATABASE_URL=postgresql://user:password@postgres:5432/production_db

# Redis設定（Docker Secretsで管理）
# REDIS_URL=redis://:password@redis:6379

# ログ設定
LOGGING_LEVEL=info
LOKI_ENABLED=true
LOKI_URL=https://loki.your-domain.com

# セキュリティ（Docker Secretsで管理）
# JWT_SECRET=
# SESSION_SECRET=

# 外部サービス
EXTERNAL_API_URL=https://api.external-service.com

# パフォーマンス設定
MAX_CONCURRENT_REQUESTS=100
CACHE_TTL=3600

# 監視設定
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
```

## 5. 監視環境設定（既存保持）

### 5.1 docker-compose.loki.yml（既存設定保持）

```yaml
# 既存のファイルを保持
# 必要に応じて他の環境から参照可能にする

version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./docker/loki/loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    networks:
      - loki-network
    healthcheck:
      test:
        ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000' # ポート衝突回避
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD environment variable is required for security}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./docker/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - ./docker/grafana/dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml
      - ./docker/grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - loki-network
    depends_on:
      loki:
        condition: service_healthy
    healthcheck:
      test:
        ['CMD-SHELL', 'wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  loki-data: {}
  grafana-data: {}

networks:
  loki-network:
    driver: bridge
    # 他の環境から接続可能にする
    external: false
```

## 6. 環境別実行コマンド

### 6.1 開発環境

```bash
# 基本起動
docker compose up

# バックグラウンド起動
docker compose up -d

# 特定プロファイル起動
docker compose --profile nginx --profile database up

# ログ確認
docker compose logs -f app

# シェル接続
docker compose exec app bash
```

### 6.2 テスト環境

```bash
# Unit Tests
docker compose -f docker-compose.test.yml run --rm test-unit

# Integration Tests
docker compose -f docker-compose.test.yml --profile integration run --rm test-integration

# E2E Tests
docker compose -f docker-compose.test.yml --profile e2e up -d
docker compose -f docker-compose.test.yml --profile e2e run --rm playwright

# Coverage生成
docker compose -f docker-compose.test.yml --profile coverage run --rm coverage

# 全テスト実行
docker compose -f docker-compose.test.yml --profile integration --profile e2e --profile coverage up
```

### 6.3 本番環境

```bash
# 本番環境起動
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# スケーリング
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# ヘルスチェック
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# バックアップ実行
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup run --rm backup

# ログ確認
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### 6.4 監視環境

```bash
# Loki + Grafana起動
docker compose -f docker-compose.loki.yml up -d

# 他環境との連携
docker compose -f docker-compose.yml -f docker-compose.loki.yml up -d
```

## 7. 環境変数管理戦略

### 7.1 ファイル構成

```
.env                    # 開発環境（Gitにコミット可）
.env.override          # 個人設定（.gitignore）
.env.test              # テスト環境
.env.prod.example      # 本番環境テンプレート
.env.prod              # 本番環境（.gitignore、外部管理）
```

### 7.2 シークレット管理

**開発・テスト環境**：

- `.env`ファイルで管理
- テスト用の安全な値を使用

**本番環境**：

- Docker Secrets使用
- 外部シークレット管理システム連携
- 環境変数の暗号化

### 7.3 設定検証

```yaml
# 設定検証サービス
config-validator:
  build:
    context: .
    dockerfile: docker/validator/Dockerfile
  environment:
    - NODE_ENV=${NODE_ENV}
  command: node scripts/validate-config.js
  profiles:
    - validate
```

---

## 次のステップ

1. **Dockerfiles作成**: 各環境用の最適化されたDockerfile
2. **設定ファイル実装**: 環境別のCompose設定ファイル作成
3. **テスト実行**: 各環境での動作確認
4. **セキュリティ監査**: 設定の安全性確認
