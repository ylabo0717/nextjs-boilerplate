# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright.

## Structure

```
tests/e2e/
├── home.spec.ts         # Home page tests
├── navigation.spec.ts   # Navigation tests
├── performance.spec.ts  # Performance tests
└── accessibility.spec.ts # Accessibility tests
```

## Running Tests

### All Tests

```bash
pnpm test:e2e
```

### Specific Browser

```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
# Note: Safari/WebKit is not supported for internal use
```

### With UI Mode (Interactive)

```bash
pnpm test:e2e:ui
```

### Debug Mode

```bash
pnpm test:e2e:debug
```

### Headed Mode (See Browser)

```bash
pnpm test:e2e:headed
```

### View Test Report

```bash
pnpm test:e2e:report
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Expected Title');
  });
});
```

### Accessibility Testing

```typescript
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility issues', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Best Practices

1. **Use Page Object Model** for complex pages
2. **Keep tests independent** - Each test should be able to run in isolation
3. **Use proper selectors** - Prefer data-testid, role, or text over CSS selectors
4. **Add meaningful assertions** - Don't just check if elements exist
5. **Handle async operations** - Use proper waits and expectations
6. **Test user journeys** - Not just individual features

## CI/CD Integration

Tests run automatically in GitHub Actions on:

- Push to main/develop branches
- Pull requests

The CI runs tests on:

- Chromium (Chrome/Edge)
- Firefox

Note: Safari/WebKit is not supported for internal enterprise use.

Test artifacts (screenshots, videos, traces) are saved on failure.

## Troubleshooting

### Install Browsers

```bash
pnpm exec playwright install
```

### Update Browsers

```bash
pnpm exec playwright install --force
```

### Debug Selector

```bash
pnpm exec playwright codegen
```

This opens a browser where you can interact with your app and generate test code.
