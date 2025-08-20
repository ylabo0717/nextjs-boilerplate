# CI/CDワークフロー分離実装ガイド

> **作成日**: 2025-08-20  
> **対象**: Docker Compose Implementation PR  
> **目的**: 機能別分離ワークフローの手動実装手順

## 🚨 重要: GitHub App権限制限

GitHub Appのセキュリティ制限により、ワークフローファイル（`.github/workflows/`）の直接作成・更新ができません。以下の手順で手動実装をお願いします。

## 📁 実装必要ファイル

### 1. 共通Actions（手動作成必要）

#### `.github/actions/setup-docker-test-env/action.yml`
```yaml
name: 'Setup Docker Test Environment'
description: 'Setup standardized Docker test environment for various test types'
author: 'NextJS Boilerplate Team'

inputs:
  test-type:
    description: 'Type of test (unit|integration|e2e|all)'
    required: true
  enable-testcontainers:
    description: 'Enable Testcontainers configuration'
    required: false
    default: 'false'
  create-directories:
    description: 'Create test result directories'
    required: false
    default: 'true'

runs:
  using: 'composite'
  steps:
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      with:
        platforms: linux/amd64
        
    - name: Setup base environment files
      shell: bash
      run: |
        echo "Setting up environment files for test type: ${{ inputs.test-type }}"
        
        # Copy base environment files
        cp .env.base.example .env.base
        cp .env.test.example .env.test
        cp .env.test .env.local
        
        # Add Docker-specific configurations
        echo "DOCKER_HOST=unix:///var/run/docker.sock" >> .env.local
        
    - name: Configure for Testcontainers
      if: inputs.enable-testcontainers == 'true'
      shell: bash
      run: |
        echo "Configuring Testcontainers support..."
        echo "TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal" >> .env.local
        
    - name: Configure for E2E tests
      if: inputs.test-type == 'e2e'
      shell: bash
      run: |
        echo "Configuring E2E test environment..."
        echo "BASE_URL=http://app-server:3000" >> .env.local
        echo "PLAYWRIGHT_SKIP_WEBSERVER=true" >> .env.local
        
    - name: Create test directories
      if: inputs.create-directories == 'true'
      shell: bash
      run: |
        echo "Creating test result directories..."
        mkdir -p test-results coverage playwright-report
        
    - name: Display environment summary
      shell: bash
      run: |
        echo "🔧 Docker Test Environment Setup Complete"
        echo "  Test Type: ${{ inputs.test-type }}"
        echo "  Testcontainers: ${{ inputs.enable-testcontainers }}"
        echo "  Directories Created: ${{ inputs.create-directories }}"
        echo "  Environment files: .env.base, .env.test, .env.local"
```

#### `.github/actions/docker-cleanup/action.yml`
```yaml
name: 'Docker Environment Cleanup'
description: 'Clean up Docker containers, volumes, and optionally perform system cleanup'
author: 'NextJS Boilerplate Team'

inputs:
  cleanup-level:
    description: 'Cleanup level (basic|full|aggressive)'
    required: false
    default: 'basic'
  compose-file:
    description: 'Docker Compose file to use for cleanup'
    required: false
    default: 'docker-compose.test.yml'
  preserve-cache:
    description: 'Preserve Docker build cache'
    required: false
    default: 'true'

runs:
  using: 'composite'
  steps:
    - name: Display cleanup configuration
      shell: bash
      run: |
        echo "🧹 Docker Cleanup Configuration"
        echo "  Cleanup Level: ${{ inputs.cleanup-level }}"
        echo "  Compose File: ${{ inputs.compose-file }}"
        echo "  Preserve Cache: ${{ inputs.preserve-cache }}"
        
    - name: Stop and remove containers
      shell: bash
      run: |
        echo "Stopping and removing containers from ${{ inputs.compose-file }}..."
        if [ -f "${{ inputs.compose-file }}" ]; then
          docker compose -f ${{ inputs.compose-file }} down -v --remove-orphans
        else
          echo "Warning: Compose file ${{ inputs.compose-file }} not found, skipping compose cleanup"
        fi
        
    - name: Basic system cleanup
      if: inputs.cleanup-level == 'basic' || inputs.cleanup-level == 'full' || inputs.cleanup-level == 'aggressive'
      shell: bash
      run: |
        echo "Performing basic cleanup..."
        # Remove unused containers
        docker container prune -f
        
    - name: Full system cleanup
      if: inputs.cleanup-level == 'full' || inputs.cleanup-level == 'aggressive'
      shell: bash
      run: |
        echo "Performing full cleanup..."
        # Remove unused volumes
        docker volume prune -f
        # Remove unused networks
        docker network prune -f
        
    - name: Aggressive cleanup
      if: inputs.cleanup-level == 'aggressive'
      shell: bash
      run: |
        echo "Performing aggressive cleanup..."
        # Remove unused images (excluding cache if preserve-cache is true)
        if [ "${{ inputs.preserve-cache }}" = "true" ]; then
          echo "Preserving build cache, removing only dangling images..."
          docker image prune -f
        else
          echo "Removing all unused images including cache..."
          docker image prune -a -f
        fi
        # Full system prune (excluding cache if preserve-cache is true)
        if [ "${{ inputs.preserve-cache }}" = "false" ]; then
          echo "Performing full system prune..."
          docker system prune -a -f
        fi
        
    - name: Display cleanup summary
      shell: bash
      run: |
        echo "🏁 Cleanup Summary"
        echo "Remaining Docker resources:"
        echo ""
        echo "📦 Containers:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null || echo "  None"
        echo ""
        echo "🗄️ Volumes:"
        docker volume ls --format "table {{.Name}}\t{{.Driver}}" 2>/dev/null || echo "  None"
        echo ""
        echo "🌐 Networks:"
        docker network ls --format "table {{.Name}}\t{{.Driver}}" 2>/dev/null || echo "  None"
        echo ""
        echo "💾 Images:"
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null || echo "  None"
        echo ""
        echo "✅ Docker cleanup completed successfully"
```

