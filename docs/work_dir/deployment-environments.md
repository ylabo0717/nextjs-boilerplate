# Deployment Environments Configuration

## 概要

このドキュメントでは、リリース自動化と連携するデプロイメント環境の設定について説明します。

## 環境構成

### Development (開発環境)

- **ブランチ**: `develop`
- **URL**: `https://dev.example.com`
- **自動デプロイ**: developブランチへのpush時
- **用途**: 開発チームによる機能確認

### Staging (ステージング環境)

- **ブランチ**: `staging`
- **URL**: `https://staging.example.com`
- **自動デプロイ**: リリースPR作成時
- **用途**: リリース前の最終確認

### Production (本番環境)

- **ブランチ**: `main`
- **URL**: `https://example.com`
- **自動デプロイ**: タグ作成時（v\*）
- **用途**: エンドユーザー向け

## デプロイメントプロバイダー別設定

### Vercel

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  release:
    types: [published]
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Netlify

```yaml
# .github/workflows/deploy-netlify.yml
name: Deploy to Netlify

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nwtgck/actions-netlify@v2.1
        with:
          publish-dir: './out'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: 'Deploy from GitHub Actions'
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### AWS (S3 + CloudFront)

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build
        run: |
          pnpm install --frozen-lockfile
          pnpm build
          pnpm export

      - name: Deploy to S3
        run: |
          aws s3 sync ./out s3://${{ secrets.S3_BUCKET }} --delete

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

### Docker Registry

```yaml
# .github/workflows/deploy-docker.yml
name: Build and Push Docker Image

on:
  release:
    types: [published]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: myapp/nextjs-boilerplate
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## ロールバック手順

### 自動ロールバック

```yaml
# .github/workflows/rollback.yml
name: Rollback Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: v${{ github.event.inputs.version }}

      - name: Deploy previous version
        run: |
          # デプロイコマンドを実行
          echo "Rolling back to version ${{ github.event.inputs.version }}"

      - name: Create rollback issue
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Rollback to v${{ github.event.inputs.version }}`,
              body: `Production has been rolled back to version ${{ github.event.inputs.version }}`,
              labels: ['rollback', 'production']
            });
```

### 手動ロールバック

1. GitHub Releases ページから前のバージョンを選択
2. アセットをダウンロード
3. 手動でデプロイコマンドを実行

```bash
# 例: Vercelの場合
vercel --prod --force

# 例: Netlifyの場合
netlify deploy --prod

# 例: AWSの場合
aws s3 sync ./out s3://bucket-name --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

## 環境変数の管理

### GitHub Secrets

必要なシークレット一覧：

```yaml
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Netlify
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID

# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET
CLOUDFRONT_DISTRIBUTION_ID

# Docker
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN

# Notifications
SLACK_WEBHOOK
DISCORD_WEBHOOK
```

### 環境変数の設定方法

```bash
# GitHub CLIを使用
gh secret set VERCEL_TOKEN --body "your-token-here"

# または GitHub UI から
# Settings > Secrets and variables > Actions > New repository secret
```

## モニタリング

### デプロイメント通知

```yaml
- name: Notify deployment
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: custom
    custom_payload: |
      {
        text: "🚀 Deployment Successful",
        attachments: [{
          color: 'good',
          text: `Version ${process.env.VERSION} deployed to production`
        }]
      }
```

### ヘルスチェック

```yaml
- name: Health check
  run: |
    for i in {1..5}; do
      if curl -f https://example.com/api/health; then
        echo "Health check passed"
        exit 0
      fi
      echo "Attempt $i failed, retrying..."
      sleep 10
    done
    echo "Health check failed"
    exit 1
```

## トラブルシューティング

### よくある問題と解決策

1. **デプロイが失敗する**
   - ビルドエラーのログを確認
   - 環境変数が正しく設定されているか確認
   - デプロイプロバイダーのステータスを確認

2. **ロールバックが必要**
   - 自動ロールバックワークフローを実行
   - 前のバージョンのタグをチェックアウト
   - 手動でデプロイコマンドを実行

3. **環境変数が反映されない**
   - GitHub Secretsが正しく設定されているか確認
   - ワークフローでの変数名が一致しているか確認
   - デプロイプロバイダー側の設定を確認

## 次のステップ

1. デプロイプロバイダーの選定
2. 環境別の設定ファイル作成
3. GitHub Secretsの設定
4. デプロイワークフローの実装
5. ヘルスチェックとモニタリングの実装
