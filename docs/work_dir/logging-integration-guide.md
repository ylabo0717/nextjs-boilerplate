# Logging Integration Guide

本プロジェクトのLokiログ統合システムの使用方法とテスト手順について説明します。

## 🚀 クイックスタート

### 1. Loki + Grafana環境の起動

```bash
# Loki と Grafana を Docker Compose で起動
docker-compose -f docker-compose.loki.yml up -d

# ヘルスチェック
curl http://localhost:3100/ready  # Loki
curl http://localhost:3000/api/health  # Grafana
```

### 2. Grafanaダッシュボードへのアクセス

- URL: http://localhost:3000
- Username: `admin`
- Password: 環境変数`GRAFANA_ADMIN_PASSWORD`で設定（デフォルト: `changeme123!`）
- ダッシュボード: "Next.js Application Logging Dashboard"

#### 🔐 セキュリティ注意事項

**重要**: 本番環境では必ず`GRAFANA_ADMIN_PASSWORD`環境変数を設定してください：

```bash
# 開発環境（.env.local）
GRAFANA_ADMIN_PASSWORD=your_secure_password_here

# Docker Compose起動前に設定
export GRAFANA_ADMIN_PASSWORD=your_secure_password_here
docker-compose -f docker-compose.loki.yml up -d
```

### 3. アプリケーションでのLoki統合有効化

```bash
# 環境変数を設定
export LOKI_ENABLED=true
export LOKI_URL=http://localhost:3100

# アプリケーション起動
pnpm dev
```

## 🧪 テスト実行

### Unit Tests (MSWモック使用)

```bash
# 通常のユニットテスト
pnpm test tests/unit/logger/loki-client.test.ts
pnpm test tests/unit/logger/loki-transport.test.ts

# 統合テスト（MSWでHTTPリクエストをモック）
pnpm test tests/integration/logger/loki-integration.test.ts
pnpm test tests/integration/logger/loki-e2e.integration.test.ts
```

### True Integration Tests (実際のLokiサーバー使用)

```bash
# 1. Lokiサーバー起動
docker-compose -f docker-compose.loki.yml up -d loki

# 2. 真の統合テスト実行
LOKI_INTEGRATION_TEST=true pnpm test tests/integration/logger/loki-true-integration.test.ts

# 3. クエリテストも有効化（オプション）
LOKI_INTEGRATION_TEST=true LOKI_QUERY_ENABLED=true pnpm test tests/integration/logger/loki-true-integration.test.ts
```

### パフォーマンステスト

```bash
# 高負荷テスト（100ログ）
LOKI_INTEGRATION_TEST=true pnpm test tests/integration/logger/loki-true-integration.test.ts --grep "high-volume"

# リカバリーテスト（手動でサーバー停止/再開が必要）
LOKI_INTEGRATION_TEST=true LOKI_RECOVERY_TEST=true pnpm test tests/integration/logger/loki-true-integration.test.ts --grep "recovery"
```

## ⚙️ 設定

### 環境変数

```bash
# 基本設定
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100
LOKI_MIN_LEVEL=info
LOKI_BATCH_SIZE=50

# 認証（オプション）
LOKI_API_KEY=your_api_key
# または
LOKI_USERNAME=your_username
LOKI_PASSWORD=your_password

# テナント（オプション）
LOKI_TENANT_ID=your_tenant

# テスト用
LOKI_INTEGRATION_TEST=true
LOKI_QUERY_ENABLED=true
LOKI_RECOVERY_TEST=true
```

### プログラム上での設定

```typescript
import { initializeLogger } from '@/lib/logger';
import { initializeLokiTransport } from '@/lib/logger/loki-transport';

// グローバルロガー初期化
initializeLogger({
  enableLoki: true,
  lokiConfig: {
    url: 'http://localhost:3100',
    batchSize: 50,
    defaultLabels: {
      service: 'my-nextjs-app',
      environment: 'production',
      version: '1.0.0',
    },
  },
});

// 直接トランスポート使用
const transport = await initializeLokiTransport({
  url: 'http://localhost:3100',
  batchSize: 10,
  defaultLabels: { service: 'my-service' },
});

await transport.sendLog('info', 'Hello, Loki!');
```

## 📊 ダッシュボード機能