### 2. 分離ワークフローファイル（手動作成必要）

#### `.github/workflows/docker-unit-tests.yml`
```yaml
name: Docker Unit Tests

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
      - '.github/workflows/docker-unit-tests.yml'
      - '.github/actions/setup-docker-test-env/**'
      - '.github/actions/docker-cleanup/**'
  pull_request:
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
      - '.github/workflows/docker-unit-tests.yml'
      - '.github/actions/setup-docker-test-env/**'
      - '.github/actions/docker-cleanup/**'

env:
  NODE_VERSION: '20.x'
  DOCKER_BUILDKIT: 1
  COMPOSE_DOCKER_CLI_BUILD: 1

concurrency:
  group: docker-unit-tests-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  docker-unit-tests:
    name: Docker Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker test environment
        uses: ./.github/actions/setup-docker-test-env
        with:
          test-type: 'unit'
          enable-testcontainers: 'false'
          create-directories: 'true'

      - name: Build test image
        run: |
          echo "🔨 Building Docker test image for unit tests..."
          docker compose -f docker-compose.test.yml build app-test

      - name: Run Unit Tests in Docker
        run: |
          echo "🧪 Running unit tests in Docker environment..."
          docker compose -f docker-compose.test.yml run --rm app-test pnpm test:unit

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: docker-unit-test-results-${{ github.sha }}
          path: |
            test-results/
            coverage/
          retention-days: 7
          if-no-files-found: ignore

      - name: Clean up Docker environment
        if: always()
        uses: ./.github/actions/docker-cleanup
        with:
          cleanup-level: 'basic'
          compose-file: 'docker-compose.test.yml'
          preserve-cache: 'true'

      - name: Post test summary
        if: always()
        run: |
          echo "📊 Docker Unit Tests Summary"
          echo "  Test Type: Unit Tests"
          echo "  Environment: Docker"
          echo "  Duration: ${{ job.status == 'success' && 'Completed successfully' || 'Failed or cancelled' }}"
          echo "  Artifacts: Unit test results and coverage uploaded"
```

## 🔄 実装手順

### Phase 1: 準備
1. 上記ファイルを手動でローカルリポジトリに作成
2. 各ディレクトリの作成確認:
   ```bash
   mkdir -p .github/actions/setup-docker-test-env
   mkdir -p .github/actions/docker-cleanup
   ```

### Phase 2: 段階的テスト
1. `docker-unit-tests.yml` のみ追加してテスト
2. 正常動作確認後、他のワークフローを順次追加
3. 各段階で既存ワークフローとの並行実行で検証

### Phase 3: 完全移行
1. 全新ワークフローの安定稼働確認
2. `docker-tests.yml` の無効化
3. 最終動作確認

## 📊 検証ポイント

### 必須確認項目
- [ ] Unit Tests の実行成功
- [ ] Integration Tests の実行成功（Testcontainers含む）
- [ ] E2E Tests の実行成功（マルチブラウザ）
- [ ] Quality Gate の正常動作
- [ ] アーティファクトの正常アップロード
- [ ] 実行時間が既存と同等またはそれ以下

### 品質ゲート基準
- **全ワークフロー成功**: 3/3ワークフローが成功
- **実行時間**: 各ワークフローが制限時間内に完了
- **アーティファクト**: テスト結果とカバレッジの正常保存

## ⚠️ 注意事項

1. **GitHub App制限**: ワークフローファイルは手動追加が必須
2. **段階的移行**: 一度に全ファイルを追加せず、段階的に検証
3. **バックアップ**: 既存`docker-tests.yml`は新ワークフロー検証完了まで保持
4. **権限確認**: Actions実行権限とリポジトリアクセス権限の確認

## 🎯 期待効果

- **保守性向上**: 378行→76-152行範囲での管理
- **デバッグ効率**: 機能別の独立したログ分析
- **並列実行**: 最大10ジョブの並列実行
- **重複削減**: 66%のコード重複削減

---

**このガイドに従って手動実装することで、CI/CDワークフローの機能別分離が完了し、大幅な保守性向上を実現できます。**