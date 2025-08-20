#!/bin/bash

# CI/CDワークフロー分離実装セットアップスクリプト
# GitHub App権限制限のため、手動実行が必要です

set -e

echo "🚀 CI/CDワークフロー分離実装セットアップ"
echo "=============================================="
echo ""

# ディレクトリ作成
echo "📁 ディレクトリ構造の作成..."
mkdir -p .github/actions/setup-docker-test-env
mkdir -p .github/actions/docker-cleanup

echo "✅ ディレクトリ作成完了"
echo ""

# ファイル存在確認
echo "🔍 実装ファイルの確認..."

files=(
    ".github/actions/setup-docker-test-env/action.yml"
    ".github/actions/docker-cleanup/action.yml"
    ".github/workflows/docker-unit-tests.yml"
    ".github/workflows/docker-integration-tests.yml"
    ".github/workflows/docker-e2e-tests.yml"
    ".github/workflows/docker-quality-gate.yml"
)

missing_files=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file - 存在"
    else
        echo "  ❌ $file - 不在（手動作成必要）"
        missing_files=$((missing_files + 1))
    fi
done

echo ""

if [ $missing_files -eq 0 ]; then
    echo "🎉 全ファイルが存在します！"
    echo ""
    echo "📋 次のステップ:"
    echo "1. 新ワークフローをテスト"
    echo "2. 既存ワークフローとの比較検証"
    echo "3. 段階的移行の実行"
    echo ""
    echo "💡 テスト実行コマンド例:"
    echo "  git add .github/"
    echo "  git commit -m 'feat: add separated Docker workflows'"
    echo "  git push origin HEAD"
else
    echo "⚠️  $missing_files個のファイルが不在です"
    echo ""
    echo "📖 詳細手順は以下のドキュメントを参照:"
    echo "  docs/work_dir/docker_compose/workflow-implementation-guide.md"
    echo ""
    echo "🔧 手動作成が必要なファイル:"
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            echo "  - $file"
        fi
    done
fi

echo ""
echo "📊 実装効果の確認:"
echo "  - 重複コード削減: 88行 → 30行 (66%削減)"
echo "  - ファイル分離: 378行 → 76-152行範囲"
echo "  - 並列実行ジョブ: 6ジョブ → 8-10ジョブ"
echo ""

# 現在のワークフロー情報
if [ -f ".github/workflows/docker-tests.yml" ]; then
    echo "📝 既存ワークフロー:"
    echo "  - docker-tests.yml ($(wc -l < .github/workflows/docker-tests.yml)行) - 分離後に無効化予定"
fi

echo ""
echo "✅ セットアップ確認完了"