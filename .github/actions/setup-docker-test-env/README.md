# Setup Docker Test Environment Action

Docker環境でのテスト実行に必要な共通セットアップを提供するGitHub Actionです。

## 概要

このActionは、異なるタイプのテスト（Unit、Integration、E2E）で共通して必要となる環境設定を標準化し、重複を削減します。

## 入力パラメータ

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|-----|-----------|-----|
| `test-type` | ✅ | - | テストの種類 (`unit`/`integration`/`e2e`/`all`) |
| `enable-testcontainers` | ❌ | `false` | Testcontainers設定の有効化 |
| `create-directories` | ❌ | `true` | テスト結果ディレクトリの作成 |

## 実行内容

### 1. Docker Buildx セットアップ
- Docker Buildxの設定
- linux/amd64 プラットフォーム対応

### 2. 環境ファイル設定
- `.env.base.example` → `.env.base`
- `.env.test.example` → `.env.test`
- `.env.test` → `.env.local`
- Docker Host設定の追加

### 3. 条件付き設定

#### Testcontainers有効時
```bash
TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal
```

#### E2Eテスト時
```bash
BASE_URL=http://app-server:3000
PLAYWRIGHT_SKIP_WEBSERVER=true
```

### 4. ディレクトリ作成
- `test-results/`
- `coverage/`
- `playwright-report/`

## 使用例

### Unit Tests
```yaml
- uses: ./.github/actions/setup-docker-test-env
  with:
    test-type: 'unit'
```

### Integration Tests
```yaml
- uses: ./.github/actions/setup-docker-test-env
  with:
    test-type: 'integration'
    enable-testcontainers: 'true'
```

### E2E Tests
```yaml
- uses: ./.github/actions/setup-docker-test-env
  with:
    test-type: 'e2e'
    create-directories: 'true'
```

## 出力

このActionは環境のセットアップのみを行い、特別な出力は提供しません。セットアップの完了は標準出力で確認できます。

## エラーハンドリング

- 環境ファイルが存在しない場合はエラー終了
- ディレクトリ作成に失敗した場合はエラー終了
- 各ステップの実行結果がログに出力される

## 関連ドキュメント

- [Docker Cleanup Action](../docker-cleanup/README.md)
- [CI/CDワークフロー改善設計書](../../../docs/work_dir/docker_compose/functional-separation-design.md)