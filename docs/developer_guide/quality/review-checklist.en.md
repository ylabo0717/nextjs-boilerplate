# PR Review Checklist

This checklist is used by both **PR creators** and **reviewers**.
Mark non-applicable items as ~~N/A~~ to proceed.

---

## 🚨 Required Checks (Blockers)

**Block** merge if there are issues with these items.

### Security

- [ ] **Prevent confidential information leakage**: API keys, passwords, secrets are not included in client code
- [ ] **Pass secret scanning**: No secrets detected by gitleaks or equivalent tools
- [ ] **No hardcoding**: Passwords, API keys, etc. are not directly embedded in code (only via environment variables)
- [ ] **Authentication & authorization**: Final permission checks are performed on the server side (client-side checks are for UX assistance only)
- [ ] **Input validation**: Zod or schema validation implemented for external inputs (API, forms, environment variables)
- [ ] **XSS prevention**: User input is properly sanitized and escaped
- [ ] **Prevent confidential logs**: Passwords, tokens, etc. are not included in console.log or log output

### Type Safety

- [ ] **No any**: `any` type is not used (if unavoidable, reason must be explained in comments)
- [ ] **Use unknown**: External data is received as `unknown` and validated with type guards or Zod
- [ ] **Type consistency**: Public API return types are stable (record in CHANGELOG for breaking changes)

### CI/Quality Gates

- [ ] **Lint success**: `pnpm lint` completes without errors
- [ ] **Type check success**: `pnpm typecheck` completes without errors
- [ ] **Test success**: `pnpm test` all pass
- [ ] **Build success**: `pnpm build` succeeds

---

## ⚠️ Important Checks (Strongly Recommended for Fix)

### Architecture & Design

- [ ] **Pure functions first**: Business logic is implemented as pure functions
- [ ] **Side effect separation**: I/O, time acquisition, random generation are concentrated in boundary layers (API routes, useEffect, etc.)
- [ ] **Avoid IIFE/closures**: Avoid IIFE (Immediately Invoked Function Expression) and use pure functions
- [ ] **SSOT principle**: Duplicate constants/configuration values are referenced from `src/constants/`
- [ ] **Class usage reason**: When using classes, the following reasons are explained in comments
  - State management, resource management, lifecycle management required
  - Connection management with external systems (DB, API, files)
  - Interface implementation or environment-specific constraints

### Next.js 15 + React 19 Best Practices

- [ ] **Server/Client separation**: Avoid unnecessary Client Component usage (verify necessity of `'use client'`)
- [ ] **Data fetching optimization**: Prioritize server-side data fetching
- [ ] **Async params support**: `params` and `searchParams` are retrieved with `await` (Next.js 15)
- [ ] **Server Actions**: Proper error handling implemented when using Server Actions
- [ ] **New hook utilization**: React 19 new features like `useActionState` are used appropriately

### Performance

- [ ] **Bundle impact**: Impact of new dependencies on bundle size has been verified
- [ ] **Dynamic imports**: Dynamic imports (`import()`) considered for large libraries
- [ ] **Re-render optimization**: Dependency arrays and props design optimized to prevent unnecessary re-renders
- [ ] **Image optimization**: Next.js Image component, WebP/AVIF formats used appropriately
- [ ] **Core Web Vitals**: Impact on performance metrics considered

---

## 💡 Improvement Checks (Recommended)

### Code Quality

- [ ] **Complexity**: Function complexity is appropriate (recommended: ≤10 lines per function, ≤3 nesting levels)
- [ ] **Eliminate magic numbers**: Numeric literals extracted as constants (including test constants)
- [ ] **Dead code**: Unused code, imports, variables removed
- [ ] **Naming**: Variable and function names clearly express intent
- [ ] **Structured logging**: Integrated logger used for log output with appropriate log levels and context
- [ ] **GDPR compliance**: Personal information (IP, email addresses, etc.) properly hashed/masked during log output

### Accessibility

- [ ] **Semantic**: Appropriate HTML elements (button, a, form, etc.) used
- [ ] **Labels**: Appropriate labels and aria-labels set for form elements
- [ ] **Keyboard operation**: Operable with Tab, Enter, Escape keys
- [ ] **Contrast**: Color contrast ratio meets WCAG 2.1 standards

