# メトリクスと品質ゲート

## 概要

本プロジェクトでは、コード品質とパフォーマンスを継続的に監視するために、包括的なメトリクス計測と品質ゲートシステムを実装しています。

## メトリクス計測

### 計測対象

1. **パフォーマンスメトリクス**
   - ビルド時間
   - テスト実行時間
   - **First Load JS** - ユーザーが実際にダウンロードするJavaScriptサイズ
   - 個別ページサイズ

2. **コード品質メトリクス**
   - TypeScriptエラー数
   - ESLintエラー・警告数
   - テストカバレッジ

3. **Lighthouseスコア**
   - Performance
   - Accessibility
   - Best Practices
   - SEO

### バンドルサイズメトリクスについて

#### First Load JSとは

**First Load JS**は、ユーザーがサイトに初回アクセスした際にダウンロードする必要があるJavaScriptの合計サイズです。これは以下を含みます：

- **フレームワークコード** (React, Next.js)
- **共通チャンク** (全ページで使用されるコード)
- **ページ固有のコード** (そのページのみで使用されるコード)

#### なぜFirst Load JSが重要か

1. **ユーザー体験への直接的な影響**
   - ダウンロード時間がTime to Interactive (TTI)に影響
   - 特にモバイルや低速回線で顕著

2. **実際の影響**

   | First Load JS | 3G回線  | 4G回線  | ユーザー体験 |
   | ------------- | ------- | ------- | ------------ |
   | 100KB         | 約0.6秒 | 約0.2秒 | ⚡ 優秀      |
   | 200KB         | 約1.2秒 | 約0.4秒 | ✅ 良好      |
   | 250KB         | 約1.5秒 | 約0.5秒 | ⚠️ 許容範囲  |
   | 500KB         | 約3.0秒 | 約1.0秒 | ❌ 要改善    |

#### 測定対象外

以下はサーバーサイドで使用され、ユーザーがダウンロードしないため測定対象外：

- `.next/server/` - サーバーサイドコード
- `.next/cache/` - ビルドキャッシュ
- ソースマップ（`.map`ファイル）
- 開発用依存関係

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

| メトリクス                | 必須基準 | 推奨基準 | 優秀基準 |
| ------------------------- | -------- | -------- | -------- |
| TypeScriptエラー          | 0件      | -        | -        |
| ESLintエラー              | 0件      | -        | -        |
| ESLint警告                | ≤10件    | 0件      | -        |
| テストカバレッジ          | ≥60%     | ≥70%     | ≥80%     |
| ビルド時間                | <5分     | <4分     | <3分     |
| **First Load JS**         | <250KB   | <200KB   | <150KB   |
| **ページ固有JS**          | <100KB   | <75KB    | <50KB    |
| **平均複雑度** ※1         | ≤10      | ≤8       | ≤5       |
| **最大複雑度** ※1         | ≤20      | ≤15      | ≤10      |
| Lighthouse Performance    | ≥80      | ≥90      | ≥95      |
| Lighthouse Accessibility  | ≥90      | ≥95      | ≥98      |
| Lighthouse Best Practices | ≥90      | ≥95      | ≥98      |
| Lighthouse SEO            | ≥90      | ≥95      | ≥98      |

※1: コード複雑度は`src/components/ui/`（shadcn/uiコンポーネント）を除外して測定

#### バンドルサイズ閾値の詳細

| レベル    | First Load JS | 説明                 |
| --------- | ------------- | -------------------- |
| ⚡ 優秀   | < 100KB       | 非常に高速、理想的   |
| ✅ 良好   | < 150KB       | 良好なパフォーマンス |
| ⚠️ 警告   | < 200KB       | 許容範囲内           |
| ❌ エラー | ≥ 250KB       | 改善が必要           |

#### コード複雑度の詳細

**測定対象:**

- 自チームが作成・管理するコードのみ
- `src/components/ui/`（shadcn/uiコンポーネント）は除外

**測定方法:**

ESLintCCライブラリを使用した循環的複雑度（Cyclomatic Complexity）の計測。
ASTベースの正確な解析により、以下の要素をカウント：

- 条件分岐（if/else、switch/case）
- ループ（for、while、do-while）
- 論理演算子（&&、||）
- try-catch文

**複雑度の基準:**

| 複雑度 | 評価    | 説明                       |
| ------ | ------- | -------------------------- |
| 1-5    | ⚡ 優秀 | シンプルで理解しやすい     |
| 6-10   | ✅ 良好 | 適度な複雑さ               |
| 11-15  | ⚠️ 注意 | リファクタリング検討       |
| 16-20  | 🟡 警告 | 分割を推奨                 |
| 21+    | ❌ 危険 | 早急にリファクタリング必要 |

**閾値設定の根拠:**

| 閾値項目             | 設定値 | 根拠                                                     |
| -------------------- | ------ | -------------------------------------------------------- |
| **個別ファイル最大** | 20     | ESLint標準のデフォルト値。業界標準として広く採用         |
| **個別ファイル警告** | 15     | SonarQube推奨値。認知的負荷が高くなる境界                |
| **平均複雑度警告**   | 8      | 一般的なベストプラクティス。プロジェクト全体の健全性指標 |
| **平均複雑度最大**   | 10     | McCabeの原論文推奨値。これを超えるとバグ発生率が急増     |

参考文献：

- [ESLint Complexity Rule](https://eslint.org/docs/latest/rules/complexity) - デフォルト20
- [SonarQube Cognitive Complexity](https://www.sonarsource.com/docs/CognitiveComplexity.pdf) - 推奨15以下
- McCabe, T. J. (1976). "A Complexity Measure" - 推奨10以下

**複雑度を下げる方法:**

- 早期リターンの活用
- 関数の分割
- ポリモーフィズムの活用
- 条件分岐の簡素化

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
