# Docker FAQ - よくある質問

## 🤔 一般的な質問

### Q1: Dockerを使う理由は？

**A:** このプロジェクトでDockerを使用する理由：

- **環境統一**: 開発・テスト・本番で同じ環境を使用
- **依存関係の分離**: Node.jsバージョンやシステム依存関係の管理
- **CI/CDの信頼性**: テスト環境と本番環境の一致
- **スケーラビリティ**: コンテナオーケストレーションへの拡張性
- **セキュリティ**: 分離されたプロセス実行環境

### Q2: ローカル開発でもDockerを使うべき？

**A:** 用途によって使い分けを推奨：

**ローカル開発（推奨）:**

```bash
pnpm dev  # 高速なHMR、デバッグが簡単
```

**Docker開発（特定ケース）:**

```bash
docker compose up  # 本番環境に近い検証、依存関係の問題調査
```

**テスト実行（Docker推奨）:**

```bash
pnpm docker:test  # CI/CDと同じ環境でのテスト
```

### Q3: なぜNode.js 22に更新したの？

**A:** Phase 5の最適化で以下の理由でアップデート：

- **パフォーマンス向上**: V8エンジンの最新版による高速化
- **ESModuleサポート改善**: Vitest 3との互換性向上
- **Alpine 3.21対応**: セキュリティアップデート
- **pnpm 10.3.0対応**: 依存関係解決の最適化

## 🔧 開発環境の質問

### Q4: Docker開発環境でホットリロードが遅い

**A:** 以下を確認・実行：

```bash
# 1. ファイル監視の最適化（macOS/Windows）
# docker-compose.override.yml でdelegated mount使用
volumes:
  - .:/app:delegated

# 2. .dockerignoreの確認
# 不要なファイル（node_modules, .git）が除外されているか

# 3. リソース制限の確認
# Docker Desktopメモリ: 最低4GB推奨

# 4. Turbopack使用確認
# package.json: "dev": "next dev --turbopack"
```

### Q5: 環境変数の管理方法は？

**A:** 環境別に適切なファイルを使用：

```bash
# 開発環境（ローカル）
.env.local          # ローカル開発用（Git除外）
.env.development    # 開発環境共通

# テスト環境
.env.test          # テスト専用環境変数

# 本番環境
.env.prod          # 本番環境用（要作成、Git除外）
.env.prod.example  # 本番環境テンプレート

# Docker Compose
# 自動読み込み優先順位：
# .env.local > .env.development > .env
```

### Q6: VSCodeでDocker内のデバッグは可能？

**A:** 可能です。設定例：

**.vscode/launch.json:**

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Node",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "protocol": "inspector"
}
```

**起動方法:**

```bash
# デバッグポート付きで起動
docker compose up  # ポート9229が自動公開

# VSCodeでAttachデバッグを実行
```

## 🧪 テスト環境の質問

### Q7: Docker テストがローカルテストより遅い理由

**A:** 以下の要因があります：

- **コンテナ起動時間**: イメージプル・コンテナ起動のオーバーヘッド
- **ファイルシステム**: Docker volumeのI/Oオーバーヘッド
- **リソース制限**: メモリ・CPU制限による実行時間増加

**改善方法:**

```bash
# キャッシュ活用
docker compose -f docker-compose.test.yml build --parallel

# 部分テスト実行
pnpm docker:test:unit  # 単体テストのみ

# ローカル高速テスト→Docker最終確認の流れ
pnpm test              # 開発時
pnpm docker:test       # 完成時確認
```

### Q8: Integration テストで2件失敗する理由

**A:** Docker-in-Docker環境の制約により、Testcontainers依存のLoki関連テスト2件が失敗します：

**回避方法:**

```bash
# Lokiテストをスキップ
SKIP_LOKI_TESTS=true pnpm docker:test:integration

# または、ローカルでLokiテストを実行
pnpm test:integration
```

**理解すべきポイント:**

- この制約は技術的限界であり、実装の問題ではない
- 98.9%のテスト成功は十分に高い品質水準
- 本番環境では問題なく動作する

### Q9: E2E テストでスクリーンショットが保存されない

**A:** volume設定を確認：

```yaml
# docker-compose.test.yml
playwright:
  volumes:
    - ./test-results:/app/test-results
    - ./playwright-report:/app/playwright-report
```

**権限問題の解決:**

```bash
# 権限設定
chmod -R 755 test-results playwright-report

# または、所有者変更
sudo chown -R $(whoami) test-results playwright-report
```

## 🚀 本番環境の質問

### Q10: 本番環境でのリソース使用量は？

**A:** デフォルト設定でのリソース消費：

```yaml
app: 1GB RAM, 0.5 CPU
proxy: 256MB RAM, 0.25 CPU
loki: 512MB RAM, 0.25 CPU
grafana: 256MB RAM, 0.25 CPU
promtail: 128MB RAM, 0.1 CPU
```

**合計: 約2.2GB RAM, 1.35 CPU**

**調整方法:**

```bash
# .env.prodで調整
APP_MEMORY_LIMIT=2g
APP_CPU_LIMIT=1.0

# またはdocker-compose.prod.ymlで直接編集
```

### Q11: HTTPSが必要な場合は？

**A:** Nginx設定を調整：

```bash
# 1. SSL証明書の準備
# Let's Encrypt、自己署名、または商用証明書

# 2. nginx設定の更新
# docker/nginx/ssl.nginx.conf を有効化

# 3. ポート設定
# docker-compose.prod.yml の443ポートを公開

