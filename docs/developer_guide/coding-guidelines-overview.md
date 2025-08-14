# コーディングガイドライン - 概要

このドキュメントは、Next.js 15.x (App Router) + React 19 + TypeScript プロジェクトのコーディング標準とベストプラクティスの概要を提供します。

## 📚 ガイドライン構成

このガイドラインは以下のファイルに分割されています：

- **[概要](./coding-guidelines-overview.md)** - 基本方針、SSOT原則、禁止事項（このファイル）
- **[TypeScript](./typescript-guidelines.md)** - 型定義、命名規則、型ガード
- **[Next.js パターン](./nextjs-patterns.md)** - Server/Client Components、ルーティング、React設計
- **[アーキテクチャ設計](./architecture-guidelines.md)** - 関数型優先アプローチ、設計パターン
- **[セキュリティ](./security-guidelines.md)** - セキュアな実装パターン、脆弱性対策
- **[パフォーマンス](./performance-guidelines.md)** - 最適化、アクセシビリティ
- **[開発・保守](./development-guidelines.md)** - 状態管理、エラーハンドリング、スタイリング
- **[テスト](./testing-guidelines.md)** - テスト戦略、テストピラミッド

---

## 基本方針

### フレームワークネイティブ・アプローチ

**目的**: エコシステムとの統合性と長期的なメンテナンス性を確保する。

**理由**: サードパーティ製のスタイルガイド（Airbnb等）は依存関係の競合リスクがあり、Next.jsの進化に追従できない場合がある。

```javascript
// ✅ Good - Next.js推奨の設定
// eslint.config.mjs
...compat.extends('next/core-web-vitals', 'next/typescript')

// ❌ Bad - サードパーティ設定の全面採用
...compat.extends('airbnb-typescript')  // 依存関係競合リスク
```

### セキュリティファースト

**目的**: アプリケーションのセキュリティを最優先に考慮した開発パターンを確立する。

**効果**:

- データ漏洩の防止
- XSS、CSRF等の攻撃からの保護
- 認証・認可の適切な実装

---

## Single Source of Truth (SSOT) 原則

**目的**: すべての設定値、定数、閾値に単一の信頼できるソースを確立する。

**効果**:

- **一貫性**: 同じ値がプロジェクト全体で使用される
- **保守性**: 一箇所の更新で全体に反映される
- **明確性**: 各値の出所が明確
- **型安全性**: TypeScriptによる正しい使用の保証

### 実装パターン

```typescript
// ✅ Good - 定数の一元管理
// src/constants/index.ts
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  TIMEOUT: 5000,
  RETRY_ATTEMPTS: 3,
} as const;

// src/constants/ui.ts
export const UI_CONSTANTS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  DEBOUNCE_DELAY: 300,
  PAGINATION_SIZE: 20,
} as const;

// 使用例
import { API_CONFIG } from '@/constants';
const response = await fetch(API_CONFIG.BASE_URL, {
  signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
});
```

```typescript
// ❌ Bad - 重複する値
// components/UserList.tsx
const PAGE_SIZE = 20;

// components/ProductList.tsx
const PAGE_SIZE = 20; // 重複！

// services/api.ts
const TIMEOUT = 5000;

// utils/http.ts
const TIMEOUT = 5000; // 重複！
```

### 環境変数の使い分け

```typescript
// ✅ Good - 環境固有の値のみ環境変数を使用
// デプロイメント固有の設定
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;

// アプリケーション定数は定数ファイルで管理
const MAX_RETRY_ATTEMPTS = 3; // constants/index.ts に定義

// ❌ Bad - 定数を環境変数で上書き
const MAX_RETRY_ATTEMPTS = process.env.MAX_RETRY_ATTEMPTS ?? 3;
```

---

### 重複発見と是正フロー

1. 発見: レビュー / 静的解析 / `grep` で定数リテラル重複を検知
2. 抽出: 代表となる命名を決め `src/constants/` に追加（`as const` で不変化）
3. 置換: 既存箇所を新定数で一括置換し差分を最小化
4. 検証: TypeScript ビルド & テストを実行し回帰がないか確認
5. ドキュメント: 変更理由を PR 説明と CHANGELOG に記載（後方互換影響があれば明示）

