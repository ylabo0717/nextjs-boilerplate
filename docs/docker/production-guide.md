# Docker Compose 本番環境運用ガイド

## 概要

Phase 4で実装された本番環境対応のDocker Compose設定の運用方法とベストプラクティス。

## 🚀 クイックスタート

### 1. 最小構成での起動

```bash
# 環境変数設定
cp .env.prod.example .env.prod
vim .env.prod  # 必要な値を設定

# 本番環境起動
docker-compose -f docker-compose.prod.yml up -d

# ヘルスチェック
curl http://localhost/api/health
```

### 2. フル監視環境での起動

```bash
# 環境変数設定（監視系含む）
export GRAFANA_ADMIN_PASSWORD=secure-password-here

# 本番 + 監視環境起動
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# 各サービス確認
curl http://localhost/api/health          # アプリケーション
curl http://localhost:3001               # Grafana
curl http://localhost:9090               # Prometheus
```

## 📁 ファイル構成

### 主要設定ファイル

```
docker-compose.prod.yml       # 本番環境基本設定
docker-compose.monitoring.yml # 監視・メトリクス統合
.env.prod.example            # 環境変数テンプレート
```

### 設定ディレクトリ

```
docker/
├── app/
│   └── Dockerfile           # マルチステージDockerfile（production対応済み）
├── nginx/
│   ├── Dockerfile          # セキュリティ強化済みNginx
│   └── nginx.conf          # 本番最適化設定
├── prometheus/
│   └── prometheus.yml      # メトリクス収集設定
└── promtail/
    └── promtail-config.yml # ログ収集設定
```

## ⚙️ 設定項目

### 必須環境変数

```bash
# .env.prod
APP_VERSION=1.0.0
GRAFANA_ADMIN_PASSWORD=your-secure-password
NODE_ENV=production
```

### オプション環境変数

```bash
# ポート設定
PROXY_PORT=80
PROXY_SSL_PORT=443

# OpenTelemetry
OTEL_SERVICE_NAME=nextjs-app
OTEL_SERVICE_VERSION=1.0.0

# セキュリティ
ALLOWED_ORIGINS=https://yourdomain.com
```

## 🔒 セキュリティ機能

### 実装済みセキュリティ

- ✅ **非rootユーザー実行**: アプリ・Nginxともに非rootで実行
- ✅ **リソース制限**: メモリ・CPU制限設定済み
- ✅ **ネットワーク分離**: 専用サブネット・ネットワーク設定
- ✅ **セキュリティヘッダー**: XSS・CSRF・フレーミング対策
- ✅ **レート制限**: API・一般リクエスト制限
- ✅ **構造化ログ**: 監査・分析対応

### セキュリティチェックリスト

```bash
# デプロイ前チェック
□ .env.prod ファイルの機密情報設定完了
□ デフォルトパスワード（Grafana等）の変更
□ 不要ポートの公開停止確認
□ SSL/TLS証明書設定（HTTPS環境）
□ ファイアウォール・ネットワーク設定確認
```

## 📊 監視・メトリクス

### アクセス先

| サービス         | URL                           | 用途               |
| ---------------- | ----------------------------- | ------------------ |
| アプリケーション | http://localhost              | メインアプリ       |
| Grafana          | http://localhost:3001         | 監視ダッシュボード |
| Prometheus       | http://localhost:9090         | メトリクス収集     |
| Loki             | http://localhost:3100         | ログ収集           |
| メトリクスAPI    | http://localhost:9464/metrics | OpenTelemetry      |

### 主要メトリクス

```bash
# ヘルスチェック
curl http://localhost/api/health

# アプリケーションメトリクス
curl http://localhost/api/metrics

# Prometheusクエリ例
curl 'http://localhost:9090/api/v1/query?query=up'
curl 'http://localhost:9090/api/v1/query?query=nodejs_memory_usage_bytes'
```

### ログ確認

```bash
# アプリケーションログ
docker-compose -f docker-compose.prod.yml logs -f app

# Nginxアクセスログ
docker-compose -f docker-compose.prod.yml logs -f proxy

# 全サービスログ
docker-compose -f docker-compose.monitoring.yml logs -f
```

