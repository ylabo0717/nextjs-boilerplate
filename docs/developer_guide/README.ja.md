# 開発者ガイド

このディレクトリは、Next.js 15.x + React 19 + TypeScript プロジェクトの開発者向けドキュメントをまとめています。

> **📋 ℹ️ 情報:** このドキュメントは日本語・英語両対応しています。  
> 🇯🇵 日本語版: `*.ja.md` | 🇺🇸 English: `*.en.md`

## 📚 ドキュメント構成

### 🏗️ [Core - 基本設計・アーキテクチャ](./core/)

プロジェクトの基本的な設計原則とアーキテクチャガイドラインを定義します。

- **[アーキテクチャガイドライン](./core/architecture-guidelines.ja.md)** - 純粋関数ファースト、設計パターン
- **[コーディングガイドライン](./core/coding-guidelines.ja.md)** - 全体概要とガイド構成
- **[コーディングガイドライン概要](./core/coding-guidelines-overview.ja.md)** - SSOT原則、基本方針
- **[TypeScriptガイドライン](./core/typescript-guidelines.ja.md)** - 型定義、命名規則、型ガード  
- **[Next.jsパターン](./core/nextjs-patterns.ja.md)** - Server/Client Components、ルーティング

### 🎯 [Quality - 品質・テスト・レビュー](./quality/)

コード品質を保証するためのテスト戦略とレビューガイドラインです。

- **[テストガイドライン](./quality/testing-guidelines.ja.md)** - テスト戦略、テストピラミッド
- **[レビューチェックリスト](./quality/review-checklist.ja.md)** - PRレビュー用の横断観点
- **[品質メトリクス](./quality/quality-metrics-architecture.ja.md)** - 品質ゲートシステム
- **[パフォーマンスガイドライン](./quality/performance-guidelines.ja.md)** - 最適化、アクセシビリティ

### 🔒 [Security - セキュリティ](./security/)

セキュアな実装のためのガイドラインです。

- **[セキュリティガイドライン](./security/security-guidelines.ja.md)** - セキュアな実装パターン、脆弱性対策

### 🛠️ [Development - 開発・運用ツール](./development/)

日常的な開発作業に関するツールとプロセスのガイドラインです。

- **[開発ガイドライン](./development/development-guidelines.ja.md)** - 状態管理、エラーハンドリング、スタイリング
- **[ドキュメントガイドライン](./development/documentation-guidelines.ja.md)** - TSDoc標準、検証戦略
- **[設定構造](./development/configuration-structure.ja.md)** - プロジェクト設定の整理方法
- **[チェンジセット開発ガイド](./development/changeset-developer-guide.ja.md)** - リリース管理プロセス

### 🚀 [Infrastructure - インフラ・CI/CD](./infrastructure/)

CI/CD、デプロイメント、インフラストラクチャに関するガイドラインです。

- **[GitHub Actions ベストプラクティス](./infrastructure/github-actions-best-practices.ja.md)** - CI/CDワークフロー設計
- **[リリース自動化システム](./infrastructure/release-automation-system.ja.md)** - 自動リリースプロセス
- **[YAMLガイドライン](./infrastructure/yaml-guidelines.ja.md)** - YAML設定ファイルの標準
- **[Docker](./infrastructure/docker/)** - Docker関連のFAQとトラブルシューティング

### 📊 [Logging - ログ関連](./logging/)

ログシステムの設計と運用に関するガイドラインです。

- **[ログシステム概要](./logging/logging-system-overview.ja.md)** - ログアーキテクチャの全体像
- **[ログ設定ガイド](./logging/logging-configuration-guide.ja.md)** - ログの設定方法
- **[ログトラブルシューティング](./logging/logging-troubleshooting-guide.ja.md)** - ログ関連の問題解決

## 🚀 クイックスタート

### 開発フェーズ別ガイド

開発の段階に応じて、以下のガイドラインを参照してください：

- **プロジェクト開始時** → [コーディングガイドライン概要](./core/coding-guidelines-overview.ja.md) + [アーキテクチャガイドライン](./core/architecture-guidelines.ja.md)
- **コンポーネント開発時** → [Next.jsパターン](./core/nextjs-patterns.ja.md) + [TypeScriptガイドライン](./core/typescript-guidelines.ja.md)
- **セキュリティ実装時** → [セキュリティガイドライン](./security/security-guidelines.ja.md)
- **パフォーマンス改善時** → [パフォーマンスガイドライン](./quality/performance-guidelines.ja.md)
- **テスト実装時** → [テストガイドライン](./quality/testing-guidelines.ja.md)
- **日常開発時** → [開発ガイドライン](./development/development-guidelines.ja.md)

### 重要な原則（抜粋）

全ガイドラインに共通する最重要原則：

#### 1. セキュリティファースト

機密情報や最終的な認証・権限判定は必ずサーバーサイドで行う。クライアント側では「UX向上のための早期リダイレクト・条件付き表示」など補助的なガードのみに留める。

#### 2. Single Source of Truth (SSOT)

すべての定数と設定値は一箇所で管理し、重複を避ける。

#### 3. 純粋関数ファースト

ステートレスで純粋関数を最優先とした実装を基本とし、極めて特殊な場合にのみオブジェクト指向の利点を慎重に活用する。

## 📖 関連ドキュメント

- [環境変数設定](../environment-variables.md) - 環境変数の設定方法
- [プロジェクト設定](../../CLAUDE.md) - Claude Code用の設定とコマンド

---

> **📝 注記:** このドキュメント構造は2025年8月31日に整理されました。古いパスを参照している場合は、この新しい構造に従って更新してください。