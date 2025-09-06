# Structured Logging System Developer Guide

## 📋 Table of Contents

- [Overview](#overview)
- [Feature List](#feature-list)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Configuration and Customization](#configuration-and-customization)
- [Performance and Security](#performance-and-security)
- [Testing and Debugging](#testing-and-debugging)

---

## Overview

This project implements a high-performance structured logging system optimized for Next.js environments. It supports all environments including server-side, client-side, and Edge Runtime, achieving OpenTelemetry integration, security enhancements, and performance optimization.

### 🎯 Key Features

- **📊 Structured Log Output**: Consistent JSON format logging
- **🌐 Environment Support**: Full support for Server/Client/Edge Runtime environments
- **🔒 Security Enhancement**: Log injection prevention, automatic confidential information redaction
- **📈 Monitoring Integration**: OpenTelemetry, Grafana, Loki integration
- **⚡ High Performance**: < 1ms log output, < 5MB memory increase
- **🧪 Comprehensive Testing**: 225 tests (99.3% success rate)

---

## Feature List

### 1. Basic Logging Features

#### 1.1 Unified Logging Interface

**Purpose**: Provide consistent log API across all environments  
**Implementation**: `src/lib/logger/index.ts`

```typescript
import { logger } from '@/lib/logger';

// Basic log levels
logger.trace('Detailed debug information');
logger.debug('Development information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error information');
logger.fatal('Fatal error');

// Combined with structured data
logger.info('User login', {
  userId: '12345',
  timestamp: new Date(),
  metadata: { source: 'web' },
});
```

#### 1.2 Environment Auto-Detection Logger

**Purpose**: Optimal logger selection based on execution environment  
**Functionality**:

- Server-side: High-performance Pino-based logger
- Client-side: Developer-friendly Console-based logger
- Edge Runtime: Lightweight logger with limitation compliance

### 2. Security Features

#### 2.1 Automatic Confidential Information Redaction

**Purpose**: Prevent accidental logging of sensitive data  
**Implementation**: `src/lib/logger/sanitizer.ts`

```typescript
logger.info('API call', {
  password: 'secret123', // → '[REDACTED]'
  token: 'bearer-token', // → '[REDACTED]'
  userInfo: {
    email: 'user@example.com',
    creditCard: '4111-1111', // → '[REDACTED]'
  },
});
```

**Target Fields**:

- Password-related: `password`, `passwd`, `pwd`
- Authentication: `token`, `jwt`, `auth`, `secret`
- Financial: `creditCard`, `bankAccount`, `ssn`
- API Keys: `apiKey`, `clientSecret`

#### 2.2 Log Injection Prevention

**Purpose**: Prevent attacks using control characters  
**Features**:

- CRLF injection prevention (`\r\n` → `\\r\\n`)
- Null byte removal (`\0` → `\\0`)
- Control character escaping

#### 2.3 IP Address Hashing (GDPR Compliance)

**Purpose**: GDPR-compliant IP address logging  
**Implementation**: `src/lib/logger/crypto.ts`

```typescript
logger.info('User request', {
  ip: '192.168.1.1', // → 'sha256:abc123...' (automatically hashed)
  userAgent: 'Mozilla/5.0...',
});
```

**Configuration**:

```bash
# Environment variable (required in production)
LOG_IP_HASH_SECRET=your-64-character-minimum-secret-key
```

### 3. Performance Features

#### 3.1 Rate Limiting

**Purpose**: Protect against log flooding  
**Implementation**: Token bucket algorithm

```typescript
// Configuration example
const rateLimitConfig = {
  maxTokens: 100,
  refillRate: 10, // tokens per second
  burstCapacity: 150,
};

// Usage
logger.info('High-frequency operation', { data }); // Automatically rate limited
```

#### 3.2 Adaptive Sampling

**Purpose**: Intelligent log reduction during high load  
**Features**:

- Error logs: 100% retention
- Warning logs: 80% retention during high load
- Info logs: 50% retention during high load
- Debug logs: 10% retention during high load

### 4. Monitoring Integration

#### 4.1 OpenTelemetry Integration

**Purpose**: Distributed tracing integration  
**Features**:

- Automatic trace ID injection
- Span context correlation
- Metrics integration

```typescript
logger.info('Database query', {
  query: 'SELECT * FROM users',
  traceId: 'auto-injected', // Automatically added
  spanId: 'auto-injected',
});
```

#### 4.2 Loki Integration

**Purpose**: Centralized log aggregation  
**Implementation**: `src/lib/logger/transports/loki.ts`

```typescript
// Configuration
const lokiConfig = {
  url: 'http://localhost:3100',
  batchSize: 100,
  flushInterval: 5000, // 5 seconds
  labels: {
    service: 'nextjs-app',
    environment: 'production',
  },
};
```

---

## Basic Usage

### 1. Simple Logging

```typescript
import { logger } from '@/lib/logger';

// Server Component
export default async function HomePage() {
  logger.info('Home page rendered', {
    timestamp: new Date(),
    user: 'anonymous',
  });

  return <div>Welcome!</div>;
}

// API Route
export async function GET() {
  logger.info('API endpoint called', {
    endpoint: '/api/users',
    method: 'GET',
  });

  return NextResponse.json({ users: [] });
}

// Client Component
'use client';
export function UserForm() {
  const handleSubmit = (data: FormData) => {
    logger.info('Form submitted', {
      formType: 'user-registration',
      fieldCount: data.entries.length,
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 2. Error Logging

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: {
      userId: '123',
      operation: 'data-sync',
    },
  });
}
```

### 3. Performance Logging

```typescript
import { performance } from 'perf_hooks';

const start = performance.now();
await databaseQuery();
const duration = performance.now() - start;

logger.info('Database operation completed', {
  operation: 'user-fetch',
  duration: `${duration.toFixed(2)}ms`,
  performance: {
    slow: duration > 1000,
    threshold: '1000ms',
  },
});
```

---

## Advanced Features

### 1. Custom Loggers

```typescript
import { createLogger } from '@/lib/logger/factory';

// Service-specific logger
const dbLogger = createLogger({
  service: 'database',
  level: 'debug',
  additionalFields: {
    component: 'persistence',
  },
});

dbLogger.info('Connection established', {
  host: 'localhost',
  database: 'app_db',
});
```

### 2. Context Preservation

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '@/lib/logger';

// Preserve context across async operations
export async function withRequestContext<T>(
  context: { requestId: string; userId?: string },
  fn: () => Promise<T>
): Promise<T> {
  return contextStorage.run(context, async () => {
    logger.info('Request started', context);
    try {
      const result = await fn();
      logger.info('Request completed', { ...context, success: true });
      return result;
    } catch (error) {
      logger.error('Request failed', { ...context, error: error.message });
      throw error;
    }
  });
}
```

### 3. Custom Sanitizers

```typescript
import { addSanitizer } from '@/lib/logger/sanitizer';

// Add custom sensitive field detection
addSanitizer('customSecret', (value) => {
  if (typeof value === 'string' && value.startsWith('cs_')) {
    return '[CUSTOM_SECRET_REDACTED]';
  }
  return value;
});

logger.info('Custom operation', {
  customSecret: 'cs_secret_key', // → '[CUSTOM_SECRET_REDACTED]'
});
```

---

## Configuration and Customization

### 1. Environment Configuration

```bash
# .env.local (Development)
LOG_LEVEL=debug
NEXT_PUBLIC_LOG_LEVEL=debug
LOG_IP_HASH_SECRET=dev-secret-64-chars-minimum
LOG_RATE_LIMIT_MAX_TOKENS=1000

# .env.prod (Production)
LOG_LEVEL=info
NEXT_PUBLIC_LOG_LEVEL=warn
LOG_IP_HASH_SECRET=production-secret-64-chars-minimum
LOG_RATE_LIMIT_MAX_TOKENS=100
LOKI_ENABLED=true
LOKI_URL=https://loki.example.com
```

### 2. Custom Transport

```typescript
// src/lib/logger/transports/custom.ts
import { Transport } from '@/lib/logger/types';

export class CustomTransport implements Transport {
  async write(level: string, message: string, data: object): Promise<void> {
    // Custom log processing
    await this.sendToCustomEndpoint({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private async sendToCustomEndpoint(logEntry: any): Promise<void> {
    // Implementation
  }
}

// Usage
import { addTransport } from '@/lib/logger';
addTransport(new CustomTransport());
```

### 3. Performance Tuning

```typescript
// High-performance configuration
const performanceConfig = {
  // Rate limiting
  rateLimiting: {
    maxTokens: 50,
    refillRate: 5,
    adaptive: true,
  },

  // Batching
  batching: {
    size: 200,
    flushInterval: 3000,
  },

  // Sampling
  sampling: {
    error: 1.0, // 100%
    warn: 0.8, // 80%
    info: 0.5, // 50%
    debug: 0.1, // 10%
  },
};
```

---

## Performance and Security

### 1. Performance Metrics

**Benchmark Results**:

- Log output time: < 1ms average
- Memory overhead: < 5MB
- CPU overhead: < 1% during normal operation
- Throughput: > 10,000 logs/second

**Performance Best Practices**:

```typescript
// ✅ Good - Lazy evaluation
logger.debug(() => `Expensive calculation: ${expensiveOperation()}`);

// ❌ Bad - Always evaluated
logger.debug(`Expensive calculation: ${expensiveOperation()}`);

// ✅ Good - Structured data
logger.info('User action', { action: 'login', userId: '123' });

// ❌ Bad - String concatenation
logger.info(`User ${userId} performed action: ${action}`);
```

### 2. Security Best Practices

```typescript
// ✅ Good - Automatic redaction
logger.info('Payment processed', {
  amount: 100,
  currency: 'USD',
  creditCard: '4111-1111-1111-1111', // Automatically redacted
});

// ✅ Good - Explicit sanitization
logger.info(
  'User data',
  sanitizeLogData({
    email: user.email,
    sensitiveData: user.sensitiveData,
  })
);

// ❌ Bad - Raw sensitive data
logger.info('Raw user object', user); // May contain sensitive fields
```

---

## Testing and Debugging

### 1. Test Environment Setup

```typescript
// tests/setup.ts
import { logger } from '@/lib/logger';

// Disable logging in tests
logger.level = 'silent';

// Or capture logs for assertions
const logCapture = [];
logger.addTransport({
  write: (level, message, data) => {
    logCapture.push({ level, message, data });
  },
});
```

### 2. Debug Configuration

```typescript
// Debug mode
process.env.DEBUG = 'true';
process.env.LOG_LEVEL = 'trace';

// Enable debug logging
logger.debug('Debug mode enabled', {
  environment: process.env.NODE_ENV,
  debug: true,
});
```

### 3. Log Analysis

```bash
# Search logs in development
grep "ERROR" logs/app.log

# Loki queries in production
{service="nextjs-app"} |= "error" | json | level="error"

# Performance analysis
{service="nextjs-app"} | json | duration > 1000ms
```

---

## Summary

The structured logging system provides:

1. **Unified Interface**: Consistent API across all Next.js environments
2. **Security First**: Automatic redaction and injection prevention
3. **Performance Optimized**: Rate limiting and adaptive sampling
4. **Production Ready**: Monitoring integration and comprehensive testing
5. **Developer Friendly**: Rich debugging and development features

This system enables robust observability while maintaining security and performance standards required for production applications.

---

## Related Documentation

- [Logging Configuration Guide](./logging-configuration-guide.en.md) - Detailed configuration options
- [Logging Troubleshooting Guide](./logging-troubleshooting-guide.en.md) - Problem solving
- [Security Guidelines](../security/security-guidelines.en.md) - Security best practices
