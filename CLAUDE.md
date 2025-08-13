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
- `pnpm docs` - Generate API documentation with TypeDoc
- `pnpm docs:watch` - Generate documentation in watch mode

**Important:** This project uses `pnpm` as the package manager, not npm or yarn.

## Development Guidelines

### IMPORTANT: Pre-commit Checks

**Always run the following checks before committing:**

1. **Run ESLint checks**

   ```bash
   pnpm lint
   ```

2. **Run Prettier formatting**

   ```bash
   pnpm format
   ```

3. **Run TypeScript type checking**

   ```bash
   pnpm typecheck
   ```

4. **Run all pre-commit checks at once** (recommended)
   ```bash
   pnpm precommit:check
   ```
   If there are issues, attempt automatic fixes:
   ```bash
   pnpm precommit:fix
   ```

Running these checks before committing prevents failures in the pre-commit hooks. Always resolve ESLint and TypeScript errors before committing.

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

### Single Source of Truth Principle

**All configuration values, constants, and thresholds should have a single, authoritative source.**

This principle is critical for maintainability and consistency across the codebase:

1. **Constants and Configuration**
   - Define all numeric constants in centralized files (`/constants/` for app constants, `/tests/constants/test-constants.ts` for test constants)
   - Never duplicate values across multiple files
   - Use imports rather than hardcoding values

2. **Environment-Specific Values**
   - Use environment variables only for deployment-specific configuration (URLs, API keys)
   - Avoid using environment variables to override constants that should be consistent

3. **Benefits**
   - **Consistency**: Same values used everywhere
   - **Maintainability**: Update in one place, effect everywhere
   - **Clarity**: Clear where each value comes from
   - **Type Safety**: TypeScript ensures correct usage

4. **Example**

   ```typescript
   // ❌ Bad - duplicated values
   // scripts/performance-test.ts
   const TIMEOUT = 3000;
   // tests/e2e/test.spec.ts
   const TIMEOUT = 3000;

   // ✅ Good - single source
   // tests/constants/test-constants.ts
   export const PERFORMANCE_THRESHOLDS = {
     PAGE_LOAD_TIME: 3000,
   };
   // scripts/performance-test.ts
   import { PERFORMANCE_THRESHOLDS } from '../tests/constants/test-constants';
   ```

### Examples of Required Verification

- **GitHub Actions:** Always check the latest version and verify if the action is still maintained
- **Docker Images:** Verify the official image name and latest stable tags
- **npm/pnpm packages:** Check for security vulnerabilities and latest versions
- **APIs and SDKs:** Ensure you're using the current recommended approach, not legacy methods

## Documentation Management

### Document Creation Guidelines

**Working Documents Location:**

- Create work-in-progress documents, design notes, and research findings in `docs/work_dir/`
- Use descriptive file names (e.g., `github-actions-best-practices.md`, `performance-optimization-notes.md`)

**Production Documents Location:**

- Place finalized and reviewed content from `docs/work_dir/` into `docs/design_guide/`
- `docs/design_guide/` contains official design guides, architecture documents, and established best practices

**Document Management Workflow:**

1. Create new documents initially in `docs/work_dir/`
2. Once content is finalized and team consensus is reached, move or refine it to `docs/design_guide/`
3. `docs/work_dir/` contains working documents that may change frequently
4. `docs/design_guide/` contains stable content that should be modified carefully

## Architecture

### Project Structure

This is a Next.js 15.4.6 application using the App Router architecture with React 19.1.0 and TypeScript.

**Key directories:**

- `/src/` - All application source code
  - `/app/` - Next.js App Router pages and layouts
  - `/components/` - React components
    - `/ui/` - shadcn/ui base components
    - `/layout/` - Layout components (header, footer, etc.)
    - `/features/` - Feature-specific components
  - `/lib/` - Complex business logic and external service integrations
  - `/utils/` - Pure utility functions (side-effect free)
  - `/hooks/` - Custom React hooks
  - `/services/` - Business logic and API services
  - `/features/` - Feature-based modules
  - `/types/` - TypeScript type definitions
  - `/constants/` - Application constants
  - `/stores/` - State management
  - `/repositories/` - Data access layer
