# Configuration File Structure Guide

In this project, configuration files are organized into the `config/` directory, categorized by functionality. This document explains the location and purpose of each configuration file.

## 📁 Directory Structure

```
config/
├── security/           # Security-related configuration
│   ├── .gitleaks.toml  # Secret detection configuration
│   └── .semgrep.yml    # Static analysis configuration
├── quality/            # Code quality-related configuration
│   ├── eslint.config.mjs       # ESLint configuration
│   ├── .lintstagedrc.js       # lint-staged configuration
│   ├── .prettierrc.js         # Prettier configuration
│   ├── .prettierignore        # Prettier exclude configuration
│   └── .jscpd.json            # Code duplication detection configuration
├── performance/        # Performance-related configuration
│   ├── .lighthouserc.json        # Lighthouse CI configuration (desktop)
│   └── .lighthouserc.mobile.json # Lighthouse CI configuration (mobile)
├── build/              # Build-related configuration
│   └── postcss.config.mjs      # PostCSS configuration
├── .mcp.json           # MCP (Model Context Protocol) configuration
├── vitest.*.config.ts  # Vitest configuration files
├── playwright.*.config.ts # Playwright configuration files
├── typedoc.json        # TypeDoc configuration
├── commitlint.config.js # Commitlint configuration
├── components.json     # shadcn/ui component configuration
└── test-env.js         # Test environment configuration
```

## 🔧 Configuration File Details

### Security-Related (`config/security/`)

#### `.gitleaks.toml`

- **Purpose**: Secret detection in Git history and staging area
- **Execution Timing**:
  - pre-push hook
  - CI/CD pipeline
  - Manual scanning
- **Customization**: Exclude project-specific patterns to avoid false positives

```bash
# Usage example
gitleaks detect --config config/security/.gitleaks.toml
gitleaks protect --staged --config config/security/.gitleaks.toml
```

#### `.semgrep.yml`

- **Purpose**: Static analysis for security vulnerabilities and code quality issues
- **Execution Timing**: CI/CD pipeline
- **Customization**: Project-specific rules can be added

### Quality Management Related (`config/quality/`)

#### `eslint.config.mjs`

- **Purpose**: Integrated configuration for code style, quality, and security rules
- **Features**:
  - Based on Next.js official recommended configuration
  - Full TypeScript support
  - Built-in security rules
  - Tailwind CSS v4 support
- **Proxy File**: Referenced from `eslint.config.mjs` at project root

#### `.lintstagedrc.js`

- **Purpose**: Staged check configuration for Git commit hooks
- **Target**: Only staged files
- **Proxy File**: Referenced from `.lintstagedrc.js` at project root

#### `.prettierrc.js` & `.prettierignore`

- **Purpose**: Code formatting configuration
- **Proxy File**: Referenced from corresponding files at project root

#### `.jscpd.json`

- **Purpose**: Code duplication detection configuration
- **Metrics**: Executed as part of quality gates

### Performance-Related (`config/performance/`)

#### `.lighthouserc.json`

- **Purpose**: Lighthouse CI configuration (desktop environment)
- **Measurement Target**: Core Web Vitals, accessibility, SEO
- **Execution**: Automatic execution in CI/CD pipeline

#### `.lighthouserc.mobile.json`

- **Purpose**: Lighthouse CI configuration (mobile environment)
- **Execution**: Manual execution when needed

```bash
# Mobile measurement example
pnpm dlx @lhci/cli autorun --config=config/performance/.lighthouserc.mobile.json
```

### Build-Related (`config/build/`)

#### `postcss.config.mjs`

- **Purpose**: PostCSS configuration (Tailwind CSS v4 integration)
- **Proxy File**: Referenced from `postcss.config.mjs` at project root

## 🔄 Proxy File System

Many configuration files are set up with proxy files placed at the project root where tools expect them, loading the actual configuration from the `config/` directory.

### Proxy File Examples

```javascript
// .lintstagedrc.js at project root
module.exports = require('./config/quality/.lintstagedrc.js');
```

```javascript
// .prettierrc.js at project root
module.exports = require('./config/quality/.prettierrc.js');
```

## 📝 Guidelines for Adding/Modifying Configuration Files

### 1. Adding New Configuration Files

1. Place in appropriate category directory
2. Create proxy file if necessary
3. Update documentation
4. Update CI/CD workflows

### 2. Modifying Existing Configuration Files

1. Clarify reason for change
2. Verify impact on other tools
3. Notify entire team of changes

### 3. Updating Path References

When moving configuration files, update the following locations:

- GitHub Actions workflows
- npm/pnpm scripts
- Documentation
- README.md
- References from other configuration files

## 🔍 Troubleshooting

### When Configuration Files Cannot Be Found

1. Check existence of proxy files
2. Verify accuracy of path references
3. Check case sensitivity matching

### When Tools Don't Recognize Configuration

1. Check tool-specific configuration file naming conventions
2. Check for syntax errors in configuration files
3. Explicitly specify path with `--config` option if necessary

## 📚 Related Documentation

- [TypeScript Guidelines](../core/typescript-guidelines.en.md)
- [Testing Guidelines](../quality/testing-guidelines.en.md)
- [Security Guidelines](../security/security-guidelines.en.md)
- [Review Checklist](../quality/review-checklist.en.md)