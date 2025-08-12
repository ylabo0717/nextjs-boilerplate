# 品質メトリクス・品質ゲートアーキテクチャ設計書

## 目次

1. [概要](#概要)
2. [設計思想と原則](#設計思想と原則)
3. [メトリクス計測システム](#メトリクス計測システム)
4. [品質ゲートシステム](#品質ゲートシステム)
5. [ヘルススコア算出](#ヘルススコア算出)
6. [CI/CD統合](#cicd統合)
7. [実装詳細](#実装詳細)
8. [開発者ガイド](#開発者ガイド)

## 概要

本プロジェクトでは、ソフトウェアの品質を定量的に測定し、継続的に改善していくための包括的なメトリクス計測・品質ゲートシステムを実装しています。このシステムは、業界標準の品質モデルと科学的根拠に基づいて設計されており、開発チームが高品質なコードを維持するための客観的な指標を提供します。

### システムの目的

1. **品質の可視化**: コード品質やパフォーマンスを定量的に測定
2. **早期問題発見**: 自動化された品質チェックによる問題の早期検出
3. **継続的改善**: メトリクスの追跡による改善活動の効果測定
4. **標準化**: 業界標準に準拠した一貫性のある品質基準の適用

## 設計思想と原則

### 1. 科学的根拠に基づく設計

すべてのメトリクスと閾値は、以下の国際標準や研究成果に基づいています：

- **ISO/IEC 25010**: ソフトウェア品質モデル（特に保守性と性能効率性）
- **McCabeの複雑度理論**: 循環的複雑度10以下の推奨
- **Core Web Vitals**: Googleが定めるWebパフォーマンス基準
- **SonarQube Quality Gate**: 業界標準の品質ゲート条件

### 2. Single Source of Truth原則

すべての閾値や定数は単一のファイル（`scripts/constants/quality-metrics.ts`）で管理され、システム全体で一貫性を保証します。

```typescript
// 定数の集中管理例
export const PERFORMANCE_THRESHOLDS = {
  BUNDLE_SIZE_TARGET: 5 * 1024 * 1024, // 5MB - 推奨目標
  BUNDLE_SIZE_WARNING: 50 * 1024 * 1024, // 50MB - 警告閾値
  BUNDLE_SIZE_MAX: 100 * 1024 * 1024, // 100MB - 最大許容
};
```

### 3. 段階的な品質レベル

品質指標は3段階のレベルで評価されます：

| レベル       | 意味                 | アクション         |
| ------------ | -------------------- | ------------------ |
| **必須基準** | 最低限満たすべき品質 | 違反時はビルド失敗 |
| **推奨基準** | 目標とすべき品質     | 警告表示で改善促進 |
| **優秀基準** | 理想的な品質         | 達成時は称賛表示   |

## メトリクス計測システム

### 計測対象メトリクス

#### 1. パフォーマンスメトリクス

**ビルド時間**

- **測定内容**: Next.jsのプロダクションビルドにかかる時間
- **目的**: CI/CDパイプラインの効率性確保
- **閾値根拠**: 開発者の生産性を維持するため5分以内を目標

**バンドルサイズ（First Load JS）**

- **測定内容**: ユーザーが初回アクセス時にダウンロードするJavaScriptサイズ
- **目的**: ページ読み込み速度の最適化
- **計算式**: フレームワーク + 共通チャンク + ページ固有コード
- **閾値根拠**:

| サイズ | 3G回線での読み込み時間 | 評価        |
| ------ | ---------------------- | ----------- |
| <100KB | 約0.6秒                | ⚡ 優秀     |
| <150KB | 約0.9秒                | ✅ 良好     |
| <200KB | 約1.2秒                | ⚠️ 許容範囲 |
| <250KB | 約1.5秒                | ❌ 要改善   |

#### 2. コード品質メトリクス

**循環的複雑度（Cyclomatic Complexity）**

- **測定内容**: コードの制御フローの複雑さ
- **測定方法**: ESLintCCによるAST解析
- **カウント対象**:
  - 条件分岐（if/else、switch/case）
  - ループ（for、while、do-while）
  - 論理演算子（&&、||）
  - try-catch文
- **閾値根拠**:

| 複雑度 | 評価    | 根拠                   |
| ------ | ------- | ---------------------- |
| 1-5    | ⚡ 優秀 | シンプルで理解しやすい |
| 6-10   | ✅ 良好 | McCabe推奨値以内       |
| 11-15  | ⚠️ 注意 | SonarQube警告レベル    |
| 16-20  | 🟡 警告 | ESLintデフォルト上限   |
| 21+    | ❌ 危険 | バグ発生率が急増       |

**保守性指数（Maintainability Index）**

- **測定内容**: コードの保守しやすさを0-100で評価
- **計算要素**: 複雑度、行数、コメント率の複合指標
- **閾値根拠**: Microsoft Visual Studioの基準を採用

**コード重複率**

- **測定内容**: 重複コードの割合
- **測定方法**: ESLint sonarjsプラグインによる検出
- **閾値根拠**: SonarQube推奨値（3%以下）

#### 3. 静的解析メトリクス

**TypeScriptエラー**

- **測定内容**: 型エラーの件数
- **目標**: 0件（型安全性の完全保証）

**ESLintエラー/警告**

- **測定内容**: コーディング規約違反
- **目標**: エラー0件、警告10件以下

**テストカバレッジ**

- **測定内容**: テストでカバーされているコードの割合
- **閾値根拠**: 業界標準（SonarWay）80%以上

#### 4. Lighthouseメトリクス

**測定カテゴリー**:

- Performance: ページ読み込み速度
- Accessibility: アクセシビリティ対応
- Best Practices: Web開発のベストプラクティス
- SEO: 検索エンジン最適化

**Core Web Vitals**:

- FCP (First Contentful Paint): 1.8秒以下
- LCP (Largest Contentful Paint): 2.5秒以下
- CLS (Cumulative Layout Shift): 0.1以下
- TBT (Total Blocking Time): 300ms以下

## 品質ゲートシステム

### 二層型品質評価モデル

#### 第1層: バイナリゲート（Pass/Fail）

必須条件を満たさない場合は即座にFail判定：

```typescript
// 品質ゲート条件
const QUALITY_GATE_CONDITIONS = {
  TS_ERRORS_MAX: 0, // TypeScriptエラー許容0
  LINT_ERRORS_MAX: 0, // ESLintエラー許容0
  COVERAGE_MIN: 80, // カバレッジ80%以上
  DUPLICATION_MAX: 3, // 重複率3%以下
};
```

#### 第2層: スコアリング（0-100点）

各メトリクスを正規化して加重平均で総合評価：

```typescript
// 重み配分
const SCORE_WEIGHTS = {
  maintainability: 0.25, // 保守性
  complexity_avg: 0.15, // 平均複雑度
  complexity_max: 0.05, // 最大複雑度
  duplication: 0.1, // 重複率
  coverage: 0.15, // カバレッジ
  ts_errors: 0.06, // TypeScriptエラー
  lint_errors: 0.04, // ESLintエラー
  build_time: 0.1, // ビルド時間
  bundle_size: 0.1, // バンドルサイズ
};
```

## ヘルススコア算出

### スコア算出アルゴリズム

#### 1. 正規化関数

各メトリクスを0-100のスコアに変換：

**カバレッジの正規化**:

```
50%以下 → 0点
50-80% → 線形補間で0-80点
80-90% → 線形補間で80-90点
90-100% → 線形補間で90-100点
```

**複雑度の正規化**:

```
CC ≤ 5 → 100点（A評価）
5 < CC ≤ 10 → 80点（B評価）
10 < CC ≤ 15 → 60点（C評価）
15 < CC ≤ 20 → 40点（D評価）
20 < CC ≤ 30 → 20点（E評価）
CC > 30 → 0点（F評価）
```

#### 2. 総合スコア計算

```typescript
// 総合ヘルススコア計算
healthScore = Σ(weight[i] × normalizedScore[i])

// ゲート失敗時のキャップ
if (gateStatus === 'FAIL') {
  healthScore = Math.min(healthScore, 59);
}
```

### スコアの解釈

| スコア範囲 | 評価      | 意味                   |
| ---------- | --------- | ---------------------- |
| 80-100     | Excellent | 高品質で保守性が高い   |
| 60-79      | Good      | 許容可能、一部改善推奨 |
| 40-59      | Fair      | 重要な改善が必要       |
| 0-39       | Poor      | 緊急の対応が必要       |

## CI/CD統合

### GitHub Actionsワークフロー

#### 1. メトリクス計測ワークフロー（`.github/workflows/metrics.yml`）

```yaml
jobs:
  metrics:
    # メトリクス収集と品質ゲートチェック
    - pnpm metrics:build
    - pnpm metrics:bundle
    - pnpm quality:check

  lighthouse:
    # Lighthouseによるパフォーマンス測定
    - pnpm lighthouse:collect
    - pnpm lighthouse:assert

  quality-summary:
    # 統合レポート生成とPRコメント投稿
    - pnpm quality:report
```

#### 2. コード品質ワークフロー（`.github/workflows/code-quality.yml`）

- 週次定期実行（毎週月曜日00:00 UTC）
- PR作成時の自動実行
- 詳細な品質分析レポート生成

### PRへの自動フィードバック

PRには以下の情報が自動的にコメントされます：

```markdown
## 📊 統合品質レポート

**総合ヘルススコア: 85/100** ✅

### ⚡ パフォーマンス

- ビルド時間: 2m 30s ✅ (< 5m)
- バンドルサイズ: 180KB ⚠️ (目標: < 150KB)

### 🎯 コード品質

- TypeScriptエラー: 0 ✅
- 平均複雑度: 4.3 ✅ (優秀レベル)
- テストカバレッジ: 82% ✅

### 📈 改善提案

1. バンドルサイズを削減してください（現在: 180KB → 目標: 150KB）
2. `src/utils/parser.ts`の複雑度を下げてください（現在: 15 → 推奨: 10以下）
```

## 実装詳細

### ディレクトリ構造

```
scripts/
├── constants/
│   └── quality-metrics.ts    # 全閾値・定数の定義
├── measure-metrics.ts         # メトリクス計測
├── quality-gate.ts           # 品質ゲートチェック
├── report-metrics.ts         # レポート生成
├── code-quality-analysis.ts  # コード品質分析
└── unified-quality-report.ts # 統合レポート生成

metrics/
├── latest.json               # 最新メトリクス
├── code-quality-latest.json  # 最新コード品質
└── unified-report.md         # 統合レポート
```

### 主要スクリプト

#### measure-metrics.ts

- ビルド時間、バンドルサイズを計測
- 結果をJSON形式で保存
- GitHub Actions環境変数への出力

#### quality-gate.ts

- 品質基準のチェック
- Pass/Fail判定
- 詳細な失敗理由の出力

#### code-quality-analysis.ts

- ESLintCCによる複雑度分析
- 保守性指数の計算
- ファイル別の詳細分析

#### unified-quality-report.ts

- 全メトリクスの統合
- ヘルススコア算出
- Markdownレポート生成

## 開発者ガイド

### ローカルでの使用方法

#### 基本的な品質チェック

```bash
# 全メトリクスを計測
pnpm metrics

# 品質ゲートチェック
pnpm quality:check

# 統合レポート生成
pnpm quality:report

# すべてを実行
pnpm quality:full
```

#### 個別メトリクスの計測

```bash
# ビルド時間のみ
pnpm metrics:build

# バンドルサイズのみ
pnpm metrics:bundle

# コード品質分析のみ
pnpm quality:analyze

# Lighthouse測定
pnpm lighthouse
```

### 閾値のカスタマイズ

すべての閾値は`scripts/constants/quality-metrics.ts`で管理されています：

```typescript
// 閾値を変更する場合
export const COMPLEXITY_THRESHOLDS = {
  INDIVIDUAL: {
    WARNING: 15, // この値を変更
    MAXIMUM: 20, // この値を変更
  },
};
```

変更後は以下で確認：

```bash
pnpm quality:analyze
pnpm quality:check
```

### トラブルシューティング

#### メトリクス計測が失敗する場合

1. 依存関係の確認

```bash
pnpm install
```

2. ビルドの成功確認

```bash
pnpm build
```

3. 個別チェックで問題特定

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage
```

#### Lighthouseが失敗する場合

1. ポート3000の確認

```bash
lsof -i :3000
```

2. 本番ビルドの確認

```bash
pnpm build
pnpm start
```

### ベストプラクティス

#### コード複雑度を下げる方法

1. **早期リターンの活用**

```typescript
// 悪い例
function process(data) {
  if (data) {
    if (data.valid) {
      // 処理
    }
  }
}

// 良い例
function process(data) {
  if (!data) return;
  if (!data.valid) return;
  // 処理
}
```

2. **関数の分割**

```typescript
// 悪い例
function complexFunction() {
  // 100行のコード
}

// 良い例
function mainFunction() {
  const step1 = processStep1();
  const step2 = processStep2(step1);
  return finalizeProcess(step2);
}
```

3. **ポリモーフィズムの活用**

```typescript
// 悪い例
if (type === 'A') {
  /* 処理A */
} else if (type === 'B') {
  /* 処理B */
} else if (type === 'C') {
  /* 処理C */
}

// 良い例
const handlers = {
  A: handleTypeA,
  B: handleTypeB,
  C: handleTypeC,
};
handlers[type]?.();
```

#### バンドルサイズ最適化

1. **動的インポートの活用**

```typescript
// 重いライブラリを遅延読み込み
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

2. **Tree Shakingの確認**

```typescript
// 名前付きインポートを使用
import { specific } from 'library'; // ✅
import * as all from 'library'; // ❌
```

3. **バンドル分析**

```bash
ANALYZE=true pnpm build
```

### 継続的改善のサイクル

1. **現状把握**: `pnpm quality:report`で現在の品質を確認
2. **目標設定**: 改善すべきメトリクスを特定
3. **改善実施**: リファクタリングや最適化を実行
4. **効果測定**: 再度メトリクスを計測して効果を確認
5. **標準化**: 改善内容をチーム全体で共有

## 今後の拡張計画

### 短期計画

- [ ] メトリクス履歴のグラフ化
- [ ] Slack/Teams通知の実装
- [ ] カスタムメトリクスの追加

### 中期計画

- [ ] AIによる改善提案の自動生成
- [ ] チーム別の品質目標設定
- [ ] メトリクスダッシュボードの実装

### 長期計画

- [ ] 機械学習による品質予測
- [ ] 自動リファクタリング提案
- [ ] 品質とビジネス指標の相関分析

## 参考文献

- [ISO/IEC 25010 - Software Quality Model](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- [McCabe, T. J. (1976). "A Complexity Measure"](https://ieeexplore.ieee.org/document/1702388)
- [SonarQube Quality Gates Documentation](https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates/)
- [Google Core Web Vitals](https://web.dev/vitals/)
- [Microsoft Code Metrics Values](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- [CRAP Metric - Change Risk Analysis and Predictions](http://www.artima.com/weblogs/viewpost.jsp?thread=210575)
