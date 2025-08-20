# 環境変数管理ガイド

このドキュメントでは、統合環境変数システムの使用方法について説明します。

## 📋 概要

このプロジェクトでは環境変数管理が統合されており、共通設定と環境別差分を分離することで保守性を向上させています。

### ファイル構成

```
.env.base.example    # 共通設定（全環境で使用）
.env.dev.example     # 開発環境固有設定
.env.prod.example    # 本番環境固有設定
.env.test.example    # テスト環境固有設定
```

## 🚀 使用方法

### 1. 初期セットアップ

各環境でExampleファイルをコピーして使用してください：

```bash
# 共通設定（必須）
cp .env.base.example .env.base

# 開発環境
cp .env.dev.example .env.dev

# 本番環境
cp .env.prod.example .env.prod

# テスト環境
cp .env.test.example .env.test
```

### 2. Docker Compose での使用

#### 開発環境

```bash
# 標準的な起動方法
docker compose --env-file .env.base --env-file .env.dev up

# デタッチモードでの起動
docker compose --env-file .env.base --env-file .env.dev up -d
```

#### 本番環境

```bash
docker compose -f docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d
```

#### テスト環境

```bash
# テスト実行時（自動的に環境変数が読み込まれます）
pnpm test
pnpm test:e2e
```

## 🏗️ 設計思想

### 設定の階層化

```
.env.base (共通設定)
    ↓ 上書き
.env.{環境} (環境別設定)
```

### 設定内容の分類

#### 共通設定 (.env.base)

- アプリケーションバージョン
- 基本ログ設定
- ヘルスチェック設定
- 基本リソース制限
- セキュリティテンプレート

#### 環境別設定

**開発環境 (.env.dev)**

- デバッグ有効化
- ホットリロード設定
- 緩和されたセキュリティ設定
- 開発ツール設定

**本番環境 (.env.prod)**

- 本番最適化設定
- 厳格なセキュリティ設定
- 監視・メトリクス設定
- 高リソース制限

**テスト環境 (.env.test)**

- テストフレームワーク設定
- テスト用認証設定
- CI/CD設定

## 🔧 設定項目詳細

### 共通設定項目

| 変数名                      | 説明                       | デフォルト値 |
| --------------------------- | -------------------------- | ------------ |
| `APP_VERSION`               | アプリケーションバージョン | `1.0.0`      |
| `NEXT_TELEMETRY_DISABLED`   | Next.jsテレメトリ無効化    | `1`          |
| `LOG_LEVEL`                 | ログレベル                 | `info`       |
| `STRUCTURED_LOGGING`        | 構造化ログ有効化           | `true`       |
| `HEALTH_CHECK_INTERVAL`     | ヘルスチェック間隔         | `30s`        |
| `HEALTH_CHECK_TIMEOUT`      | ヘルスチェックタイムアウト | `10s`        |
| `HEALTH_CHECK_RETRIES`      | ヘルスチェック再試行回数   | `3`          |
| `HEALTH_CHECK_START_PERIOD` | ヘルスチェック開始待機時間 | `40s`        |

### 環境別上書き項目

| 変数名                   | 開発環境         | 本番環境     | テスト環境        |
| ------------------------ | ---------------- | ------------ | ----------------- |
| `NODE_ENV`               | `development`    | `production` | `test`            |
| `OTEL_SERVICE_NAME`      | `nextjs-app-dev` | `nextjs-app` | `nextjs-app-test` |
| `CONTAINER_MEMORY_LIMIT` | `1g`             | `1g`         | `512m`            |
| `CONTAINER_CPU_LIMIT`    | `1.0`            | `0.5`        | `0.25`            |
| `LOG_LEVEL`              | `debug`          | `info`       | `info`            |

## 🔒 セキュリティ考慮事項

### 機密情報の管理

1. **本番環境での必須変更項目**

   ```bash
   # 必ず変更すること
   JWT_SECRET=your-super-secret-jwt-key
   GRAFANA_ADMIN_PASSWORD=secure-password
   DATABASE_URL=postgresql://user:pass@host:port/db
   ```

2. **Git管理**
   - `.env.*` ファイルは `.gitignore` に含まれています
   - `.env.*.example` ファイルのみGit管理されます

3. **Docker Secrets の検討**
   本番環境では以下の使用を推奨：
   ```bash
   # Docker Secretsを使用した機密情報管理
   docker secret create jwt_secret jwt_secret.txt
   ```

## 📝 開発者向けガイド

### ローカル設定のカスタマイズ

個人的な設定調整は `.local` ファイルで行えます：

```bash
# 個人設定用ファイル（Git管理されない）
.env.base.local
.env.dev.local
.env.prod.local  # 本番環境では使用非推奨
.env.test.local
```

### 新しい環境変数の追加

1. **共通設定の場合**
   `.env.base.example` に追加

2. **環境固有の場合**
   該当する `.env.{環境}.example` に追加

3. **Docker Compose での使用**
   対応する `docker-compose*.yml` で環境変数を参照

### デバッグ方法

環境変数の設定確認：

```bash
# Docker Compose での環境変数確認
docker compose --env-file .env.base --env-file .env.dev config

# 特定サービスの環境変数確認
docker compose exec app env | grep NODE_ENV
```

## ⚠️ 注意事項

### 必須事項

1. **共通設定ファイル (.env.base) は必須**
   すべての環境で必要です

2. **環境変数の読み込み順序**

   ```
   .env.base → .env.{環境} → .env.{環境}.local
   ```

3. **本番環境での検証**
   本番デプロイ前に必ず環境変数の設定を検証してください

### トラブルシューティング

#### よくある問題

1. **環境変数が反映されない**

   ```bash
   # 解決方法：コンテナを再作成
   docker compose down
   docker compose --env-file .env.base --env-file .env.dev up --build
   ```

2. **設定ファイルが見つからない**

   ```bash
   # 解決方法：Exampleファイルをコピー
   cp .env.base.example .env.base
   cp .env.dev.example .env.dev
   ```

3. **Docker Compose起動エラー**
   ```bash
   # 設定内容を確認
   docker compose --env-file .env.base --env-file .env.dev config
   ```

## 📊 統合前後の比較

### 統合前の問題

- `.env.prod.example`: 163行の巨大ファイル
- 設定の重複
- 保守性の低下
- 環境間の設定差異が不明確

### 統合後の改善

- **共通設定**: 92行（重複除去）
- **環境別設定**: 平均30-60行（差分のみ）
- **保守性向上**: 一元管理による更新容易性
- **明確な責務分離**: 共通設定と環境差分の分離

## 🔗 関連資料

- [Docker Compose 環境変数リファレンス](https://docs.docker.com/compose/environment-variables/)
- [Next.js 環境変数ガイド](https://nextjs.org/docs/basic-features/environment-variables)
- [本プロジェクトのDockerガイド](./docker-guide.md)

---

**最終更新**: 2025年8月20日  
**バージョン**: 1.0.0
