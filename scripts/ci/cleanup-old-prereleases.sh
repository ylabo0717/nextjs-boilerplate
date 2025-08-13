#!/bin/bash
set -euo pipefail

# Delete old pre-releases with safety checks
#
# This script helps maintain a clean release history by removing
# old prerelease versions that are no longer needed
#
# Options:
#   --dry-run    Show what would be deleted without actually deleting
#   --days N     Only delete releases older than N days (default: 30)
#   --force      Skip confirmation prompt

# Default values
DRY_RUN=false
DAYS_OLD=30
FORCE=false
KEEP_LATEST=5

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --days)
      DAYS_OLD="$2"
      shift 2
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --keep)
      KEEP_LATEST="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--days N] [--force] [--keep N]"
      exit 1
      ;;
  esac
done

echo "🧹 Cleaning up old prereleases..."
echo "   Settings:"
echo "   - Keep latest: $KEEP_LATEST releases"
echo "   - Delete older than: $DAYS_OLD days"
echo "   - Dry run: $DRY_RUN"
echo ""

# Get current date in seconds since epoch
CURRENT_DATE=$(date +%s)
CUTOFF_DATE=$((CURRENT_DATE - (DAYS_OLD * 86400)))

# Get list of all prereleases with their dates
echo "📋 Fetching prerelease list..."
RELEASES=$(gh release list --limit 100 --json tagName,createdAt,isPrerelease,isDraft | \
  jq -r '.[] | select(.isPrerelease == true and .isDraft == false) | "\(.createdAt)|\(.tagName)"' | \
  sort -r)

if [ -z "$RELEASES" ]; then
  echo "ℹ️ No prereleases found"
  exit 0
fi

# Count total prereleases
TOTAL_COUNT=$(echo "$RELEASES" | wc -l | tr -d ' ')
echo "Found $TOTAL_COUNT prereleases"

# Skip the latest N releases
RELEASES_TO_CHECK=$(echo "$RELEASES" | tail -n +$((KEEP_LATEST + 1)))

if [ -z "$RELEASES_TO_CHECK" ]; then
  echo "ℹ️ No old prereleases to clean up (keeping latest $KEEP_LATEST)"
  exit 0
fi

# Collect releases to delete
RELEASES_TO_DELETE=""
DELETE_COUNT=0

while IFS='|' read -r created_at tag_name; do
  # Convert date to seconds since epoch
  RELEASE_DATE=$(date -d "$created_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" +%s 2>/dev/null || echo "0")
  
  if [ "$RELEASE_DATE" -eq 0 ]; then
    echo "⚠️  Warning: Could not parse date for $tag_name, skipping"
    continue
  fi
  
  # Check if release is older than cutoff
  if [ "$RELEASE_DATE" -lt "$CUTOFF_DATE" ]; then
    # Validate tag format (should match semantic versioning with prerelease)
    if [[ "$tag_name" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+-(alpha|beta|rc|pre|canary|next|dev)\.[0-9]+$ ]]; then
      RELEASES_TO_DELETE="$RELEASES_TO_DELETE$tag_name\n"
      DELETE_COUNT=$((DELETE_COUNT + 1))
      
      # Calculate age in days
      AGE_DAYS=$(( (CURRENT_DATE - RELEASE_DATE) / 86400 ))
      echo "  📦 $tag_name (${AGE_DAYS} days old)"
    else
      echo "  ⚠️  Skipping $tag_name - doesn't match expected prerelease pattern"
    fi
  fi
done <<< "$RELEASES_TO_CHECK"

if [ "$DELETE_COUNT" -eq 0 ]; then
  echo "ℹ️ No prereleases older than $DAYS_OLD days to delete"
  exit 0
fi

echo ""
echo "📊 Summary: Will delete $DELETE_COUNT prereleases"

# Confirmation prompt (unless --force is used)
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
  echo ""
  read -p "⚠️  Are you sure you want to delete these $DELETE_COUNT prereleases? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deletion cancelled"
    exit 1
  fi
fi

# Delete or simulate deletion
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🔍 DRY RUN MODE - No releases will be deleted"
  echo "The following releases would be deleted:"
  echo -e "$RELEASES_TO_DELETE" | head -n -1
else
  echo ""
  echo "🗑️  Deleting prereleases..."
  
  # Delete each release
  echo -e "$RELEASES_TO_DELETE" | head -n -1 | while read -r release; do
    if [ -n "$release" ]; then
      echo "  Deleting: $release"
      if gh release delete "$release" --yes; then
        echo "  ✅ Deleted: $release"
      else
        echo "  ❌ Failed to delete: $release"
      fi
    fi
  done
  
  echo ""
  echo "✅ Cleanup completed successfully"
fi

# Show remaining prereleases count
REMAINING=$(gh release list --limit 100 | grep -c -E 'Pre-release|beta|alpha|rc' || echo "0")
echo ""
echo "📈 Remaining prereleases: $REMAINING"