> ツール化候補: 将来的に頻出パターン（サイズ閾値、ページネーション長など）を検出するスクリプトを追加して自動化を検討。

## 禁止事項

### セキュリティ関連

1. **機密情報のクライアントサイド露出**

   ```tsx
   // ❌ 絶対禁止
   const API_SECRET = 'sk-123456789';
   const DATABASE_PASSWORD = 'secret123';
   ```

2. **認証のクライアントサイド実装**

   ```tsx
   // ❌ 絶対禁止
   localStorage.setItem('isAuthenticated', 'true');
   ```

3. **SQLインジェクション脆弱性**
   ```tsx
   // ❌ 絶対禁止
   const query = `SELECT * FROM users WHERE id = ${userId}`;
   ```

### パフォーマンス関連

1. **大きなライブラリの不要な全体インポート**

   ```tsx
   // ❌ Bad
   import * as lodash from 'lodash';

   // ✅ Good
   import { debounce } from 'lodash';
   ```

2. **無限ループを引き起こすuseEffect**

   ```tsx
   // ❌ Bad
   useEffect(() => {
     setData([...data, newItem]); // dataが依存配列にある場合
   }, [data]);

   // ✅ Good
   useEffect(() => {
     setData((prev) => [...prev, newItem]);
   }, [newItem]);
   ```

### 型安全性関連

1. **any型の使用**

   ```tsx
   // ❌ Bad
   const userData: any = fetchUserData();

   // ✅ Good
   const userData: User = fetchUserData();
   ```

2. **型アサーションの乱用**

   ```tsx
   // ❌ Bad
   const user = data as User; // 危険

   // ✅ Good
   if (isUser(data)) {
     // dataは確実にUser型
   }
   ```

### アクセシビリティ関連

1. **div要素でのクリック可能領域**

   ```tsx
   // ❌ Bad
   <div onClick={handleClick}>クリック</div>

   // ✅ Good
   <button onClick={handleClick}>クリック</button>
   ```

2. **alt属性のない画像**

   ```tsx
   // ❌ Bad
   <img src="profile.jpg" />

   // ✅ Good
   <img src="profile.jpg" alt="ユーザーのプロフィール画像" />
   ```

### コード品質関連

1. **マジックナンバーの使用**

   ```tsx
   // ❌ Bad
   setTimeout(() => {}, 3000);

   // ✅ Good
   import { UI_WAIT_TIMES } from '@/constants';
   setTimeout(() => {}, UI_WAIT_TIMES.STANDARD);
   ```

2. **console.logの本番環境残留**

   ```tsx
   // ❌ Bad
   console.log('Debug info'); // 本番環境で残ってはいけない

   // ✅ Good
   if (process.env.NODE_ENV === 'development') {
     console.log('Debug info');
   }
   ```

---

## まとめ

このコーディングガイドラインは、Next.js 15 + React 19 + TypeScript プロジェクトにおける品質、セキュリティ、パフォーマンス、アクセシビリティを確保するための実践的な指針です。

### 重要な原則

1. **セキュリティファースト** - 機密情報は常にサーバーサイドで処理
2. **Single Source of Truth** - 定数と設定値の一元管理
3. **型安全性** - TypeScriptの機能を最大活用
4. **パフォーマンス重視** - Core Web Vitalsの改善
5. **アクセシビリティ** - すべてのユーザーへの配慮
6. **保守性** - 長期的なメンテナンスを考慮した設計

これらの原則に従うことで、チーム全体が一貫した高品質なコードを効率的に開発できるようになります。

### 次のステップ

各トピックの詳細については、対応するガイドラインファイルを参照してください：

- 型安全なコードを書く → [TypeScript ガイドライン](./typescript-guidelines.md)
- 効率的なNext.js開発 → [Next.js パターン](./nextjs-patterns.md)
- セキュアなアプリ開発 → [セキュリティガイドライン](./security-guidelines.md)
- パフォーマンス最適化 → [パフォーマンスガイドライン](./performance-guidelines.md)

---

_このガイドラインは定期的に更新され、プロジェクトの成長とともに進化します。疑問や改善提案がある場合は、チームで議論して継続的に改善していきましょう。_
