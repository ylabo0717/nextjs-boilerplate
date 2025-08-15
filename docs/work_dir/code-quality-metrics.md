# Code Quality Metrics Documentation

## Overview

This project implements comprehensive code quality analysis using ESLint plugins for TypeScript/JavaScript static analysis. The system measures complexity, maintainability, duplication, and other quality metrics without relying on external paid services.

## Available Metrics

### 1. **Complexity Metrics** 🧩

- **Cyclomatic Complexity**: Measures the number of independent paths through code
- **Cognitive Complexity**: Measures how difficult code is to understand
- **Maximum Complexity**: Highest complexity value in the codebase
- **Average Complexity**: Mean complexity across all files

### 2. **Maintainability Metrics** 🏗️

- **Maintainability Index**: Score from 0-100 (higher is better)
- **Rating**: Letter grade (A-F) based on maintainability
- **Technical Debt**: Estimated time to fix issues

### 3. **Code Quality Indicators** 🎯

- **TypeScript Errors**: Type safety violations
- **ESLint Errors**: Code standard violations
- **ESLint Warnings**: Non-critical issues
- **Test Coverage**: Percentage of code covered by tests

### 4. **File Metrics** 📁

- **Lines of Code**: Average and maximum per file
- **Large Files**: Files exceeding 300 lines
- **File Count**: Total files analyzed

### 5. **Duplication Metrics** 🔄

- **Duplicate Strings**: Repeated string literals
- **Duplicate Functions**: Similar code blocks
- **Duplication Percentage**: Estimated duplicate code ratio

## Tools and Plugins

### ESLint Plugins

1. **eslint-plugin-sonarjs**
   - Detects code smells and complexity issues
   - Rules for cognitive complexity, duplicate code, and more
   - Configuration in `eslint.config.mjs`

2. **eslint-plugin-jsdoc**
   - Ensures proper documentation
   - Validates JSDoc comments
   - Checks parameter and return descriptions

3. **eslint-plugin-unicorn**
   - Modern JavaScript best practices
   - Performance optimizations
   - Consistent code patterns

## Usage

### Local Analysis

```bash
# Run complete code quality analysis
pnpm quality:analyze

# Generate unified quality report
pnpm quality:report

# Run both analysis and report
pnpm quality:full
```

### Available Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pnpm quality:analyze` | Run ESLint-based complexity analysis |
| `pnpm quality:report`  | Generate unified quality report      |
| `pnpm quality:full`    | Run analysis and generate report     |
| `pnpm quality:check`   | Basic quality gate checks            |
| `pnpm lint`            | Run ESLint with all plugins          |

## Quality Thresholds

### Recommended Limits

| Metric                | Good  | Warning | Error |
| --------------------- | ----- | ------- | ----- |
| Cyclomatic Complexity | < 5   | 5-10    | > 10  |
| Cognitive Complexity  | < 10  | 10-15   | > 15  |
| Maintainability Index | > 85  | 70-85   | < 70  |
| File Length           | < 200 | 200-300 | > 300 |
| Function Length       | < 20  | 20-50   | > 50  |
| Duplicate Strings     | 0     | 1-3     | > 3   |

### Where thresholds are defined

- Central definition: `scripts/constants/quality-metrics.ts`
  - `COMPLEXITY_LEVELS`: A–F with human‑readable descriptions (e.g., "Dangerous - Must be refactored")
  - `COMPLEXITY_THRESHOLDS`: Warning and maximum thresholds (individual/average)
  - `ESLINTCC_RANKS`, `ESLINT_COMPLEXITY_RULES`: ESLint settings used by analysis scripts

Notes:

- The table "Recommended Limits" shows suggested values. The enforced Quality Gate thresholds are driven by `COMPLEXITY_THRESHOLDS`.
- Analysis scripts run ESLint with `ESLINT_COMPLEXITY_RULES`, independently from the repo‑wide ESLint config.

### ESLint Configuration

Current settings (can be adjusted in `eslint.config.mjs`):

```javascript
'sonarjs/cognitive-complexity': ['warn', 15],  // Cognitive complexity limit
'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],    // Max duplicate strings
'sonarjs/no-identical-functions': 'error',     // No duplicate functions
```

In-script ESLint settings (used by analysis scripts):

- Source: `scripts/constants/quality-metrics.ts`
  - `scripts/code-quality-analysis.ts` consumes `ESLINT_COMPLEXITY_RULES` and `ESLINTCC_RANKS`.
  - Lets you tune complexity rules for analysis without changing the global ESLint config.

How to update thresholds:

1. Edit `scripts/constants/quality-metrics.ts` (e.g., change individual MAX from 20 → 18)
1. Verify locally:

