#!/bin/bash
set -euo pipefail

# Create GitHub Release with release notes from CHANGELOG
#
# Arguments:
#   $1: Prerelease flag (optional: true/false)

PRERELEASE="${1:-false}"

# Get version
VERSION=$(node -p "require('./package.json').version")
echo "Creating GitHub release for v$VERSION"

# Extract latest release notes from CHANGELOG
RELEASE_NOTES=""
if [ -f "CHANGELOG.md" ]; then
  RELEASE_NOTES=$(awk "/^## $VERSION/,/^## [0-9]/" CHANGELOG.md | head -n -1 | tail -n +2)
fi

if [ -z "$RELEASE_NOTES" ]; then
  RELEASE_NOTES="Release v$VERSION"
fi

# Build release command
RELEASE_CMD="gh release create \"v$VERSION\" \
  --title \"v$VERSION\" \
  --notes \"$RELEASE_NOTES\" \
  --target main"

# Add prerelease flag if needed
if [ "$PRERELEASE" = "true" ]; then
  RELEASE_CMD="$RELEASE_CMD --prerelease"
fi

# Create GitHub Release
eval "$RELEASE_CMD"

echo "✅ GitHub release v$VERSION created successfully"