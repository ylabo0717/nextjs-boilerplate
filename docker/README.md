# Docker Configuration for Next.js Boilerplate

This directory contains Docker configuration files for running the Next.js application in containerized environments.

## Quick Start

```bash
# Start the development environment
docker compose up

# Start with build
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Architecture

The Docker setup includes:

- **app**: Next.js application with hot reload support
- **proxy**: Nginx reverse proxy (optional)

## Services

### Application Service (`app`)

- **Port**: 3000 (Next.js application)
- **Debug Port**: 9229 (Node.js inspector)
- **Dockerfile**: `docker/app/Dockerfile.dev`
- **Features**:
  - Hot module replacement
  - Volume mounting for live code editing
  - Debug support
  - Health checks

### Proxy Service (`proxy`)

- **Port**: 8080 (Nginx reverse proxy)
- **Dockerfile**: `docker/nginx/Dockerfile`
- **Features**:
  - Load balancing ready
  - Security headers
  - Static file serving

## Development Workflow

1. **Start development environment**:

   ```bash
   docker compose up
   ```

2. **Access the application**:
   - Direct: http://localhost:3000
   - Via proxy: http://localhost:8080

3. **Debug the application**:
   - Attach debugger to port 9229
   - Use VS Code or Chrome DevTools

4. **View logs**:
   ```bash
   docker compose logs app
   ```

## File Structure

```
docker/
├── app/
│   ├── Dockerfile          # Production build
│   ├── Dockerfile.dev      # Development build
│   └── .dockerignore       # Build context optimization
├── nginx/
│   ├── Dockerfile          # Nginx proxy
│   └── nginx.conf          # Nginx configuration
└── README.md              # This file
```

## Configuration Files

- **docker-compose.yml**: Main service definitions
- **docker-compose.override.yml**: Development environment overrides
- **.env.base.example**: Common environment variable template

## Environment Variables

This project uses an integrated environment variable system. Copy the example files:

```bash
cp .env.base.example .env.base
cp .env.dev.example .env.dev
```

Key variables:

- `NODE_ENV`: Environment (development/production)
- `WATCHPACK_POLLING`: Enable file watching in Docker
- `DEBUG`: Debug output configuration

## Health Checks

The application includes health checks:

- **Endpoint**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## Volumes

- **Source code**: Live mounted for development
- **node_modules**: Named volume for performance
- **.next**: Excluded from mounting to avoid conflicts

## Networking

- **Network**: `nextjs-app-network`
- **Service discovery**: Services can communicate by name

## Production

For production deployment, modify:

1. Change Dockerfile to production version
2. Remove development volume mounts
3. Set appropriate environment variables
4. Configure proper secrets management

## Troubleshooting

### Port Conflicts

If ports 3000 or 8080 are in use:

```bash
# Check what's using the port
lsof -i :3000

# Stop the Docker services
docker compose down
```

### File Watching Issues

Enable polling if file changes aren't detected:

```bash
# In .env.local
WATCHPACK_POLLING=true
```

### Debug Connection Issues

Ensure debug port is properly exposed:

```bash
# Check if port is accessible
telnet localhost 9229
```

### Container Build Issues

Force rebuild if needed:

```bash
docker compose build --no-cache
docker compose up --force-recreate
```

## Integration with Existing Tools

This Docker setup integrates with:

- **Existing Loki setup**: `docker-compose.loki.yml` (port 3001)
- **Health endpoint**: `/api/health` for monitoring
- **OpenTelemetry**: Metrics and logging maintained

## Security

- Non-root user execution
- Minimal base images (Alpine Linux)
- Proper file permissions
- Network isolation
