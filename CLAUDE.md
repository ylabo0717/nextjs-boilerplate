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

### Quality Checks and Debugging

- `pnpm quality:check` - Run quality gate checks (type errors, lint, coverage, etc.)
- `pnpm quality:check:verbose` - Run quality checks with detailed debug output
- `pnpm quality:analyze` - Analyze code quality metrics
- `pnpm quality:analyze:verbose` - Analyze code quality with detailed debug output
- `pnpm quality:report` - Generate unified quality report
- `pnpm quality:report:verbose` - Generate report with detailed debug output

**Verbose Mode:** Add `--verbose` flag to any quality script for detailed debugging information. This is especially useful when troubleshooting CI/CD failures.

**Important:** This project uses `pnpm` as the package manager, not npm or yarn.

### Environment Variables and Docker

**Integrated Environment Variable System:**

This project uses an integrated environment variable system that separates common settings from environment-specific configurations for better maintainability.

**Environment Variable File Structure:**

- `.env.base.example` - Common settings for all environments
- `.env.dev.example` - Development-specific settings
- `.env.prod.example` - Production-specific settings
- `.env.test.example` - Test-specific settings

**Docker Compose Usage:**

```bash
# Development environment
docker compose -f docker/compose/docker-compose.yml --env-file .env.base --env-file .env.dev up

# Production environment
docker compose -f docker/compose/docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d

# Test environment (environment variables are automatically loaded)
pnpm test
```

**Initial Setup:**

```bash
cp .env.base.example .env.base
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod
cp .env.test.example .env.test
```

For detailed information, see [`docs/environment-variables.md`](docs/environment-variables.md).

## Essential Workflow

### IMPORTANT: Code Quality Standards

**🚨 STRICT ENFORCEMENT:**

- **Never skip pre-commit hooks** with `--no-verify` or similar flags
- **Never disable ESLint rules** without proper justification and approval
- **All TypeScript errors must be resolved** before committing
- **All ESLint errors must be properly fixed** (not suppressed)
- **Security linting rules are mandatory** and cannot be bypassed

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

### IMPORTANT: Follow PR Review Checklist

**All Pull Requests must follow the comprehensive review checklist:**

📋 **Review Checklist**: [`docs/developer_guide/review-checklist.md`](docs/developer_guide/review-checklist.md)

**For PR Authors:**

1. **Self-review using the checklist** before submitting the PR
2. **Copy the PR template** from the checklist into your PR description
3. **Check off applicable items** to demonstrate compliance with standards

**For Code Reviewers:**

1. **Use the priority-based structure** (🚨 Blocker → ⚠️ Important → 💡 Improvement)
2. **Focus on blocking issues first** - security, type safety, CI failures
3. **Follow the reviewer guidelines** for consistent feedback quality

### IMPORTANT: Create Changeset for User-Facing Changes

**When implementing features, fixing bugs, or making any user-facing changes, always create a Changeset:**

1. **Create a Changeset after implementing your changes**

   ```bash
   pnpm changeset:add
   ```

   - Select the appropriate version bump (patch for fixes, minor for features, major for breaking changes)
   - Write a clear description of what changed from the user's perspective

2. **Include the Changeset in your PR**
   - Commit the generated `.changeset/*.md` file along with your code changes
   - This ensures your changes are properly documented for the next release

For detailed instructions, see [Changeset Developer Guide](docs/developer_guide/changeset-developer-guide.md).

### IMPORTANT: Follow Project Standards

**Before implementing any feature or using any library/tool:**

- **Verify latest versions** of libraries, tools, and GitHub Actions
- **Research current best practices** before implementation
- **Use Single Source of Truth (SSOT)** - constants from `src/constants/`, test constants from `tests/constants/`
- **Follow TypeScript standards** - no `any`, use TSDoc for public APIs, Zod for validation
- **Pure functions first** - stateless functions with no side effects, avoid classes except extreme cases
- **Test with constants** - no magic numbers, use `tests/constants/test-constants.ts`

## Technical Guidelines

For detailed implementation standards, refer to the specialized guidelines:

### Core Standards

- 📖 [**Coding Guidelines**](docs/developer_guide/coding-guidelines.md) - SSOT principles, architecture patterns, pure functions
- 📝 [**TypeScript Guidelines**](docs/developer_guide/typescript-guidelines.md) - Type safety, TSDoc standards, Zod validation
- ⚛️ [**Next.js Patterns**](docs/developer_guide/nextjs-patterns.md) - Server/Client Components, async params, data fetching
- 🏗️ [**Architecture Guidelines**](docs/developer_guide/architecture-guidelines.md) - Pure functions first, functional design patterns

