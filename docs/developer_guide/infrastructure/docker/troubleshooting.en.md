# Docker Troubleshooting Guide

This document explains common problems that occur in Docker Compose environments and their solutions.

## 🚨 Common Problems and Solutions

### 1. Container Startup Issues

#### Port Conflict Error

**Symptoms:**

```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solution:**

```bash
# Check ports in use
lsof -i :3000

# Stop process
kill -9 <PID>

# Or use a different port
PROXY_PORT=8080 docker compose -f docker-compose.prod.yml up -d
```

#### Out of Memory Error

**Symptoms:**

```
Container exited with code 137 (SIGKILL - out of memory)
```

**Solution:**

```bash
# Check and increase Docker Desktop memory limit (recommended: 4GB+)
# Or adjust individual resource limits

# Check current memory usage
docker stats

# Relax memory limits (temporarily)
docker compose -f docker-compose.prod.yml up -d --scale app=1
```

#### Health Check Failure

**Symptoms:**

```
Container is unhealthy
```

**Solution:**

```bash
# Check health check logs
docker inspect <container_id> | jq '.[0].State.Health.Log'

# Manually execute health check
docker exec <container_id> curl -f http://localhost:3000/api/health

# Relax health check settings (for debugging)
# Increase retries in docker-compose.prod.yml
```

### 2. Build Issues

#### Dependency Installation Failure

**Symptoms:**

```
npm ERR! network timeout
npm ERR! Could not resolve dependency
```

**Solution:**

```bash
# Clear Docker build cache
docker builder prune -f

# Rebuild without cache
docker compose build --no-cache

# Use different registry
docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com .
```

#### Cache Issues

**Symptoms:**

```
No space left on device
```

**Solution:**

```bash
# Check Docker disk usage
docker system df

# Clean up unused images and cache
docker builder prune -f
docker image prune -f

# Complete cleanup (caution: removes all Docker resources)
docker system prune -a -f
```

### 3. Network Issues

#### Service Communication Failure

**Symptoms:**

```
connect ECONNREFUSED app:3000
```

**Solution:**

```bash
# Check network connectivity
docker compose exec proxy ping app

# Verify service startup order
docker compose logs app | grep "ready"
docker compose logs proxy | grep "started"

# Use service health checks
# Add depends_on with condition: service_healthy
```

#### DNS Resolution Problems

**Symptoms:**

```
getaddrinfo ENOTFOUND app
```

**Solution:**

```bash
# Check Docker Compose network
docker network ls
docker network inspect <network_name>

# Restart Docker Compose
docker compose down
docker compose up -d

# Use explicit network configuration
# Add networks section to docker-compose.yml
```

### 4. Logging and Monitoring Issues

#### Log Volume Overflow

**Symptoms:**

```
No space left on device (log files)
```

**Solution:**

```bash
# Configure log rotation
# Add logging configuration to docker-compose.yml:
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"

# Clean existing logs
docker compose down
docker system prune -f
```

#### Prometheus Connection Issues

**Symptoms:**

```
Connection refused to Prometheus
```

**Solution:**

```bash
# Check Prometheus configuration
docker compose exec prometheus cat /etc/prometheus/prometheus.yml

# Verify target endpoints
docker compose exec prometheus promtool query instant 'up'

# Check Prometheus logs
docker compose -f docker-compose.prod.yml logs prometheus
```

#### Loki Log Ingestion Problems

**Symptoms:**

```
Failed to send logs to Loki
```

**Solution:**

```bash
# Check Loki configuration
docker compose exec loki cat /etc/loki/local-config.yaml

# Verify Loki API
docker compose exec loki curl http://localhost:3100/ready

# Check ingestion logs
docker compose -f docker-compose.prod.yml logs loki
```

### 5. Reverse Proxy Issues

#### Nginx Configuration Error

**Symptoms:**

```
nginx: configuration file test failed
```

**Solution:**

```bash
# Test Nginx configuration
docker compose exec proxy nginx -t

# Check configuration file
docker compose exec proxy cat /etc/nginx/nginx.conf

# Reload configuration
docker compose exec proxy nginx -s reload

# Check Nginx logs
docker compose -f docker-compose.prod.yml logs proxy
```

#### SSL Certificate Issues

**Symptoms:**

```
SSL handshake failed
```

**Solution:**

```bash
# Recommend using HTTP only in development environment
# Check HTTP settings in docker/nginx/nginx.conf

# Generate self-signed certificate if needed
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/server.key \
  -out docker/nginx/server.crt
```

#### Grafana Access Issues

**Symptoms:**

```
Cannot connect to Grafana on port 3001
```

**Solution:**

```bash
# Set Grafana admin password
echo "GRAFANA_ADMIN_PASSWORD=your-secure-password" >> .env.prod

# Recreate Grafana data volume
docker volume rm nextjs-grafana-data
docker compose -f docker-compose.prod.yml up -d grafana

# Check Grafana initialization logs
docker compose -f docker-compose.prod.yml logs grafana
```

## 🔍 Debugging Methods

### Log Checking

```bash
# All service logs
docker compose logs -f

# Specific service logs
docker compose logs -f app

# Show errors only
docker compose logs --tail=100 2>&1 | grep -i error
```

### Container Internal Inspection

```bash
# Enter container
docker compose exec app sh

# Check processes
docker compose exec app ps aux

# Check network
docker compose exec app netstat -tlnp

# Check filesystem
docker compose exec app ls -la /app
```

### Resource Usage Checking

```bash
# Real-time monitoring
docker stats

# Detailed resource information
docker system df

# Check unused resources
docker system prune --dry-run
```

## 🧹 Environment Cleanup

### Development Environment Reset

```bash
# Remove containers and volumes
docker compose down -v

# Remove unused images and cache
docker builder prune -f
docker image prune -f

# Complete reset (caution: removes all Docker resources)
docker system prune -a -f
```

### Production Environment Reset

```bash
# Stop production environment (preserve data)
docker compose -f docker-compose.prod.yml down

# Complete removal including data (caution: Grafana/Loki data will be lost)
docker compose -f docker-compose.prod.yml down -v
```

## 🔧 Performance Tuning

### Build Time Improvement

```bash
# Utilize Dockerfile multi-stage build cache
docker build --target deps .
docker build --cache-from=deps .

# Persist pnpm store cache
docker volume create pnpm-store
```

### Runtime Performance Improvement

```bash
# Adjust CPU and memory limits
# Adjust cpus, mem_limit in docker-compose.prod.yml according to environment

# Monitor resource usage
docker compose -f docker-compose.prod.yml exec grafana /bin/sh
# Check metrics in Grafana dashboard
```

## 📞 Support

If problems persist:

1. **GitHub Issues**: [nextjs-boilerplate/issues](https://github.com/yourusername/nextjs-boilerplate/issues)
2. **Log Collection**: Gather detailed error logs
3. **Environment Information**:
   ```bash
   docker version
   docker compose version
   uname -a
   ```

## 📚 Related Documentation

- [Docker README](../docker/README.md)
- [Testing Guidelines](../../quality/testing-guidelines.en.md)
- [Architecture Guidelines](../../core/architecture-guidelines.en.md)
