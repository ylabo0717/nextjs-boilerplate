# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint to check code quality

**Important:** This project uses `pnpm` as the package manager, not npm or yarn.

## Architecture

### Project Structure
This is a Next.js 15.4.6 application using the App Router architecture with React 19.1.0 and TypeScript.

**Key directories:**
- `/app/` - Next.js App Router pages and layouts
- `/lib/` - Utility functions including the `cn()` class name utility
- `/components/` - React components (will be created when adding shadcn/ui components)
- `/public/` - Static assets

### Technology Stack
- **Framework:** Next.js 15.4.6 with App Router and React Server Components
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS 4.0 with shadcn/ui component library integration
- **Icons:** Lucide React
- **Fonts:** Geist Sans and Geist Mono from next/font/google

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