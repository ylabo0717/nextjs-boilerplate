#!/bin/bash

# Simple secret scanner for CI
# This is a basic scanner that looks for common secret patterns

set -e

echo "🔍 Running simple secret scan..."

# Define patterns to search for
declare -a patterns=(
    # API Keys and Tokens
    "api[_-]?key.*['\"].*[a-zA-Z0-9]{20,}"
    "token.*['\"].*[a-zA-Z0-9]{20,}"
    "bearer.*[a-zA-Z0-9]{20,}"
    
    # AWS
    "AKIA[0-9A-Z]{16}"
    "aws[_-]?secret.*[a-zA-Z0-9/+=]{40}"
    
    # Private Keys
    "-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----"
    
    # GitHub
    "ghp_[a-zA-Z0-9]{36}"
    "gho_[a-zA-Z0-9]{36}"
    "ghu_[a-zA-Z0-9]{36}"
    "ghs_[a-zA-Z0-9]{36}"
    "ghr_[a-zA-Z0-9]{36}"
    
    # Database URLs with credentials
    "postgres://[^:]+:[^@]+@"
    "mysql://[^:]+:[^@]+@"
    "mongodb://[^:]+:[^@]+@"
    "redis://[^:]+:[^@]+@"
    
    # JWT
    "eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+"
    
    # Generic secrets
    "password.*['\"].*[a-zA-Z0-9]{8,}"
    "secret.*['\"].*[a-zA-Z0-9]{8,}"
)

# Files to exclude from scanning
exclude_patterns=(
    "*.md"
    "*.lock"
    "*.json"
    "node_modules/*"
    ".next/*"
    "coverage/*"
    "dist/*"
    "build/*"
    ".git/*"
    "*.test.*"
    "*.spec.*"
)

# Build grep exclude arguments
exclude_args=""
for pattern in "${exclude_patterns[@]}"; do
    exclude_args="$exclude_args --exclude=$pattern"
done

# Track if secrets were found
secrets_found=false
findings=""

# Search for each pattern
for pattern in "${patterns[@]}"; do
    echo "Checking for pattern: $pattern"
    
    # Use grep to find matches, ignore case
    set +e
    results=$(grep -r -i -E "$pattern" . \
        --exclude-dir=node_modules \
        --exclude-dir=.next \
        --exclude-dir=.git \
        --exclude-dir=coverage \
        --exclude-dir=dist \
        --exclude-dir=build \
        --exclude="*.lock" \
        --exclude="*.md" \
        --exclude="*.example" \
        --exclude="*.test.*" \
        --exclude="*.spec.*" \
        2>/dev/null | head -5)
    set -e
    
    if [ ! -z "$results" ]; then
        secrets_found=true
        findings="$findings\n⚠️ Potential secret found matching pattern: $pattern\n$results\n"
    fi
done

# Report results
if [ "$secrets_found" = true ]; then
    echo "❌ Potential secrets detected!"
    echo -e "$findings"
    echo ""
    echo "Please review the findings above and ensure no real secrets are committed."
    echo "If these are false positives, consider updating the .gitleaks.toml configuration."
    exit 1
else
    echo "✅ No secrets detected"
    exit 0
fi