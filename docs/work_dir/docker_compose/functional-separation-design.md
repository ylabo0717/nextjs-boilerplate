# CI/CDワークフロー機能別分離設計書

> **作成日**: 2025-08-20  
> **関連文書**: [CI/CDワークフロー分析レポート](./ci-workflow-analysis.md)  
> **目的**: docker-tests.yml (378行) を機能別に分離し、保守性と可読性を向上

## 🎯 設計目標

### 主要目標
1. **378行の単一ファイルを3-4個の機能別ファイルに分離**
2. **重複ロジックを30%削減** (共通Actionの活用)
3. **デバッグ効率を向上** (機能別の明確化)
4. **実行時間維持** (並列性を損なわない)

### 非機能要件
- 既存の実行時間を悪化させない
- CI/CD全体の安定性を保持
- トリガー条件と依存関係を維持

## 📁 新しいワークフロー構成

### 分離後のファイル構成

```
.github/
├── workflows/
│   ├── docker-unit-tests.yml          # 新規 (~80行)
│   ├── docker-integration-tests.yml   # 新規 (~90行) 
│   ├── docker-e2e-tests.yml          # 新規 (~100行)
│   ├── docker-quality-gate.yml       # 新規 (~60行)
│   └── docker-tests.yml              # 削除対象
└── actions/                           # 新規ディレクトリ
    ├── setup-docker-test-env/         # 共通Action
    │   ├── action.yml
    │   └── README.md
    └── docker-cleanup/                # 共通Action
        ├── action.yml
        └── README.md
```

### 機能別分離の詳細設計

#### 1. `docker-unit-tests.yml` (対象: Unit Tests)

**責務:**
- Docker環境でのUnit Tests実行
- 最も軽量で高速なテスト

**実行条件:**
```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'tests/unit/**'
      - 'tests/lib/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'vitest.*.config.ts'
      - 'docker/app/**'
      - 'docker-compose.test.yml'
  pull_request:
    branches: [main, develop]
    paths: [同上]
```

**ジョブ構成:**
```yaml
jobs:
  docker-unit-tests:
    name: Docker Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-docker-test-env
        with:
          test-type: 'unit'
      - name: Run Unit Tests
        run: docker compose -f docker-compose.test.yml run --rm app-test pnpm test:unit
      - uses: ./.github/actions/docker-cleanup
```

#### 2. `docker-integration-tests.yml` (対象: Integration Tests)

**責務:**
- Testcontainers統合テスト
- 外部依存サービス（Redis、DB等）を含むテスト

**実行条件:**
```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'tests/integration/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'vitest.*.config.ts'
      - 'docker/**'
      - 'docker-compose.test.yml'
  pull_request:
    branches: [main, develop]
    paths: [同上]
```

**特殊設定:**
```yaml
- name: Setup Testcontainers environment
  run: |
    echo "TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal" >> .env.local
    echo "DOCKER_HOST=unix:///var/run/docker.sock" >> .env.local
```

#### 3. `docker-e2e-tests.yml` (対象: E2E Tests)

**責務:**
- Docker環境でのPlaywright E2Eテスト
- マルチブラウザ対応

**マトリックス戦略:**
```yaml
strategy:
  matrix:
    browser: [chromium, firefox]
  fail-fast: false
```

**アプリケーションサーバー管理:**
```yaml
jobs:
  start-app-server:
    name: Start Application Server
    # アプリサーバーの起動と準備確認
    
  e2e-tests:
    name: E2E Tests
    needs: start-app-server
    strategy:
      matrix:
        browser: [chromium, firefox]
    # ブラウザ別テスト実行
```

#### 4. `docker-quality-gate.yml` (対象: Quality Gate)

**責務:**
- 全Docker testの結果統合
- 品質ゲート判定
- 結果レポート生成

**依存関係:**
```yaml
on:
  workflow_run:
    workflows: 
      - "Docker Unit Tests"
      - "Docker Integration Tests"  
      - "Docker E2E Tests"
    types: [completed]
```

**品質判定ロジック:**
```yaml
jobs:
  quality-gate:
    name: Docker Quality Gate
    runs-on: ubuntu-latest
    steps:
      - name: Get workflow results
        # GitHub API経由で各ワークフローの結果取得
      - name: Quality assessment
        # 包括的な品質判定
      - name: Generate report
        # 統合レポート生成
```

## 🔧 共通Action設計

### 1. `setup-docker-test-env` Action

**ファイル:** `.github/actions/setup-docker-test-env/action.yml`

