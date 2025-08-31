# 🚧 Next.js Boilerplate (Under Active Development)

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

The Docker version is recommended as it avoids environment-specific issues. See [Docker Installation Guide](#docker-installation) for detailed setup instructions.

#### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# 2. Copy environment files
cp .env.base.example .env.base
cp .env.dev.example .env.dev

# 3. Start development environment
pnpm docker:dev
```

#### Verification

```bash
# Access application (open in browser)
open http://localhost:3000

# Run all tests in Docker environment
pnpm docker:test

# Run individual test types
pnpm docker:test:unit        # Unit tests
pnpm docker:test:integration # Integration tests
pnpm docker:test:e2e         # E2E tests
```

### 💻 Local Development

For local development without Docker. See [Tool Installation Guide](#tool-installation) for detailed setup instructions.

#### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# 2. Install dependencies
pnpm install

# 3. Install Playwright browsers
pnpm exec playwright install

# 4. Copy environment files
cp .env.base.example .env.base
cp .env.dev.example .env.dev
cp .env.test.example .env.test

# 5. Start development server
pnpm dev
```

#### Verification

```bash
# Access application (open in browser)
open http://localhost:3000

# Code quality check
pnpm precommit:check

# Run tests
pnpm test:unit           # Unit tests
pnpm test:integration    # Integration tests
pnpm test:e2e           # E2E tests
pnpm test:coverage      # Test coverage
```

### 🔍 Git Hooks Verification

The project has pre-commit and pre-push hooks configured:

```bash
# 1. Create a test file to verify hooks
echo "console.log('test');" > test-file.js
git add test-file.js

# 2. Commit (pre-commit hook will run)
git commit -m "test: check pre-commit hooks"
# ESLint, Prettier, and TypeScript checks run automatically

# 3. Push (pre-push hook will run)
git push
# Gitleaks secret scanning will run

# 4. Clean up test file
git rm test-file.js
git commit -m "test: cleanup test file"
```

### ✅ Setup Completion Verification

If all the following succeed, your setup is complete:

- [ ] Application displays correctly at http://localhost:3000
- [ ] `pnpm precommit:check` completes without errors
- [ ] `pnpm test:unit` passes all tests
- [ ] `pnpm test:integration` passes all tests
- [ ] `pnpm test:e2e` passes all tests
- [ ] Pre-commit hooks work on git commit
- [ ] Pre-push hooks work on git push

### 🚨 Troubleshooting

**Node.js Version Issues:**

```bash
# Check current version
node --version  # Should be 20.x.x or higher

# If pnpm is missing
npm install -g pnpm

# Clear npm/pnpm cache if needed
npm cache clean --force
pnpm store prune
```

**Docker Issues:**

```bash
# Check Docker status
docker --version
docker compose version

# Docker not running
sudo systemctl start docker  # Linux
# Start Docker Desktop # macOS/Windows

# Port conflicts
# Kill processes using port 3000
lsof -ti:3000 | xargs kill -9
```

**Permission Errors:**

```bash
# Linux/macOS file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh

# Docker permission denied
sudo usermod -aG docker $USER  # Logout required
```

**Test Environment Issues:**

```bash
# Reset test environment
rm -rf node_modules
pnpm install
pnpm exec playwright install

# For known test limitations
SKIP_LOKI_TESTS=true pnpm test:integration
```

For detailed FAQ and advanced troubleshooting, see [docs/developer_guide/docker/faq.md](docs/developer_guide/docker/faq.md).

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

# Testing
pnpm test:unit         # Unit tests with Vitest
pnpm test:integration  # Integration tests with Vitest
pnpm test:coverage     # Generate test coverage report
pnpm test:scripts      # Run scripts tests
pnpm test:e2e          # End-to-end tests with Playwright

# Docker Commands
pnpm docker:test       # Run all Docker tests
pnpm docker:dev        # Start development environment
pnpm docker:prod       # Start production environment

# Quality Metrics & Analysis
pnpm metrics           # Measure project metrics
pnpm quality:check     # Run quality gate checks
pnpm quality:analyze   # Analyze code quality
pnpm quality:report    # Generate quality report

# Documentation & Release
pnpm docs:check        # Check documentation completeness
pnpm changeset         # Create changeset for version management
pnpm changeset:version # Update version based on changesets
pnpm release           # Build and publish release

# Git Hooks (automatic)
# Pre-commit: ESLint, Prettier, TypeScript checks
# Commit-msg: Conventional commit validation
```

## 🧪 Testing

This project includes comprehensive testing with multiple frameworks and approaches.

### Running Tests

Run unit/integration tests with Vitest:

```bash
pnpm test            # all (unit+integration)
pnpm test:unit       # unit only
pnpm test:integration # integration only
pnpm test:coverage   # coverage for unit+integration
```

Run end-to-end tests with Playwright:

```bash
pnpm test:e2e        # E2E tests
```

### Test Architecture

- **Unit Tests**: Fast, isolated component/function tests
- **Integration Tests**: Database and API integration testing with Docker containers
- **E2E Tests**: Full user workflow testing with Playwright
- **Coverage Reports**: Comprehensive code coverage analysis

## 🐳 Docker Support

This project includes comprehensive Docker support for development, testing, and production environments.

### Development Environment

Start the development environment with hot reload:

```bash
docker compose up
```

Access the application at [http://localhost:3000](http://localhost:3000).

### Testing Environment

Run all tests in Docker containers:

```bash
# All test types
pnpm docker:test

# Individual test types
pnpm docker:test:unit        # Unit tests
pnpm docker:test:integration # Integration tests
pnpm docker:test:e2e         # E2E tests

# Clean up test containers
pnpm docker:test:clean
```

### Production Environment

Start the production environment with monitoring:

```bash
# Using pnpm script (recommended)
pnpm docker:prod

# Or using Docker Compose directly
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

**Access Points:**

- **Application**: [http://localhost:8080](http://localhost:8080)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (admin/password)
- **Loki Logs**: [http://localhost:3100](http://localhost:3100)
- **Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Metrics**: [http://localhost:8080/api/metrics](http://localhost:8080/api/metrics)

### Environment Variables

This project uses an **integrated environment variable system** that separates common settings from environment-specific configurations for better maintainability.

**File Structure:**

- `.env.base.example` - Common settings for all environments
- `.env.dev.example` - Development-specific settings
- `.env.prod.example` - Production-specific settings
- `.env.test.example` - Test-specific settings

**Setup:**

```bash
# Copy example files (required)
cp .env.base.example .env.base
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod
cp .env.test.example .env.test

# Edit files with your actual values (especially .env.prod for production)
```

**Usage with Docker Compose:**

```bash
# Development
docker compose --env-file .env.base --env-file .env.dev up

# Production
docker compose -f docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d
```

For detailed configuration options, see [`docs/environment-variables.md`](docs/environment-variables.md).

### Docker Architecture

- **Multi-stage builds** for optimized image sizes
- **Security-first design** with non-root users
- **Health checks** for all services
- **Resource limits** for production stability
- **Logging integration** with Loki and Grafana
- **OpenTelemetry metrics** support

## 📁 Project Structure

```
nextjs-boilerplate/
├── src/                  # Application source code
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── layout/       # Layout components (header, footer, etc.)
│   │   └── features/     # Feature-specific components
│   ├── lib/              # Complex business logic
│   │   └── logger/       # Structured logging system (Pure functions)
│   ├── utils/            # Pure utility functions
│   │   └── cn.ts         # Class name utility
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Business logic and API services
│   ├── features/         # Feature-based modules
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # Application constants
│   ├── stores/           # State management
│   └── repositories/     # Data access layer
├── public/               # Static assets
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Example() {
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
- **Pre-push**: Runs Gitleaks secret scanning
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

- [Design Document](./docs/work_dir/nextjs_boilerplate_design.md) - Architecture and design decisions
- [Phase 1 Status](./docs/work_dir/phase1_implementation_status.md) - Implementation progress
- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Implement your changes
4. **Create a Changeset for your changes** (required for features and fixes):

   ```bash
   pnpm changeset:add
   ```

   - Select the appropriate version bump (patch/minor/major)
   - Write a clear description of what changed

5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### When to Create a Changeset

**Required for:**

- ✅ New features or functionality
- ✅ Bug fixes
- ✅ Performance improvements
- ✅ Breaking changes

**Not required for:**

- ❌ Internal refactoring (no user impact)
- ❌ Test additions/modifications
- ❌ Documentation updates (unless significant)

For detailed instructions, see [Changeset Developer Guide](./docs/developer_guide/changeset-developer-guide.md).

## 🔐 Security

### Secret Scanning

This project uses [Gitleaks](https://github.com/gitleaks/gitleaks) to prevent secrets from being committed:

- **Pre-push hook**: Automatically scans for secrets before pushing
- **CI/CD**: Additional scanning in GitHub Actions
- **Configuration**: See `config/security/.gitleaks.toml` for detection rules

## 🛠️ Tool Installation

### Docker Installation

**macOS:**

```bash
# Docker Desktop for Mac
# Download from https://docs.docker.com/desktop/mac/install/

# Or using Homebrew
brew install --cask docker
```

**Windows:**

```bash
# Docker Desktop for Windows
# Download from https://docs.docker.com/desktop/windows/install/

# Or using Chocolatey
choco install docker-desktop
```

**Linux (Ubuntu/Debian):**

```bash
# Docker Engine
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again required
```

### Node.js & pnpm Installation

**Node.js 20.x or higher:**

**macOS:**

```bash
# Homebrew
brew install node@20

# Or using nodenv
brew install nodenv
nodenv install 20.x.x
nodenv global 20.x.x
```

**Windows:**

```bash
# Chocolatey
choco install nodejs --version=20.x.x

# Or download from Node.js official site
# https://nodejs.org/
```

**Linux:**

```bash
# NodeSource repository (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**pnpm 8.x or higher:**

```bash
# Install via npm
npm install -g pnpm@latest

# Or use corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate

# Verify version
pnpm --version
```

### Gitleaks Installation

**macOS:**

```bash
brew install gitleaks
```

**Windows:**

```bash
# Using Chocolatey
choco install gitleaks

# Using Scoop
scoop install gitleaks

# Or download binary from GitHub releases
```

**Linux:**

```bash
# Debian/Ubuntu
sudo apt install gitleaks

# Fedora/RHEL
sudo dnf install gitleaks

# Arch Linux (AUR)
yay -S gitleaks

# Or download binary from GitHub releases
```

**Docker:**

```bash
docker pull zricethezav/gitleaks:latest
docker run -v ${PWD}:/path zricethezav/gitleaks:latest detect --source="/path"
```

**Manual Installation:**

Download the latest binary from [Gitleaks Releases](https://github.com/gitleaks/gitleaks/releases) and add it to your PATH.

### Running Secret Scans

```bash
# Scan entire repository
gitleaks detect --config config/security/.gitleaks.toml

# Scan staged changes only
gitleaks protect --staged --config config/security/.gitleaks.toml

# Verbose output for debugging
gitleaks detect --verbose --config config/security/.gitleaks.toml
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel](https://vercel.com/) - Platform for deploying Next.js apps

## 🔮 Roadmap

### Phase 1 ✅ (Completed)

- ✅ Basic Next.js setup with App Router
- ✅ TypeScript configuration with strict mode
- ✅ ESLint/Prettier setup with auto-formatting
- ✅ Tailwind CSS v4 with CSS variables
- ✅ shadcn/ui components integration
- ✅ Git hooks with Husky and lint-staged
- ✅ Commitlint for conventional commits
- ✅ Gitleaks for secret scanning

### Phase 2 ✅ (Completed) - Testing & CI/CD Infrastructure

- ✅ **Testing Framework**
  - Vitest for unit/integration testing
  - Playwright for E2E testing
  - Testing infrastructure with coverage reports
  - Test constants management system
- ✅ **CI/CD Pipeline**
  - GitHub Actions workflow automation
  - Multi-environment testing (Node 18/20/22)
  - Security scanning (CodeQL, Gitleaks, Dependabot)
  - E2E scheduled execution
  - Quality gates and metrics collection
  - Lighthouse performance monitoring
  - Automated release management

### Phase 3 🔄 (Near Completion) - Advanced Logging & Observability

- ✅ **Structured Logging System** - Pure function-based Pino integration
  - Cross-platform support (Server/Client/Edge Runtime)
  - GDPR-compliant IP hashing (HMAC-SHA256)
  - Protection against log injection attacks (control character sanitization)
  - Remote configuration with KV storage
  - Rate limiting and error fallback mechanisms
- ✅ **OpenTelemetry Integration** - Full distributed tracing & metrics
  - Automatic trace_id correlation in all logs
  - OpenTelemetry severity_number compliance
  - Structured events (event_name/event_category)
  - Instrumentation for Next.js App Router
- ✅ **Metrics & Monitoring**
  - Automatic error_count and log_entries_total collection
  - Request duration histograms
  - Memory usage monitoring
  - Prometheus-compatible metrics export (/api/metrics)
  - Enhanced metrics with labels and custom dimensions
- ✅ **Error Handling System**
  - Automatic error classification (21 error patterns)
  - Fallback functionality and resilience
  - API/Component/Global error boundary support
- ✅ **Testing Coverage**
  - 180+ unit tests with 99%+ coverage
  - 60+ E2E tests for all logging scenarios
  - Integration tests for external services (Loki, etc.)
- ⏳ **Infrastructure** (Remaining items)
  - Docker Compose setup
  - Monitoring and observability dashboards

### Phase 4 🚧 (In Progress) - State Management & Data Layer

- ⏳ **TanStack Query** setup for server state management
- ⏳ **Zustand** for client state management
- ⏳ **API client infrastructure** with type-safe endpoints
- ⏳ **Zod schema validation** for runtime type checking
- ⏳ **Form management** with React Hook Form integration

### Phase 5 (Planned) - Authentication & Security

- ⏳ **NextAuth.js** authentication system
- ⏳ **Security headers** (CSP, HSTS, etc.)
- ⏳ **Rate limiting** middleware
- ⏳ **Session management** with secure cookies
- ⏳ **RBAC** (Role-Based Access Control)

### Phase 6 (Planned) - Production Infrastructure

- ⏳ **Docker containerization**
- ⏳ **Monitoring dashboards** (Grafana integration)
- ⏳ **Alerting system** setup
- ⏳ **Performance optimization**
- ⏳ **CDN integration**

---

Built with ❤️ using Next.js and modern web technologies
