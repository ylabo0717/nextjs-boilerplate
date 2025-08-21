# Docker Troubleshooting Guide

このドキュメントでは、Docker Compose環境でよく発生する問題とその解決方法を説明します。

## 🚨 よくある問題と解決方法

### 1. コンテナ起動の問題

#### ポート競合エラー

**症状:**

```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**解決方法:**

```bash
# 使用中のポートを確認
lsof -i :3000

# プロセスを停止
kill -9 <PID>

# または別のポートを使用
PROXY_PORT=8080 docker compose -f docker-compose.prod.yml up -d
```

#### メモリ不足エラー

**症状:**

```
Container exited with code 137 (SIGKILL - out of memory)
```

**解決方法:**

```bash
# Docker Desktop のメモリ制限を確認・増加（推奨: 4GB以上）
# または個別のリソース制限を調整

# 現在のメモリ使用量を確認
docker stats

# メモリ制限を緩和（一時的）
docker compose -f docker-compose.prod.yml up -d --scale app=1
```

#### ヘルスチェック失敗

**症状:**

```
Container is unhealthy
```

**解決方法:**

```bash
# ヘルスチェックログを確認
docker inspect <container_id> | jq '.[0].State.Health.Log'

# 手動でヘルスチェックを実行
docker exec <container_id> curl -f http://localhost:3000/api/health

# ヘルスチェック設定を緩和（debugging用）
# docker-compose.prod.yml のretries数を増加
```

### 2. ビルドの問題

#### 依存関係インストール失敗

**症状:**

```
npm ERR! network timeout
npm ERR! Could not resolve dependency
```

**解決方法:**

```bash
# Dockerキャッシュをクリア
docker builder prune

# ネットワーク設定を確認
docker compose build --no-cache

# プロキシ環境の場合、buildx設定を調整
docker buildx create --use --config /path/to/buildkitd.toml
```

#### pnpmキャッシュ問題

**症状:**

```
ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY
```

**解決方法:**

```bash
# pnpmキャッシュをクリア
docker volume rm $(docker volume ls -q | grep pnpm)

# Dockerfileのキャッシュマウントを一時的に無効化
RUN pnpm install --frozen-lockfile --no-cache

# 完全リビルド
docker compose build --no-cache app
```

### 3. テスト環境の問題

#### Testcontainers失敗 (Integration Tests)

**症状:**

```
Could not find a valid Docker environment
```

**解決方法:**

```bash
# Docker-in-Docker環境を確認
docker compose -f docker-compose.test.yml logs app-integration

# Loki関連テストを一時的に除外
SKIP_LOKI_TESTS=true pnpm docker:test:integration

# Docker socketマウントを確認
ls -la /var/run/docker.sock
```

#### Playwright接続エラー

**症状:**

```
browserType.launch: Browser closed prematurely
```

**解決方法:**

```bash
# Playwrightのシステム依存関係を確認
docker compose -f docker-compose.test.yml run --rm playwright npx playwright install-deps

# Playwrightのバージョンを確認・更新
docker compose -f docker-compose.test.yml build playwright --no-cache

# ヘルスチェック待機を追加
docker compose -f docker-compose.test.yml up app-server -d
docker compose -f docker-compose.test.yml exec app-server curl http://localhost:3000/api/health
```

#### E2E テスト表示問題

**症状:**

```
Test failed: Cannot connect to display
```

**解決方法:**

```bash
# Xvfbが適切に動作しているか確認
docker compose -f docker-compose.test.yml run --rm playwright ps aux | grep Xvfb

# Dockerfileでディスプレイ設定を確認
ENV DISPLAY=:99
```

### 4. 本番環境の問題

#### Nginx設定問題

**症状:**

```
502 Bad Gateway
```

**解決方法:**

```bash
# Nginx設定をテスト
docker compose -f docker-compose.prod.yml exec proxy nginx -t

# バックエンド接続を確認
docker compose -f docker-compose.prod.yml exec proxy curl http://app:3000/api/health

# Nginxログを確認
docker compose -f docker-compose.prod.yml logs proxy
```

#### SSL証明書問題

**症状:**

```
SSL handshake failed
```

**解決方法:**

```bash
# 開発環境では HTTP のみ使用を推奨
# docker/nginx/nginx.conf で HTTP設定を確認

# 必要に応じて自己署名証明書を生成
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/server.key \
  -out docker/nginx/server.crt
```

#### Grafana アクセス問題

**症状:**

```
Cannot connect to Grafana on port 3001
```

**解決方法:**

```bash
# Grafana管理者パスワードを設定
echo "GRAFANA_ADMIN_PASSWORD=your-secure-password" >> .env.prod

# Grafanaデータボリュームを再作成
docker volume rm nextjs-grafana-data
docker compose -f docker-compose.prod.yml up -d grafana

# Grafana初期化ログを確認
docker compose -f docker-compose.prod.yml logs grafana
```

## 🔍 デバッグ方法

### ログ確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービスのログ
docker compose logs -f app

# エラーのみ表示
docker compose logs --tail=100 2>&1 | grep -i error
```

### コンテナ内部の確認

```bash
# コンテナに入る
docker compose exec app sh

# プロセス確認
docker compose exec app ps aux

# ネットワーク確認
docker compose exec app netstat -tlnp

# ファイルシステム確認
docker compose exec app ls -la /app
```

### リソース使用量確認

```bash
# リアルタイムモニタリング
docker stats

# 詳細なリソース情報
docker system df

# 未使用リソースの確認
docker system prune --dry-run
```

## 🧹 環境のクリーンアップ

### 開発環境リセット

```bash
# コンテナとボリュームを削除
docker compose down -v

# 未使用イメージ・キャッシュを削除
docker builder prune -f
docker image prune -f

# 完全リセット（注意：全Dockerリソースが削除される）
docker system prune -a -f
```

### 本番環境リセット

```bash
# 本番環境停止（データ保持）
docker compose -f docker-compose.prod.yml down

# データを含む完全削除（注意：Grafana/Lokiデータが失われます）
docker compose -f docker-compose.prod.yml down -v
```

## 🔧 パフォーマンスチューニング

### ビルド時間改善

```bash
# Dockerfileのマルチステージビルドキャッシュを活用
docker build --target deps .
docker build --cache-from=deps .

# pnpmストアキャッシュを永続化
docker volume create pnpm-store
```

### 実行時パフォーマンス改善

```bash
# CPU・メモリ制限の調整
# docker-compose.prod.yml の cpus, mem_limit を環境に応じて調整

# リソース使用量を監視
docker compose -f docker-compose.prod.yml exec grafana /bin/sh
# Grafanaダッシュボードでメトリクス確認
```

## 📞 サポート

問題が解決しない場合：

1. **GitHub Issues**: [nextjs-boilerplate/issues](https://github.com/yourusername/nextjs-boilerplate/issues)
2. **ログの確認**: 詳細なエラーログを収集
3. **環境情報の提供**:
   ```bash
   docker version
   docker compose version
   uname -a
   ```

## 📚 関連ドキュメント

- [Docker README](../docker/README.md)
- [Testing Guidelines](developer_guide/testing-guidelines.md)
- [Architecture Guidelines](developer_guide/architecture-guidelines.md)
