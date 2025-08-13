#!/bin/bash
set -euo pipefail

# Delete old pre-releases (keep the latest 5)
#
# This script helps maintain a clean release history by removing
# old prerelease versions that are no longer needed

echo "🧹 Cleaning up old prereleases..."

# Get list of prereleases, skip the latest 5, extract release tags
PRERELEASES=$(gh release list --limit 100 | grep -E 'Pre-release|beta|alpha|rc' | tail -n +6 | cut -f1)

if [ -z "$PRERELEASES" ]; then
  echo "ℹ️ No old prereleases to clean up"
  exit 0
fi

# Delete each old prerelease
for release in $PRERELEASES; do
  echo "Deleting old prerelease: $release"
  gh release delete "$release" --yes
done

echo "✅ Old prereleases cleaned up successfully"