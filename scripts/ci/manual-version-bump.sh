#!/bin/bash
set -euo pipefail

# Handle manual version bump for workflow_dispatch releases
#
# Arguments:
#   $1: Version type (patch/minor/major)
#   $2: Prerelease identifier (optional: beta/alpha/rc)

VERSION_TYPE="${1:-}"
PRERELEASE="${2:-}"

if [ -z "$VERSION_TYPE" ]; then
  echo "Error: Version type is required"
  echo "Usage: $0 <version_type> [prerelease]"
  exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Create a changeset using the separate script
./scripts/ci/create-changeset.sh "$VERSION_TYPE" "$PRERELEASE"

# Update versions
pnpm exec changeset version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Commit and create tag
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add .
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main --tags

echo "✅ Version bumped to v$NEW_VERSION and pushed to repository"