```bash
pnpm quality:analyze && pnpm quality:report
pnpm quality:check
```

1. CI Quality Gate evaluation uses `scripts/quality-gate.ts` and reads from `COMPLEXITY_THRESHOLDS`.

## Reports

### 1. JSON Metrics

- **Location**: `metrics/code-quality-latest.json`
- **Contents**:
  - Raw metrics data
  - Detailed file analysis
  - Timestamp and history

### 2. Unified Quality Report

- **Location**: `metrics/unified-report.md`
- **Contents**:
  - Combined metrics from all sources
  - Health score (0-100)
  - Actionable recommendations
  - Markdown format for easy reading

## GitHub Actions Integration

### Automated Analysis

The `code-quality.yml` workflow runs:

- **Weekly**: Every Monday at 00:00 UTC
- **On PR**: When code changes are pushed
- **Manual**: Via workflow dispatch

Features:

- Automatic PR comments with quality report
- Issue creation for critical problems (health score < 60)
- Artifact storage of reports
- GitHub summary generation

### PR Comment Example

```markdown
📊 Unified Quality Report

Overall Health Score: 85/100 ✅

Performance Metrics:

- Build Time: 2m 30s ✅
- Bundle Size: 3.2 MB ✅

Code Quality:

- TypeScript Errors: 0 ✅
- Maintainability: 82.5 (B) ✅
- Avg Complexity: 4.3 ✅

Recommendations:

- ✅ Code quality is excellent!
```

## Interpreting Results

### Health Score

The overall health score (0-100) indicates:

- **80-100**: Excellent - High quality, well-maintained code
- **60-79**: Good - Acceptable quality with some improvements needed
- **40-59**: Fair - Significant improvements recommended
- **0-39**: Poor - Immediate attention required

### Complexity Guidelines

**Cyclomatic Complexity**:

- **1-4**: Simple, easy to test
- **5-7**: Moderate, still manageable
- **8-10**: Complex, consider refactoring
- **>10**: Too complex, should be refactored

**Cognitive Complexity**:

- **1-5**: Easy to understand
- **6-10**: Requires some attention
- **11-15**: Difficult to understand
- **>15**: Very difficult, needs refactoring

### Maintainability Index

- **100-90**: Highly maintainable (A)
- **89-80**: Moderately maintainable (B)
- **79-70**: Somewhat maintainable (C)
- **69-60**: Difficult to maintain (D)
- **<60**: Very difficult to maintain (F)

## Best Practices

### Improving Complexity

1. **Extract Functions**: Break large functions into smaller ones
2. **Early Returns**: Use guard clauses to reduce nesting
3. **Simplify Conditionals**: Use lookup tables or polymorphism
4. **Remove Duplication**: Extract common code to shared functions

### Improving Maintainability

1. **Add Documentation**: Write clear JSDoc comments
2. **Use Descriptive Names**: Make code self-documenting
3. **Keep Files Small**: Split large modules
4. **Follow Patterns**: Use consistent coding patterns

### Example Refactoring

**Before** (High Complexity):

```javascript
function processData(data) {
  if (data) {
    if (data.type === 'A') {
      if (data.value > 100) {
        // process A high
      } else {
        // process A low
      }
    } else if (data.type === 'B') {
      // process B
    }
  }
}
```

**After** (Low Complexity):

```javascript
function processData(data) {
  if (!data) return;

  const processors = {
    A: processTypeA,
    B: processTypeB,
  };

  const processor = processors[data.type];
  if (processor) processor(data);
}

function processTypeA(data) {
  return data.value > 100 ? processHighValue(data) : processLowValue(data);
}
```

## Troubleshooting

### Common Issues

1. **ESLint complexity warnings**
   - Review flagged files for refactoring opportunities

2. **Low maintainability scores**
   - Add JSDoc comments
   - Reduce file size
   - Simplify complex logic

3. **High duplication percentage**
   - Extract common code to utility functions
   - Use configuration objects for repeated patterns
   - Consider creating reusable components

## Future Improvements

- [ ] Integration with VS Code for real-time feedback
- [ ] Historical trend charts
- [ ] Team-specific quality goals
- [ ] Automated refactoring suggestions
- [ ] Performance impact analysis
- [ ] Advanced TypeScript-specific metrics

## Health Score（科学的根拠と算出）

このリポジトリのヘルススコア（0–100）は、以下の原則と一次情報に基づいて設計しています。

### 1. 設計原則（根拠）

- 品質モデル: ISO/IEC 25010の品質特性（特に「Maintainability」「Performance efficiency」）を採用し、評価視点と重み付けに反映。
- Quality Gateの意味論: SonarQubeのQuality Gateは条件の満たす/満たさないを二値で判定し、スコアで相殺しない運用が標準。
- 維持性指標: MicrosoftのMaintainability Index（0–100）を第一級指標として採用可能な場合は直接活用。
- 複雑度×テストの相互作用: CRAPメトリクスの知見（高複雑度×低カバレッジは変更リスクを増大）を関数形や勾配に反映。

