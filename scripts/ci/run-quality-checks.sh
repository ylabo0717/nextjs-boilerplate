#!/bin/bash
set -euo pipefail

# Run quality checks before release
#
# This script runs:
# - ESLint for code quality
# - TypeScript type checking
# - Unit tests

echo "🔍 Running quality checks..."

echo "📝 Running ESLint..."
pnpm lint

echo "🔧 Running TypeScript type check..."
pnpm typecheck

echo "🧪 Running unit tests..."
pnpm test:unit

echo "✅ All quality checks passed!"