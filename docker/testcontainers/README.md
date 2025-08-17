# Testcontainers Docker Integration

Docker環境でTestcontainersを実行するための設定とベストプラクティス

## Docker-in-Docker設定

### 1. 必要な環境変数

```bash
# Testcontainers設定
TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal
DOCKER_HOST=unix:///var/run/docker.sock
TESTCONTAINERS_RYUK_DISABLED=false

# CI環境での設定
TESTCONTAINERS_CHECKS_DISABLE=true
```

### 2. Docker Composeでの設定

```yaml
services:
  app-integration:
    volumes:
      # Dockerソケットのマウント（必須）
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal
      - DOCKER_HOST=unix:///var/run/docker.sock
```

### 3. セキュリティ考慮事項

- Dockerソケットのマウントはセキュリティリスクを伴います
- 本番環境では絶対に使用しないでください
- テスト環境専用の設定です

## トラブルシューティング

### 問題1: Container startup failed

```bash
# 解決策: Docker daemon確認
docker info

# 権限確認
ls -la /var/run/docker.sock
```

### 問題2: Network connectivity issues

```bash
# 解決策: ネットワーク設定確認
docker network ls
docker compose -f docker-compose.test.yml logs
```

### 問題3: Port conflicts

```bash
# 解決策: 動的ポート使用
# Testcontainersが自動的にポートを割り当てます
const port = container.getMappedPort(3100);
```

## ベストプラクティス

1. **リソース管理**: テスト終了時の確実なクリーンアップ
2. **タイムアウト設定**: 適切な待機時間の設定
3. **ログ出力**: デバッグ用のコンテナログ出力
4. **健全性チェック**: サービス起動確認の実装

## 使用例

```typescript
// Integration Testsでの使用
import { createLokiTestContainer } from '../setup/loki-testcontainer-setup';

describe('Integration Tests', () => {
  let lokiContainer: LokiTestContainer;

  beforeAll(async () => {
    lokiContainer = await createLokiTestContainer();
  });

  afterAll(async () => {
    await lokiContainer.stop();
  });

  it('should work with Loki', async () => {
    // テスト実装
  });
});
```
