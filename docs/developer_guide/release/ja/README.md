# リリース管理ガイドライン

Changeset、リリース自動化、CI/CD、GitHub Actionsに関するガイドラインです。

## 📋 ドキュメント一覧

- **[Changeset開発者ガイド](./changeset-developer-guide.md)** - Changesetを使ったリリース管理の基本
- **[リリース自動化システム](./release-automation-system.md)** - 自動リリースシステムの設計と運用
- **[GitHub Actionsベストプラクティス](./github-actions-best-practices.md)** - CI/CDワークフローの設計原則

## 🚀 リリースフロー

### Changeset管理

1. 機能開発時にChangesetファイル作成
2. PR作成・レビュー・マージ
3. 自動リリースPR生成
4. リリースPRマージで自動デプロイ

### バージョン管理

- Semantic Versioning (X.Y.Z)
- 自動バージョン更新
- 自動CHANGELOG生成

### CI/CD パイプライン

- 自動テスト実行
- 品質ゲートチェック
- 自動デプロイメント

## 🔗 関連ドキュメント

- [品質管理ガイドライン](../quality/ja/) - リリース品質基準
- [テストガイドライン](../testing/ja/) - リリース前テスト戦略
- [設定管理ガイドライン](../configuration/ja/) - CI/CD設定