Grafanaダッシュボード `nextjs-app-logging` には以下のパネルが含まれます：

### 1. Application Logs

- 全アプリケーションログのリアルタイム表示
- フィルタリングとサーチ機能

### 2. Log Rate by Level

- ログレベル別の送信頻度（info, warn, error等）
- 時系列グラフ

### 3. Log Distribution by Level

- 1時間あたりのログレベル分布
- パイチャート表示

### 4. Error Logs

- エラーログのみを抽出表示
- デバッグとトラブルシューティング用

### 5. Request Activity

- リクエストIDベースのアクティビティトラッキング
- API呼び出しの可視化

### 6. Context-aware Logs

- コンテキスト情報を含むログの表示
- トレーシングとデバッグ用

## 🛠️ トラブルシューティング

### よくある問題

#### 1. Lokiに接続できない

```bash
# Lokiの状態確認
docker-compose -f docker-compose.loki.yml ps
curl http://localhost:3100/ready

# ログ確認
docker-compose -f docker-compose.loki.yml logs loki
```

#### 2. ログが表示されない

```bash
# アプリケーション側の設定確認
echo $LOKI_ENABLED
echo $LOKI_URL

# 手動でログ送信テスト
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"service":"test"},"values":[["'$(date +%s%N)'","test message"]]}]}'
```

#### 3. 認証エラー

```bash
# 認証情報確認
echo $LOKI_API_KEY
echo $LOKI_USERNAME
echo $LOKI_PASSWORD

# Basic認証テスト
curl -u $LOKI_USERNAME:$LOKI_PASSWORD http://localhost:3100/ready
```

#### 4. パフォーマンス問題

- `LOKI_BATCH_SIZE` を調整（デフォルト: 50）
- `flushInterval` を調整（デフォルト: 5000ms）
- ログレベルフィルタリングを使用（`LOKI_MIN_LEVEL`）

### デバッグモード

```typescript
import { LokiTransport } from '@/lib/logger/loki-transport';

const transport = new LokiTransport({
  url: 'http://localhost:3100',
  debug: true, // デバッグログを有効化
});
```

## 🏗️ アーキテクチャ

```
Application
     ↓
Logger (Pino)
     ↓
LokiTransport
     ↓
LokiClient (Batching)
     ↓
HTTP API (Loki Push API)
     ↓
Loki Server
     ↓
Grafana Dashboard
```

### コンポーネント説明

- **Logger**: Pinoベースのメインロガー
- **LokiTransport**: ログをLoki形式に変換・送信
- **LokiClient**: バッチング、認証、リトライ処理
- **Context Management**: AsyncLocalStorageによるコンテキスト伝搬

## 🚀 本番環境での使用

### Docker Compose（本番用）

```yaml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    volumes:
      - loki-data:/loki
    environment:
      - LOKI_CONFIG_FILE=/etc/loki/config.yaml
    configs:
      - source: loki_config
        target: /etc/loki/config.yaml
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: LOKI_ENABLED
              value: 'true'
            - name: LOKI_URL
              value: 'http://loki.logging:3100'
```

### 監視とアラート

Grafanaでアラート設定：

- エラーログ率 > 5%
- ログ送信失敗率 > 1%
- レスポンス時間 > 5秒

## 📝 ベストプラクティス

### 1. ラベル設計

```typescript
// 良い例：カーディナリティが低い
{ service: "api", environment: "prod", version: "1.0" }

// 悪い例：カーディナリティが高い
{ user_id: "12345", request_id: "abc-def", timestamp: "..." }
```

### 2. ログレベル

- `debug`: 開発時のみ
- `info`: 一般的な情報
- `warn`: 警告（要注意）
- `error`: エラー（要対応）

### 3. コンテキスト活用

```typescript
runWithLoggerContext(config, { requestId, userId }, () => {
  logger.info('Processing request'); // 自動的にコンテキスト付与
});
```

### 4. パフォーマンス考慮

- 適切なバッチサイズ設定
- ログレベルフィルタリング
- 除外パターン使用

## 🔗 関連リソース

- [Loki Documentation](https://grafana.com/docs/loki/)
- [Grafana Dashboard Creation](https://grafana.com/docs/grafana/latest/dashboards/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Next.js Logging Best Practices](https://nextjs.org/docs/going-to-production#logging)
