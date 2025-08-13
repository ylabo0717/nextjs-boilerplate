---
'nextjs-boilerplate': minor
---

Add comprehensive release automation system with GitHub Actions

### New Features

- **Automated Release Workflow**: Complete CI/CD pipeline for automated releases
  - Automatic version bumping with Changesets
  - GitHub Release creation with auto-generated release notes
  - Pre-release support for canary and RC versions
  - Automatic cleanup of old pre-releases (30-day retention)

- **Release Scripts**: New utility scripts for release management
  - `scripts/ci/update-changeset-config.sh` - Dynamic repository configuration
  - `scripts/ci/cleanup-old-prereleases.sh` - Automated pre-release cleanup with configurable retention

- **GitHub Actions Workflows**:
  - `.github/workflows/release.yml` - Main release automation workflow
  - Supports both stable and pre-release versions
  - Integration with Changesets for version management
  - Automatic PR creation for version updates

### Developer Experience

- **Simplified Release Process**:
  - Developers only need to create changesets during development
  - Merging to main branch automatically triggers the release process
  - Version bumps and releases are fully automated

- **Pre-release Management**:
  - Easy creation of canary and RC versions for testing
  - Automatic cleanup prevents repository clutter
  - Clear version history with tagged releases

### Documentation

- Comprehensive release automation guide in `docs/design_guide/release-automation-system.md`
- Detailed workflow documentation and best practices
- Troubleshooting guide for common issues

This system significantly reduces manual work in the release process while maintaining high quality and consistency in version management.
