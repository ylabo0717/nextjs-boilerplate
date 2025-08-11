# GitHub Actions Best Practices

This document provides guidelines for implementing and maintaining GitHub Actions workflows.

## Table of Contents

- [Security and Maintainability](#security-and-maintainability)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Test Environment Isolation](#test-environment-isolation)
- [GitHub API Usage](#github-api-usage)

## Security and Maintainability

### Avoid Inline Scripts

Large inline scripts (heredocs) should be extracted to external files for better security and maintainability.

**❌ Bad:**

```yaml
- name: Run tests
  run: |
    cat > test.js << 'EOF'
    // 100+ lines of JavaScript code
    EOF
    node test.js
```

**✅ Good:**

```yaml
- name: Run tests
  run: node scripts/test.js
```

### Centralized Configuration

Avoid magic numbers and centralize constants in configuration files.

- Test constants: `tests/constants/test-constants.ts`
- Inject configuration via environment variables
- Maintain consistency between workflow and application settings

**Example:**

```yaml
env:
  MAX_TOTAL_TIME: 3000 # From PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME
  MAX_DOM_CONTENT_LOADED: 1500 # From PERFORMANCE_THRESHOLDS.DOM_CONTENT_LOADED_TIME
```

## Performance Optimization

### Leverage Caching

Cache dependencies and build artifacts to reduce execution time.

**Playwright Browser Cache Example:**

```yaml
- name: Cache Playwright browsers
  id: playwright-cache
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ matrix.browser }}-${{ hashFiles('**/package.json') }}
    restore-keys: |
      playwright-${{ runner.os }}-${{ matrix.browser }}-

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
```

### Resource Usage Limits

**Limit Parallel Execution:**

```yaml
strategy:
  matrix:
    browser: [chromium, firefox]
  fail-fast: false
  max-parallel: 2 # Limit concurrent jobs to 2
```

**Artifact Retention:**

- Regular reports: 7 days
- Debug artifacts on failure: 14 days

## Error Handling

### Implement Retry Logic

Add automatic retries for unstable operations.

```javascript
async function startServerWithRetry() {
  let retries = SERVER_START_RETRIES;
  let lastError;

  while (retries > 0) {
    try {
      await waitForServerReady(BASE_URL);
      return;
    } catch (error) {
      lastError = error;
      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  throw lastError;
}
```

### Process Cleanup

Handle multiple exit signals and ensure proper resource cleanup.

```javascript
// Try graceful shutdown before force kill
function cleanupServer() {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    setTimeout(() => {
      if (!server.killed) {
        server.kill('SIGKILL');
      }
    }, 5000);
  }
}

process.on('exit', cleanupServer);
process.on('SIGINT', cleanupServer);
process.on('SIGTERM', cleanupServer);
```

## Test Environment Isolation

### Dedicated Test Scripts

Clearly separate production and test environments.

**package.json:**

```json
{
  "scripts": {
    "start": "next start",
    "start:test": "NODE_ENV=test next start"
  }
}
```

**Workflow:**

```yaml
env:
  NODE_ENV: test
```

## GitHub API Usage

### Issues API Considerations

- `listForRepo` endpoint doesn't have a `created` parameter
- `since` parameter filters by last update time
- Combine `sort` with title filtering for date-based searches

**Correct Implementation:**

```javascript
const issues = await github.rest.issues.listForRepo({
  owner: context.repo.owner,
  repo: context.repo.repo,
  labels: 'automated',
  state: 'open',
  per_page: 100,
  sort: 'created',
  direction: 'desc',
});

// Filter by date in title
const todayIssues = issues.data.filter((issue) => issue.title.includes(date));
```

### Server Startup Verification

Use health checks instead of fixed delays for reliable server startup confirmation.

```javascript
function waitForServerReady(url, timeoutMs = 30000, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', retry);

      function retry() {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Server did not become ready in time'));
        } else {
          setTimeout(check, intervalMs);
        }
      }
    }
    check();
  });
}
```

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [actions/cache](https://github.com/actions/cache)
- [GitHub REST API - Issues](https://docs.github.com/en/rest/issues)