- `/public/` - Static assets
- `/tests/` - Test files (unit and E2E)
- `/docs/` - Documentation

### Technology Stack

- **Framework:** Next.js 15.4.6 with App Router and React Server Components
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS 4.0 with shadcn/ui component library integration
- **Icons:** Lucide React
- **Fonts:** Geist Sans and Geist Mono from next/font/google
- **Form Handling:** React Hook Form with Zod validation
- **Notifications:** Sonner for toast notifications

### Key Patterns

1. **Path Aliases:** Use `@/` for imports from src directory (e.g., `@/utils/cn`, `@/components/ui/button`)
2. **Styling:** Use Tailwind utility classes with the `cn()` utility from `@/utils/cn` for conditional classes
3. **Components:** shadcn/ui is configured - use their CLI to add components: `pnpm dlx shadcn@latest add [component-name]`
4. **CSS Variables:** The project uses CSS custom properties for theming with light/dark mode support

### shadcn/ui Configuration

- Style: "new-york"
- Base color: zinc
- CSS variables enabled
- Components will be added to `/src/components/ui/`

### Development Notes

- Turbopack is enabled for faster development builds
- No testing framework is currently configured
- ESLint is configured with Next.js and TypeScript rules
- The project is ready for Vercel deployment

## Code Documentation Standards

For comprehensive documentation guidelines, see [Documentation Guidelines](docs/design_guide/documentation-guidelines.md).

The documentation guide includes:

- TSDoc syntax and best practices
- Three-stage validation strategy (pre-commit, pre-push, CI)
- What to document vs what NOT to document
- Templates for common code patterns
- Troubleshooting and migration guides

### TSDoc Comments

All code should use TSDoc-style comments for better documentation and IDE support. This project has adopted TSDoc as the official documentation standard, replacing JSDoc.

#### For Constants and Variables

```typescript
/**
 * Maximum number of retry attempts for API calls
 *
 * @public
 */
export const MAX_RETRIES = 3;
```

#### For Objects with Properties

Use multi-line TSDoc comments for each property:

```typescript
/**
 * Application configuration constants
 *
 * @public
 */
export const CONFIG = {
  /**
   * API endpoint base URL
   *
   * @remarks
   * Used for all API requests in production
   */
  API_URL: 'https://api.example.com',

  /**
   * Request timeout
   *
   * @remarks
   * Unit: milliseconds
   */
  TIMEOUT: 5000,
} as const;
```

#### For Functions and Methods

````typescript
/**
 * Calculates the total price including tax
 *
 * @param price - The base price
 * @param taxRate - The tax rate as a decimal
 * @returns The total price including tax
 *
 * @remarks
 * Tax rate should be provided as a decimal (e.g., 0.08 for 8%)
 *
 * @example
 * ```typescript
 * const total = calculateTotal(100, 0.08); // Returns 108
 * ```
 *
 * @public
 */
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
````

#### For Classes and Interfaces

```typescript
/**
 * Represents a user in the system
 *
 * @public
 */
interface User {
  /**
   * Unique identifier
   *
   * @remarks
   * Generated UUID v4 format
   */
  id: string;

  /**
   * User's display name
   */
  name: string;

  /**
   * User's email address
   *
   * @remarks
   * Must be a valid email format
   */
  email: string;
}
```

### TSDoc Best Practices

#### Required Documentation

- Use TSDoc comments for all exported constants, functions, classes, and interfaces
- Mark public APIs with `@public` tag
- Use `@remarks` for additional explanatory content
- Add `@example` for complex functions to show usage

#### TSDoc Tags Usage

- `@param` - Parameter descriptions (no type needed, inferred from TypeScript)
- `@returns` - Return value description
- `@remarks` - Additional details, units, or constraints
- `@example` - Code examples showing usage
- `@public` - Mark as public API
- `@deprecated` - Mark deprecated functionality
- `@see` - References to related items
- `@since` - Version when feature was added