```yaml
name: 'Setup Docker Test Environment'
description: 'Setup standardized Docker test environment'

inputs:
  test-type:
    description: 'Type of test (unit|integration|e2e)'
    required: true
  enable-testcontainers:
    description: 'Enable Testcontainers configuration'
    required: false
    default: 'false'

runs:
  using: 'composite'
  steps:
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Setup base environment
      shell: bash
      run: |
        cp .env.base.example .env.base
        cp .env.test.example .env.test
        cp .env.test .env.local
        
    - name: Configure for Testcontainers
      if: inputs.enable-testcontainers == 'true'
      shell: bash
      run: |
        echo "DOCKER_HOST=unix:///var/run/docker.sock" >> .env.local
        echo "TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal" >> .env.local
        
    - name: Create test directories
      shell: bash
      run: |
        mkdir -p test-results coverage playwright-report
```

### 2. `docker-cleanup` Action

**ファイル:** `.github/actions/docker-cleanup/action.yml`

```yaml
name: 'Docker Environment Cleanup'
description: 'Clean up Docker containers and volumes'

inputs:
  cleanup-level:
    description: 'Cleanup level (basic|full)'
    required: false
    default: 'basic'

runs:
  using: 'composite'
  steps:
    - name: Stop and remove containers
      shell: bash
      run: |
        docker compose -f docker-compose.test.yml down -v
        
    - name: Full system cleanup
      if: inputs.cleanup-level == 'full'
      shell: bash
      run: |
        docker system prune -f
        docker volume prune -f
```

## 🔄 ワークフロー間連携

### 1. Sequential Execution Pattern

**従来のパターン (単一ワークフロー内):**
```yaml
jobs:
  unit-tests: ...
  integration-tests:
    needs: [unit-tests]
  e2e-tests:
    needs: [integration-tests]
```

**新しいパターン (ワークフロー間):**
```yaml
# workflow_dispatch または workflow_run を活用
on:
  workflow_run:
    workflows: ["Docker Unit Tests"]
    types: [completed]
    branches: [main, develop]
```

### 2. Parallel Execution Pattern

**高速化のための並列実行:**
- Unit Tests と Integration Tests は並列実行可能
- E2E Tests は他の完了を待たずに並列実行
- Quality Gate のみ全ての完了を待機

### 3. Artifact Sharing

**ワークフロー間でのアーティファクト共有:**

```yaml
# テスト結果の保存
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: docker-unit-test-results-${{ github.sha }}
    path: test-results/

# 他ワークフローでの取得
- name: Download test results
  uses: actions/download-artifact@v4
  with:
    name: docker-unit-test-results-${{ github.sha }}
    path: test-results/
```

## 📊 期待効果

### 定量的効果

| 項目 | 現在 | 分離後 | 改善率 |
|------|------|--------|--------|
| ファイル行数 | 378行 | 80+90+100+60=330行 | -13% |
| 重複ロジック | ~88行 | ~30行 | -66% |
| デバッグ範囲 | 378行全体 | 80-100行範囲 | -70% |
| 並列実行ジョブ数 | 6ジョブ | 8-10ジョブ | +33% |

### 定性的効果

1. **保守性向上**
   - 機能別の独立性
   - 変更影響範囲の限定
   - 専門性に応じた担当分け

2. **デバッグ効率**
   - エラー箇所の特定迅速化
   - ログ分析の簡素化
   - 部分的な再実行容易性

3. **チーム開発効率**
   - 並行開発の競合減少
   - レビュー範囲の明確化
   - 専門知識の分散

## ⚠️ リスクと対策

### 主要リスク

1. **ワークフロー間連携の複雑化**
   - **対策**: workflow_run の適切な設計
   - **モニタリング**: 実行順序と依存関係の監視

2. **実行時間の増加可能性**
   - **対策**: 並列実行の最適化
   - **モニタリング**: 実行時間計測とベンチマーク

3. **アーティファクト管理の複雑化**
   - **対策**: 命名規則の統一化
   - **モニタリング**: ストレージ使用量の監視

### 移行リスク

1. **一時的な不安定性**
   - **対策**: 段階的移行 (feature flag利用)
   - **ロールバック**: 従来版の並行保持

2. **CI/CD全体への影響**
   - **対策**: 十分なテスト期間確保
   - **監視**: メインブランチでの慎重な検証

## 📋 次のステップ

1. **[実装計画書](./implementation-plan.md)** の作成
2. **Proof of Concept** の実装
3. **段階的ロールアウト** の実行

---

**関連文書:**
- [CI/CDワークフロー分析レポート](./ci-workflow-analysis.md)
- [実装計画書](./implementation-plan.md) (次回作成予定)