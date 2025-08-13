#!/bin/bash
set -euo pipefail

# Generate release metrics and add to GitHub step summary

VERSION=$(node -p "require('./package.json').version")
COMMIT_SHA="${GITHUB_SHA:-unknown}"
BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
BUILD_TIME=$(cat .next/build-time.txt 2>/dev/null || echo "N/A")
TEST_COVERAGE=$(cat coverage/coverage-summary.json 2>/dev/null | jq -r '.total.lines.pct' 2>/dev/null || echo "N/A")
RELEASE_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Generate release metrics JSON
cat > release-metrics.json << EOF
{
  "version": "$VERSION",
  "date": "$RELEASE_DATE",
  "commit": "$COMMIT_SHA",
  "build_time": "$BUILD_TIME",
  "bundle_size": "$BUNDLE_SIZE",
  "test_coverage": "$TEST_COVERAGE"
}
EOF

# Add to GitHub step summary if available
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Release Metrics for v$VERSION"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Version | $VERSION |"
    echo "| Date | $RELEASE_DATE |"
    echo "| Commit | $COMMIT_SHA |"
    echo "| Bundle Size | $BUNDLE_SIZE |"
    echo "| Build Time | $BUILD_TIME |"
    echo "| Test Coverage | $TEST_COVERAGE% |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "✅ Release metrics generated successfully"