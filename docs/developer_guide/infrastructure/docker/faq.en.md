# Docker FAQ - Frequently Asked Questions

## 🤔 General Questions

### Q1: Why use Docker?

**A:** Reasons for using Docker in this project:

- **Environment unification**: Use the same environment for development, testing, and production
- **Dependency isolation**: Management of Node.js versions and system dependencies
- **CI/CD reliability**: Matching test and production environments
- **Scalability**: Extensibility to container orchestration
- **Security**: Isolated process execution environment

### Q2: Should I use Docker for local development too?

**A:** Recommended to use case-by-case:

**Local Development (Recommended):**

```bash
pnpm dev  # Fast HMR, easy debugging
```

**Docker Development (Specific Cases):**

```bash
docker compose up  # Production-like verification, dependency issue investigation
```

**Test Execution (Docker Recommended):**

```bash
pnpm docker:test  # Testing in same environment as CI/CD
```

### Q3: Why did we update to Node.js 22?

**A:** Updated in Phase 5 optimization for the following reasons:

- **Performance improvement**: Speedup with latest V8 engine
- **Improved ESModule support**: Better compatibility with Vitest 3
- **Alpine 3.21 support**: Security updates
- **pnpm 10.3.0 support**: Optimized dependency resolution

## 🔧 Development Environment Questions

### Q4: Hot reload is slow in Docker development environment

**A:** Check and execute the following:

```bash
# 1. File watching optimization (macOS/Windows)
# Use delegated mount in docker-compose.override.yml
volumes:
  - .:/app:delegated

# 2. Check .dockerignore
# Ensure unnecessary files (node_modules, .git) are excluded

# 3. Check resource limits
# Docker Desktop memory: minimum 4GB recommended

# 4. Verify Turbopack usage
# package.json: "dev": "next dev --turbopack"
```

### Q5: How to manage environment variables?

**A:** Use appropriate files for each environment:

```bash
# Development environment (local)
.env.local          # For local development (Git excluded)
.env.development    # Common development environment

# Test environment
.env.test          # Test-specific environment variables

# Production environment
.env.prod          # For production (must create, Git excluded)
.env.prod.example  # Production environment template

# Docker Compose
# Auto-load priority:
# .env.local > .env.development > .env
```

### Q6: Is debugging inside Docker possible with VSCode?

**A:** Yes, it's possible. Configuration example:

