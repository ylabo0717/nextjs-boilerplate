# セキュリティツール構成

このプロジェクトでは、3層のセキュリティチェックを実装しています。

## 1. ESLint Security Plugins (ローカル/CI)

### インストール済みプラグイン

- `eslint-plugin-security`: 一般的なセキュリティ問題を検出
- `eslint-plugin-no-secrets`: ハードコードされた秘密情報を検出

### チェック内容

- evalの使用検出
- 安全でない正規表現
- タイミング攻撃の可能性
- ハードコードされたAPIキー/パスワード

### 実行方法

```bash
pnpm lint
```

## 2. Semgrep (CI/ローカル)

### 特徴

- **完全ローカル実行可能**
- プライベートリポジトリでも無料
- カスタムルール定義可能（`.semgrep.yml`）

### チェック内容

- React XSS（dangerouslySetInnerHTML）
- SQLインジェクション
- ハードコードされた秘密情報
- evalの使用
- Next.js特有の問題

### ローカル実行

```bash
# Dockerを使用
docker run --rm -v "$(pwd):/src" \
  returntocorp/semgrep:latest \
  --config=.semgrep.yml \
  /src

# または、Semgrep CLIをインストール
pip install semgrep
semgrep --config=.semgrep.yml
```

## 3. CodeQL (CI)

### 動作

- **パブリックリポジトリ**: 自動的にGitHub Code Scanningにアップロード
- **プライベートリポジトリ**: SARIFファイルをArtifactsとして保存

### カスタムクエリ

`.github/codeql/queries/react-security.ql`に独自のReactセキュリティルールを定義

### 結果の確認

- パブリック: GitHub Security タブで確認
- プライベート: Actions → Artifacts → codeql-resultsをダウンロード

## セキュリティワークフロー構成

### 実行タイミング

- mainブランチへのpush時
- Pull Request作成時
- 毎日3:00 AM UTC（スケジュール実行）
- 手動実行可能

### ジョブ構成

1. **dependency-audit**: 依存関係の脆弱性チェック
2. **codeql-analysis**: 静的コード解析（条件付きアップロード）
3. **semgrep-analysis**: Semgrepによるセキュリティチェック
4. **secret-scanning**: Gitleaksによるシークレット検出
5. **license-check**: ライセンスコンプライアンス確認

## プライベートリポジトリでの運用

### 無料で使えるツール

- ✅ ESLint Security Plugins
- ✅ Semgrep
- ✅ CodeQL（分析のみ、アップロードなし）
- ✅ Gitleaks

### 有料が必要なもの

- ❌ GitHub Code Scanning（GitHub Advanced Security必要）

## ローカル開発での推奨事項

1. **コミット前**

   ```bash
   pnpm lint  # ESLintセキュリティチェック
   ```

2. **定期的に実行**
   ```bash
   # Semgrepチェック
   docker run --rm -v "$(pwd):/src" \
     returntocorp/semgrep:latest \
     --config=auto \
     /src
   ```

## トラブルシューティング

### CodeQLエラー

- プライベートリポジトリの場合は正常動作
- SARIFファイルはArtifactsから取得可能

### Semgrepエラー

- Dockerが利用できない場合はpip installで対応
- SEMGREP_APP_TOKENは任意（なくても動作）

### ESLintエラー

- `pnpm lint`で詳細確認
- 自動修正: `pnpm lint --fix`
