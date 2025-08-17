# Docker Compose実装計画

## 1. 実装概要

### 1.1 目標

既存のNext.jsプロジェクトを完全にDocker Compose化し、開発・テスト・本番のすべての環境でコンテナベースの運用を実現する。

### 1.2 終了条件

- Docker Compose環境でUnit Tests、Integration Tests、E2E Testsがすべてパス
- 既存のLoki統合テストが正常動作
- 開発体験の向上（ホットリロード、デバッグ機能維持）

## 2. 実装フェーズ

### Phase 1: 基盤構築（Week 1-2）

#### 1.1 Dockerfiles作成

**1.1.1 アプリケーション用Dockerfile**

```dockerfile
# docker/app/Dockerfile
# Multi-stage build: base, development, test, production
```

**1.1.2 開発用Dockerfile**

```dockerfile
# docker/app/Dockerfile.dev
# Hot reload対応、デバッグポート開放
```

**1.1.3 Nginx用Dockerfile（オプション）**

```dockerfile
# docker/nginx/Dockerfile
# リバースプロキシ設定
```

**成果物**:

- [ ] `docker/app/Dockerfile`
- [ ] `docker/app/Dockerfile.dev`
- [ ] `docker/app/.dockerignore`
- [ ] `docker/nginx/Dockerfile`（必要に応じて）

#### 1.2 ベースCompose設定

**1.2.1 メイン設定ファイル**

```yaml
# docker-compose.yml
# 開発環境用ベース設定
services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile.dev
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
```

**1.2.2 開発環境オーバーライド**

```yaml
# docker-compose.override.yml
# 開発環境特有の設定
```

**成果物**:

- [ ] `docker-compose.yml`
- [ ] `docker-compose.override.yml`
- [ ] `.env.example`

#### 1.3 開発環境動作確認

**1.3.1 基本動作テスト**

```bash
# 起動テスト
docker compose up -d
curl http://localhost:3000

# ホットリロード確認
# ファイル編集 → 自動反映確認
```

**1.3.2 開発体験確認**

- [ ] ホットリロード動作
- [ ] TypeScript type checking
- [ ] ESLint/Prettier動作
- [ ] デバッグポート接続

**成果物**:

- [ ] 動作確認レポート
- [ ] トラブルシューティングガイド

### Phase 2: テスト環境統合（Week 3-4）

#### 2.1 テスト用Compose設定

**2.1.1 テスト環境設定**

```yaml
# docker-compose.test.yml
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
    depends_on:
      - app-test
    volumes:
      - .:/workspace
    working_dir: /workspace
```

**成果物**:

- [ ] `docker-compose.test.yml`
- [ ] `.env.test`

#### 2.2 Unit Tests統合

**2.2.1 Vitestコンテナ化**

```bash
# Unit tests実行
docker compose -f docker-compose.test.yml run --rm app-test pnpm test:unit

# Coverage生成
docker compose -f docker-compose.test.yml run --rm app-test pnpm test:coverage
```

**2.2.2 テスト環境最適化**

- 並列実行設定
- テストデータ管理
- キャッシュ最適化

**成果物**:

- [ ] Unit Tests 100%パス
- [ ] テスト実行時間 < 現在の150%

#### 2.3 Integration Tests統合

**2.3.1 既存Testcontainers対応**

```yaml
# Loki testcontainer設定保持
# 既存の tests/setup/loki-testcontainer-setup.ts を活用
```

**2.3.2 データベース統合テスト**

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
```

**成果物**:

- [ ] Integration Tests 100%パス
- [ ] Loki統合テスト継続動作
- [ ] テストデータベース設定

#### 2.4 E2E Tests統合

**2.4.1 Playwright環境**

```bash
# E2E tests実行
docker compose -f docker-compose.test.yml run --rm playwright pnpm test:e2e

# Headed mode
docker compose -f docker-compose.test.yml run --rm playwright pnpm test:e2e:headed
```

**2.4.2 テスト環境準備**

- アプリケーション起動待機
- テストデータセットアップ
- スクリーンショット・動画保存

**成果物**:

- [ ] E2E Tests 100%パス
- [ ] テスト実行時間 < 現在の120%
- [ ] テスト成果物の保存設定

#### 2.5 CI/CD統合

**2.5.1 GitHub Actions更新**

```yaml
# .github/workflows/test.yml
- name: Run tests in Docker
  run: |
    docker compose -f docker-compose.test.yml run --rm app-test pnpm test
    docker compose -f docker-compose.test.yml run --rm playwright pnpm test:e2e
```

**成果物**:

- [ ] CI/CDパイプライン更新
- [ ] すべてのテストジョブの成功

### Phase 3: 本番環境対応（Week 5-6）

#### 3.1 本番用Compose設定

**3.1.1 本番環境設定**

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: production
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
    environment:
      - NODE_ENV=production
```

**成果物**:

- [ ] `docker-compose.prod.yml`
- [ ] `.env.prod.example`
- [ ] ヘルスチェック実装

#### 3.2 セキュリティ強化

**3.2.1 シークレット管理**

