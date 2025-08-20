#!/bin/bash

# ==============================================================================
# Security Headers Verification Script
#
# 本番環境のNginxプロキシ経由でセキュリティヘッダーを検証
# Usage: ./scripts/verify-security-headers.sh
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROXY_URL="http://localhost:8080"
TIMEOUT=10
MAX_RETRIES=3

echo -e "${YELLOW}🔒 Nginxセキュリティヘッダー検証開始${NC}"
echo "対象URL: $PROXY_URL"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s --max-time $TIMEOUT "$url" > /dev/null 2>&1; then
            return 0
        fi
        retries=$((retries + 1))
        echo -e "${YELLOW}⏳ サービス起動待機中... (試行 $retries/$MAX_RETRIES)${NC}"
        sleep 5
    done
    
    return 1
}

# Function to verify header
verify_header() {
    local header_name=$1
    local expected_pattern=$2
    local description=$3
    
    local header_value
    header_value=$(curl -s -I --max-time $TIMEOUT "$PROXY_URL" | grep -i "^$header_name:" | sed 's/\r$//' | cut -d' ' -f2-)
    
    if [ -z "$header_value" ]; then
        echo -e "${RED}❌ $description: ヘッダーが設定されていません${NC}"
        return 1
    fi
    
    if echo "$header_value" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ $description: $header_value${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: 期待値と異なります${NC}"
        echo "   実際の値: $header_value"
        echo "   期待パターン: $expected_pattern"
        return 1
    fi
}

# Function to verify CSP does not contain unsafe directives
verify_csp_security() {
    local csp_header
    csp_header=$(curl -s -I --max-time $TIMEOUT "$PROXY_URL" | grep -i "^content-security-policy:" | sed 's/\r$//' | cut -d' ' -f2-)
    
    if [ -z "$csp_header" ]; then
        echo -e "${RED}❌ CSP: ヘッダーが設定されていません${NC}"
        return 1
    fi
    
    # Check for unsafe directives
    if echo "$csp_header" | grep -q "unsafe-eval"; then
        echo -e "${RED}❌ CSP: 'unsafe-eval'が含まれています (セキュリティリスク)${NC}"
        echo "   実際の値: $csp_header"
        return 1
    fi
    
    if echo "$csp_header" | grep -q "script-src.*unsafe-inline.*unsafe-eval\|script-src.*unsafe-eval.*unsafe-inline"; then
        echo -e "${RED}❌ CSP: script-srcに'unsafe-inline'と'unsafe-eval'の両方が含まれています${NC}"
        echo "   実際の値: $csp_header"
        return 1
    fi
    
    echo -e "${GREEN}✅ CSP: セキュアな設定です${NC}"
    echo "   設定値: $csp_header"
    return 0
}

# Main verification process
main() {
    # Check if service is running
    if ! check_service "$PROXY_URL"; then
        echo -e "${RED}❌ サービスにアクセスできません: $PROXY_URL${NC}"
        echo ""
        echo "以下のコマンドでサービスを開始してください:"
        echo "docker compose -f docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d"
        exit 1
    fi
    
    echo -e "${GREEN}✅ サービス接続確認完了${NC}"
    echo ""
    
    # Initialize test result
    local failed_tests=0
    
    # Verify security headers
    echo "📋 セキュリティヘッダー検証:"
    
    verify_header "X-Frame-Options" "SAMEORIGIN" "X-Frame-Options" || failed_tests=$((failed_tests + 1))
    verify_header "X-Content-Type-Options" "nosniff" "X-Content-Type-Options" || failed_tests=$((failed_tests + 1))
    verify_header "X-XSS-Protection" "1; mode=block" "X-XSS-Protection" || failed_tests=$((failed_tests + 1))
    verify_header "Referrer-Policy" "strict-origin-when-cross-origin" "Referrer-Policy" || failed_tests=$((failed_tests + 1))
    
    echo ""
    echo "🔒 CSP検証:"
    verify_csp_security || failed_tests=$((failed_tests + 1))
    
    echo ""
    
    # Final result
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 すべてのセキュリティヘッダー検証が成功しました！${NC}"
        exit 0
    else
        echo -e "${RED}❌ $failed_tests 個の検証が失敗しました${NC}"
        exit 1
    fi
}

# Run main function
main "$@"