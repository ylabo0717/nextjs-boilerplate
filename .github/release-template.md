# Release v{{version}}

## 📋 Overview

This release includes {{changeCount}} changes from {{contributorCount}} contributors.

## 🎯 Highlights

<!-- 主要な変更点を3-5点記載 -->

-
-
-

## 📊 Release Metrics

| Metric           | Value               |
| ---------------- | ------------------- |
| Bundle Size      | {{bundleSize}}      |
| Test Coverage    | {{testCoverage}}%   |
| Build Time       | {{buildTime}}       |
| Lighthouse Score | {{lighthouseScore}} |

## 🚀 What's Changed

### Features

{{#features}}

- {{title}} by @{{author}} in #{{number}}
  {{/features}}

### Bug Fixes

{{#bugfixes}}

- {{title}} by @{{author}} in #{{number}}
  {{/bugfixes}}

### Documentation

{{#documentation}}

- {{title}} by @{{author}} in #{{number}}
  {{/documentation}}

### Other Changes

{{#other}}

- {{title}} by @{{author}} in #{{number}}
  {{/other}}

## 🔄 Dependency Updates

{{#dependencies}}

- Bump {{name}} from {{oldVersion}} to {{newVersion}}
  {{/dependencies}}

## 📈 Comparison

**Full Changelog**: [{{previousVersion}}...{{version}}](https://github.com/{{repository}}/compare/{{previousVersion}}...{{version}})

## 🙏 Contributors

Thanks to all contributors who made this release possible:

{{#contributors}}

- @{{username}}
  {{/contributors}}

## 📝 Installation

```bash
# Clone the repository
git clone https://github.com/{{repository}}.git
cd {{repositoryName}}

# Checkout this version
git checkout v{{version}}

# Install dependencies
pnpm install

# Build the application
pnpm build
```

## ⚠️ Breaking Changes

{{#breaking}}

- {{description}}
  {{/breaking}}

## 🔗 Links

- [Documentation](https://github.com/{{repository}}/tree/v{{version}}/docs)
- [Migration Guide](https://github.com/{{repository}}/blob/v{{version}}/docs/migration-guide.md)
- [Contributing Guidelines](https://github.com/{{repository}}/blob/v{{version}}/CONTRIBUTING.md)

---

_Released on {{releaseDate}}_
