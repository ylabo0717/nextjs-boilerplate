# GitHub Actions Best Practices

This document provides guidelines for implementing and maintaining GitHub Actions workflows.

## Table of Contents

- [Permissions Configuration](#permissions-configuration)
- [Security and Maintainability](#security-and-maintainability)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Test Environment Isolation](#test-environment-isolation)
- [GitHub API Usage](#github-api-usage)
- [Version Management](#version-management)
- [Debugging](#debugging)
- [Notifications and Reporting](#notifications-and-reporting)

## Permissions Configuration

GitHub Actionsでは、セキュリティのため最小権限の原則に従い、必要な権限のみを明示的に指定することが推奨されています。

### Basic Permission Settings

```yaml
permissions:
  contents: read # リポジトリの内容を読み取る
  issues: write # Issueへのコメント投稿
  pull-requests: write # PRへのコメント投稿
```

### Commonly Used Permissions

| Permission               | Description                   | Use Case                         |
| ------------------------ | ----------------------------- | -------------------------------- |
| `contents: read`         | Read repository contents      | Code checkout                    |
| `contents: write`        | Write to repository           | Update files, create tags        |
| `issues: write`          | Write to issues               | Post issue comments              |
| `pull-requests: write`   | Write to PRs                  | Post PR comments, create reviews |
| `actions: read`          | Read workflow execution state | Check other workflow status      |
| `checks: write`          | Create/update checks          | Report CI results                |
| `packages: write`        | Publish packages              | npm/Docker package publishing    |
| `security-events: write` | Send security events          | CodeQL security scan results     |

### Permission Best Practices

1. **Principle of Least Privilege**: Grant only the minimum required permissions
2. **Explicit Declaration**: Explicitly declare required permissions instead of relying on defaults
3. **Job-level Permissions**: When possible, set permissions at the job level rather than workflow-wide

```yaml
jobs:
  test:
    permissions:
      contents: read
    # ...

  deploy:
    permissions:
      contents: read
      packages: write
    # ...
```

### PR Comment Posting Requirements

When posting comments to PRs, the following permissions are required:

```yaml
permissions:
  pull-requests: write # For posting comments to the PR itself
  issues: write # For posting via issue number (PRs are treated as issues)
```

When using `github-script` to post PR comments, it's recommended to set both permissions.

### Troubleshooting

#### "Resource not accessible by integration" Error

If you encounter this error, check:

1. Required permissions are set in the `permissions` section
2. For PRs from forked repositories, consider using `pull_request_target` event
3. Organization settings don't restrict GitHub Actions permissions

#### Fork PR Limitations

For security reasons, PRs from forks have limited permissions:

- Use `pull_request_target` event (caution: security risks)
- Manually approve workflow after PR creation
- Save results as artifacts and comment in a separate workflow

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

### Secret Management

1. **Pass secrets via environment variables**

   ```yaml
   env:
     API_KEY: ${{ secrets.API_KEY }}
   ```

2. **Mask secrets from logs**

   ```yaml
   - run: echo "::add-mask::${{ secrets.API_KEY }}"
   ```

3. **Minimum scope**
   - Create secrets with minimum required scope
   - Rotate regularly

### Third-party Actions Usage

1. **Use only trusted sources**
   - GitHub official Actions
   - Verified creators
   - Sufficient stars and maintenance

2. **Pin by commit SHA (high-security environments)**
   ```yaml
   uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.0
   ```

## Performance Optimization

### Leverage Caching

Cache dependencies and build artifacts to reduce execution time.

**Dependency Caching:**

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
```

**Build Artifact Caching:**

```yaml
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}
```

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

### Parallel Execution

1. **Matrix Builds**

   ```yaml
   strategy:
     matrix:
       node-version: [18, 20]
       os: [ubuntu-latest, windows-latest]
   ```

2. **Minimize Job Dependencies**
   - Independent jobs run in parallel
   - Use `needs` sparingly

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

### Timeout Settings

```yaml
jobs:
  test:
    timeout-minutes: 30 # Job-wide timeout
    steps:
      - run: npm test
        timeout-minutes: 10 # Step-specific timeout
```

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

### Failure Information Collection

```yaml
- name: Upload logs on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: error-logs
    path: |
      logs/
      .next/
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

## Version Management

### Actions/Tools Version Specification

1. **Use Semantic Versioning**

   ```yaml
   # ✅ Good - specify major version
   uses: actions/checkout@v4

   # ❌ Bad - use latest/master
   uses: actions/checkout@latest
   ```

2. **Regular Updates**
   - Automate Actions updates with Dependabot
   - Monthly version checks and updates

3. **Breaking Change Verification**
   - Always check CHANGELOG for major version updates
   - Pre-validate in test environment

## Debugging

### Enable Debug Logging

1. **Detailed Workflow Execution Logs**
   - Set `ACTIONS_RUNNER_DEBUG: true` in repository Secrets
   - `ACTIONS_STEP_DEBUG: true` for detailed step logs

2. **Conditional Debug Output**
   ```yaml
   - name: Debug info
     if: ${{ runner.debug == '1' }}
     run: |
       echo "Debug mode enabled"
       env | sort
   ```

## Notifications and Reporting

### Status Badges

```markdown
![CI](https://github.com/[owner]/[repo]/workflows/CI/badge.svg)
```

### Slack/Discord Notifications

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Build failed! Check the logs.'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Update History

- 2025-08-12: Merged permissions configuration and best practices documentation
  - Added comprehensive permissions configuration section
  - Integrated existing best practices with new permission guidelines
  - Enhanced troubleshooting section for permission-related issues

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [actions/cache](https://github.com/actions/cache)
- [GitHub REST API - Issues](https://docs.github.com/en/rest/issues)
