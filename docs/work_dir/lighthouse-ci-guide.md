# Lighthouse CI ガイド

## 概要

Lighthouse CIは、Webサイトのパフォーマンスと品質を自動的に測定・監視するツールです。
本プロジェクトでは、GitHub Actionsと統合して、PRごとに自動的に品質チェックを実行します。

## 測定項目

### 📊 主要カテゴリー（スコア）

| カテゴリー     | 閾値     | レベル | 説明                                 |
| -------------- | -------- | ------ | ------------------------------------ |
| Performance    | 90点以上 | Error  | ページの読み込み速度とパフォーマンス |
| Accessibility  | 95点以上 | Error  | アクセシビリティ（障害者対応）       |
| Best Practices | 95点以上 | Error  | Web開発のベストプラクティス準拠      |
| SEO            | 95点以上 | Error  | 検索エンジン最適化                   |

### ⚡ パフォーマンス指標

| 指標                           | 閾値      | レベル | 説明                                   |
| ------------------------------ | --------- | ------ | -------------------------------------- |
| FCP (First Contentful Paint)   | 1.8秒以下 | Warn   | 最初のコンテンツが表示されるまでの時間 |
| LCP (Largest Contentful Paint) | 2.5秒以下 | Warn   | 最大のコンテンツが表示されるまでの時間 |
| CLS (Cumulative Layout Shift)  | 0.1以下   | Warn   | レイアウトのずれ（視覚的安定性）       |
| TBT (Total Blocking Time)      | 300ms以下 | Warn   | メインスレッドがブロックされる時間     |
| Speed Index                    | 3.4秒以下 | Warn   | ページ内容が視覚的に表示される速度     |
| TTI (Time to Interactive)      | 3.8秒以下 | Warn   | ページが完全に操作可能になるまでの時間 |
| Max Potential FID              | 250ms以下 | Warn   | 最大入力遅延時間                       |

## 使用方法

### ローカルでの実行

```bash
# 基本的な実行（ビルド、測定、アサーション全て実行）
pnpm lighthouse

# 個別のコマンド
pnpm lighthouse:collect  # データ収集のみ
pnpm lighthouse:assert   # アサーションのみ
pnpm lighthouse:upload   # 結果のアップロード

# モバイル設定での実行
pnpm dlx @lhci/cli autorun --config=.lighthouserc.mobile.json
```

### CI/CDでの自動実行

GitHub ActionsでPRを作成すると自動的に：

1. アプリケーションのビルド
2. 各ページの測定（3回実行して平均値を算出）
3. 閾値チェック
4. PRへの結果コメント投稿

## 設定ファイル

### `.lighthouserc.json`（デスクトップ用）

- **測定対象URL**: `/`, `/example`
- **実行回数**: 3回
- **プリセット**: desktop
- **タイムアウト**: 30秒

### `.lighthouserc.mobile.json`（モバイル用）

- **画面サイズ**: 375x667
- **CPU速度**: 4倍スローダウン
- **ネットワーク**: 3G相当のスロットリング

## エラーレベルの意味

| レベル | 表示 | 意味                     | CI/CDへの影響              |
| ------ | ---- | ------------------------ | -------------------------- |
| Error  | 🔴   | 必須要件を満たしていない | ビルド失敗（PRマージ不可） |
| Warn   | 🟡   | 改善推奨                 | ビルド成功（改善を推奨）   |
| Pass   | 🟢   | 問題なし                 | ビルド成功                 |

## ベストプラクティス

### 現在の設定の妥当性

本プロジェクトの設定は、Googleが推奨するベストプラクティスに準拠しています：

1. **段階的導入** - "Start slowly"の原則に従い、基本的な品質チェックから開始
2. **3段階のアサーション** - error/warn/offを適切に使い分け
3. **業界標準の閾値** - Core Web Vitalsの推奨値を採用
4. **複数回測定** - 3回実行で測定値の安定性を確保
5. **環境依存項目の除外** - HTTPSチェックなど開発環境で不要な項目を除外

### 閾値の根拠

| 指標          | 設定値 | Google推奨 | 根拠                        |
| ------------- | ------ | ---------- | --------------------------- |
| Performance   | 90点   | 90点以上   | Google推奨値と同じ          |
| Accessibility | 95点   | 90点以上   | より厳格な基準を採用        |
| FCP           | 1.8秒  | 1.8秒以下  | Core Web Vitals "Good" 基準 |
| LCP           | 2.5秒  | 2.5秒以下  | Core Web Vitals "Good" 基準 |
| CLS           | 0.1    | 0.1以下    | Core Web Vitals "Good" 基準 |

## トラブルシューティング

### よくある問題と対処法

#### 1. 404エラーが発生する

**原因**: 設定で指定したURLが存在しない
**対処**: `.lighthouserc.json`の`url`配列を実際に存在するページに修正

#### 2. タイムアウトエラー

**原因**: ビルドやサーバー起動に時間がかかりすぎている
**対処**: `startServerReadyTimeout`の値を増やす（デフォルト: 30000ms）

#### 3. スコアが低い

**原因**: Next.jsの開発ビルドでは最適化が不十分
**対処**: 本番ビルド（`pnpm build`）で測定することを確認

### ローカル環境での注意点

- ポート3000が空いている必要があります
- 初回実行時はビルドに時間がかかります（1-2分）
- `.lighthouseci/`ディレクトリは`.gitignore`に含まれています

## 今後の拡張計画

### Phase 1（実装済み）✅

- 基本的な品質チェック
- GitHub Actions統合
- PRへの自動コメント

### Phase 2（計画中）

- Lighthouse CIサーバーの導入
- 履歴データの永続化
- トレンド分析

### Phase 3（将来）

- パフォーマンスバジェット設定
- カスタムアサーション
- 詳細なレポート生成

## 参考リンク

- [Lighthouse CI 公式ドキュメント](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev - Core Web Vitals](https://web.dev/vitals/)
- [Chrome Developers - Lighthouse](https://developer.chrome.com/docs/lighthouse/)