#### Style Guidelines

- Keep main description concise but informative
- Use `@remarks` for units of measurement (e.g., milliseconds, pixels)
- Update comments when code changes
- Avoid redundant comments that merely restate the code
- Use proper TSDoc syntax to ensure compatibility with documentation generation tools

#### Linting

- ESLint with `eslint-plugin-tsdoc` enforces TSDoc syntax
- Run `pnpm lint` to check TSDoc compliance
- Documentation is generated using TypeDoc with `pnpm docs`

### Documentation Validation Strategy

This project implements a **staged documentation validation approach** to balance development speed with code quality:

#### 1. Pre-commit (Development Flexibility)

- **TSDoc warnings only** - Allows quick iterations and WIP commits
- ESLint checks syntax but doesn't block commits for missing documentation
- Focus on code functionality and immediate issues

#### 2. Pre-push (Quality Gate)

- **Strict TSDoc validation** - Runs `pnpm docs:check`
- All exported items must have proper documentation
- Prevents undocumented code from being shared with the team
- Catches documentation issues before they reach the repository

#### 3. CI/CD (Final Verification)

- **Complete validation** - Runs as a separate job in CI pipeline
- Ensures all code in main/develop branches is properly documented
- Generates documentation to verify it builds successfully

#### Benefits of This Approach

- **Development Speed**: No interruption during local development
- **Code Quality**: Ensures shared code is well-documented
- **Team Collaboration**: Everyone gets properly documented code
- **Gradual Adoption**: Easy to implement in existing projects

#### Commands

- `pnpm docs` - Generate documentation (with warnings as errors)
- `pnpm docs:check` - Validate documentation without generating files
- `pnpm lint` - Check code quality (TSDoc as warnings locally)

#### Excluded from Documentation Requirements

The following are intentionally excluded from documentation requirements:

1. **shadcn/ui components** (`src/components/ui/**/*`)
   - Third-party components copied from shadcn/ui
   - Not maintained by this project
   - Excluded via `typedoc.json`

2. **Test files** (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
   - Test code doesn't need public API documentation
   - Excluded via `typedoc.json`

3. **Zod schema internal types** (`Schema.__type.*`)
   - Auto-generated by Zod's `z.object()` and `z.array()`
   - Impossible to document individually
   - Filtered out by `scripts/check-docs.mjs`

These exclusions ensure documentation efforts focus on:

- Custom business logic
- Public APIs and interfaces
- Code written and maintained by the team
- Components that serve as reusable modules

The custom `scripts/check-docs.mjs` script (ES Modules) filters TypeDoc output to remove noise from auto-generated types while still catching missing documentation on important exports.

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

When implementing or modifying GitHub Actions workflows, refer to `docs/work_dir/github-actions-best-practices.md` for detailed best practices including:

- Permissions configuration (最小権限の原則)
- Version management for Actions and tools
- Security best practices
- Performance optimization techniques
- Debugging and troubleshooting

### YAML Script Separation Policy

**Complex scripts in YAML files should be extracted to separate script files.**

When working with GitHub Actions workflows or other YAML configuration files:

1. **Keep YAML files simple and readable**
   - YAML should contain only configuration and simple one-line commands
   - Complex logic should not be embedded in YAML files

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

4. **Example**

   ```yaml
   # ❌ Bad - complex script in YAML
   - name: Process release
     run: |
       if [ -f "CHANGELOG.md" ]; then
         VERSION=$(node -p "require('./package.json').version")
         NOTES=$(awk "/^## $VERSION/,/^## [0-9]/" CHANGELOG.md)
         # ... more complex logic
       fi

   # ✅ Good - script in separate file
   - name: Process release
     run: ./scripts/ci/process-release.sh
   ```

5. **Script organization**
   - Place CI/CD scripts in `scripts/ci/`
   - Use consistent error handling (`set -euo pipefail`)
   - Add clear comments and usage instructions
   - Include validation for required environment variables

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
