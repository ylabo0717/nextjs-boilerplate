#!/bin/bash
set -euo pipefail

# Check for pending changesets and determine if a release should be triggered
#
# Outputs:
#   has-changesets: true/false - Whether there are pending changesets
#   should-release: true/false - Whether a release should be triggered

# Check if there are pending changesets to process
if [ -n "$(ls -A .changeset/*.md 2>/dev/null | grep -v README.md)" ]; then
  echo "has-changesets=true" >> "$GITHUB_OUTPUT"
  echo "✅ Found pending changesets"
else
  echo "has-changesets=false" >> "$GITHUB_OUTPUT"
  echo "ℹ️ No pending changesets found"
fi

# Determine if a release should be triggered
# Release conditions:
# 1. Manual workflow dispatch (workflow_dispatch event)
# 2. Git tag push (refs/tags/v* pattern)
if [[ "${GITHUB_EVENT_NAME}" == "workflow_dispatch" ]]; then
  echo "should-release=true" >> "$GITHUB_OUTPUT"
  echo "🚀 Manual release triggered via workflow_dispatch"
elif [[ "${GITHUB_REF}" == refs/tags/v* ]]; then
  echo "should-release=true" >> "$GITHUB_OUTPUT"
  echo "🏷️ Tag release triggered for ${GITHUB_REF}"
else
  echo "should-release=false" >> "$GITHUB_OUTPUT"
  echo "ℹ️ Standard push to main branch - checking for changesets only"
fi