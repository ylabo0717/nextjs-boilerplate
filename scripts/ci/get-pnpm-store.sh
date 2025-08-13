#!/bin/bash
set -euo pipefail

# Get pnpm store directory path for caching

echo "STORE_PATH=$(pnpm store path --silent)" >> "$GITHUB_OUTPUT"