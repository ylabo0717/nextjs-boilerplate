# 🚧 Next.js Boilerplate (Under Active Development)

<!-- Language Switcher -->

**Languages**: [English](./README.md) | [日本語](./README.ja.md)

---

> **⚠️ This project is currently under active development and not yet production-ready. Features and APIs may change.**

A production-ready Next.js boilerplate with TypeScript, Tailwind CSS, shadcn/ui, and comprehensive development tooling.

## 📋 Prerequisites

- **Node.js 20.x or higher**
- **pnpm 8.x or higher**
- **Gitleaks** (for secret scanning)
- **Docker & Docker Compose** (for containerized development)

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

## 🚀 Quick Start

This section explains how to set up the project quickly and verify it's working correctly.

### 🐳 Docker Version (Recommended)

The Docker version is recommended as it avoids environment-specific issues. See [Docker Installation Guide](#docker-installation) below for detailed setup instructions.

#### Quick Setup

```bash
# Clone the repository
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# Copy environment file
cp .env.dev.example .env

# Start the development server with Docker
pnpm docker:dev
```

The application will be available at:
- **Development server**: http://localhost:3010
- **Storybook**: http://localhost:6016

#### Development Commands

```bash
# Start development server
pnpm docker:dev

# Run tests
pnpm docker:test

# Run linting
pnpm docker:lint

# Type checking
pnpm docker:type-check
```

#### Stop and Cleanup

```bash
# Stop containers
pnpm docker:down

# Remove containers and volumes (complete cleanup)
pnpm docker:clean
```

### 💻 Local Version

#### Prerequisites Check

Before starting, ensure you have the required tools installed:

```bash
# Check Node.js version (should be 20.x or higher)
node --version

# Check pnpm version (should be 8.x or higher) 
pnpm --version

# Check if Gitleaks is installed
gitleaks version
```

#### Setup Steps

```bash
# Clone the repository
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# Install dependencies
pnpm install

# Copy environment file
cp .env.dev.example .env

# Start development server
pnpm dev
```

#### Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Testing
pnpm test
pnpm test:ui

# Storybook
pnpm storybook

# Build
pnpm build
```

## 🏗️ Project Structure

```
📁 nextjs-boilerplate/
├── 📁 .changeset/           # Changeset configuration for version management
├── 📁 .claude/              # Claude AI configuration files
├── 📁 .github/              # GitHub workflows and templates
├── 📁 .husky/               # Git hooks configuration
├── 📁 .serena/              # Serena AI assistant configuration 
├── 📁 .vscode/              # VS Code settings and extensions
├── 📁 config/               # Build and tool configurations
├── 📁 docker/               # Docker configurations
├── 📁 docs/                 # Developer guides and documentation
├── 📁 public/               # Static assets
├── 📁 scripts/              # Build and utility scripts
├── 📁 src/                  # Source code
│   ├── 📁 app/              # Next.js App Router pages
│   ├── 📁 components/       # React components
│   │   ├── 📁 functional/   # Business logic components
│   │   ├── 📁 templates/    # Page templates
│   │   └── 📁 ui/           # UI components (shadcn/ui)
│   ├── 📁 hooks/            # Custom React hooks
│   ├── 📁 lib/              # Utility libraries
│   ├── 📁 stores/           # State management
│   ├── 📁 styles/           # Global styles
│   └── 📁 utils/            # Utility functions
├── 📁 tests/                # Test files
└── 📁 types/                # TypeScript type definitions
```

## ⚙️ Configuration

### Environment Variables

The project uses a layered environment configuration system:

1. **`.env.base.example`** - Base configuration template
2. **`.env.dev.example`** - Development-specific settings  
3. **`.env.prod.example`** - Production-specific settings
4. **`.env.test.example`** - Test-specific settings

Copy the appropriate example file to `.env` for your environment:

```bash
# For development
cp .env.dev.example .env

# For production  
cp .env.prod.example .env

# For testing
cp .env.test.example .env
```

### Key Configuration Files

- **`next.config.ts`** - Next.js configuration with Turbopack and strict mode
- **`eslint.config.mjs`** - ESLint configuration with TypeScript support
- **`tsconfig.json`** - TypeScript configuration with strict mode
- **`tailwind.config.ts`** - Tailwind CSS configuration with shadcn/ui
- **`package.json`** - Dependencies and scripts

## 🧪 Testing

### Test Structure

```
📁 tests/
├── 📁 __mocks__/            # Mock files
├── 📁 components/           # Component tests
├── 📁 e2e/                  # End-to-end tests
├── 📁 integration/          # Integration tests
├── 📁 unit/                 # Unit tests
└── 📁 utils/                # Test utilities
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with UI (Vitest UI)
pnpm test:ui

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/components/ui/Button.test.tsx

# Run tests with coverage
pnpm test:coverage
```

### Test Technologies

- **Vitest** - Fast unit testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Jest DOM matchers
- **MSW (Mock Service Worker)** - API mocking

## 📚 Documentation

### Developer Guides

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System architecture and design patterns
- **[Component Guide](./docs/COMPONENTS.md)** - Component development guidelines
- **[Styling Guide](./docs/STYLING.md)** - CSS and Tailwind CSS best practices
- **[Testing Guide](./docs/TESTING.md)** - Testing strategies and best practices
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Deployment and CI/CD setup

### API Documentation

- **[Storybook](http://localhost:6016)** - Component documentation and examples (when running locally)

## 🐳 Docker Installation

### System Requirements

- **Docker Desktop** or **Docker Engine** with **Docker Compose v2**
- **Minimum 4GB RAM** allocated to Docker
- **10GB free disk space**

### Installation Steps

#### Windows/macOS
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop
3. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

#### Linux
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### Docker Configuration

The project includes optimized Docker configurations:

- **`docker/Dockerfile.dev`** - Development container with hot reload
- **`docker/Dockerfile.prod`** - Production container with optimized build
- **`docker/docker-compose.dev.yml`** - Development services
- **`docker/docker-compose.prod.yml`** - Production services

### Docker Commands Reference

```bash
# Development
pnpm docker:dev           # Start development environment
pnpm docker:dev:build     # Rebuild development containers
pnpm docker:logs          # View container logs

# Testing
pnpm docker:test          # Run tests in container
pnpm docker:test:watch    # Run tests in watch mode
pnpm docker:lint          # Run linting
pnpm docker:type-check    # Run type checking

# Production
pnpm docker:prod          # Start production environment
pnpm docker:prod:build    # Build production containers

# Maintenance
pnpm docker:down          # Stop containers
pnpm docker:clean         # Remove containers and volumes
pnpm docker:shell         # Access container shell
```

## 🔧 Development Tools

### Code Quality

- **ESLint** - JavaScript/TypeScript linting with strict rules
- **Prettier** - Code formatting with consistent style
- **TypeScript** - Static type checking with strict mode
- **Husky** - Git hooks for pre-commit quality checks
- **lint-staged** - Run linters on staged files only

### Build Tools

- **Turbopack** - Next.js bundler for fast development builds
- **pnpm** - Fast, space-efficient package manager
- **Changesets** - Version management and changelog generation

### Development Experience

- **Storybook** - Component development and documentation
- **VS Code Extensions** - Recommended extensions for optimal DX
- **Path Aliases** - Clean imports with `@/` prefix
- **Hot Reload** - Instant feedback during development

## 🚀 Deployment

### Deployment Options

1. **[Vercel](https://vercel.com)** (Recommended)
   - Native Next.js support with zero configuration
   - Automatic deployments from Git
   - Edge Functions and ISR support

2. **[Railway](https://railway.app)**
   - Simple container deployment
   - Automatic HTTPS and custom domains
   - Built-in monitoring and logs

3. **Docker Container**
   - Use provided production Dockerfile
   - Deploy to any container platform
   - Full control over environment

### Environment Setup

For production deployment, ensure these environment variables are configured:

```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
# Add your production-specific variables here
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper tests
4. Run quality checks: `pnpm lint && pnpm type-check && pnpm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ylabo0717/nextjs-boilerplate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ylabo0717/nextjs-boilerplate/discussions)

---

## 🎯 Roadmap

### Phase 1: Foundation (Current)
- [x] Basic Next.js setup with TypeScript
- [x] Tailwind CSS integration
- [x] shadcn/ui component library
- [x] ESLint and Prettier configuration
- [x] Docker development environment
- [x] Basic testing setup with Vitest
- [x] Storybook for component development

### Phase 2: Advanced Features (In Progress)
- [ ] Authentication system (NextAuth.js)
- [ ] Database integration (Prisma + PostgreSQL)
- [ ] API route examples
- [ ] Comprehensive test coverage
- [ ] CI/CD pipeline improvements
- [ ] Performance optimization

### Phase 3: Production Ready (Planned)
- [ ] Security hardening
- [ ] Monitoring and logging
- [ ] Error tracking (Sentry)
- [ ] Analytics integration
- [ ] SEO optimization
- [ ] Accessibility improvements

## 📊 Project Status

- **Development**: Active
- **Stability**: Alpha (APIs may change)
- **Test Coverage**: In Progress
- **Documentation**: In Progress
- **Production Ready**: Not Yet

---

*This boilerplate is actively maintained and regularly updated with the latest Next.js features and best practices.*
