# Docker Compose 本番環境セキュリティガイド

## 概要

本番環境でのDocker Compose運用におけるセキュリティ強化設定とベストプラクティス。

## 実装済みセキュリティ機能

### 1. コンテナセキュリティ

#### 1.1 非rootユーザー実行 ✅ 実装済み

**アプリケーションコンテナ:**

```dockerfile
# docker/app/Dockerfile (行39-41)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs  # 本番環境では非rootユーザーで実行
```

**Nginxコンテナ:**

```dockerfile
# docker/nginx/Dockerfile (行27-28, 48)
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx
USER nginx  # 非rootユーザーで実行
```

#### 1.2 リソース制限 ✅ 実装済み

```yaml
# docker-compose.prod.yml
services:
  app:
    mem_limit: 1g # メモリ制限
    cpus: 0.5 # CPU制限
  proxy:
    mem_limit: 256m # プロキシメモリ制限
    cpus: 0.25 # プロキシCPU制限
```

### 2. ネットワークセキュリティ

#### 2.1 ネットワーク分離 ✅ 実装済み

```yaml
# docker-compose.prod.yml
networks:
  app-network:
    name: nextjs-prod-network
    driver: bridge
    internal: false # 外部アクセス制御
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16 # 専用サブネット
```

#### 2.2 Nginx セキュリティヘッダー ✅ 実装済み

```nginx
# docker/nginx/nginx.conf (行75-80)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

#### 2.3 レート制限 ✅ 実装済み

```nginx
# docker/nginx/nginx.conf (行82-84)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;     # API制限
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s; # 一般制限
```

### 3. 環境変数管理

#### 3.1 機密情報分離 ✅ 実装済み

```bash
# 統合環境変数システムの使用方法
cp .env.base.example .env.base
cp .env.prod.example .env.prod
# 実際の値を設定
vim .env.prod

# Docker Compose起動時に指定
docker compose -f docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d
```

#### 3.2 必須環境変数チェック ✅ 実装済み

```yaml
# docker-compose.loki.yml (行26)
environment:
  - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD environment variable is required for security}
```

### 4. ログ・監査

#### 4.1 構造化ログ ✅ 実装済み

```yaml
# docker-compose.prod.yml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: '10m' # ログローテーション
        max-file: '3' # 保持ファイル数
```

#### 4.2 アクセスログ監視 ✅ 実装済み

```nginx
# docker/nginx/nginx.conf (行32-36)
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';
```

## セキュリティチェックリスト

### 🔒 デプロイ前チェック

- [ ] `.env.prod` ファイルの機密情報設定完了
- [ ] デフォルトパスワードの変更
- [ ] 不要なポート公開の削除
- [ ] SSL/TLS証明書の設定（HTTPS環境）
- [ ] ファイアウォール設定確認

### 🔍 運用時監視項目

- [ ] 異常なアクセスパターンの検出
- [ ] リソース使用量監視（CPU/メモリ）
- [ ] エラーレート監視
- [ ] セキュリティアップデート適用

### 🚨 インシデント対応

- [ ] 不正アクセス検出時の対応手順
- [ ] システム緊急停止手順
- [ ] ログ保全手順
- [ ] 復旧手順

## 高度なセキュリティオプション

### 1. Docker Secrets（本番環境推奨）

```yaml
# 機密情報をDocker Secretsで管理
secrets:
  db_password:
    external: true
  jwt_secret:
    external: true

services:
  app:
    secrets:
      - db_password
      - jwt_secret
```

### 2. SSL/TLS終端

```yaml
# SSL対応Nginx設定
services:
  proxy:
    build:
      target: ssl # SSL対応ステージ
    ports:
      - '443:443'
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
```

### 3. セキュリティスキャン統合

```yaml
# Trivyによる脆弱性スキャン
services:
  security-scan:
    image: aquasec/trivy:latest
    command: ['image', 'nextjs-app:latest']
```

## トラブルシューティング

### よくある問題と対策

**1. 権限エラー**

```bash
# コンテナ内での権限確認
docker-compose -f docker-compose.prod.yml exec app whoami
docker-compose -f docker-compose.prod.yml exec app id
```

**2. ネットワーク接続問題**

```bash
# ネットワーク設定確認
docker network ls
docker network inspect nextjs-prod-network
```

**3. ログ分析**

```bash
# セキュリティ関連ログの確認
docker-compose -f docker-compose.prod.yml logs proxy | grep -E "(40[0-9]|50[0-9])"
```

## 関連ドキュメント

- [docker/README.md](../docker/README.md) - Docker環境全般
- [OpenTelemetry統合](./opentelemetry-integration.md) - メトリクス監視
- [Loki統合ガイド](./loki-integration.md) - ログ監視
