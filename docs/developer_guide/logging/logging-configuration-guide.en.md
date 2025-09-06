# Structured Logging System Configuration Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Variables Reference](#environment-variables-reference)
- [Environment-Specific Configuration Examples](#environment-specific-configuration-examples)
- [Performance Tuning](#performance-tuning)
- [Security Configuration](#security-configuration)
- [Monitoring & Aggregation Configuration](#monitoring--aggregation-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide explains detailed configuration methods for the structured logging system. It includes recommended settings by environment, performance tuning, and security configuration best practices.

---

## Environment Variables Reference

### 🔧 Basic Log Configuration

| Variable Name           | Description           | Type                                     | Default | Required |
| ----------------------- | --------------------- | ---------------------------------------- | ------- | -------- |
| `LOG_LEVEL`             | Server-side log level | `trace\|debug\|info\|warn\|error\|fatal` | `info`  | No       |
| `NEXT_PUBLIC_LOG_LEVEL` | Client-side log level | `trace\|debug\|info\|warn\|error\|fatal` | `info`  | No       |

**Usage Examples**:

```bash
# Production: info level and above only
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# Development: output all logs
LOG_LEVEL=trace
NEXT_PUBLIC_LOG_LEVEL=debug
```

### 🔒 Security Configuration

| Variable Name        | Description               | Type     | Default | Required   |
| -------------------- | ------------------------- | -------- | ------- | ---------- |
| `LOG_IP_HASH_SECRET` | Secret key for IP hashing | `string` | -       | Yes (Prod) |

**Security Requirements**:

- **Required in production**: For GDPR compliance
- **Minimum 64 characters**: For strong encryption
- **Different values per environment**: For security isolation

```bash
# Production example
LOG_IP_HASH_SECRET=your-super-secure-64-character-minimum-secret-key-for-production

# Staging example
LOG_IP_HASH_SECRET=different-staging-secret-key-at-least-64-characters-long
```

### ⚡ Performance & Rate Limiting Configuration

#### Rate Limiting Settings

| Variable Name                       | Description                    | Type      | Default |
| ----------------------------------- | ------------------------------ | --------- | ------- |
| `LOG_RATE_LIMIT_MAX_TOKENS`         | Maximum token count            | `number`  | `100`   |
| `LOG_RATE_LIMIT_REFILL_RATE`        | Token refill rate (sec/token)  | `number`  | `10`    |
| `LOG_RATE_LIMIT_BURST_CAPACITY`     | Burst capacity                 | `number`  | `150`   |
| `LOG_RATE_LIMIT_BACKOFF_MULTIPLIER` | Backoff multiplier             | `number`  | `2`     |
| `LOG_RATE_LIMIT_MAX_BACKOFF`        | Maximum backoff time (seconds) | `number`  | `300`   |
| `LOG_RATE_LIMIT_ADAPTIVE`           | Adaptive sampling              | `boolean` | `true`  |
| `LOG_RATE_LIMIT_ERROR_THRESHOLD`    | Error threshold (count/minute) | `number`  | `100`   |

**Configuration Examples by Use Case**:

```bash
# High-load environment (stricter limits)
LOG_RATE_LIMIT_MAX_TOKENS=50
LOG_RATE_LIMIT_REFILL_RATE=5
LOG_RATE_LIMIT_BURST_CAPACITY=75

# Development environment (relaxed limits)
LOG_RATE_LIMIT_MAX_TOKENS=1000
LOG_RATE_LIMIT_REFILL_RATE=100
LOG_RATE_LIMIT_ADAPTIVE=false
```

### 🌐 Loki Aggregation Configuration

| Variable Name         | Description               | Type       | Default                 |
| --------------------- | ------------------------- | ---------- | ----------------------- |
| `LOKI_ENABLED`        | Enable/disable Loki       | `boolean`  | `true`                  |
| `LOKI_URL`            | Loki endpoint URL         | `string`   | `http://localhost:3100` |
| `LOKI_TENANT_ID`      | Multi-tenant ID           | `string`   | -                       |
| `LOKI_API_KEY`        | API authentication key    | `string`   | -                       |
| `LOKI_MIN_LEVEL`      | Minimum log level to send | `LogLevel` | `info`                  |
| `LOKI_BATCH_SIZE`     | Batch size                | `number`   | `100`                   |
| `LOKI_FLUSH_INTERVAL` | Flush interval (ms)       | `number`   | `5000`                  |

---

## Environment-Specific Configuration Examples

### 🏠 Local Development Environment

**.env.local:**

```bash
# Basic configuration
LOG_LEVEL=debug
NEXT_PUBLIC_LOG_LEVEL=debug

# Security (development dummy)
LOG_IP_HASH_SECRET=development-local-secret-key-minimum-64-characters-long

# Performance (relaxed)
LOG_RATE_LIMIT_MAX_TOKENS=1000
LOG_RATE_LIMIT_REFILL_RATE=100
LOG_RATE_LIMIT_ADAPTIVE=false

# Monitoring (local)
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100
LOKI_MIN_LEVEL=debug
```

### 🧪 Test Environment

**.env.test:**

```bash
# Basic configuration
LOG_LEVEL=warn
NEXT_PUBLIC_LOG_LEVEL=error

# Security (test dummy)
LOG_IP_HASH_SECRET=test-environment-secret-key-minimum-64-characters-for-testing

# Performance (standard)
LOG_RATE_LIMIT_MAX_TOKENS=100
LOG_RATE_LIMIT_REFILL_RATE=10

# Monitoring (disabled for unit tests)
LOKI_ENABLED=false
```

### 🚧 Staging Environment

**.env.staging:**

```bash
# Basic configuration
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# Security (staging specific)
LOG_IP_HASH_SECRET=staging-specific-secret-key-different-from-production-64chars

# Performance (production-like)
LOG_RATE_LIMIT_MAX_TOKENS=100
LOG_RATE_LIMIT_REFILL_RATE=10
LOG_RATE_LIMIT_ADAPTIVE=true

# Monitoring (staging Loki)
LOKI_ENABLED=true
LOKI_URL=https://staging-loki.example.com
LOKI_TENANT_ID=staging
LOKI_MIN_LEVEL=info
```

### 🚀 Production Environment

**.env.prod:**

```bash
# Basic configuration
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn

# Security (production secure)
LOG_IP_HASH_SECRET=production-highly-secure-secret-key-64-characters-minimum

# Performance (optimized)
LOG_RATE_LIMIT_MAX_TOKENS=50
LOG_RATE_LIMIT_REFILL_RATE=5
LOG_RATE_LIMIT_BURST_CAPACITY=75
LOG_RATE_LIMIT_ADAPTIVE=true
LOG_RATE_LIMIT_ERROR_THRESHOLD=50

# Monitoring (production Loki)
LOKI_ENABLED=true
LOKI_URL=https://loki.example.com
LOKI_TENANT_ID=production
LOKI_API_KEY=prod-api-key-here
LOKI_MIN_LEVEL=info
LOKI_BATCH_SIZE=200
LOKI_FLUSH_INTERVAL=3000
```

---

## Performance Tuning

### 🎯 High-Traffic Applications

For applications expecting high traffic (>10,000 requests/minute):

```bash
# Aggressive rate limiting
LOG_RATE_LIMIT_MAX_TOKENS=25
LOG_RATE_LIMIT_REFILL_RATE=2
LOG_RATE_LIMIT_BURST_CAPACITY=50

# Optimized Loki batching
LOKI_BATCH_SIZE=500
LOKI_FLUSH_INTERVAL=2000
LOKI_MIN_LEVEL=warn
```

### 🐌 Resource-Constrained Environments

For limited CPU/memory environments:

```bash
# Minimal logging
LOG_LEVEL=warn
NEXT_PUBLIC_LOG_LEVEL=error

# Conservative rate limiting
LOG_RATE_LIMIT_MAX_TOKENS=10
LOG_RATE_LIMIT_REFILL_RATE=1
LOG_RATE_LIMIT_ADAPTIVE=false

# Reduced Loki overhead
LOKI_ENABLED=false  # Or use local file logging
```

### 📊 Debug-Heavy Development

For development with extensive debugging:

```bash
# Verbose logging
LOG_LEVEL=trace
NEXT_PUBLIC_LOG_LEVEL=debug

# No rate limiting
LOG_RATE_LIMIT_MAX_TOKENS=10000
LOG_RATE_LIMIT_REFILL_RATE=1000
LOG_RATE_LIMIT_ADAPTIVE=false

# Immediate Loki flushing
LOKI_BATCH_SIZE=1
LOKI_FLUSH_INTERVAL=100
```

---

## Security Configuration

### 🔐 IP Address Hashing

**Purpose**: GDPR compliance for IP address logging.

**Configuration**:

```bash
# Generate secure secret (Linux/macOS)
openssl rand -base64 48

# Set in environment
LOG_IP_HASH_SECRET=generated-secret-key-here
```

**Validation**:

```typescript
// Check if IP hashing is working
import { logger } from '@/lib/logger';

logger.info('User request', {
  ip: '192.168.1.1', // Will be automatically hashed
});
```

### 🚨 Error Prevention

**Common Security Mistakes**:

```bash
# ❌ Bad: Short secret
LOG_IP_HASH_SECRET=short

# ❌ Bad: Same secret across environments
LOG_IP_HASH_SECRET=same-for-all-envs

# ❌ Bad: Hardcoded in code
const secret = 'hardcoded-secret';

# ✅ Good: Environment-specific, secure length
LOG_IP_HASH_SECRET=unique-per-env-64-chars-minimum-secure-random-string
```

---

## Monitoring & Aggregation Configuration

### 📈 Grafana Dashboard Setup

**Required Metrics**:

1. **Log Volume**: `log_entries_total`
2. **Error Rate**: `log_entries_total{level="error"}`
3. **Rate Limiting**: `log_rate_limit_events_total`

**Loki Query Examples**:

```logql
# Error logs in last hour
{service="nextjs-app"} |= "error" | json | level="error"

# Rate limit hits
{service="nextjs-app"} |= "rate_limit" | json | message="Rate limit exceeded"

# User activity by IP (hashed)
{service="nextjs-app"} | json | __error__="" | ip != ""
```

### 🔔 Alerting Configuration

**Prometheus Alert Rules**:

```yaml
groups:
  - name: logging_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(log_entries_total{level="error"}[5m]) > 10
        for: 2m
        annotations:
          summary: 'High error rate detected'

      - alert: LoggingSystemDown
        expr: up{job="nextjs-app"} == 0
        for: 1m
        annotations:
          summary: 'Logging system is down'
```

---

## Troubleshooting

### 🔍 Common Issues

#### Issue: Logs not appearing in Loki

**Diagnosis**:

```bash
# Check Loki connectivity
curl -G "http://localhost:3100/loki/api/v1/labels"

# Verify environment variables
echo $LOKI_URL
echo $LOKI_ENABLED
```

**Solution**:

```bash
# 1. Verify Loki is running
docker compose logs loki

# 2. Check network connectivity
docker compose exec app ping loki

# 3. Validate configuration
LOKI_ENABLED=true
LOKI_URL=http://loki:3100  # Use service name in Docker
```

#### Issue: Rate limiting too aggressive

**Symptoms**: Legitimate logs being dropped

**Solution**:

```bash
# Temporarily increase limits
LOG_RATE_LIMIT_MAX_TOKENS=200
LOG_RATE_LIMIT_REFILL_RATE=20

# Monitor and adjust based on actual usage
# Check rate limit metrics in Grafana
```

#### Issue: High memory usage

**Diagnosis**:

```bash
# Check log buffer size
docker stats

# Monitor Loki batch accumulation
# Check LOKI_BATCH_SIZE and LOKI_FLUSH_INTERVAL
```

**Solution**:

```bash
# Reduce batch size
LOKI_BATCH_SIZE=50
LOKI_FLUSH_INTERVAL=1000

# Or disable Loki temporarily
LOKI_ENABLED=false
```

### 🛠️ Debug Configuration

**Enable Debug Mode**:

```bash
# Environment variables
DEBUG=true
LOG_LEVEL=debug
NEXT_PUBLIC_LOG_LEVEL=debug

# Check configuration loading
npm run dev  # Look for "Logger initialized" message
```

**Configuration Validation**:

```typescript
// Add to your app startup
import { logger } from '@/lib/logger';

logger.info('Logger test', {
  test: 'configuration',
  timestamp: new Date().toISOString(),
});
```

---

## Related Documentation

- [Logging System Overview](./logging-system-overview.en.md) - Architecture and components
- [Logging Troubleshooting Guide](./logging-troubleshooting-guide.en.md) - Problem solving
- [Security Guidelines](../security/security-guidelines.en.md) - Security best practices