参考:

- ISO/IEC 25010（品質特性）
- SonarQube Quality Gate（推奨条件: Coverage≥80%、Duplication≤3%、重大Issue 0）
- Microsoft Maintainability Index の式と閾値帯
- CRAP: Change Risk Analysis and Predictions

### 2. 二層型モデル

1. Quality Gate（バイナリ判定）

- 重大不具合同等: TypeScript Errors>0 または ESLint Errors>0 → Fail
- Coverage<80% → Fail
- Duplication>3% → Fail

2. 正規化スコアの加重和（0–100）

- 各メトリクスを0–100に正規化し、加重平均で集約。

### 3. 正規化の例（0–100）

- Maintainability Index: そのまま0–100（取得不可時は複雑度に重み再配分）
- 平均複雑度（CC avg）: 5→100, 10→80, 15→60, 20→40, 30→20, >30→0 の区分線形
- 最大複雑度（CC max）: 20超を段階的に減点（上限リスク抑制）
- 重複率（%）: 0→100, 3→95, 10→60, 20→30, ≥30→0 の区分線形
- カバレッジ（%）: 80%で強い勾配（50→0, 80→80, 90→90, 100→100）
- TypeScript Errors: 0→100、>0は非線形で急減（信号的）
- ESLint Errors: 0→100、>0で穏やかに減点
- ESLint Warnings: 10件超過分のみ緩やかに減点
- Build Time: 目標（例: ≤2分）→100、最大（5分）→0 の線形
- Bundle Size: 目標（5MB）→100、最大（100MB）→0 の線形

注: 具体的しきい値は `scripts/constants/quality-metrics.ts` に集約。

### 3.1 正規化ブレークポイントとターゲットスコア（実装準拠）

実装はすべて `scripts/constants/quality-metrics.ts` の定数に依存します。ここに採用根拠と対応関係を明示します。

#### Coverage（テストカバレッジ）

- 定数:
  - `QUALITY_GATE_CONDITIONS.COVERAGE_MIN = 80`（Gate閾値）
  - `SCORING_CONSTANTS.COVERAGE_BREAKPOINTS = { ZERO: 50, GOOD: 80, GREAT: 90 }`
  - `SCORING_CONSTANTS.COVERAGE_SCORES = { AT_GOOD: 80, AT_GREAT: 90, AT_MAX: 100 }`
- 根拠: 80%は業界標準（Sonar Way）を参照。50%未満は品質信号として0点域に抑える。80–90–100の3段階は「改善余地→優良→最上位」を示す。
- 区分線形マッピング:

| Coverage% 区間 | 出力スコア |
| -------------- | ---------- |
| ≤ 50           | 0          |
| 50–80          | 0→80       |
| 80–90          | 80→90      |
| 90–100         | 90→100     |

Mermaid 可視化（参考）:

```mermaid
%%{init: { 'theme': 'neutral' } }%%
xychart-beta
  title "Coverage normalization"
  x-axis "Coverage %" 0 --> 100
  y-axis "Score" 0 --> 100
  line [0,0],[50,0],[80,80],[90,90],[100,100]
```

#### 平均循環的複雑度（CC avg）

- 定数:
  - ブレークポイント: `SCORING_CONSTANTS.CC_AVG_BREAKPOINTS` = 5(A), 10(B), 15(C), 20(D), 30(E)
  - スコア: `SCORING_CONSTANTS.CC_AVG_SCORES` = 100(A), 80(B), 60(C), 40(D), 20(E)
- 根拠: A–Fの等級（`COMPLEXITY_LEVELS`）に整合。複雑度が高まるほど段階的に減点し、>30 は 0 に漸近。
- 区分線形マッピング:

| CC avg 区間 | 出力スコア |
| ----------- | ---------- |
| ≤ 5         | 100        |
| 5–10        | 100→80     |
| 10–15       | 80→60      |
| 15–20       | 60→40      |
| 20–30       | 40→20      |
| > 30        | 0          |

```mermaid
%%{init: { 'theme': 'neutral' } }%%
xychart-beta
  title "CC avg normalization"
  x-axis "CC avg" 0 --> 35
  y-axis "Score" 0 --> 100
  line [0,100],[5,100],[10,80],[15,60],[20,40],[30,20],[35,0]
```

#### 最大循環的複雑度（CC max）

