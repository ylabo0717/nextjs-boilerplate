# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- All responses must be written in Japanese.

## Commands

### Development

- `pnpm dev` - Start development server with Turbopack (runs on <http://localhost:3000>)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint to check code quality
- `pnpm format` - Format all files with Prettier
- `pnpm format:check` - Check if files are formatted correctly
- `pnpm typecheck` - Run TypeScript type checking

**Important:** This project uses `pnpm` as the package manager, not npm or yarn.

## Development Guidelines

### IMPORTANT: Verify Latest Versions and Best Practices

**Before implementing any feature or using any library/tool:**

1. **Always verify the latest stable version** of libraries, tools, and GitHub Actions
   - Check official documentation and GitHub repositories
   - Verify if the tool/action is deprecated or has newer alternatives
   - Use specific version tags rather than `latest` for reproducibility

2. **Research current best practices** before implementation
   - Check official documentation for recommended patterns
   - Verify security best practices for the specific use case
   - Look for community standards and widely adopted patterns

3. **Validate external suggestions and recommendations**
   - Don't blindly trust AI suggestions (including GitHub Copilot)
   - Cross-reference with official documentation
   - Test recommendations in development before applying to production

4. **Stay updated with deprecation notices**
   - Check for deprecation warnings in documentation
   - Look for migration guides when tools are deprecated
   - Replace deprecated dependencies proactively

### Examples of Required Verification

- **GitHub Actions:** Always check the latest version and verify if the action is still maintained
- **Docker Images:** Verify the official image name and latest stable tags
- **npm/pnpm packages:** Check for security vulnerabilities and latest versions
- **APIs and SDKs:** Ensure you're using the current recommended approach, not legacy methods

## Architecture

### Project Structure

This is a Next.js 15.4.6 application using the App Router architecture with React 19.1.0 and TypeScript.

**Key directories:**

- `/app/` - Next.js App Router pages and layouts
- `/lib/` - Utility functions including the `cn()` class name utility
- `/components/` - React components (will be created when adding shadcn/ui components)
- `/public/` - Static assets
- `/hooks/` - Custom React hooks
- `/services/` - Business logic and API services
- `/features/` - Feature-based modules
- `/types/` - TypeScript type definitions
- `/constants/` - Application constants

### Technology Stack

- **Framework:** Next.js 15.4.6 with App Router and React Server Components
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS 4.0 with shadcn/ui component library integration
- **Icons:** Lucide React
- **Fonts:** Geist Sans and Geist Mono from next/font/google
- **Form Handling:** React Hook Form with Zod validation
- **Notifications:** Sonner for toast notifications

### Key Patterns

1. **Path Aliases:** Use `@/` for imports from root (e.g., `@/lib/utils`)
2. **Styling:** Use Tailwind utility classes with the `cn()` utility from `@/lib/utils` for conditional classes
3. **Components:** shadcn/ui is configured - use their CLI to add components: `pnpm dlx shadcn@latest add [component-name]`
4. **CSS Variables:** The project uses CSS custom properties for theming with light/dark mode support

### shadcn/ui Configuration

- Style: "new-york"
- Base color: zinc
- CSS variables enabled
- Components will be added to `/components/ui/`

### Development Notes

- Turbopack is enabled for faster development builds
- No testing framework is currently configured
- ESLint is configured with Next.js and TypeScript rules
- The project is ready for Vercel deployment

## Code Documentation Standards

### JSDoc Comments

All code should use JSDoc-style comments for better documentation and IDE support:

#### For Constants and Variables

```typescript
/**
 * Maximum number of retry attempts for API calls
 */
export const MAX_RETRIES = 3;
```

#### For Objects with Properties

Use multi-line JSDoc comments for each property:

```typescript
export const CONFIG = {
  /**
   * API endpoint base URL
   */
  API_URL: 'https://api.example.com',

  /**
   * Request timeout in milliseconds
   */
  TIMEOUT: 5000,
} as const;
```

#### For Functions and Methods

```typescript
/**
 * Calculates the total price including tax
 * @param price - The base price
 * @param taxRate - The tax rate as a decimal (e.g., 0.08 for 8%)
 * @returns The total price including tax
 */
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

#### For Classes and Interfaces

```typescript
/**
 * Represents a user in the system
 */
interface User {
  /** Unique identifier */
  id: string;

  /** User's display name */
  name: string;

  /** User's email address */
  email: string;
}
```

### Best Practices

- Use JSDoc comments for all exported constants, functions, classes, and interfaces
- Keep comments concise but informative
- Include units of measurement where applicable (e.g., milliseconds, pixels)
- Update comments when code changes
- Avoid redundant comments that merely restate the code

## Testing Best Practices

### No Magic Numbers Policy

**Magic numbers are strictly prohibited in test files.** All numeric values should be defined as named constants in `/tests/constants/test-constants.ts` to improve code readability, maintainability, and consistency.

#### Why No Magic Numbers?

- **Clarity**: Named constants clearly express the intent and meaning of values
- **Maintainability**: Values can be updated in one central location
- **Consistency**: Ensures the same values are used across all test files
- **Documentation**: Constants serve as self-documenting code

#### How to Handle Numeric Values

```typescript
// ❌ Bad - using magic numbers
await page.waitForTimeout(500);
await page.setViewportSize({ width: 1920, height: 1080 });
expect(loadTime).toBeLessThan(3000);
await page.evaluate(() => window.scrollTo(0, 500));

// ✅ Good - using named constants
import {
  UI_WAIT_TIMES,
  VIEWPORT_SIZES,
  NETWORK_WAIT_TIMES,
  SCROLL_POSITIONS,
} from '../constants/test-constants';

await page.waitForTimeout(UI_WAIT_TIMES.STANDARD);
await page.setViewportSize(VIEWPORT_SIZES.DESKTOP);
expect(loadTime).toBeLessThan(NETWORK_WAIT_TIMES.API_RESPONSE);
await page.evaluate((scrollY) => window.scrollTo(0, scrollY), SCROLL_POSITIONS.STANDARD);
```

#### Important Note for page.evaluate()

When using constants inside `page.evaluate()`, you must pass them as arguments since the browser context cannot access external variables:

```typescript
// ❌ Wrong - constant not accessible in browser context
await page.evaluate(() => window.scrollTo(0, SCROLL_POSITIONS.STANDARD));

// ✅ Correct - pass constant as argument
await page.evaluate((scrollY) => window.scrollTo(0, scrollY), SCROLL_POSITIONS.STANDARD);
```

### Available Test Constants

All test constants are defined in `/tests/constants/test-constants.ts`:

- **UI_WAIT_TIMES**: For UI interactions (MINIMAL: 100ms, SHORT: 300ms, STANDARD: 500ms, LONG: 1000ms, EXTRA_LONG: 2000ms)
- **NETWORK_WAIT_TIMES**: For network operations (API_RESPONSE: 3000ms, PAGE_LOAD: 5000ms, NETWORK_IDLE: 2000ms)
- **TEST_TIMEOUTS**: For test case timeouts (DEFAULT: 30s, EXTENDED: 60s, QUICK: 10s)
- **RETRY_CONFIG**: For retry logic (MAX_RETRIES: 3, RETRY_DELAY: 1000ms)
- **ANIMATION_DURATIONS**: For animations (TRANSITION: 300ms, MODAL: 400ms, DROPDOWN: 200ms)
- **WEBSERVER_TIMEOUT**: For web server startup (STARTUP: 120s)
- **SCROLL_POSITIONS**: For scroll testing (STANDARD: 500px)
- **PERFORMANCE_THRESHOLDS**: For performance metrics (FCP_GOOD: 1800ms, MEMORY_INCREASE_MAX: 50MB)
- **VIEWPORT_SIZES**: For responsive testing (DESKTOP: 1920x1080, MOBILE: 375x667)

### Adding New Constants

When you encounter a new numeric value in tests:

1. **Identify the purpose** of the value
2. **Choose an appropriate category** or create a new one if needed
3. **Add the constant** to `/tests/constants/test-constants.ts` with:
   - A descriptive name in UPPER_SNAKE_CASE
   - A JSDoc comment explaining its purpose and unit
4. **Import and use** the constant in your test files

## GitHub Actions

When implementing or modifying GitHub Actions workflows, refer to `docs/github-actions-best-practices.md`.

## Git Commit Convention

This project uses **Conventional Commits** specification. All commit messages are validated by commitlint.

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

#### Best Practices for Commit Messages

1. **First Line (Header) - Keep it concise**
   - Maximum 100 characters (enforced by commitlint)
   - Format: `<type>(<scope>): <subject>`
   - Should be a complete sentence that summarizes the change
   - Use present tense ("add feature" not "added feature")

2. **Message Body - Add details when needed**
   - Separate from header with a blank line
   - Explain **what** and **why** vs. how
   - Wrap lines at 72 characters for better readability
   - Use bullet points for multiple changes

3. **When to use message body**
   - Multiple related changes in one commit
   - Complex changes that need explanation
   - Breaking changes that affect users
   - Performance improvements with metrics

#### Example of a Well-Formatted Commit Message

```text
feat: enforce no magic numbers policy in test files

- Renamed timeouts.ts to test-constants.ts for broader scope
- Added constants for scroll positions, performance thresholds, viewport sizes
- Updated all test files to use named constants
- Updated CLAUDE.md with comprehensive policy documentation

This improves code maintainability and makes test values self-documenting.
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **revert**: Reverts a previous commit

### Examples

```bash
# New feature
git commit -m "feat: add user authentication"

# Bug fix
git commit -m "fix: resolve login error handling"

# Documentation update
git commit -m "docs: add installation instructions to README"

# Code formatting
git commit -m "style: fix ESLint errors"

# Refactoring
git commit -m "refactor: extract API client to shared module"

# With scope
git commit -m "feat(auth): add OAuth provider support"

# Breaking change
git commit -m "feat!: change API response format

BREAKING CHANGE: API responses now use camelCase instead of snake_case"
```

### Pre-commit Hooks

The following checks run automatically on commit:

1. **ESLint** - Code quality checks and auto-fixing
2. **Prettier** - Code formatting
3. **TypeScript** - Type checking
4. **Commitlint** - Commit message validation

If any of these checks fail, the commit will be aborted. Fix the issues and try again.

## Important Instructions for Claude

### Question Handling

When the user asks a question (indicated by question marks or interrogative phrases), ONLY answer the question without making any code changes or file modifications. Do not proactively fix or modify anything unless explicitly requested. If the user wants changes made after your answer, they will explicitly ask for them.
