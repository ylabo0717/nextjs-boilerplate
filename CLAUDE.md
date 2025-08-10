# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Git Commit Convention

This project uses **Conventional Commits** specification. All commit messages are validated by commitlint.

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
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
