# コード品質評価基準の業界標準

## 推奨する評価基準

### 1. **SonarQube方式（最も推奨）** ⭐️

SonarQubeは最も広く採用されている静的解析ツールで、明確な根拠に基づいた評価基準を持っています。

#### 評価基準

```
A評価: 技術的負債比率 < 5%
B評価: 技術的負債比率 < 10%
C評価: 技術的負債比率 < 20%
D評価: 技術的負債比率 < 50%
E評価: 技術的負債比率 >= 50%
```

#### メトリクス閾値

- **複雑度**: 循環的複雑度 10以下
- **重複**: 3%未満
- **カバレッジ**: 80%以上（新規コード）
- **保守性**: 技術的負債時間で評価

**ソース**:

- [SonarQube Metric Definitions](https://docs.sonarqube.org/latest/user-guide/metric-definitions/)
- [SonarQube Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)

---

### 2. **Code Climate方式**

GitHub連携で人気のCode Climateの評価方式。

#### 技術的負債評価

```javascript
// 技術的負債比率 = 修正時間 / 開発時間
const debtRatio = remediationTime / developmentTime;

// グレード計算
if (debtRatio <= 0.05) return 'A'; // 5%以下
if (debtRatio <= 0.1) return 'B'; // 10%以下
if (debtRatio <= 0.2) return 'C'; // 20%以下
if (debtRatio <= 0.5) return 'D'; // 50%以下
return 'F';
```

#### 複雑度評価

- **認知的複雑度**: 5以下が理想、15以上は要リファクタリング
- **メソッド長**: 25行以下
- **クラス長**: 250行以下

**ソース**:

- [Code Climate Maintainability](https://docs.codeclimate.com/docs/maintainability)
- [Cognitive Complexity White Paper](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)

---

### 3. **Microsoft/Visual Studio方式**

保守性インデックス（MI）による評価。

#### 保守性インデックス計算式

```
MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
```

#### 評価基準

- **90-100**: 高い保守性（緑）
- **70-89**: 中程度の保守性（黄）
- **0-69**: 低い保守性（赤）

**ソース**:

- [Visual Studio Code Metrics](https://docs.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- [Maintainability Index Range and Meaning](https://blogs.msdn.microsoft.com/codeanalysis/2007/11/20/maintainability-index-range-and-meaning/)

---

### 4. **Google Engineering Practices**

Googleの社内基準（一部公開）。

#### テストカバレッジ

- **80%以上**: 推奨（ただし100%は追求しない）
- **60-80%**: 許容範囲
- **60%未満**: 改善必要

#### コードレビュー基準

- 関数は1つの責務のみ
- 複雑度は10以下
- ファイルは400行以下

**ソース**:

- [Google Testing Blog](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)
- [Google Engineering Practices](https://google.github.io/eng-practices/)

---

## 実装の推奨順位

### 🥇 **1位: SonarQube方式を採用**

**理由**:

- 最も広く採用されている業界標準
- 学術研究に基づいた明確な根拠
- 多くの言語・フレームワークに対応
- CI/CDとの統合が容易

### 🥈 **2位: ハイブリッドアプローチ**

SonarQubeベースに、プロジェクト特性に応じて調整:

```typescript
// 推奨する重み付け
const METRIC_WEIGHTS = {
  RELIABILITY: 0.3, // バグの可能性（SonarQube）
  SECURITY: 0.25, // セキュリティ問題（SonarQube）
  MAINTAINABILITY: 0.25, // 保守性（SonarQube + MS）
  COVERAGE: 0.1, // テストカバレッジ（Google）
  DUPLICATION: 0.1, // 重複コード（SonarQube）
};
```

### 🥉 **3位: シンプルな3段階評価**

小規模プロジェクト向け:

```typescript
// シンプルな評価基準
const getGrade = (score: number): string => {
  if (score >= 80) return '良好 ✅';
  if (score >= 60) return '要改善 ⚠️';
  return '問題あり ❌';
};
```

---

## 実装例

```typescript
/**
 * SonarQube方式に基づいた実装
 * https://docs.sonarqube.org/latest/user-guide/metric-definitions/
 */
export class SonarQubeBasedScoring {
  private static readonly DEBT_THRESHOLDS = {
    A: 0.05, // 5%
    B: 0.1, // 10%
    C: 0.2, // 20%
    D: 0.5, // 50%
  };

  /**
   * 技術的負債比率を計算
   * @param remediationCost 修正にかかる推定時間（分）
   * @param developmentCost 開発にかかった時間（分）
   */
  static calculateDebtRatio(remediationCost: number, developmentCost: number): number {
    if (developmentCost === 0) return 0;
    return remediationCost / developmentCost;
  }

  /**
   * 循環的複雑度から修正コストを推定
   * SonarQubeのデフォルト: 複雑度1につき30分
   */
  static estimateComplexityCost(complexity: number): number {
    const MINUTES_PER_COMPLEXITY = 30;
    const threshold = 10;
    return Math.max(0, complexity - threshold) * MINUTES_PER_COMPLEXITY;
  }

  /**
   * 重複コードの修正コストを推定
   * SonarQubeのデフォルト: 重複ブロック1つにつき120分
   */
  static estimateDuplicationCost(duplicatedBlocks: number): number {
    const MINUTES_PER_BLOCK = 120;
    return duplicatedBlocks * MINUTES_PER_BLOCK;
  }

  /**
   * 総合評価を計算
   */
  static calculateRating(debtRatio: number): string {
    if (debtRatio <= this.DEBT_THRESHOLDS.A) return 'A';
    if (debtRatio <= this.DEBT_THRESHOLDS.B) return 'B';
    if (debtRatio <= this.DEBT_THRESHOLDS.C) return 'C';
    if (debtRatio <= this.DEBT_THRESHOLDS.D) return 'D';
    return 'E';
  }
}
```

---

## 参考文献

1. **Cyclomatic Complexity** (McCabe, 1976)
   - [Original Paper](https://www.literateprogramming.com/mccabe.pdf)
   - 推奨値: 10以下

2. **Cognitive Complexity** (SonarSource, 2017)
   - [White Paper](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)
   - 循環的複雑度の改良版

3. **Technical Debt** (Cunningham, 1992)
   - [Original Wiki](http://wiki.c2.com/?TechnicalDebt)
   - 技術的負債の概念の起源

4. **Code Smells** (Fowler, 1999)
   - [Refactoring Book](https://refactoring.com/)
   - コードの品質問題パターン

5. **Clean Code** (Martin, 2008)
   - ファイルサイズ、関数長の推奨値
   - 200-500行/ファイル、20行/関数

---

## 結論

**SonarQube方式を採用することを強く推奨します。**

理由:

1. ✅ 業界標準として最も広く採用
2. ✅ 明確な学術的根拠
3. ✅ 継続的な更新と改善
4. ✅ 多言語サポート
5. ✅ CI/CD統合が容易
6. ✅ 豊富なドキュメント

次点でCode Climate方式も良い選択肢ですが、SonarQubeの方がオープンで透明性が高いです。