## 🏥 ヘルスチェック

### 拡張ヘルスチェック情報

```json
{
  "status": "ok",
  "timestamp": "2025-08-18T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "system": {
    "memory": {
      "used": 45,
      "total": 128,
      "external": 8
    },
    "pid": 1,
    "nodejs_version": "v20.18.0"
  }
}
```

### 監視項目

```bash
# 基本ヘルスチェック
docker-compose -f docker-compose.prod.yml ps

# 詳細リソース確認
docker stats $(docker-compose -f docker-compose.prod.yml ps -q)

# コンテナヘルスステータス
docker-compose -f docker-compose.prod.yml exec app curl -f http://localhost:3000/api/health
```

## 🚨 運用・トラブルシューティング

### よくある問題と対策

**1. コンテナ起動エラー**

```bash
# ログ確認
docker-compose -f docker-compose.prod.yml logs app

# リソース不足確認
docker system df
docker system prune  # 不要なリソース削除
```

**2. ヘルスチェック失敗**

```bash
# 内部からのヘルスチェック確認
docker-compose -f docker-compose.prod.yml exec app curl -f http://localhost:3000/api/health

# Nginx経由でのアクセス確認
curl -v http://localhost/api/health
```

**3. パフォーマンス問題**

```bash
# リソース使用量確認
docker stats

# Grafanaでのメトリクス確認
# http://localhost:3001 でCPU・メモリ・レスポンス時間を確認
```

### メンテナンス操作

```bash
# 安全な再起動
docker-compose -f docker-compose.prod.yml restart app

# 設定変更時の再デプロイ
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# データ保持してのサービス更新
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# 完全クリーンアップ
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a
```

## 📈 パフォーマンス最適化

### 現在の設定値

```yaml
# リソース制限（docker-compose.prod.yml）
app:
  mem_limit: 1g # メモリ制限
  cpus: 0.5 # CPU制限

proxy:
  mem_limit: 256m # プロキシメモリ制限
  cpus: 0.25 # プロキシCPU制限
```

### 調整方法

```bash
# .env.prod での調整
CONTAINER_MEMORY_LIMIT=2g
CONTAINER_CPU_LIMIT=1.0

# Nginx設定調整
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
```

## 🔄 バックアップ・復旧

### データバックアップ

```bash
# Grafanaデータのバックアップ
docker run --rm -v nextjs-grafana-data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .

# Prometheusデータのバックアップ
docker run --rm -v nextjs-prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz -C /data .

# Lokiデータのバックアップ
docker run --rm -v nextjs-loki-data:/data -v $(pwd):/backup alpine tar czf /backup/loki-backup.tar.gz -C /data .
```

### データ復旧

```bash
# Grafanaデータの復旧
docker run --rm -v nextjs-grafana-data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana-backup.tar.gz -C /data

# サービス再起動
docker-compose -f docker-compose.monitoring.yml restart grafana
```

## 🎯 次のステップ（Phase 5予定）

### 計画中の最適化

- [ ] **ビルド最適化**: Docker layer caching、Multi-stage build最適化
- [ ] **起動時間最適化**: 並列起動設定、ヘルスチェック調整
- [ ] **SSL/TLS対応**: Let's Encrypt統合、自動証明書更新
- [ ] **スケーリング対応**: 負荷分散、水平スケーリング設定

### 高度な運用機能

- [ ] **自動化**: デプロイメントパイプライン、自動ロールバック
- [ ] **監視強化**: アラート設定、SLA監視、パフォーマンス分析
- [ ] **セキュリティ強化**:脆弱性スキャン、セキュリティ監査の自動化

## 📚 関連ドキュメント

- [Docker基盤構築 (Phase 2)](../work_dir/docker_compose/implementation-plan.md#phase-2-docker基盤構築)
- [テスト環境統合 (Phase 3)](../work_dir/docker_compose/implementation-plan.md#phase-3-テスト環境統合)
- [セキュリティガイド](./production-security.md)
- [OpenTelemetryメトリクス](../developer_guide/typescript-guidelines.md)