### Testing

- [ ] **Test updates**: Tests (Unit/Integration/E2E) corresponding to changed logic updated
- [ ] **Error case testing**: Includes test cases for error paths and boundary values
- [ ] **Minimize mocking**: Avoid excessive mocking, test actual behavior

### Error Handling & UX

- [ ] **Error Boundary**: Error Boundary placed in appropriate positions
- [ ] **User-friendly errors**: Display non-technical error messages
- [ ] **Loading states**: Display loading/pending states during async processing
- [ ] **Fallback**: Provide fallback UI for network errors, etc.

---

## 📝 Documentation & Maintainability

- [ ] **TSDoc**: TSDoc comments added for new public functions/constants
- [ ] **README consistency**: No contradictions with existing documentation
- [ ] **TODO comments**: TODO and FIXME comments include deadlines and assignees
- [ ] **Change reasons**: Background and reasons documented in comments for major design changes

---

## 📋 PR Template

Copy and use the following in your PR description:

```markdown
## Change Overview

<!-- Briefly explain what was changed -->

## Operation Verification

<!-- Test methods or screenshots -->

## Checklist

### 🚨 Required (Blockers)

- [ ] Security: No confidential information leakage, input validation implemented
- [ ] Type safety: No any usage, unknown + type guard utilization
- [ ] CI: Lint/Type/Test/Build all successful

### ⚠️ Important (Fix Recommended)

- [ ] Architecture: Pure functions first, SSOT principle compliance
- [ ] Next.js & React: Proper Server/Client separation, appropriate use of new features
- [ ] Performance: Bundle impact confirmed, optimization implemented

### 💡 Improvement (Recommended)

- [ ] Code quality: Appropriate complexity, no magic numbers
- [ ] Accessibility: Semantic, keyboard support
- [ ] Testing: Tests updated corresponding to changes
- [ ] Error handling: Proper error handling and UX

### 📝 Documentation

- [ ] TSDoc: Documentation added for new public APIs
- [ ] Change reasons: Background explanation for design changes
```

## Related Matters

<!-- Links to related Issues, PRs, documentation -->

---

## 🔍 Reviewer Guide

### Priority Order for Review

1. **🚨 Required checks** → Block merge if issues found
2. **⚠️ Important checks** → Strongly recommend fixes, ask for explanations
3. **💡 Improvement checks** → Suggestion level, record for future improvements

### How to Write Review Comments

- **Blocker**: `[BLOCKER] Security: API key is included in client code`
- **Important**: `[IMPORTANT] Performance: This dependency has significant impact on bundle size`
- **Suggestion**: `[SUGGESTION] Complexity: Splitting this function would improve readability`

---

## 🎯 External Review Perspectives (Regular Security Checks)

### Security Enhancement Checks

- [ ] **Environment variables**: No hardcoded credentials in production configuration
- [ ] **Secret scan configuration**: `config/security/.gitleaks.toml` properly configured to minimize false positives
- [ ] **Access control**: Default credentials for admin panels and monitoring tools changed
- [ ] **Log confidentiality**: PII (Personally Identifiable Information) properly masked in structured logs

### Architecture Health Checks

- [ ] **Function paradigm**: IIFE and complex closures refactored to pure functions
- [ ] **State management validity**: Proper documentation of reasons for class usage
- [ ] **Test coverage**: Verification of error paths and edge cases coverage
- [ ] **Language consistency**: Language usage based on team consensus (minimizing Japanese-English mixing)

**📅 Recommended frequency**: Quarterly or after major feature additions

---

**Related Guidelines:**

- [Overview](../core/coding-guidelines-overview.en.md) - Basic policies and SSOT principles
- [TypeScript](../core/typescript-guidelines.en.md) - Type safety guidelines
- [Next.js Patterns](../core/nextjs-patterns.en.md) - Server/Client Components
- [Security](../security/security-guidelines.en.md) - Secure implementation
- [Documentation](../development/documentation-guidelines.en.md) - TSDoc standards
