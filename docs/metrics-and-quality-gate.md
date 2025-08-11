# メトリクスと品質ゲート

## 概要

本プロジェクトでは、コード品質とパフォーマンスを継続的に監視するために、包括的なメトリクス計測と品質ゲートシステムを実装しています。

## メトリクス計測

### 計測対象

1. **パフォーマンスメトリクス**
   - ビルド時間
   - テスト実行時間
   - バンドルサイズ（Total、JavaScript、CSS）

2. **コード品質メトリクス**
   - TypeScriptエラー数
   - ESLintエラー・警告数
   - テストカバレッジ

3. **Lighthouseスコア**
   - Performance
   - Accessibility
   - Best Practices
   - SEO

### 使用方法

```bash
# すべてのメトリクスを計測
pnpm metrics

# 個別のメトリクスを計測
pnpm metrics:build    # ビルド時間のみ
pnpm metrics:test     # テスト時間のみ
pnpm metrics:bundle   # バンドルサイズのみ
```

計測結果は`metrics/`ディレクトリに保存されます：

- `latest.json` - 最新のメトリクス
- `metrics-{timestamp}.json` - タイムスタンプ付きの履歴

## 品質ゲート

### 品質基準

| メトリクス                | 必須基準 | 推奨基準 |
| ------------------------- | -------- | -------- |
| TypeScriptエラー          | 0件      | -        |
| ESLintエラー              | 0件      | -        |
| ESLint警告                | ≤10件    | 0件      |
| テストカバレッジ          | ≥60%     | ≥70%     |
| ビルド時間                | <5分     | <4分     |
| バンドルサイズ            | <5MB     | <4MB     |
| Lighthouse Performance    | ≥80      | ≥90      |
| Lighthouse Accessibility  | ≥90      | ≥95      |
| Lighthouse Best Practices | ≥90      | ≥95      |
| Lighthouse SEO            | ≥90      | ≥95      |

### 品質チェックの実行

```bash
# 品質ゲートチェックを実行
pnpm quality:check
```

品質基準を満たさない場合、スクリプトは非ゼロで終了します。

## GitHub Actions統合

### メトリクスワークフロー

`.github/workflows/metrics.yml`で定義されたワークフローが、PR作成時に自動的に実行されます。

#### ジョブ構成

1. **metrics** - メトリクス収集と品質ゲートチェック
2. **lighthouse** - Lighthouse CI実行
3. **bundle-analysis** - バンドルサイズ分析
4. **quality-summary** - 結果サマリー生成

### PRコメント

PRには自動的にメトリクスレポートがコメントとして投稿されます：

```markdown
## 📊 Build Metrics Report

### ⚡ Performance Metrics

| Metric      | Value  | Threshold | Status |
| ----------- | ------ | --------- | ------ |
| Build Time  | 2m 30s | < 5m      | ✅     |
| Bundle Size | 3.2MB  | < 5MB     | ✅     |

### 🎯 Code Quality

| Metric            | Value | Threshold | Status |
| ----------------- | ----- | --------- | ------ |
| TypeScript Errors | 0     | 0         | ✅     |
| Test Coverage     | 65%   | ≥ 60%     | ✅     |
```

## Lighthouse CI設定

`.lighthouserc.json`でLighthouse CIの設定を管理：

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/about"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }]
      }
    }
  }
}
```

## スクリプト一覧

### measure-metrics.ts

メトリクスを計測し、結果をJSONファイルとして保存します。

**主な機能：**

- ビルド時間の計測
- テスト実行時間の計測
- バンドルサイズの計算
- GitHub Actions出力への書き込み

### quality-gate.ts

品質ゲートチェックを実行し、基準を満たすか検証します。

**主な機能：**

- TypeScript/ESLintエラーチェック
- カバレッジ閾値検証
- ビルド時間/バンドルサイズ検証
- 失敗時の詳細レポート生成

### report-metrics.ts

メトリクスレポートを生成し、PRコメントとして投稿します。

**主な機能：**

- 現在と過去のメトリクス比較
- 変化の可視化（増減表示）
- Markdownレポート生成
- GitHub PR APIへの投稿

## ローカル開発での活用

### 継続的な品質チェック

開発中に定期的に品質チェックを実行：

```bash
# 開発前にベースラインを確認
pnpm metrics
pnpm quality:check

# 変更後に再度チェック
pnpm metrics
pnpm quality:check
```

### パフォーマンス最適化

バンドルサイズの分析：

```bash
# バンドルサイズを計測
pnpm metrics:bundle

# 詳細な分析が必要な場合
ANALYZE=true pnpm build
```

## トラブルシューティング

### メトリクス計測が失敗する

1. 依存関係が正しくインストールされているか確認

   ```bash
   pnpm install
   pnpm add -D tsx
   ```

2. ビルドが成功することを確認
   ```bash
   pnpm build
   ```

### 品質ゲートが想定外に失敗する

1. 各チェックを個別に実行して問題を特定

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test:coverage
   ```

2. 閾値の調整が必要な場合は`scripts/quality-gate.ts`の`DEFAULT_THRESHOLDS`を修正

### Lighthouse CIが失敗する

1. ポート3000が使用されていないか確認
2. `.lighthouserc.json`のURLが正しいか確認
3. ビルドが正常に完了しているか確認

## 今後の改善計画

- [ ] メトリクス履歴のグラフ化
- [ ] カスタム閾値の環境変数対応
- [ ] Slack通知の追加
- [ ] メトリクスダッシュボードの実装
- [ ] より詳細なバンドル分析レポート
