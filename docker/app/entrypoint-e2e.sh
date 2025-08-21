#!/bin/bash

# ==============================================================================
# Docker E2E Test Entrypoint Script
# 
# CI環境でのPlaywright実行時の権限問題を解決するエントリーポイント
# ボリュームマウント後にディレクトリ権限を適切に設定
# ==============================================================================

set -e

# ディレクトリが存在しない場合は作成
if [ ! -d "/app/test-results" ]; then
    sudo mkdir -p /app/test-results
fi

if [ ! -d "/app/playwright-report" ]; then
    sudo mkdir -p /app/playwright-report
fi

# ボリュームマウント後の権限修正（CI環境対応）
# 既存のPlaywrightアーティファクトをクリーンアップ（権限問題回避）
sudo find /app/test-results -name '.playwright-artifacts-*' -exec rm -rf {} + 2>/dev/null || true
sudo find /app/playwright-report -name '*' -mindepth 1 -exec rm -rf {} + 2>/dev/null || true

# より堅牢な権限修正 - 既存ファイルも含めて完全に権限変更
sudo chown -R pwuser:pwuser /app/test-results /app/playwright-report 2>/dev/null || true
sudo chmod -R 755 /app/test-results /app/playwright-report 2>/dev/null || true

# 権限が正しく設定されているか確認（デバッグ用）
if [ "${CI}" = "true" ]; then
    echo "=== Directory permissions check ==="
    ls -la /app/ | grep -E "(test-results|playwright-report)"
    echo "=== End permissions check ==="
fi

# 引数で渡されたコマンドを実行
exec "$@"