- 定数:
  - Gate上限: `COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM = 20`
  - ペナルティ範囲: `SCORING_CONSTANTS.MAX_COMPLEXITY_PENALTY_RANGE = 20`（20→40）
  - 最大減点: `SCORING_CONSTANTS.MAX_COMPLEXITY_MAX_DEDUCT = 60`（100→40）
- 根拠: 単一箇所の極端な複雑度はリスクだが、健康度の全体性を損なわないように勾配は限定（40 まで）。> MAX+範囲は 0。

| 条件  | 出力スコア     |
| ----- | -------------- |
| ≤ 20  | 100            |
| 20–40 | 100→40（線形） |
| > 40  | 0              |

#### 重複率（Duplication %）

- 定数:
  - プロジェクトしきい値: `UNIFIED_REPORT_THRESHOLDS.DUPLICATION_MAX = 10`
  - ブレークポイント: `SCORING_CONSTANTS.DUPLICATION_BREAKPOINTS = { MID: 10, HIGH: 20 }`
  - スコア: `SCORING_CONSTANTS.DUPLICATION_SCORES = { THRESHOLD: 95, MID: 60, HIGH: 30 }`
- 根拠: 0%は満点。しきい値（10%）で 95 点（「警告域入り」）。10–20%で急減（60→30）。20%以上は 0 に漸近。

| Dup% 区間 | 出力スコア           |
| --------- | -------------------- |
| = 0       | 100                  |
| 0–10      | 100→95               |
| 10–20     | 95→60→30（区分線形） |
| ≥ 20      | 0                    |

備考: Gateの二値判定は別途 `QUALITY_GATE_CONDITIONS.DUPLICATION_MAX = 3` を使用（全体コードの許容重複）。

#### Lint/TypeScript エラー・警告

- 対数減衰/線形ペナルティを定数化:
  - `SCORING_CONSTANTS.TS_ERROR_LOG_DECAY = 30`
  - `SCORING_CONSTANTS.LINT_ERROR_LOG_DECAY = 20`
  - `SCORING_CONSTANTS.LINT_WARNING_PENALTY = 2`（`UNIFIED_REPORT_THRESHOLDS.LINT_WARN_MAX = 10`超過分に適用）

### 3.2 定数→実装の対応表

- Coverage: `COVERAGE_BREAKPOINTS`/`COVERAGE_SCORES` + `QUALITY_GATE_CONDITIONS.COVERAGE_MIN`
- Avg Complexity: `CC_AVG_BREAKPOINTS`/`CC_AVG_SCORES`
- Max Complexity: `COMPLEXITY_THRESHOLDS.INDIVIDUAL.MAXIMUM` + `MAX_COMPLEXITY_PENALTY_RANGE` + `MAX_COMPLEXITY_MAX_DEDUCT`
- Duplication: `UNIFIED_REPORT_THRESHOLDS.DUPLICATION_MAX` + `DUPLICATION_BREAKPOINTS` + `DUPLICATION_SCORES`
- Lint/TS: `TS_ERROR_LOG_DECAY` / `LINT_ERROR_LOG_DECAY` / `LINT_WARNING_PENALTY` + `LINT_WARN_MAX`

### 4. 重み（合計=1.0）の例

- Maintainabilityブロック 0.55（MI 0.25、CC avg 0.15、CC max 0.05、Dup 0.10）
- テスト品質 0.15（Coverage）
- 静的不具合 0.10（TS Errors 0.06、ESLint Errors 0.04）
- パフォーマンス 0.20（Build 0.10、Bundle 0.10）

MI未取得時は、その重みをCC avgへ再配分します。

### 5. Gate Fail時のスコア処理（推奨: キャップ方式）

- 判定がFailのとき、healthScoreの上限を59にキャップします（例: min(raw, 59)）。
- Gateのバイナリ性（標準運用）を守りつつ、rawスコアは別途保存/可視化してトレンド分析に利用できます。

### 6. 将来のキャリブレーション

- 分位点正規化: リポ内の履歴分布（p10–p90）に基づいてスコアレンジを動的調整
- 目的適合: 障害/レビュー不合格率/投入工数との相関に基づく重み再学習（MCDA/回帰）
- 新規コード重視: 新規コードメトリクス取得後はSonar同様の「新規コード基準」へ移行

### 7. 出典

- ISO/IEC 25010（品質モデル）: [https://iso25000.com/index.php/en/iso-25000-standards/iso-25010](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- SonarQube Quality Gates: [https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates/](https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates/)
- Maintainability Index（Microsoft Docs）: [https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-maintainability-index-range-and-meaning)
- Code metrics values（Microsoft Docs）: [https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values](https://learn.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- CRAP metric（Artima）: [http://www.artima.com/weblogs/viewpost.jsp?thread=210575](http://www.artima.com/weblogs/viewpost.jsp?thread=210575)
