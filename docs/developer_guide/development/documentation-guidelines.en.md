# Documentation Guidelines

## Overview

This document outlines the documentation standards and practices for this Next.js boilerplate project. We use **TSDoc** as our documentation standard, enforced through a staged validation approach that balances development speed with code quality.

## Table of Contents

1. [Documentation Standards](#documentation-standards)
2. [TSDoc Syntax Guide](#tsdoc-syntax-guide)
3. [Validation Strategy](#validation-strategy)
4. [What to Document](#what-to-document)
5. [What NOT to Document](#what-not-to-document)
6. [Tools and Commands](#tools-and-commands)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

## Documentation Standards

### Why TSDoc?

- **TypeScript Native**: Designed specifically for TypeScript projects
- **Rich Metadata**: Supports tags like `@remarks`, `@example`, `@public`
- **Tooling Support**: Excellent integration with TypeDoc and IDE IntelliSense
- **Standardized**: Industry standard for TypeScript documentation

### TSDoc vs JSDoc

We use **TSDoc exclusively**. JSDoc is not used in this project.

| Feature          | TSDoc (Used)                      | JSDoc (Not Used)         |
| ---------------- | --------------------------------- | ------------------------ |
| Syntax           | `/** */` with TSDoc tags          | `/** */` with JSDoc tags |
| Type Annotations | Not needed (TypeScript infers)    | Required in comments     |
| Tags             | `@remarks`, `@example`, `@public` | `@type`, `@typedef`      |
| Validation       | TypeDoc + eslint-plugin-tsdoc     | eslint-plugin-jsdoc      |

## TSDoc Syntax Guide

### Basic Structure

````typescript
/**
 * Brief description (first paragraph)
 *
 * Detailed description (optional additional paragraphs)
 *
 * @param paramName - Parameter description
 * @returns Return value description
 *
 * @remarks
 * Additional implementation notes
 *
 * @example
 * ```typescript
 * // Example usage
 * const result = myFunction('input');
 * ```
 *
 * @public
 */
````

### Common TSDoc Tags

#### Essential Tags

- `@param` - Describes a function parameter
- `@returns` - Describes the return value
- `@remarks` - Additional notes, caveats, or implementation details
- `@example` - Code examples showing usage
- `@public` - Marks as public API
- `@internal` - Marks as internal (not part of public API)

#### Additional Tags

- `@deprecated` - Marks deprecated functionality
- `@since` - Version when feature was added
- `@see` - References to related items
- `@throws` - Documents exceptions that may be thrown
- `@typeParam` - Documents generic type parameters
- `@defaultValue` - Documents default values
- `@override` - Indicates method overrides parent class

### Documentation Templates

#### Constants

```typescript
/**
 * Maximum number of retry attempts for API calls
 *
 * @remarks
 * Used across all API service methods
 *
 * @public
 */
export const MAX_RETRIES = 3;
```

#### Functions

````typescript
/**
 * Fetches user data from the API
 *
 * @param userId - The unique identifier of the user
 * @param options - Optional configuration for the request
 * @returns A promise that resolves to the user data
 *
 * @remarks
 * This function includes automatic retry logic and caching
 *
 * @example
 * ```typescript
 * const user = await fetchUser('123', { cache: true });
 * console.log(user.name);
 * ```
 *
 * @throws {@link ApiError} If the user is not found
 *
 * @public
 */
export async function fetchUser(userId: string, options?: FetchOptions): Promise<User> {
  // Implementation
}
````

#### Interfaces/Types

```typescript
/**
 * Configuration options for the application
 *
 * @public
 */
export interface AppConfig {
  /**
   * The base URL for API requests
   *
   * @remarks
   * Should not include trailing slash
   */
  apiUrl: string;

  /**
   * Request timeout in milliseconds
   *
   * @defaultValue 5000
   */
  timeout?: number;

  /**
   * Enable debug logging
   *
   * @defaultValue false
   */
  debug?: boolean;
}
```

#### Classes

````typescript
/**
 * Service for managing user authentication
 *
 * @remarks
 * This service handles login, logout, and session management
 *
 * @example
 * ```typescript
 * const authService = new AuthService();
 * await authService.login(credentials);
 * ```
 *
 * @public
 */
export class AuthService {
  /**
   * Creates a new instance of AuthService
   *
   * @param config - Service configuration
   */
  constructor(config: AuthConfig) {
    // Implementation
  }

  /**
   * Authenticates a user with credentials
   *
   * @param credentials - User login credentials
   * @returns The authenticated user session
   *
   * @throws {@link AuthError} If authentication fails
   */
  async login(credentials: Credentials): Promise<Session> {
    // Implementation
  }
}
````

#### React Components

````typescript
/**
 * Button component with multiple style variants
 *
 * @remarks
 * This component uses Tailwind CSS for styling and supports
 * multiple variants and sizes
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="large" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 *
 * @public
 */
export function Button({ children, variant = 'default', size = 'medium', ...props }: ButtonProps) {
  // Implementation
}
````

## Validation Strategy

### Three-Stage Validation

Our documentation validation follows a staged approach:

#### 1. Pre-commit (Development Flexibility)

- **Tool**: ESLint with `tsdoc/syntax`
- **Level**: Warnings only
- **Purpose**: Allow quick iterations and WIP commits
- **Command**: `pnpm lint`

#### 2. Pre-push (Quality Gate)

- **Tools**: ESLint (errors) + TypeDoc validation
- **Level**: Strict enforcement
- **Purpose**: Ensure shared code is documented
- **Commands**:
  - `pnpm lint:pre-push` (ESLint with errors)
  - `pnpm docs:check` (TypeDoc validation)

#### 3. CI/CD (Final Verification)

- **Tools**: Full validation in CI pipeline
- **Level**: Strict enforcement
- **Purpose**: Guarantee main/develop branches quality
- **Job**: `docs-check` in GitHub Actions

### Benefits of Staged Approach

- **Development Speed**: No interruption during local development
- **Code Quality**: Ensures shared code is well-documented
- **Team Collaboration**: Everyone receives properly documented code
- **Gradual Adoption**: Easy to implement in existing projects

## What to Document

### Must Document

1. **All Exported Items**
   - Functions
   - Classes
   - Interfaces
   - Type aliases
   - Constants
   - Enums

2. **Public APIs**
   - Any code that other modules/components will use
   - Utility functions
   - Service methods
   - React components (custom, not from libraries)

3. **Complex Logic**
   - Algorithms with non-obvious behavior
   - Business logic implementations
   - Performance optimizations
   - Security-critical code

4. **Configuration**
   - Environment variables usage
   - Default values and their reasoning
   - Constraints and valid ranges

### Documentation Quality Guidelines

- **Be Concise**: First line should be a clear, brief description
- **Add Value**: Don't just restate the code
- **Include Examples**: For complex functions, show usage
- **Document Edge Cases**: Use `@remarks` for gotchas
- **Keep Updated**: Update docs when code changes

## What NOT to Document

### Automatically Excluded

1. **shadcn/ui Components** (`src/components/ui/**/*`)
   - Third-party components
   - Excluded via `typedoc.json`

2. **Test Files** (`*.test.ts`, `*.spec.ts`)
   - Test code doesn't need public API docs
   - Excluded via `typedoc.json`

3. **Zod Schema Internal Types**
   - Auto-generated by `z.object()` and `z.array()`
   - Filtered by `scripts/check-docs.js`
   - Document the schema variable, not internal properties

4. **TypeScript Internal Types**
   - Compiler-generated types
   - Filtered by `scripts/check-docs.js`

### Don't Over-Document

Avoid documenting:

- Trivial getters/setters
- Self-explanatory simple functions
- Internal implementation details (use `@internal` tag)
- Obvious parameter types (TypeScript provides these)

## Tools and Commands

### Development Commands

```bash
# Local development (warnings only)
pnpm lint

# Pre-push validation (strict)
pnpm lint:pre-push

# Documentation validation
pnpm docs:check

# Generate documentation
pnpm docs

# Raw TypeDoc output (with Zod noise)
pnpm docs:check:raw
```

### Configuration Files

1. **`typedoc.json`** - TypeDoc configuration
   - Entry points
   - Exclusions (shadcn/ui, tests)
   - Validation rules

2. **`config/quality/eslint.config.mjs`** - ESLint configuration
   - TSDoc syntax validation
   - Staged strictness levels

3. **`scripts/check-docs.mjs`** - Custom validation (ES Modules)
   - Filters Zod internal types
   - Removes noise from warnings
   - Ignores TypeScript version warnings

### IDE Integration

Most IDEs support TSDoc:

- **VS Code**: IntelliSense shows TSDoc comments
- **WebStorm**: Full TSDoc support
- **Cursor/Copilot**: Use TSDoc for better suggestions

## Examples

### Good Documentation

````typescript
/**
 * Calculates the compound interest on an investment
 *
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
 * @param time - Investment period in years
 * @param compound - Number of times interest is compounded per year
 * @returns The final amount after compound interest
 *
 * @remarks
 * Uses the formula: A = P(1 + r/n)^(nt)
 * Rate should be provided as decimal, not percentage
 *
 * @example
 * ```typescript
 * // $1000 at 5% for 10 years, compounded monthly
 * const amount = calculateCompoundInterest(1000, 0.05, 10, 12);
 * console.log(amount); // 1647.01
 * ```
 *
 * @public
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compound: number = 1
): number {
  return principal * Math.pow(1 + rate / compound, compound * time);
}
````

### Bad Documentation

```typescript
// ❌ Bad: Just restates the obvious
/**
 * Gets the user
 * @param id - The id
 * @returns The user
 */
export function getUser(id: string): User {
  // ...
}

// ❌ Bad: No documentation at all
export function processPayment(amount: number): boolean {
  // ...
}

// ❌ Bad: Wrong TSDoc syntax
/**
 * Process data
 * @ param data The data to process  // Wrong: space after @
 */
export function processData(data: unknown): void {
  // ...
}
```

## Troubleshooting

### Common Issues

#### 1. "TSDoc syntax error"

**Problem**: ESLint reports TSDoc syntax errors
**Solution**: Check for:

- Spaces after `@` symbol
- Missing parameter names
- Incorrect tag names

#### 2. "Does not have any documentation"

**Problem**: TypeDoc reports missing documentation
**Solution**: Add TSDoc comment above the exported item

#### 3. Zod schema warnings

**Problem**: Many warnings about `Schema.__type.*`
**Solution**: These are filtered automatically by `pnpm docs:check`

#### 4. Pre-push hook fails

**Problem**: Documentation validation fails on push
**Solution**:

1. Run `pnpm docs:check` to see issues
2. Add missing documentation
3. Fix TSDoc syntax errors
4. Try push again

### Getting Help

1. **Check this guide** for documentation standards
2. **Run validation** with `pnpm docs:check`
3. **Check examples** in the codebase
4. **Use IDE** IntelliSense for TSDoc hints

## Migration Guide

### From JSDoc to TSDoc

If migrating from JSDoc:

1. **Remove type annotations** - TypeScript infers these
2. **Update tags**:
   - `@typedef` → TypeScript interfaces
   - `@type` → Remove (TypeScript handles)
   - `@memberof` → Remove (not needed)
   - `@namespace` → Use modules
3. **Add TSDoc tags**:
   - Add `@remarks` for additional notes
   - Add `@public` for public APIs
   - Use `@example` with TypeScript code

### Adding to Existing Code

1. **Start with exports** - Document all exported items first
2. **Add examples** - For complex functions
3. **Document gotchas** - Use `@remarks` for non-obvious behavior
4. **Run validation** - Use `pnpm docs:check` regularly

## Best Practices

### Do's

- ✅ Write documentation as you code
- ✅ Include examples for complex functions
- ✅ Document edge cases and limitations
- ✅ Use `@remarks` for important notes
- ✅ Keep documentation up-to-date
- ✅ Use `@internal` for non-public APIs
- ✅ Run `pnpm docs:check` before pushing

### Don'ts

- ❌ Don't document the obvious
- ❌ Don't use JSDoc tags
- ❌ Don't document Zod internal types
- ❌ Don't duplicate TypeScript type info
- ❌ Don't leave TODO comments in docs
- ❌ Don't document test files
- ❌ Don't forget to update docs when code changes

## Summary

This project uses a pragmatic approach to documentation:

1. **TSDoc standard** for all documentation
2. **Staged validation** for development flexibility
3. **Smart filtering** to reduce noise
4. **Clear guidelines** on what to document

By following these guidelines, we maintain high-quality documentation without hindering development speed. Remember: good documentation is an investment in your team's future productivity!
