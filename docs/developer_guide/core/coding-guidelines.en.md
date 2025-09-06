# Coding Guidelines

This document provides an overview of coding standards and best practices for Next.js 15.x (App Router) + React 19 + TypeScript projects.

> **📋 Important:** These guidelines have been split into multiple files. Please refer to each specialized guideline for detailed information.

## 📚 Guidelines Structure

These guidelines are divided into the following files:

- **[Overview](./coding-guidelines-overview.en.md)** - Basic policies, SSOT principles, prohibited practices
- **[TypeScript](./typescript-guidelines.en.md)** - Type definitions, naming conventions, type guards
- **[Next.js Patterns](./nextjs-patterns.en.md)** - Server/Client Components, routing, React design
- **[Architecture Guidelines](./architecture-guidelines.en.md)** - Function-first approach, design patterns
- **[Security](../security/security-guidelines.en.md)** - Secure implementation patterns, vulnerability countermeasures
- **[Performance](../quality/performance-guidelines.en.md)** - Optimization, accessibility
- **[Development & Maintenance](../development/development-guidelines.en.md)** - State management, error handling, styling
- **[Testing](../quality/testing-guidelines.en.md)** - Test strategy, test pyramid
- **[Review Checklist](../quality/review-checklist.en.md)** - Cross-cutting concerns for PR reviews

---

## Quick Start

If you want to quickly check best practices for each area, refer to the corresponding guideline file:

### Phase-based Development Guide

- **Project Start** → [Overview](./coding-guidelines-overview.en.md) + [Architecture Guidelines](./architecture-guidelines.en.md)
- **Component Development** → [Next.js Patterns](./nextjs-patterns.en.md) + [TypeScript](./typescript-guidelines.en.md)
- **Security Implementation** → [Security](../security/security-guidelines.en.md)
- **Performance Improvement** → [Performance](../quality/performance-guidelines.en.md)
- **Test Implementation** → [Testing](../quality/testing-guidelines.en.md)
- **Daily Development** → [Development & Maintenance](../development/development-guidelines.en.md)

---

## Key Principles (Excerpts)

The following are the most important principles common to all guidelines. Please refer to each specialized guideline for details.

### 1. Security First

Always handle sensitive information and final authentication/authorization on the server side. On the client side, limit to auxiliary guards such as "early redirect/conditional display for UX improvement" and do not make decisions that cross trust boundaries (permission determination/sensitive data retrieval).

> 📖 Details: [Security Guidelines](../security/security-guidelines.en.md)

### 2. Single Source of Truth (SSOT)

Manage all constants and configuration values in one place, avoiding duplication.

> 📖 Details: [Overview Guidelines](./coding-guidelines-overview.en.md#single-source-of-truth-ssot-principle)

### 3. Pure Functions First Approach

Use pure functions in 99% of cases, consider classes only in extremely exceptional cases (complex internal state / performance optimization that is significantly difficult with pure function composition).

> 📖 Details: [Architecture Guidelines](./architecture-guidelines.en.md)

### 4. Thorough Type Safety

Make maximum use of TypeScript features and avoid using the any type.

> 📖 Details: [TypeScript Guidelines](./typescript-guidelines.en.md)

---

## Quick Reference for Common Tasks

### When creating new components

1. [Next.js Patterns](./nextjs-patterns.en.md) - How to use Server/Client Components
2. [TypeScript](./typescript-guidelines.en.md) - How to define Props types
3. [Development & Maintenance](../development/development-guidelines.en.md) - Styling (Tailwind CSS)

### When implementing API calls

1. [Security](../security/security-guidelines.en.md) - Authentication/authorization, input validation
2. [Architecture Guidelines](./architecture-guidelines.en.md) - API client design
3. [Development & Maintenance](../development/development-guidelines.en.md) - Error handling

### When solving performance issues

1. [Performance](../quality/performance-guidelines.en.md) - Dynamic imports, memoization strategies
2. [Next.js Patterns](./nextjs-patterns.en.md) - Utilizing Server Components
3. [Development & Maintenance](../development/development-guidelines.en.md) - State management optimization

### When writing tests

1. [Testing](../quality/testing-guidelines.en.md) - Test pyramid, test patterns
2. [TypeScript](./typescript-guidelines.en.md) - Type safety for mocks
3. [Overview](./coding-guidelines-overview.en.md) - Constant management for test data

---

## PR Review Checklist

Detailed and up-to-date cross-cutting concerns are consolidated in a separate file. Please refer to the following when reviewing/creating PRs:

➡️ Refer to `review-checklist.en.md`: [Review Checklist](../quality/review-checklist.en.md)

(This file maintains only an overview to avoid duplication)

## Technology Stack Overview

- **Framework:** Next.js 15.4.6 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.0 + shadcn/ui
- **Testing:** Vitest (Unit) + Playwright (E2E)
- **Architecture:** Pure functions first + functional programming

---

## Next Steps

1. **First time**: Understand basic policies with [Overview](./coding-guidelines-overview.en.md)
2. **Start development**: Refer to corresponding specialized guidelines
3. **Continuous improvement**: Regularly review guidelines and implement improvement suggestions

---

_These guidelines are regularly updated and evolve with project growth. If you have questions or improvement suggestions, let's discuss them as a team and continuously improve._
