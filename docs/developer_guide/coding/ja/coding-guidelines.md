# コーディングガイドライン

このドキュメントは、Next.js 15.x (App Router) + React 19 + TypeScript プロジェクトのコーディング標準とベストプラクティスの概要を提供します。

> **📋 重要:** このガイドラインは複数のファイルに分割されました。詳細な情報は各専門ガイドラインを参照してください。

## 📚 ガイドライン構成

このガイドラインは以下のファイルに分割されています：

- **[概要](./coding-guidelines-overview.md)** - 基本方針、SSOT原則、禁止事項
- **[TypeScript](./typescript-guidelines.md)** - 型定義、命名規則、型ガード
- **[Next.js パターン](./nextjs-patterns.md)** - Server/Client Components、ルーティング、React設計
- **[アーキテクチャ設計](./architecture-guidelines.md)** - 関数型優先アプローチ、設計パターン
- **[セキュリティ](../../development/ja/security-guidelines.md)** - セキュアな実装パターン、脆弱性対策
- **[パフォーマンス](../../development/ja/performance-guidelines.md)** - 最適化、アクセシビリティ
- **[開発・保守](../../development/ja/development-guidelines.md)** - 状態管理、エラーハンドリング、スタイリング
- **[テスト](../../testing/ja/testing-guidelines.md)** - テスト戦略、テストピラミッド
- **[レビュー チェックリスト](../../development/ja/review-checklist.md)** - PRレビュー用の横断観点

---

## クイックスタート

各領域でのベストプラクティスを即座に確認したい場合は、対応するガイドラインファイルを参照してください：

### 開発フェーズ別ガイド

- **プロジェクト開始時** → [概要](./coding-guidelines-overview.md) + [アーキテクチャ設計](./architecture-guidelines.md)
- **コンポーネント開発時** → [Next.js パターン](./nextjs-patterns.md) + [TypeScript](./typescript-guidelines.md)
- **セキュリティ実装時** → [セキュリティ](../../development/ja/security-guidelines.md)
- **パフォーマンス改善時** → [パフォーマンス](../../development/ja/performance-guidelines.md)
- **テスト実装時** → [テスト](../../testing/ja/testing-guidelines.md)
- **日常開発時** → [開発・保守](../../development/ja/development-guidelines.md)

---

## 重要な原則（抜粋）

以下は全ガイドラインに共通する最重要原則です。詳細は各専門ガイドラインを参照してください。

### 1. セキュリティファースト

機密情報や最終的な認証・権限判定は必ずサーバーサイドで行う。クライアント側では「UX向上のための早期リダイレクト・条件付き表示」など補助的なガードのみに留め、信頼境界を越える判断（権限可否・機密データ取得）は行わない。

> 📖 詳細: [セキュリティガイドライン](./security-guidelines.md)

### 2. Single Source of Truth (SSOT)

すべての定数と設定値は一箇所で管理し、重複を避ける。

> 📖 詳細: [概要ガイドライン](./coding-guidelines-overview.md#single-source-of-truth-ssot-原則)

### 3. 純粋関数優先アプローチ

99%のケースで純粋関数を使用し、クラスは極めて例外的な（複雑な内部状態 / パフォーマンス最適化が純粋関数合成で著しく困難な）場合のみ検討する。

> 📖 詳細: [アーキテクチャ設計ガイドライン](./architecture-guidelines.md)

### 4. 型安全性の徹底

TypeScriptの機能を最大限活用し、any型の使用を避ける。

> 📖 詳細: [TypeScriptガイドライン](./typescript-guidelines.md)

---

## よくあるタスクのクイックリファレンス

### 新しいコンポーネントを作成する時

1. [Next.js パターン](./nextjs-patterns.md) - Server/Client Componentsの使い分け
2. [TypeScript](./typescript-guidelines.md) - Props型の定義方法
3. [開発・保守](./development-guidelines.md) - スタイリング（Tailwind CSS）

### API呼び出しを実装する時

1. [セキュリティ](./security-guidelines.md) - 認証・認可、入力値検証
2. [アーキテクチャ設計](./architecture-guidelines.md) - APIクライアント設計
3. [開発・保守](./development-guidelines.md) - エラーハンドリング

### パフォーマンス問題を解決する時

1. [パフォーマンス](./performance-guidelines.md) - 動的インポート、メモ化戦略
2. [Next.js パターン](./nextjs-patterns.md) - Server Componentsの活用
3. [開発・保守](./development-guidelines.md) - 状態管理の最適化

### テストを書く時

1. [テスト](./testing-guidelines.md) - テストピラミッド、テストパターン
2. [TypeScript](./typescript-guidelines.md) - モックの型安全性
3. [概要](./coding-guidelines-overview.md) - テストデータの定数管理

---

## PRレビュー用チェックリスト

詳細で最新の横断観点は別ファイルに集約しています。PRをレビュー/作成する際は以下を参照してください：

➡️ `review-checklist.md` を参照: [レビュー チェックリスト](./review-checklist.md)

（このファイルには重複を避けるため概要のみを保持します）

## 技術スタック概要

- **Framework:** Next.js 15.4.6 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.0 + shadcn/ui
- **Testing:** Vitest (Unit) + Playwright (E2E)
- **Architecture:** 純粋関数優先 + 関数型プログラミング

---

## 次のステップ

1. **初回**: [概要](./coding-guidelines-overview.md)で基本方針を理解
2. **開発開始**: 対応する専門ガイドラインを参照
3. **継続的改善**: 定期的にガイドラインを見直し、改善提案を実施

---

_このガイドラインは定期的に更新され、プロジェクトの成長とともに進化します。疑問や改善提案がある場合は、チームで議論して継続的に改善していきましょう。_
