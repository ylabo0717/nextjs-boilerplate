#!/bin/bash
set -euo pipefail

# Upload build artifacts to GitHub release

VERSION=$(node -p "require('./package.json').version")
echo "Uploading build artifacts for v$VERSION"

# Archive build artifacts
echo "Creating archive..."
tar -czf "nextjs-boilerplate-v$VERSION.tar.gz" \
  .next \
  public \
  package.json \
  pnpm-lock.yaml \
  README.md

# Upload to GitHub Release
echo "Uploading to GitHub release..."
gh release upload "v$VERSION" \
  "nextjs-boilerplate-v$VERSION.tar.gz" \
  --clobber

echo "✅ Build artifacts uploaded successfully"