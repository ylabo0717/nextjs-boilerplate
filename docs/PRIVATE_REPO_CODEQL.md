# プライベートリポジトリでのCodeQL設定

## 問題の原因

プライベートリポジトリでCode Scanningを使用するには、**GitHub Advanced Security**ライセンスが必要です。

## 解決方法

### オプション1: GitHub Advanced Securityを有効化（推奨）

1. **組織レベルで有効化**
   - Organization設定 → Security → Code security and analysis
   - "GitHub Advanced Security"を有効化
   - 注意: 追加料金が発生します

2. **リポジトリレベルで有効化**
   - リポジトリ設定 → Security & analysis
   - "GitHub Advanced Security"を有効化
   - "Code scanning"を有効化

### オプション2: リポジトリを公開する

パブリックリポジトリではCode Scanningが無料で利用できます。

```bash
gh repo edit ylabo0717/nextjs-boilerplate --visibility public
```

### オプション3: ローカルでCodeQLを実行

GitHub Actions以外でCodeQLを実行：

```bash
# CodeQL CLIをインストール
brew install codeql

# データベースを作成
codeql database create codeql-db --language=javascript

# クエリを実行
codeql database analyze codeql-db \
  .github/codeql/queries/react-security.ql \
  --format=sarif-latest \
  --output=results.sarif
```

### オプション4: SARIFファイルのみを利用

現在の設定では、Code Scanningが無効でも：

- CodeQLの分析は実行されます
- SARIFファイルがArtifactsとして保存されます
- ローカルで結果を確認できます

## 現在のワークフローの動作

1. **continue-on-error: true**
   - Code Scanningが無効でもワークフローは続行

2. **SARIFファイルの保存**
   - Artifactsとして結果が保存される
   - Actions画面からダウンロード可能

3. **他のセキュリティチェック**
   - 依存関係の脆弱性チェック
   - シークレットスキャン
   - ライセンスチェック
     これらは正常に動作します

## コスト情報

- **パブリックリポジトリ**: 無料
- **プライベートリポジトリ**:
  - GitHub Advanced Security が必要
  - 料金: コミッター数に基づく月額制
  - 詳細: https://github.com/pricing

## 推奨事項

1. **開発中**: ローカルでCodeQLを実行
2. **本番環境**: GitHub Advanced Securityを検討
3. **オープンソース化可能**: パブリックリポジトリに変更
