# YAML Guidelines

This document provides guidelines for writing and maintaining YAML files in this project, particularly for GitHub Actions workflows and other configuration files.

## YAML Script Separation Policy

**Complex scripts in YAML files should be extracted to separate script files.**

### Core Principles

1. **Keep YAML files simple and readable**
   - YAML should contain only configuration and simple one-line commands
   - Complex logic should not be embedded in YAML files
   - Use YAML for declarative configuration, not imperative programming

2. **Extract scripts to dedicated files**
   - Multi-line bash scripts should be moved to `scripts/ci/` directory
   - Use descriptive names for script files (e.g., `check-changesets.sh`, `create-github-release.sh`)
   - Make scripts executable with `chmod +x`

3. **Benefits of separation**
   - **Better maintainability**: Scripts can be edited and tested independently
   - **Tool compatibility**: Avoids conflicts with YAML parsers and formatters (e.g., Prettier)
   - **Reusability**: Scripts can be used across multiple workflows
   - **Testability**: Scripts can be unit tested and validated separately
   - **Syntax highlighting**: Proper syntax highlighting in editors
   - **Version control**: Better diff visibility for script changes

### Examples

#### ❌ Bad - Complex Script in YAML

```yaml
- name: Process release
  run: |
    # Get version
    VERSION=$(node -p "require('./package.json').version")

    # Extract latest release notes from CHANGELOG
    if [ -f "CHANGELOG.md" ]; then
      ESCAPED_VERSION=$(printf '%s\n' "$VERSION" | sed -e 's/[]\/$*.^|[]/\\&/g')
      RELEASE_NOTES=$(awk "/^## $ESCAPED_VERSION/,/^## [0-9]/" CHANGELOG.md | sed '$d' | tail -n +2)
    fi

    if [ -z "$RELEASE_NOTES" ]; then
      RELEASE_NOTES="Release v$VERSION"
    fi

    # Create GitHub Release
    gh release create "v$VERSION" \
      --title "v$VERSION" \
      --notes "$RELEASE_NOTES" \
      --target main
```

#### ✅ Good - Script in Separate File

```yaml
- name: Process release
  run: ./scripts/ci/create-github-release.sh
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

With the script in `scripts/ci/create-github-release.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Create GitHub Release with release notes from CHANGELOG
#
# Arguments:
#   $1: Prerelease flag (optional: true/false)

VERSION=$(node -p "require('./package.json').version")
# ... rest of the script logic
```

### Script Organization Guidelines

#### Directory Structure

```
scripts/
├── ci/                    # CI/CD related scripts
│   ├── check-changesets.sh
│   ├── create-release.sh
│   └── run-quality-checks.sh
├── dev/                   # Development helper scripts
│   ├── setup.sh
│   └── clean.sh
└── test/                  # Testing scripts
    ├── run-e2e.sh
    └── coverage-report.sh
```

#### Script Best Practices

1. **Use consistent error handling**

   ```bash
   #!/bin/bash
   set -euo pipefail  # Exit on error, undefined variables, pipe failures
   ```

2. **Add clear comments and usage instructions**

   ```bash
   # Create a changeset file for manual releases
   #
   # Usage: ./create-changeset.sh <version_type> [prerelease]
   #
   # Arguments:
   #   version_type: The version bump type (patch, minor, major)
   #   prerelease:   Optional prerelease tag (alpha, beta, rc)
   ```

3. **Validate required environment variables**

   ```bash
   if [ -z "${GITHUB_TOKEN:-}" ]; then
     echo "Error: GITHUB_TOKEN is required"
     exit 1
   fi
   ```

4. **Use descriptive variable names**

   ```bash
   VERSION_TYPE="${1:-}"
   PRERELEASE="${2:-}"
   ```

5. **Provide helpful error messages**
   ```bash
   if [ -z "$VERSION_TYPE" ]; then
     echo "Error: Version type is required"
     echo "Usage: $0 <version_type> [prerelease]"
     exit 1
   fi
   ```

## YAML Formatting Standards

### Linting Configuration

This project uses `eslint-plugin-yml` to enforce YAML formatting standards. The following rules are enforced:

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes preferred
- **Key spacing**: Consistent spacing after colons
- **Empty lines**: Maximum 1 consecutive empty line
- **String keys**: All keys must be strings

### Automated Checks

YAML files are automatically checked and formatted during:

1. **Pre-commit hooks**: Via lint-staged
2. **ESLint**: `npx eslint '**/*.{yml,yaml}'`
3. **Prettier**: Formats basic structure

### Common YAML Patterns

#### GitHub Actions Workflow

```yaml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: ./scripts/ci/run-tests.sh
```

#### Configuration Files

```yaml
# config.yml
version: '1.0'
settings:
  environment: production
  features:
    - name: feature-a
      enabled: true
    - name: feature-b
      enabled: false
```

## When to Keep Scripts in YAML

Simple, one-line commands can remain in YAML files:

- ✅ `run: pnpm install`
- ✅ `run: pnpm test`
- ✅ `run: echo "Status: ${{ job.status }}"`

Extract to separate files when:

- ❌ More than 3 lines of logic
- ❌ Complex conditionals or loops
- ❌ String manipulation or parsing
- ❌ Multiple commands with error handling
- ❌ Reusable logic across workflows

## Tools and Resources

### Validation Tools

- **ESLint**: `npx eslint '**/*.{yml,yaml}'` - Lint YAML files
- **Prettier**: `npx prettier --check '**/*.{yml,yaml}'` - Format checking
- **YAML Validator**: Online tools for quick validation

### References

- [YAML Specification](https://yaml.org/spec/)
- [GitHub Actions Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [ESLint Plugin YML](https://github.com/ota-meshi/eslint-plugin-yml)

## Migration Guide

When refactoring existing YAML files with embedded scripts:

1. **Identify complex scripts** in YAML files
2. **Create script file** in appropriate directory
3. **Move logic** to the script file
4. **Add proper error handling** (`set -euo pipefail`)
5. **Make executable** (`chmod +x script.sh`)
6. **Update YAML** to call the script
7. **Test thoroughly** in development environment
8. **Document** any required environment variables

## Troubleshooting

### Common Issues

1. **Script not found**
   - Ensure script has execute permissions: `chmod +x script.sh`
   - Use relative path from repository root: `./scripts/ci/script.sh`

2. **Environment variables not available**
   - Pass via `env:` section in GitHub Actions
   - Export in script if needed for child processes

3. **Different behavior in CI**
   - Test scripts locally first
   - Use same shell (usually `bash`) as CI environment
   - Check for CI-specific environment variables

4. **YAML parsing errors**
   - Run ESLint to identify issues: `npx eslint file.yml`
   - Check for proper indentation and quotes
   - Validate with online YAML validators
