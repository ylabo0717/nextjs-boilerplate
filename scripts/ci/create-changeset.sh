#!/bin/bash
set -euo pipefail

# Create a changeset file for manual releases
#
# Usage: ./scripts/ci/create-changeset.sh <version_type> [prerelease]
#
# Arguments:
#   version_type: The version bump type (patch, minor, major)
#   prerelease:   Optional prerelease tag (alpha, beta, rc, etc.)

VERSION_TYPE="${1:-}"
PRERELEASE="${2:-}"

if [ -z "$VERSION_TYPE" ]; then
  echo "Error: Version type is required"
  echo "Usage: $0 <version_type> [prerelease]"
  exit 1
fi

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid version type '$VERSION_TYPE'"
  echo "Valid types: patch, minor, major"
  exit 1
fi

# Create .changeset directory if it doesn't exist
mkdir -p .changeset

# Generate changeset file
CHANGESET_FILE=".changeset/manual-release.md"

if [ -n "$PRERELEASE" ]; then
  echo "Creating $VERSION_TYPE-$PRERELEASE changeset..."
  # Create changeset file with proper HEREDOC formatting
  # Note: EOF marker must be at the beginning of the line (no indentation)
  cat > "$CHANGESET_FILE" << 'EOF_PRERELEASE'
---
"nextjs-boilerplate": VERSION_TYPE_PLACEHOLDER
---

Manual release: VERSION_TYPE_PLACEHOLDER-PRERELEASE_PLACEHOLDER
EOF_PRERELEASE
  
  # Replace placeholders with actual values to avoid variable expansion issues
  sed -i.bak "s/VERSION_TYPE_PLACEHOLDER/$VERSION_TYPE/g" "$CHANGESET_FILE"
  sed -i.bak "s/PRERELEASE_PLACEHOLDER/$PRERELEASE/g" "$CHANGESET_FILE"
  rm -f "${CHANGESET_FILE}.bak"
else
  echo "Creating $VERSION_TYPE changeset..."
  # Create changeset file with proper HEREDOC formatting
  # Note: EOF marker must be at the beginning of the line (no indentation)
  cat > "$CHANGESET_FILE" << 'EOF_CHANGESET'
---
"nextjs-boilerplate": VERSION_TYPE_PLACEHOLDER
---

Manual release: VERSION_TYPE_PLACEHOLDER
EOF_CHANGESET
  
  # Replace placeholders with actual values to avoid variable expansion issues
  sed -i.bak "s/VERSION_TYPE_PLACEHOLDER/$VERSION_TYPE/g" "$CHANGESET_FILE"
  rm -f "${CHANGESET_FILE}.bak"
fi

echo "✅ Changeset created at $CHANGESET_FILE"