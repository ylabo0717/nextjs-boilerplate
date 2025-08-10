# Next.js Boilerplate

## Testing

Run unit/integration tests with Vitest:

```bash
pnpm test            # all (unit+integration)
pnpm test:unit       # unit only
pnpm test:integration # integration only
pnpm test:coverage   # coverage for unit+integration
```

E2E (Playwright) will be added in a separate step.

A production-ready Next.js boilerplate with TypeScript, Tailwind CSS, shadcn/ui, and comprehensive development tooling.

## 🚀 Features

### Core Technologies

- **Next.js 15.4.6** - React framework with App Router
- **React 19.1.0** - Latest React with Server Components
- **TypeScript** - Type-safe development with strict mode
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components

### Development Experience

- **Turbopack** - Lightning-fast HMR
- **ESLint & Prettier** - Code quality and formatting
- **Husky & lint-staged** - Pre-commit hooks for code quality
- **Commitlint** - Conventional commit messages
- **Path aliases** - Clean imports with `@/` prefix

### UI Components (shadcn/ui)

- Form components with React Hook Form integration
- Toast notifications with Sonner
- Dialog, Card, Button, Input, Select, and more
- Dark mode support with CSS variables
- Tailwind CSS plugin for automatic class sorting

## 📋 Prerequisites

- Node.js 20.x or higher
- pnpm 8.x or higher

## 🛠️ Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nextjs-boilerplate.git
cd nextjs-boilerplate
```

1. Install dependencies:

```bash
pnpm install
```

1. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 📦 Available Scripts

```bash
# Development
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
pnpm format:check # Check code formatting
pnpm typecheck    # Run TypeScript type checking

# Git Hooks (automatic)
# Pre-commit: ESLint, Prettier, TypeScript checks
# Commit-msg: Conventional commit validation
```

## 📁 Project Structure

```
nextjs-boilerplate/
├── app/                  # Next.js App Router
│   ├── layout.tsx       # Root layout with providers
│   ├── page.tsx         # Home page
│   └── example/         # Example page with form demo
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   └── utils.ts         # Utility functions (cn, etc.)
├── hooks/               # Custom React hooks
├── services/            # Business logic and API services
├── features/            # Feature-based modules
├── types/               # TypeScript type definitions
├── constants/           # Application constants
├── public/              # Static assets
└── docs/                # Documentation
```

## 🎨 UI Components

This boilerplate includes pre-configured shadcn/ui components:

### Adding New Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Available Components

- **Forms**: Input, Label, Form (with React Hook Form)
- **Feedback**: Toast (Sonner), Alert
- **Overlay**: Dialog, Dropdown Menu
- **Display**: Card, Separator, Skeleton
- **Buttons**: Button with multiple variants

### Example Usage

```tsx
  return <Button onClick={() => toast.success('Hello!')}>Click me</Button>;
}
```

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- Path aliases configured (`@/*`)
- Target: ES2017

### ESLint

- Next.js recommended rules
- TypeScript integration
- Prettier integration

### Tailwind CSS

- Version 4 with CSS variables
- Dark mode support
- Custom theme with zinc color palette
- Automatic class sorting with Prettier

### Git Hooks

- **Pre-commit**: Runs ESLint, Prettier, and TypeScript checks
- **Commit-msg**: Validates commit messages against Conventional Commits

## 📝 Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat: add user authentication
fix: resolve login error
docs: update README
style: format code
refactor: extract API client
perf: optimize image loading
test: add unit tests
chore: update dependencies
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test updates
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes

## 🎯 Example Page

Visit `/example` to see a demonstration of:

- Form validation with React Hook Form and Zod
- Toast notifications with Sonner
- Various button styles and variants
- Responsive layout with Tailwind CSS

## 🚢 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nextjs-boilerplate)

### Docker

```dockerfile
# Dockerfile example coming in Phase 3
```

### Environment Variables

Create a `.env.local` file:

```env
# Add your environment variables here
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 📚 Documentation

- [Design Document](./docs/nextjs_boilerplate_design.md) - Architecture and design decisions
- [Phase 1 Status](./docs/phase1_implementation_status.md) - Implementation progress
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel](https://vercel.com/) - Platform for deploying Next.js apps

## 🔮 Roadmap

### Phase 1 ✅ (Completed)

- Basic Next.js setup
- TypeScript configuration
- ESLint/Prettier setup
- Tailwind CSS v4
- shadcn/ui components
- Git hooks with Husky

### Phase 2 (Planned)

- Vitest for unit testing
- Playwright for E2E testing
- GitHub Actions CI/CD
- Testing infrastructure

### Phase 3 (Planned)

- Docker Compose setup
- OpenTelemetry integration
- Structured logging with Pino
- Monitoring and observability

### Phase 4 (Planned)

- TanStack Query setup
- Zustand state management
- API client infrastructure
- Zod schema validation

### Phase 5 (Planned)

- NextAuth.js authentication
- Security headers (CSP, etc.)
- Rate limiting
- Session management

---

Built with ❤️ using Next.js and modern web technologies