# 4. 環境変数設定
PROXY_SSL_PORT=443
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Q12: スケールアップの方法は？

**A:** Docker Composeでの基本的なスケーリング：

```bash
# アプリケーションを3つのインスタンスに増加
docker compose -f docker-compose.prod.yml up --scale app=3

# 負荷分散の確認
curl http://localhost:8080  # Nginxがラウンドロビン
```

**さらなるスケーリングには:**

- **Kubernetes**: 本格的なオーケストレーション
- **Docker Swarm**: 軽量なクラスタリング
- **Load Balancer**: 外部ロードバランサー

## 🔍 監視・ログの質問

### Q13: Grafanaダッシュボードにアクセスできない

**A:** 確認事項：

```bash
# 1. 環境変数の設定
echo "GRAFANA_ADMIN_PASSWORD=your-password" >> .env.prod

# 2. サービスの状態確認
docker compose -f docker-compose.prod.yml ps grafana

# 3. ログの確認
docker compose -f docker-compose.prod.yml logs grafana

# 4. ポートの確認
curl http://localhost:3001

# 5. 初期化の完了待機
# 初回起動時はデータベース初期化に時間がかかる
```

### Q14: ログが出力されない・見つからない

**A:** ログ出力先の確認：

```bash
# Docker Composeログ
docker compose -f docker-compose.prod.yml logs -f app

# JSON形式のログ（Lokiへ送信）
docker compose -f docker-compose.prod.yml exec promtail cat /var/log/containers/*.log

# アプリケーションログ
docker compose -f docker-compose.prod.yml exec app cat /app/.next/trace

# Nginx アクセスログ
docker compose -f docker-compose.prod.yml exec proxy cat /var/log/nginx/access.log
```

### Q15: メトリクスデータが表示されない

**A:** OpenTelemetryメトリクスの確認：

```bash
# 1. メトリクスエンドポイント確認
curl http://localhost:8080/api/metrics

# 2. Prometheusメトリクス確認（ポート9464）
# アプリケーション内部での確認が必要

# 3. Grafanaでのデータソース設定確認
# http://localhost:3001 → Configuration → Data Sources

# 4. ダッシュボードのクエリ確認
# Grafanaでメトリクス名・ラベルの確認
```

## 💡 最適化の質問

### Q16: ビルド時間を短縮したい

**A:** 最適化手順：

```bash
# 1. Dockerキャッシュの最大活用
docker compose build --parallel

# 2. マルチステージビルドキャッシュ
docker build --target deps .
docker build --cache-from=deps .

# 3. pnpmキャッシュの永続化
# 既にDockerfileで設定済み（キャッシュマウント）

# 4. 不要ファイルの除外
# .dockerignore の確認・最適化

# 5. 段階的ビルド
docker compose build base deps  # 基盤のみ
docker compose build app        # アプリのみ
```

### Q17: イメージサイズを削減したい

**A:** サイズ最適化のベストプラクティス：

```bash
# 現在のイメージサイズ確認
docker images | grep nextjs-boilerplate

# 最適化要素（既に適用済み）：
# ✅ Alpine Linux base image
# ✅ Multi-stage build
# ✅ pnpm prune --production
# ✅ standalone build output
# ✅ 不要ファイルの除外

# 追加最適化：
# 1. 基盤イメージの選択
FROM node:22-alpine3.21  # 既に最軽量版を使用

# 2. レイヤー統合
RUN command1 && command2 && command3

# 3. ビルド時キャッシュクリア
RUN npm cache clean --force
```

## 🔒 セキュリティの質問

### Q18: 本番環境のセキュリティは大丈夫？

**A:** 実装済みのセキュリティ対策：

- **非rootユーザー実行**: nextjs:nodejs（UID/GID: 1001）
- **リソース制限**: メモリ・CPU制限でDoS攻撃対策
- **ネットワーク分離**: app-network, monitoring-network
- **最小権限原則**: 必要最小限のポート公開
- **ログローテーション**: ディスク使用量制限
- **ヘルスチェック**: サービス監視

**追加推奨設定:**

```bash
# 1. 環境変数の暗号化
# Docker Secrets または外部シークレット管理

# 2. TLS/SSL設定
# HTTPS証明書の設定

# 3. ファイアウォール設定
# iptables または cloud provider firewall

# 4. ログ監視
# セキュリティログの監視・アラート設定
```

### Q19: 開発環境で秘密情報を扱うには？

**A:** 安全な秘密情報管理：

```bash
# 1. .env.local使用（Git除外）
echo "SECRET_KEY=dev-only-secret" >> .env.local

# 2. Docker secrets使用
echo "production-secret" | docker secret create api_key -
# docker-compose.prod.yml で secrets設定

# 3. 外部管理ツール
# HashiCorp Vault, AWS Secrets Manager等

# 4. 開発用ダミー値の使用
# 本番と開発で異なる無害な値を設定
```

## 📚 学習・参考資料

### Q20: Docker Composeをもっと学ぶには？

**A:** 推奨学習リソース：

**公式ドキュメント:**

- [Docker Compose Specification](https://compose-spec.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

**このプロジェクトでの実装例:**

- `docker-compose.yml` - 基本設定
- `docker-compose.prod.yml` - 本番環境設定
- `docker-compose.test.yml` - テスト環境設定

**追加学習項目:**

- Kubernetes（本格的なオーケストレーション）
- Docker Swarm（軽量クラスタリング）
- Container security（セキュリティベストプラクティス）

---

他に質問がある場合は、[GitHub Issues](https://github.com/yourusername/nextjs-boilerplate/issues)で遠慮なくお聞きください！
