# 構造化ログシステム 設定ガイド

## 📋 目次

- [概要](#概要)
- [環境変数リファレンス](#環境変数リファレンス)
- [環境別設定例](#環境別設定例)
- [パフォーマンスチューニング](#パフォーマンスチューニング)
- [セキュリティ設定](#セキュリティ設定)
- [監視・集約設定](#監視集約設定)
- [トラブルシューティング](#トラブルシューティング)

---

## 概要

このガイドでは、構造化ログシステムの詳細な設定方法を説明します。環境別の推奨設定、パフォーマンスチューニング、セキュリティ設定のベストプラクティスを含みます。

---

## 環境変数リファレンス

### 🔧 基本ログ設定

| 変数名                  | 説明                         | 型                                       | デフォルト値 | 必須 |
| ----------------------- | ---------------------------- | ---------------------------------------- | ------------ | ---- |
| `LOG_LEVEL`             | サーバーサイドログレベル     | `trace\|debug\|info\|warn\|error\|fatal` | `info`       | No   |
| `NEXT_PUBLIC_LOG_LEVEL` | クライアントサイドログレベル | `trace\|debug\|info\|warn\|error\|fatal` | `info`       | No   |

**使用例**:

```bash
# 本番環境：情報レベル以上のみ
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# 開発環境：すべてのログを出力
LOG_LEVEL=trace
NEXT_PUBLIC_LOG_LEVEL=debug
```

### 🔒 セキュリティ設定

| 変数名               | 説明                         | 型       | デフォルト値 | 必須        |
| -------------------- | ---------------------------- | -------- | ------------ | ----------- |
| `LOG_IP_HASH_SECRET` | IPアドレスハッシュ化用秘密鍵 | `string` | -            | Yes（本番） |

**セキュリティ要件**:

- **本番環境では必須**: GDPR準拠のため
- **最小64文字**: 強力な暗号化のため
- **環境ごとに異なる値**: セキュリティ分離のため

```bash
# 本番環境例
LOG_IP_HASH_SECRET=your-super-secure-64-character-minimum-secret-key-for-production

# ステージング環境例
LOG_IP_HASH_SECRET=different-staging-secret-key-at-least-64-characters-long
```

### ⚡ パフォーマンス・制限設定

#### レート制限設定

| 変数名                              | 説明                     | 型        | デフォルト値 |
| ----------------------------------- | ------------------------ | --------- | ------------ |
| `LOG_RATE_LIMIT_MAX_TOKENS`         | 最大トークン数           | `number`  | `100`        |
| `LOG_RATE_LIMIT_REFILL_RATE`        | トークン補充率（秒/個）  | `number`  | `10`         |
| `LOG_RATE_LIMIT_BURST_CAPACITY`     | バースト容量             | `number`  | `150`        |
| `LOG_RATE_LIMIT_BACKOFF_MULTIPLIER` | バックオフ倍率           | `number`  | `2`          |
| `LOG_RATE_LIMIT_MAX_BACKOFF`        | 最大バックオフ時間（秒） | `number`  | `300`        |
| `LOG_RATE_LIMIT_ADAPTIVE`           | アダプティブサンプリング | `boolean` | `true`       |
| `LOG_RATE_LIMIT_ERROR_THRESHOLD`    | エラー閾値（分/個）      | `number`  | `100`        |

**用途別設定例**:

```bash
# 高負荷環境（制限強化）
LOG_RATE_LIMIT_MAX_TOKENS=50
LOG_RATE_LIMIT_REFILL_RATE=5
LOG_RATE_LIMIT_BURST_CAPACITY=75

# 開発環境（制限緩和）
LOG_RATE_LIMIT_MAX_TOKENS=1000
LOG_RATE_LIMIT_REFILL_RATE=100
LOG_RATE_LIMIT_ADAPTIVE=false
```

### 🌐 Loki集約設定

| 変数名                | 説明                  | 型         | デフォルト値            |
| --------------------- | --------------------- | ---------- | ----------------------- |
| `LOKI_ENABLED`        | Loki送信有効/無効     | `boolean`  | `true`                  |
| `LOKI_URL`            | LokiエンドポイントURL | `string`   | `http://localhost:3100` |
| `LOKI_TENANT_ID`      | マルチテナント用ID    | `string`   | -                       |
| `LOKI_API_KEY`        | API認証キー           | `string`   | -                       |
| `LOKI_MIN_LEVEL`      | 送信最小ログレベル    | `LogLevel` | `info`                  |
| `LOKI_BATCH_SIZE`     | バッチサイズ          | `number`   | `100`                   |
| `LOKI_FLUSH_INTERVAL` | フラッシュ間隔（ms）  | `number`   | `5000`                  |
| `LOKI_TIMEOUT`        | タイムアウト（ms）    | `number`   | `10000`                 |
| `LOKI_MAX_RETRIES`    | 最大リトライ回数      | `number`   | `3`                     |
| `LOKI_USERNAME`       | Basic認証ユーザー名   | `string`   | -                       |
| `LOKI_PASSWORD`       | Basic認証パスワード   | `string`   | -                       |

### 🗄️ KVストレージ設定

| 変数名                 | 説明                     | 型        | デフォルト値 |
| ---------------------- | ------------------------ | --------- | ------------ |
| `KV_CONNECTION_STRING` | KV接続文字列             | `string`  | -            |
| `REDIS_URL`            | Redis接続URL             | `string`  | -            |
| `KV_TTL_DEFAULT`       | デフォルトTTL（秒）      | `number`  | `3600`       |
| `KV_MAX_RETRIES`       | 最大リトライ回数         | `number`  | `3`          |
| `KV_TIMEOUT_MS`        | タイムアウト（ms）       | `number`  | `5000`       |
| `KV_FALLBACK_ENABLED`  | フォールバック有効       | `boolean` | `true`       |
| `EDGE_CONFIG_ID`       | Vercel Edge Config ID    | `string`  | -            |
| `EDGE_CONFIG_TOKEN`    | Vercel Edge Config Token | `string`  | -            |

### 📊 アプリケーション情報

| 変数名                    | 説明                       | 型                                 | デフォルト値         |
| ------------------------- | -------------------------- | ---------------------------------- | -------------------- |
| `NEXT_PUBLIC_APP_NAME`    | アプリケーション名         | `string`                           | `nextjs-boilerplate` |
| `NEXT_PUBLIC_APP_VERSION` | アプリケーションバージョン | `string`                           | `1.0.0`              |
| `SERVICE_NAME`            | サービス名（監視用）       | `string`                           | `nextjs-boilerplate` |
| `NODE_ENV`                | Node.js環境                | `development\|staging\|production` | `development`        |
| `NEXT_RUNTIME`            | Next.js実行時環境          | `nodejs\|edge`                     | `nodejs`             |

---

## 環境別設定例

### 🧪 開発環境 (`.env.local`)

```bash
# 基本ログ設定
LOG_LEVEL=debug
NEXT_PUBLIC_LOG_LEVEL=debug

# アプリケーション情報
NEXT_PUBLIC_APP_NAME=nextjs-boilerplate-dev
NEXT_PUBLIC_APP_VERSION=1.0.0-dev
NODE_ENV=development

# セキュリティ設定（開発用）
LOG_IP_HASH_SECRET=development-secret-key-at-least-64-characters-long-for-testing

# Loki設定（ローカル）
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100
LOKI_MIN_LEVEL=debug
LOKI_BATCH_SIZE=10
LOKI_FLUSH_INTERVAL=1000

# レート制限（緩和）
LOG_RATE_LIMIT_MAX_TOKENS=1000
LOG_RATE_LIMIT_REFILL_RATE=100
LOG_RATE_LIMIT_ADAPTIVE=false

# KVストレージ（オプション）
REDIS_URL=redis://localhost:6379
KV_TTL_DEFAULT=1800
```

### 🏗️ ステージング環境 (`.env.staging`)

```bash
# 基本ログ設定
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# アプリケーション情報
NEXT_PUBLIC_APP_NAME=nextjs-boilerplate-staging
NEXT_PUBLIC_APP_VERSION=1.0.0-rc.1
NODE_ENV=staging

# セキュリティ設定
LOG_IP_HASH_SECRET=staging-environment-secret-key-must-be-different-from-production

# Loki設定（ステージング）
LOKI_ENABLED=true
LOKI_URL=https://staging-loki.example.com
LOKI_TENANT_ID=staging-tenant
LOKI_API_KEY=staging-api-key
LOKI_MIN_LEVEL=info
LOKI_BATCH_SIZE=50
LOKI_FLUSH_INTERVAL=3000
LOKI_TIMEOUT=5000
LOKI_MAX_RETRIES=2

# レート制限（標準）
LOG_RATE_LIMIT_MAX_TOKENS=100
LOG_RATE_LIMIT_REFILL_RATE=10
LOG_RATE_LIMIT_BURST_CAPACITY=150
LOG_RATE_LIMIT_ADAPTIVE=true

# KVストレージ
REDIS_URL=redis://staging-redis:6379
KV_TTL_DEFAULT=3600
KV_MAX_RETRIES=3
```

### 🚀 本番環境 (`.env.production`)

```bash
# 基本ログ設定
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# アプリケーション情報
NEXT_PUBLIC_APP_NAME=nextjs-boilerplate
NEXT_PUBLIC_APP_VERSION=1.0.0
SERVICE_NAME=nextjs-boilerplate-prod
NODE_ENV=production

# セキュリティ設定（必須）
LOG_IP_HASH_SECRET=production-super-secure-secret-key-at-least-64-characters-long-unique

# Loki設定（本番）
LOKI_ENABLED=true
LOKI_URL=https://loki.example.com
LOKI_TENANT_ID=production-tenant
LOKI_API_KEY=production-api-key-secure
LOKI_MIN_LEVEL=info
LOKI_BATCH_SIZE=100
LOKI_FLUSH_INTERVAL=5000
LOKI_TIMEOUT=10000
LOKI_MAX_RETRIES=3

# Basic認証（オプション）
LOKI_USERNAME=loki-user
LOKI_PASSWORD=secure-loki-password

# レート制限（本番最適化）
LOG_RATE_LIMIT_MAX_TOKENS=100
LOG_RATE_LIMIT_REFILL_RATE=10
LOG_RATE_LIMIT_BURST_CAPACITY=150
LOG_RATE_LIMIT_BACKOFF_MULTIPLIER=2
LOG_RATE_LIMIT_MAX_BACKOFF=300
LOG_RATE_LIMIT_ADAPTIVE=true
LOG_RATE_LIMIT_ERROR_THRESHOLD=100

# KVストレージ（高可用性）
REDIS_URL=redis://production-redis-cluster:6379
KV_TTL_DEFAULT=3600
KV_MAX_RETRIES=5
KV_TIMEOUT_MS=3000
KV_FALLBACK_ENABLED=true

# Vercel Edge Config（オプション）
EDGE_CONFIG_ID=your-edge-config-id
EDGE_CONFIG_TOKEN=your-edge-config-token
```

---

## パフォーマンスチューニング

### 🔥 高負荷環境設定

```bash
# ログレベル制限
LOG_LEVEL=warn
NEXT_PUBLIC_LOG_LEVEL=error

# 厳格なレート制限
LOG_RATE_LIMIT_MAX_TOKENS=50
LOG_RATE_LIMIT_REFILL_RATE=5
LOG_RATE_LIMIT_BURST_CAPACITY=75
LOG_RATE_LIMIT_ADAPTIVE=true

# Loki最適化
LOKI_MIN_LEVEL=warn
LOKI_BATCH_SIZE=200
LOKI_FLUSH_INTERVAL=10000
LOKI_TIMEOUT=5000
```

### 💾 メモリ制約環境

```bash
# レート制限強化
LOG_RATE_LIMIT_MAX_TOKENS=25
LOG_RATE_LIMIT_REFILL_RATE=2

# KV設定最適化
KV_TTL_DEFAULT=1800
KV_TIMEOUT_MS=2000
KV_MAX_RETRIES=2

# Loki設定最適化
LOKI_BATCH_SIZE=50
LOKI_FLUSH_INTERVAL=15000
```

### ⚡ 低レイテンシ要求環境

```bash
# 即座のフラッシュ
LOKI_BATCH_SIZE=10
LOKI_FLUSH_INTERVAL=1000
LOKI_TIMEOUT=3000

# レート制限緩和
LOG_RATE_LIMIT_MAX_TOKENS=500
LOG_RATE_LIMIT_REFILL_RATE=50
LOG_RATE_LIMIT_ADAPTIVE=false
```

---

## セキュリティ設定

### 🔐 秘密鍵管理のベストプラクティス

#### 1. 秘密鍵生成

```bash
# 安全な秘密鍵生成（Linux/Mac）
openssl rand -base64 64

# PowerShell（Windows）
[System.Web.Security.Membership]::GeneratePassword(64, 0)
```

#### 2. 環境分離

```bash
# 各環境で異なる秘密鍵を使用
# ❌ 悪い例
LOG_IP_HASH_SECRET=same-key-for-all-environments

# ✅ 良い例
# development:
LOG_IP_HASH_SECRET=dev-specific-key-64-chars-minimum
# staging:
LOG_IP_HASH_SECRET=staging-specific-key-64-chars-minimum
# production:
LOG_IP_HASH_SECRET=prod-specific-key-64-chars-minimum
```

#### 3. 秘密鍵ローテーション

```bash
# 定期的な秘密鍵ローテーション（推奨：3ヶ月ごと）
# 旧キー保持期間を考慮した段階的移行
LOG_IP_HASH_SECRET=new-rotated-key-2024-q1
```

### 🛡️ GDPR準拠設定

```bash
# IPアドレスハッシュ化（必須）
LOG_IP_HASH_SECRET=gdpr-compliant-secret-key-for-ip-hashing

# 機密情報自動Redaction（デフォルトで有効）
# 追加の機密フィールドがある場合は、コードレベルで設定
```

### 🔒 Loki認証設定

```bash
# Basic認証
LOKI_USERNAME=secure-username
LOKI_PASSWORD=secure-complex-password

# API Key認証
LOKI_API_KEY=secure-api-key-with-sufficient-entropy

# マルチテナント
LOKI_TENANT_ID=isolated-tenant-production
```

---

## 監視・集約設定

### 📊 Grafana連携

#### セキュリティ設定

```bash
# 🔐 Grafana管理者パスワード（必須）
GRAFANA_ADMIN_PASSWORD=your_secure_admin_password_here

# 📝 重要事項:
# - デフォルトの 'changeme123!' は開発環境のみ
# - 本番環境では必ず複雑なパスワードに変更
# - 最低16文字、大小英数字・記号を含む
```

#### データソース設定

```bash
# Loki データソース設定
LOKI_URL=https://loki.monitoring.example.com
SERVICE_NAME=nextjs-boilerplate-prod

# ダッシュボード用ラベル
NEXT_PUBLIC_APP_NAME=production-app
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 🚨 アラート設定

```bash
# エラー閾値設定
LOG_RATE_LIMIT_ERROR_THRESHOLD=50  # 分あたり50エラー以上でアラート

# Loki設定
LOKI_MIN_LEVEL=warn  # 警告以上のログをアラート対象
```

### 📈 メトリクス収集

```bash
# OpenTelemetry設定
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
OTEL_SERVICE_NAME=nextjs-boilerplate
OTEL_SERVICE_VERSION=1.0.0
```

---

## トラブルシューティング

### ❌ よくある設定エラー

#### 1. 秘密鍵未設定

**エラー**: 本番環境でIPハッシュ化が失敗

**解決策**:

```bash
# 必須設定の追加
LOG_IP_HASH_SECRET=your-64-character-minimum-secret-key
```

#### 2. Loki接続失敗

**エラー**: ログがLokiに送信されない

**診断**:

```bash
# 接続テスト
curl -X POST "${LOKI_URL}/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams": [{"stream": {"test": "true"}, "values": [["1000000000000000000", "test message"]]}]}'
```

**解決策**:

```bash
# URL確認
LOKI_URL=http://localhost:3100  # プロトコル（http/https）を確認
LOKI_ENABLED=true               # 有効化確認
```

#### 3. レート制限過多

**症状**: ログが出力されない/少ない

**解決策**:

```bash
# 制限緩和
LOG_RATE_LIMIT_MAX_TOKENS=1000
LOG_RATE_LIMIT_ADAPTIVE=false
```

### 🔍 設定検証コマンド

```bash
# 環境変数確認
pnpm run dev 2>&1 | grep -E "(LOG_|LOKI_|KV_)"

# ログ出力テスト
curl http://localhost:3000/api/test-logging

# Loki送信テスト
curl http://localhost:3000/api/test-loki
```

### 📋 設定チェックリスト

- [ ] `LOG_LEVEL` が環境に適した値
- [ ] `LOG_IP_HASH_SECRET` が本番環境で設定済み（64文字以上）
- [ ] `LOKI_URL` が正しいエンドポイント
- [ ] レート制限が負荷に適した値
- [ ] セキュリティ設定が環境要件を満たす
- [ ] 監視・アラート設定が運用要件を満たす

---

## 関連ドキュメント

- [システム概要](./logging-system-overview.ja.md)
- [トラブルシューティングガイド](./logging-troubleshooting-guide.ja.md)
- [API リファレンス](../../api/logger/)
- [統合計画書](../../work_dir/structured-logging-unified-plan.md)
