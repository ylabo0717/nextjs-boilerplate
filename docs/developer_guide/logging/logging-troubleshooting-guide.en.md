# Structured Logging System Troubleshooting Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Debugging Procedures](#debugging-procedures)
- [Error Message Reference](#error-message-reference)
- [Performance Issue Diagnosis](#performance-issue-diagnosis)
- [Environment-Specific Troubleshooting](#environment-specific-troubleshooting)
- [Monitoring and Alerts](#monitoring-and-alerts)

---

## Overview

This guide provides detailed instructions for diagnosing and resolving potential issues with the structured logging system. It includes best practices for early problem detection and rapid resolution.

---

## Common Issues and Solutions

### 🚫 Logs Not Being Output

#### Symptoms

- No logs appearing in console
- Logs not being sent to Loki
- Logs not being recorded to files

#### Possible Causes and Solutions

**1. Log Level Configuration Issues**

```bash
# Check current configuration
echo "Current log level: $LOG_LEVEL"
echo "Client log level: $NEXT_PUBLIC_LOG_LEVEL"

# Solution: Lower log level
export LOG_LEVEL=debug
export NEXT_PUBLIC_LOG_LEVEL=debug
```

**2. Rate Limiting Issues**

```typescript
// Debug rate limiting status
import { logger } from '@/lib/logger';

// Check rate limit status
logger.info('Rate limit test', {
  rateLimit: 'testing',
  timestamp: Date.now(),
});
```

```bash
# Solution: Relax rate limiting
export LOG_RATE_LIMIT_MAX_TOKENS=1000
export LOG_RATE_LIMIT_ADAPTIVE=false
```

**3. Environment Variable Configuration Errors**

```bash
# Configuration check script
pnpm run dev 2>&1 | grep -E "(LOG_|LOKI_)" | head -20
```

### 🔌 Loki Connection Issues

#### Symptoms

- Logs not appearing in Grafana
- Loki connection errors
- Timeout errors

#### Diagnostic Procedures

**1. Loki Connection Test**

```bash
# Basic connection test
curl -X GET "${LOKI_URL}/ready"

# Log send test
curl -X POST "${LOKI_URL}/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: ${LOKI_TENANT_ID}" \
  -d '{
    "streams": [
      {
        "stream": {
          "service": "test",
          "level": "info"
        },
        "values": [
          ["'$(date +%s)000000000'", "Test connection message"]
        ]
      }
    ]
  }'
```

**2. Network Configuration Check**

```bash
# Docker network test
docker compose exec app ping loki

# Port accessibility test
telnet localhost 3100

# Firewall check
sudo ufw status
```

**3. Loki Configuration Validation**

```bash
# Check Loki logs
docker compose logs loki | tail -50

# Check Loki configuration
docker compose exec loki cat /etc/loki/local-config.yaml
```

### ⚡ Performance Issues

#### Symptoms

- Application slowdown
- High memory usage
- Log delays

#### Diagnostic Steps

**1. Memory Usage Analysis**

```bash
# Check application memory usage
docker stats nextjs-app

# Check log buffer size
curl http://localhost:3000/api/health | jq '.metrics.memory'

# Monitor heap usage
node --expose-gc --inspect=0.0.0.0:9229 server.js
```

**2. Rate Limiting Analysis**

```typescript
// Add performance monitoring
import { logger } from '@/lib/logger';
import { performance } from 'perf_hooks';

const start = performance.now();
logger.info('Performance test', { test: 'data' });
const duration = performance.now() - start;

console.log(`Log execution time: ${duration.toFixed(2)}ms`);
```

**3. Batch Processing Optimization**

```bash
# Check current batch settings
echo "Batch size: $LOKI_BATCH_SIZE"
echo "Flush interval: $LOKI_FLUSH_INTERVAL"

# Optimize for high load
export LOKI_BATCH_SIZE=500
export LOKI_FLUSH_INTERVAL=2000
```

### 🔒 Security Issues

#### Symptoms

- Sensitive data appearing in logs
- IP hash failures
- Secret exposure

#### Solutions

**1. Sensitive Data Redaction Check**

```typescript
// Test redaction functionality
import { logger } from '@/lib/logger';

logger.info('Redaction test', {
  password: 'secret123',      // Should be [REDACTED]
  token: 'bearer-token',      // Should be [REDACTED]
  creditCard: '4111-1111',    // Should be [REDACTED]
  normalData: 'public info',  // Should remain visible
});
```

**2. IP Hash Secret Validation**

```bash
# Check IP hash secret
if [ -z "$LOG_IP_HASH_SECRET" ]; then
  echo "❌ IP hash secret not set"
else
  echo "✅ IP hash secret configured (length: ${#LOG_IP_HASH_SECRET})"
fi

# Generate new secret if needed
openssl rand -base64 48
```

**3. Log Injection Prevention Test**

```typescript
// Test log injection prevention
import { logger } from '@/lib/logger';

// These should be safely escaped
logger.info('Injection test', {
  malicious: 'test\r\ninjected: line',
  nullByte: 'test\0null',
  controlChar: 'test\x1b[31mred\x1b[0m',
});
```

---

## Debugging Procedures

### 🔍 Step-by-Step Debugging

#### 1. Initial Diagnosis

```bash
# Check service status
curl -s http://localhost:3000/api/health | jq '.'

# Check environment variables
env | grep -E "^(LOG_|LOKI_|NEXT_PUBLIC_LOG_)" | sort

# Check logs directory (if file logging enabled)
ls -la logs/
tail -f logs/app.log
```

#### 2. Logger System Test

```typescript
// Create test script: scripts/test-logger.ts
import { logger } from '@/lib/logger';

console.log('Testing logger system...');

// Test all log levels
logger.trace('Trace level test');
logger.debug('Debug level test');
logger.info('Info level test');
logger.warn('Warning level test');
logger.error('Error level test');
logger.fatal('Fatal level test');

// Test structured data
logger.info('Structured data test', {
  userId: '12345',
  action: 'login',
  metadata: {
    userAgent: 'Mozilla/5.0...',
    ip: '192.168.1.1',
  },
});

console.log('Logger test completed');
```

```bash
# Run test script
pnpm tsx scripts/test-logger.ts
```

#### 3. Component-by-Component Testing

**Test Rate Limiter**

```typescript
// Test rate limiting
for (let i = 0; i < 200; i++) {
  logger.info(`Rate limit test ${i}`, { iteration: i });
}
```

**Test Loki Transport**

```bash
# Enable Loki debugging
export DEBUG=loki-transport
pnpm dev
```

**Test Sanitizer**

```typescript
// Test sensitive data sanitization
const testData = {
  username: 'john_doe',
  password: 'secret123',
  email: 'john@example.com',
  apiKey: 'sk-abcd1234',
  creditCard: '4111-1111-1111-1111',
};

logger.info('Sanitizer test', testData);
```

### 🧰 Debug Mode Configuration

```bash
# Enable comprehensive debugging
export DEBUG=*
export LOG_LEVEL=trace
export NEXT_PUBLIC_LOG_LEVEL=trace
export NODE_ENV=development

# Start application with debug output
pnpm dev 2>&1 | tee debug-output.log
```

---

## Error Message Reference

### 🚨 Common Error Messages

#### "Logger initialization failed"

**Cause**: Environment variables not properly configured

**Solution**:
```bash
# Check required environment variables
if [ -z "$LOG_IP_HASH_SECRET" ]; then
  export LOG_IP_HASH_SECRET="$(openssl rand -base64 48)"
fi

export LOG_LEVEL=info
export NEXT_PUBLIC_LOG_LEVEL=warn
```

#### "Rate limit exceeded"

**Cause**: Too many log calls in short time

**Solution**:
```bash
# Temporarily increase rate limits
export LOG_RATE_LIMIT_MAX_TOKENS=500
export LOG_RATE_LIMIT_REFILL_RATE=50

# Or disable adaptive sampling
export LOG_RATE_LIMIT_ADAPTIVE=false
```

#### "Loki transport failed"

**Cause**: Loki server unavailable or configuration error

**Solution**:
```bash
# Check Loki status
curl "${LOKI_URL}/ready"

# Verify configuration
echo "Loki URL: $LOKI_URL"
echo "Loki Tenant: $LOKI_TENANT_ID"

# Restart Loki service
docker compose restart loki
```

#### "CORS error in browser"

**Cause**: Client-side logging blocked by CORS

**Solution**:
```typescript
// Use server-side logging for sensitive operations
// Client-side logging is for development only
if (process.env.NODE_ENV === 'development') {
  logger.debug('Client debug info', data);
}
```

---

## Performance Issue Diagnosis

### 📊 Performance Metrics

#### 1. Log Performance Benchmarking

```typescript
// Benchmark logging performance
import { performance } from 'perf_hooks';

const benchmarkLogging = async () => {
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    logger.info('Benchmark test', {
      iteration: i,
      data: 'test data',
      timestamp: Date.now(),
    });
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average per log: ${avgTime.toFixed(4)}ms`);
  console.log(`Logs per second: ${(1000 / avgTime).toFixed(0)}`);
};

benchmarkLogging();
```

#### 2. Memory Usage Monitoring

```typescript
// Monitor memory usage
const monitorMemory = () => {
  const usage = process.memoryUsage();
  
  logger.info('Memory usage', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
};

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);
```

#### 3. Rate Limit Metrics

```typescript
// Monitor rate limiting
const monitorRateLimit = () => {
  // This would be implemented in the actual rate limiter
  const stats = getRateLimitStats();
  
  logger.info('Rate limit stats', {
    tokensRemaining: stats.tokens,
    requestsBlocked: stats.blocked,
    adaptiveSampling: stats.samplingRate,
  });
};
```

---

## Environment-Specific Troubleshooting

### 🏠 Development Environment

**Common Issues**:

```bash
# Hot reload not working with logs
# Solution: Disable extensive logging
export LOG_LEVEL=warn

# Console flooding with debug logs
# Solution: Use structured filtering
export NEXT_PUBLIC_LOG_LEVEL=error

# Memory leaks during development
# Solution: Regular restart or memory monitoring
pnpm dev --max-old-space-size=2048
```

### 🧪 Test Environment

**Common Issues**:

```bash
# Tests failing due to logging
# Solution: Disable logging in tests
export NODE_ENV=test
export LOG_LEVEL=silent

# Test interference from log files
# Solution: Use in-memory logging
export LOG_TRANSPORT=memory
```

### 🚀 Production Environment

**Common Issues**:

```bash
# High log volume causing disk space issues
# Solution: Implement log rotation
export LOG_ROTATION_SIZE=100M
export LOG_RETENTION_DAYS=30

# Performance degradation from logging
# Solution: Optimize batch sizes
export LOKI_BATCH_SIZE=1000
export LOKI_FLUSH_INTERVAL=1000

# Missing logs in production
# Solution: Check production log level
export LOG_LEVEL=info  # Not debug in production
```

---

## Monitoring and Alerts

### 📈 Grafana Dashboard Setup

**Key Metrics to Monitor**:

```promql
# Log volume
rate(log_entries_total[5m])

# Error rate
rate(log_entries_total{level="error"}[5m])

# Rate limit hits
rate(log_rate_limit_exceeded_total[5m])

# Loki ingestion lag
loki_ingester_wal_samples_appended_total
```

**Sample Alerts**:

```yaml
# prometheus/alerts.yml
groups:
  - name: logging_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(log_entries_total{level="error"}[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in logs"
          
      - alert: LoggingSystemDown
        expr: up{job="nextjs-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Logging system is down"
          
      - alert: LokiIngestionLag
        expr: loki_ingestion_lag_seconds > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki ingestion lag detected"
```

### 🔔 Automated Health Checks

```typescript
// Health check endpoint: app/api/health/logging/route.ts
export async function GET() {
  const healthChecks = {
    logger: checkLoggerHealth(),
    rateLimiter: checkRateLimiterHealth(),
    lokiTransport: await checkLokiHealth(),
    memoryUsage: checkMemoryUsage(),
  };

  const isHealthy = Object.values(healthChecks).every(check => check.status === 'ok');

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthChecks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}

function checkLoggerHealth() {
  try {
    logger.info('Health check', { component: 'logger' });
    return { status: 'ok', message: 'Logger functional' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async function checkLokiHealth() {
  try {
    const response = await fetch(`${process.env.LOKI_URL}/ready`, {
      timeout: 5000,
    });
    
    if (response.ok) {
      return { status: 'ok', message: 'Loki reachable' };
    } else {
      return { status: 'error', message: `Loki returned ${response.status}` };
    }
  } catch (error) {
    return { status: 'error', message: 'Loki unreachable' };
  }
}
```

---

## Summary

This troubleshooting guide provides:

1. **Systematic Diagnosis** - Step-by-step procedures for common issues
2. **Performance Optimization** - Tools and techniques for performance analysis
3. **Security Validation** - Methods to ensure proper data protection
4. **Environment-Specific Solutions** - Tailored approaches for different environments
5. **Proactive Monitoring** - Early warning systems and health checks

By following these procedures, you can:
- Quickly identify and resolve logging issues
- Maintain optimal system performance
- Ensure security and compliance
- Prevent issues through proactive monitoring

---

## Related Documentation

- [Logging System Overview](./logging-system-overview.en.md) - Architecture and features
- [Logging Configuration Guide](./logging-configuration-guide.en.md) - Configuration options
- [Security Guidelines](../security/security-guidelines.en.md) - Security best practices