# Developer Guide

This directory contains comprehensive developer documentation for Next.js 15.x + React 19 + TypeScript projects.

> **📋 ℹ️ Info:** This documentation is available in both Japanese and English.  
> 🇯🇵 Japanese: `*.ja.md` | 🇺🇸 English: `*.en.md`

## 📚 Documentation Structure

### 🏗️ [Core - Basic Design & Architecture](./core/)

Defines fundamental design principles and architectural guidelines for the project.

- **[Architecture Guidelines](./core/architecture-guidelines.ja.md)** - Pure functions first, design patterns
- **[Coding Guidelines](./core/coding-guidelines.ja.md)** - Overall overview and guide structure
- **[Coding Guidelines Overview](./core/coding-guidelines-overview.ja.md)** - SSOT principles, basic policies
- **[TypeScript Guidelines](./core/typescript-guidelines.ja.md)** - Type definitions, naming conventions, type guards
- **[Next.js Patterns](./core/nextjs-patterns.ja.md)** - Server/Client Components, routing

### 🎯 [Quality - Quality, Testing & Review](./quality/)

Testing strategies and review guidelines to ensure code quality.

- **[Testing Guidelines](./quality/testing-guidelines.ja.md)** - Test strategy, test pyramid
- **[Review Checklist](./quality/review-checklist.ja.md)** - Cross-cutting concerns for PR reviews
- **[Quality Metrics](./quality/quality-metrics-architecture.ja.md)** - Quality gate system
- **[Performance Guidelines](./quality/performance-guidelines.ja.md)** - Optimization, accessibility

### 🔒 [Security - Security](./security/)

Guidelines for secure implementation practices.

- **[Security Guidelines](./security/security-guidelines.ja.md)** - Secure implementation patterns, vulnerability countermeasures

### 🛠️ [Development - Development & Operations Tools](./development/)

Guidelines for tools and processes in daily development work.

- **[Development Guidelines](./development/development-guidelines.ja.md)** - State management, error handling, styling
- **[Documentation Guidelines](./development/documentation-guidelines.ja.md)** - TSDoc standards, validation strategy
- **[Configuration Structure](./development/configuration-structure.ja.md)** - Project configuration organization
- **[Changeset Developer Guide](./development/changeset-developer-guide.ja.md)** - Release management process

### 🚀 [Infrastructure - Infrastructure & CI/CD](./infrastructure/)

Guidelines for CI/CD, deployment, and infrastructure.

- **[GitHub Actions Best Practices](./infrastructure/github-actions-best-practices.ja.md)** - CI/CD workflow design
- **[Release Automation System](./infrastructure/release-automation-system.ja.md)** - Automated release process
- **[YAML Guidelines](./infrastructure/yaml-guidelines.ja.md)** - YAML configuration file standards
- **[Docker](./infrastructure/docker/)** - Docker-related FAQ and troubleshooting

### 📊 [Logging - Logging](./logging/)

Guidelines for logging system design and operations.

- **[Logging System Overview](./logging/logging-system-overview.ja.md)** - Complete logging architecture overview
- **[Logging Configuration Guide](./logging/logging-configuration-guide.ja.md)** - How to configure logging
- **[Logging Troubleshooting](./logging/logging-troubleshooting-guide.ja.md)** - Logging-related problem solving

## 🚀 Quick Start

### Phase-based Development Guide

Refer to the following guidelines according to your development stage:

- **Project Start** → [Coding Guidelines Overview](./core/coding-guidelines-overview.ja.md) + [Architecture Guidelines](./core/architecture-guidelines.ja.md)
- **Component Development** → [Next.js Patterns](./core/nextjs-patterns.ja.md) + [TypeScript Guidelines](./core/typescript-guidelines.ja.md)
- **Security Implementation** → [Security Guidelines](./security/security-guidelines.ja.md)
- **Performance Improvement** → [Performance Guidelines](./quality/performance-guidelines.ja.md)
- **Test Implementation** → [Testing Guidelines](./quality/testing-guidelines.ja.md)
- **Daily Development** → [Development Guidelines](./development/development-guidelines.ja.md)

### Key Principles (Excerpts)

Most important principles common to all guidelines:

#### 1. Security First

Always handle confidential information and final authentication/authorization on the server side. On the client side, limit to auxiliary guards such as "early redirect/conditional display for UX improvement."

#### 2. Single Source of Truth (SSOT)

Manage all constants and configuration values in one place, avoiding duplication.

#### 3. Pure Functions First

Prioritize stateless pure functions as the foundation, carefully utilizing object-oriented benefits only in extremely special cases.

## 📖 Related Documentation

- [Environment Variables](../environment-variables.md) - How to configure environment variables
- [Project Configuration](../../CLAUDE.md) - Configuration and commands for Claude Code

---

> **📝 Note:** This document structure was reorganized on August 31, 2025. If you are referencing old paths, please update them according to this new structure.
