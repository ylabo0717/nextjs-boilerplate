# Documentation Guidelines

Code documentation, TSDoc, and API documentation creation guidelines for the Next.js + TypeScript project.

## 📋 Document List

- **[Documentation Guidelines](./documentation-guidelines.md)** - TSDoc standards, validation strategy, and best practices

## 📝 Documentation Standards

### TSDoc Integration

- TypeScript native documentation
- Rich metadata support with tags like `@remarks`, `@example`, `@public`
- Excellent tooling support with TypeDoc and IDE IntelliSense
- Industry standard for TypeScript projects

### What to Document

- **Public APIs**: All exported functions, classes, and types
- **Complex Logic**: Non-obvious business logic and algorithms
- **Configuration**: Environment variables and configuration options
- **Architecture Decisions**: Why certain patterns were chosen

### Validation Strategy

- Staged validation approach balancing development speed with quality
- Pre-commit hooks for documentation checks
- CI/CD integration for comprehensive validation

## 🔗 Related Documents

- [Coding Guidelines](../coding/en/) - Code structure and documentation integration
- [Development Guidelines](../development/en/) - Documentation in development workflow
- [Quality Guidelines](../quality/en/) - Documentation quality metrics