### Quality & Security

- 🔒 [**Security Guidelines**](docs/developer_guide/security-guidelines.md) - Secure implementation, authentication patterns
- 🚀 [**Performance Guidelines**](docs/developer_guide/performance-guidelines.md) - Optimization, accessibility standards
- 🧪 [**Testing Guidelines**](docs/developer_guide/testing-guidelines.md) - Test pyramid, constants management
- 📋 [**Review Checklist**](docs/developer_guide/review-checklist.md) - PR review standards and templates

### Documentation & Process

- 📚 [**Documentation Guidelines**](docs/developer_guide/documentation-guidelines.md) - TSDoc standards, validation strategy
- 🔄 [**Development Guidelines**](docs/developer_guide/development-guidelines.md) - State management, error handling, styling
- 📦 [**Changeset Developer Guide**](docs/developer_guide/changeset-developer-guide.md) - Release management process

## Project Configuration

### Technology Stack

- **Framework:** Next.js 15.4.6 with App Router and React Server Components
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS 4.0 with shadcn/ui component library integration
- **Testing:** Vitest (Unit) + Playwright (E2E)
- **Architecture:** Pure functions first (stateless functions with no side effects, avoid classes except extreme cases)

### Configuration Structure

This project uses an organized configuration structure with settings grouped by functionality in the `config/` directory:

- **`config/security/`** - Security-related configurations (Gitleaks, Semgrep)
- **`config/quality/`** - Code quality tools (ESLint, Prettier, lint-staged)
- **`config/performance/`** - Performance measurement (Lighthouse CI)
- **`config/build/`** - Build-related configurations (PostCSS)

For detailed information about each configuration file and its usage, see [`docs/developer_guide/configuration-structure.md`](docs/developer_guide/configuration-structure.md).

### Repository Setup for New Projects

When using this boilerplate for a new project:

1. **Automatic Setup (Recommended)**
   - Run `./scripts/setup-repository.sh` after cloning
   - This script automatically configures the repository name in all necessary files

2. **Manual Configuration**
   - Update `package.json` project name
   - Configure `.changeset/config.json` GitHub repository
   - Update `README.md` project title

## Git Commit Convention

This project uses **Conventional Commits** specification. All commit messages are validated by commitlint.

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Key Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

**IMPORTANT: All commit messages must be written in English.**

### Pre-commit Hooks

The following checks run automatically on commit:

1. **ESLint** - Code quality checks and auto-fixing
2. **Prettier** - Code formatting
3. **TypeScript** - Type checking
4. **Commitlint** - Commit message validation

If any of these checks fail, the commit will be aborted. Fix the issues and try again.

## Important Instructions for Claude

### Code Analysis and Exploration

**IMPORTANT: Always use Serena tools for code analysis and exploration:**

- **Use `mcp__serena__find_symbol`** for finding functions, classes, or variables by name
- **Use `mcp__serena__get_symbols_overview`** to understand file structure before making changes
- **Use `mcp__serena__search_for_pattern`** for pattern-based code searches
- **Use `mcp__serena__find_referencing_symbols`** to understand symbol usage
- **NEVER use basic Read tool** for exploring large code files when Serena tools are available
- **Use Read tool only** for small files, configuration files, or when you need exact line-by-line content

This approach is significantly more efficient and token-conscious than reading entire files.  
For details, refer to `.claude/commands/serena.md`

### Question Handling

When the user asks a question (indicated by question marks or interrogative phrases), ONLY answer the question without making any code changes or file modifications. Do not proactively fix or modify anything unless explicitly requested. If the user wants changes made after your answer, they will explicitly ask for them.

### Development Context

- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.

### Testing Standards

**CRITICAL: NO TEST SKIPPING ALLOWED**

- **NEVER skip tests** with `test.skip()`, `describe.skip()`, or similar methods
- **NEVER comment out failing tests** to make test suites pass
- **ALWAYS fix the underlying issue** that causes test failures
- **All tests must pass** before considering a task complete
- When encountering test failures, **debug and fix the root cause** rather than avoiding the problem
- Test failures indicate real issues that must be resolved, not bypassed