```yaml
# Docker Secrets使用
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

**3.2.2 ネットワーク分離**

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

**成果物**:

- [ ] シークレット管理設定
- [ ] ネットワーク分離設定
- [ ] セキュリティ監査レポート

#### 3.3 監視・ログ統合

**3.3.1 既存Loki設定統合**

```yaml
# docker-compose.prod.yml
# 既存のdocker-compose.loki.ymlと連携
```

**3.3.2 メトリクス収集**

```yaml
services:
  prometheus:
    image: prom/prometheus
  node_exporter:
    image: prom/node-exporter
```

**成果物**:

- [ ] Loki統合完了
- [ ] メトリクス収集設定
- [ ] アラート設定

### Phase 4: 最適化・ドキュメント化（Week 7）

#### 4.1 パフォーマンス最適化

**4.1.1 ビルド最適化**

- Docker layer caching
- Multi-stage build最適化
- イメージサイズ削減

**4.1.2 起動時間最適化**

- 依存関係最適化
- 並列起動設定
- ヘルスチェック調整

**成果物**:

- [ ] ビルド時間 < 5分
- [ ] 起動時間 < 30秒
- [ ] イメージサイズ < 500MB

#### 4.2 開発者ドキュメント

**4.2.1 README更新**

````markdown
## Docker Compose使用方法

### 開発環境

```bash
docker compose up
```
````

### テスト実行

```bash
docker compose -f docker-compose.test.yml run --rm app-test pnpm test
```

````

**4.2.2 トラブルシューティングガイド**
- よくある問題と解決方法
- パフォーマンス調整方法
- デバッグ手順

**成果物**:
- [ ] README.md更新
- [ ] トラブルシューティングガイド
- [ ] 開発者向けFAQ

## 3. リスク管理

### 3.1 高リスク項目

**3.1.1 既存テスト互換性**
- **リスク**: 既存テストが動作しない
- **対策**: 段階的移行、並行運用期間設定
- **検証**: 各フェーズでの完全テスト実行

**3.1.2 パフォーマンス劣化**
- **リスク**: Docker化によるパフォーマンス低下
- **対策**: ベンチマーク測定、最適化フェーズ実施
- **検証**: 定量的パフォーマンス比較

### 3.2 中リスク項目

**3.2.1 開発体験の変化**
- **リスク**: 開発効率の低下
- **対策**: ホットリロード保持、起動スクリプト提供
- **検証**: 開発者フィードバック収集

**3.2.2 複雑性の増加**
- **リスク**: 設定管理の複雑化
- **対策**: 明確なドキュメント化、自動化スクリプト
- **検証**: 新規メンバーでの環境構築テスト

## 4. 品質保証

### 4.1 テスト基準

**4.1.1 機能テスト**
- [ ] Unit Tests: 100%パス
- [ ] Integration Tests: 100%パス
- [ ] E2E Tests: 100%パス
- [ ] Loki統合テスト: 100%パス

**4.1.2 パフォーマンステスト**
- [ ] ビルド時間: < 5分
- [ ] 起動時間: < 30秒
- [ ] テスト実行時間: < 現在の150%
- [ ] メモリ使用量: < 2GB

**4.1.3 セキュリティテスト**
- [ ] シークレット漏洩チェック
- [ ] コンテナスキャン
- [ ] ネットワーク分離確認
- [ ] 権限設定確認

### 4.2 継続的監視

**4.2.1 メトリクス収集**
- コンテナリソース使用量
- アプリケーションパフォーマンス
- エラーレート
- ログ出力量

**4.2.2 アラート設定**
- 高CPU/メモリ使用率
- コンテナ異常終了
- ヘルスチェック失敗
- ディスク容量不足

## 5. ロールバック計画

### 5.1 緊急時対応

**5.1.1 即座のロールバック**
```bash
# 既存環境に戻す
git checkout main
pnpm install
pnpm dev
````

**5.1.2 段階的復旧**

1. Docker環境停止
2. 既存環境での動作確認
3. 問題の特定・修正
4. 段階的Docker環境復旧

### 5.2 データ保護

**5.2.1 バックアップ戦略**

- 設定ファイルのバージョン管理
- データベースダンプ
- ログファイル保存
- 環境変数バックアップ

## 6. 成功指標とマイルストーン

### 6.1 Phase別成功指標

**Phase 1**: 開発環境動作

- [ ] Docker Compose up成功
- [ ] ホットリロード動作
- [ ] 基本機能確認

**Phase 2**: テスト統合

- [ ] 全テストスイートパス
- [ ] CI/CD統合完了
- [ ] パフォーマンス基準達成

**Phase 3**: 本番対応

- [ ] 本番環境設定完了
- [ ] セキュリティ要件達成
- [ ] 監視システム統合

**Phase 4**: 最適化

- [ ] パフォーマンス目標達成
- [ ] ドキュメント完成
- [ ] チーム受け入れ完了

### 6.2 最終成功指標

**技術指標**:

- [ ] 全テスト 100%パス
- [ ] ビルド時間 < 5分
- [ ] 起動時間 < 30秒
- [ ] セキュリティスキャン パス

**体験指標**:

- [ ] 開発者満足度 > 80%
- [ ] セットアップ時間 < 10分
- [ ] トラブル発生率 < 5%
- [ ] ドキュメント完全性 100%

---

## 次のアクション

1. **Phase 1開始**: Dockerfiles作成から着手
2. **環境準備**: 必要なツール・権限の確認
3. **チーム調整**: 実装スケジュール共有
4. **品質基準確定**: テスト要件の詳細化