**.vscode/launch.json:**

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Node",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "skipFiles": ["<node_internals>/**"]
}
```

**Docker configuration:**

```dockerfile
# Add debug port exposure
EXPOSE 9229

# Run with debug flag
CMD ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

## 🐛 Troubleshooting Questions

### Q7: "Port already in use" error

**A:** Solutions:

```bash
# 1. Check process using the port
lsof -i :3000
netstat -tulpn | grep :3000

# 2. Stop the process
kill -9 <PID>

# 3. Use different port
PROXY_PORT=8080 docker compose up

# 4. Stop all related containers
docker compose down
```

### Q8: Container memory issues

**A:** Memory optimization:

```bash
# 1. Check memory usage
docker stats

# 2. Increase Docker Desktop memory
# Recommended: 4GB+ for development

# 3. Set memory limits
# In docker-compose.yml:
mem_limit: 2g
memswap_limit: 2g

# 4. Clean up unused resources
docker system prune -f
```

### Q9: Build failures

**A:** Common build issue solutions:

```bash
# 1. Clear build cache
docker builder prune -f

# 2. Rebuild without cache
docker compose build --no-cache

# 3. Check disk space
df -h
docker system df

# 4. Verify .dockerignore
# Ensure node_modules is excluded

# 5. Check dependency conflicts
pnpm install --frozen-lockfile
```

## 🧪 Testing Questions

### Q10: Running tests in Docker vs local

**A:** Recommendation by test type:

**Unit Tests:**
```bash
# Local (faster iteration)
pnpm test:unit

# Docker (CI/CD consistency)
pnpm docker:test:unit
```

**Integration/E2E Tests:**
```bash
# Docker (recommended - environment consistency)
pnpm docker:test:e2e
```

### Q11: Test database setup in Docker

**A:** Database isolation strategies:

```bash
# 1. Use test database service
# docker-compose.test.yml with separate DB

# 2. Database per test (recommended)
# Before each test: create clean DB
# After each test: cleanup

# 3. In-memory database
# Use SQLite :memory: for unit tests

# 4. Containerized test DB
docker run --rm -d \
  -e POSTGRES_DB=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:16-alpine
```

## 🚀 Production Questions

### Q12: Production deployment differences

**A:** Key differences in production setup:

```bash
# 1. Environment file
cp .env.prod.example .env.prod
# Edit with production values

# 2. Use production compose file
docker compose -f docker-compose.prod.yml up -d

# 3. Resource allocation
# Production has CPU/memory limits

# 4. Health checks enabled
# Production containers have health monitoring

# 5. Logging configuration
# Structured logs with rotation
```

### Q13: Scaling containers in production

**A:** Scaling strategies:

```bash
# 1. Scale application containers
docker compose -f docker-compose.prod.yml up -d --scale app=3

# 2. Load balancer configuration
# Nginx automatically balances across scaled containers

# 3. Database connection pooling
# Configure connection limits per container

# 4. Monitoring scaled instances
# Prometheus metrics for each instance
```

## 📊 Monitoring Questions

### Q14: Setting up monitoring stack

**A:** Complete monitoring setup:

```bash
# 1. Start monitoring stack
docker compose -f docker-compose.prod.yml up -d \
  prometheus grafana loki

# 2. Access Grafana
# http://localhost:3001
# Default: admin/admin (change immediately)

# 3. Configure data sources
# Prometheus: http://prometheus:9090
# Loki: http://loki:3100

# 4. Import dashboards
# Pre-configured dashboards for Next.js metrics
```

### Q15: Custom metrics implementation

**A:** Adding application metrics:

```bash
# 1. Use built-in metrics endpoint
# /api/metrics - Prometheus format

# 2. Custom business metrics
# Extend metrics in app/api/metrics/route.ts

# 3. Configure Prometheus scraping
# prometheus/prometheus.yml

# 4. Verify metrics in Grafana
# http://localhost:3001 → Configuration → Data Sources

# 5. Check dashboard queries
# Verify metric names and labels in Grafana
```

## 💡 Optimization Questions

### Q16: Want to reduce build time

**A:** Optimization procedures:

```bash
# 1. Maximize Docker cache usage
docker compose build --parallel

# 2. Multi-stage build cache
docker build --target deps .
docker build --cache-from=deps .

# 3. Persist pnpm cache
# Already configured in Dockerfile (cache mount)

# 4. Exclude unnecessary files
# Check and optimize .dockerignore

# 5. Staged builds
docker compose build base deps  # Base only
docker compose build app        # App only
```

### Q17: Want to reduce image size

**A:** Size optimization best practices:

```bash
# Check current image size
docker images | grep nextjs-boilerplate

# Optimization elements (already applied):
# ✅ Alpine Linux base image
# ✅ Multi-stage build
# ✅ pnpm prune --production
# ✅ standalone build output
# ✅ Unnecessary file exclusion

# Additional optimization:
# 1. Base image selection
FROM node:22-alpine3.21  # Already using lightest version

# 2. Layer consolidation
RUN command1 && command2 && command3

# 3. Clear build cache
RUN npm cache clean --force
```

## 🔒 Security Questions

### Q18: Is production environment security okay?

**A:** Implemented security measures:

- **Non-root user execution**: nextjs:nodejs (UID/GID: 1001)
- **Resource limits**: Memory and CPU limits for DoS attack prevention
- **Network isolation**: app-network, monitoring-network
- **Principle of least privilege**: Minimal port exposure
- **Log rotation**: Disk usage limits
- **Health checks**: Service monitoring

**Additional recommended settings:**

```bash
# 1. Environment variable encryption
# Docker Secrets or external secret management

# 2. TLS/SSL configuration
# HTTPS certificate setup

# 3. Firewall configuration
# iptables or cloud provider firewall

# 4. Log monitoring
# Security log monitoring and alerting
```

### Q19: How to handle secrets in development environment?

**A:** Safe secret management:

```bash
# 1. Use .env.local (Git excluded)
echo "SECRET_KEY=dev-only-secret" >> .env.local

# 2. Use Docker secrets
echo "production-secret" | docker secret create api_key -
# Configure secrets in docker-compose.prod.yml

# 3. External management tools
# HashiCorp Vault, AWS Secrets Manager, etc.

# 4. Use development dummy values
# Set different harmless values for production and development
```

## 📚 Learning & Reference Materials

### Q20: How to learn more about Docker Compose?

**A:** Recommended learning resources:

**Official Documentation:**

- [Docker Compose Specification](https://compose-spec.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

**Implementation examples in this project:**

- `docker-compose.yml` - Basic configuration
- `docker-compose.prod.yml` - Production environment configuration
- `docker-compose.test.yml` - Test environment configuration

**Additional learning topics:**

- Kubernetes (full-scale orchestration)
- Docker Swarm (lightweight clustering)
- Container security (security best practices)

---

If you have other questions, please feel free to ask in [GitHub Issues](https://github.com/yourusername/nextjs-boilerplate/issues)!