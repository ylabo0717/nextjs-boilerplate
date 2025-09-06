# Testing Strategy Guidelines

This document defines testing strategies and best practices for Next.js + React + TypeScript projects.

## Table of Contents

1. [Test Pyramid](#test-pyramid)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests (End-to-End Testing)](#e2e-tests-end-to-end-testing)
5. [Testing Best Practices](#testing-best-practices)
6. [Mocks and Stubs](#mocks-and-stubs)

---

## Test Pyramid

**Purpose**: Build an efficient and reliable test suite.

**Structure**:

1. **Unit Tests (70%)** - Individual functions and components
2. **Integration Tests (20%)** - Component interactions
3. **E2E Tests (10%)** - User scenarios

### Testing Strategy Principles

```typescript
// Test target classification
/**
 * Unit Tests: Single functions, hooks, pure functions
 * - Business logic
 * - Utility functions
 * - Custom hooks
 * - Single components
 */

/**
 * Integration Tests: Multiple component interactions
 * - Form submission flows
 * - Components with API calls
 * - Page-level testing
 */

/**
 * E2E Tests: Complete user journeys
 * - Login → Dashboard display
 * - Product purchase flow
 * - Admin functionality
 */
```

---

## Unit Tests

### Utility Function Testing

```typescript
// ✅ Good - Unit Test example
// utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from './format';

describe('formatCurrency', () => {
  it('should format number as US dollars', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('should handle decimal numbers', () => {
    expect(formatCurrency(99.99)).toBe('$99.99');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('should handle edge cases', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
  });
});

describe('formatDate', () => {
  it('should format date in ISO format', () => {
    const date = new Date('2023-12-25T10:30:00Z');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-12-25');
  });

  it('should handle different locales', () => {
    const date = new Date('2023-12-25');
    expect(formatDate(date, 'long', 'en-US')).toBe('December 25, 2023');
    expect(formatDate(date, 'long', 'ja-JP')).toBe('2023年12月25日');
  });
});
```

### Custom Hook Testing

```typescript
// ✅ Good - Custom hook testing
// hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));

    expect(result.current[0]).toBe('default');
  });

  it('should return stored value from localStorage', () => {
    localStorageMock.setItem('test', JSON.stringify('stored'));

    const { result } = renderHook(() => useLocalStorage('test', 'default'));

    expect(result.current[0]).toBe('stored');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test', JSON.stringify('new value'));
  });
});
```

### Component Unit Testing

```typescript
// ✅ Good - Component unit testing
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button loading>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should apply correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

---

## Integration Tests

### Form Integration Testing

```typescript
// ✅ Good - Form integration testing
// components/ContactForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContactForm } from './ContactForm';

// Mock API call
const mockSubmitForm = vi.fn();
vi.mock('@/api/contact', () => ({
  submitContactForm: mockSubmitForm,
}));

describe('ContactForm Integration', () => {
  beforeEach(() => {
    mockSubmitForm.mockClear();
  });

  it('should submit form with valid data', async () => {
    mockSubmitForm.mockResolvedValue({ success: true });

    render(<ContactForm />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello, this is a test message.' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    // Verify API call
    await waitFor(() => {
      expect(mockSubmitForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, this is a test message.',
      });
    });

    // Verify success message
    expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
  });

  it('should show validation errors for invalid data', async () => {
    render(<ContactForm />);

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    // Verify validation errors
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });

    // Verify API was not called
    expect(mockSubmitForm).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockSubmitForm.mockRejectedValue(new Error('Server error'));

    render(<ContactForm />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Test message' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
    });
  });
});
```

### API Integration Testing

```typescript
// ✅ Good - API integration testing
// api/users.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { getUser, updateUser, createUser } from './users';

// Setup MSW server
const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;

    if (id === '1') {
      return res(
        ctx.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        })
      );
    }

    return res(ctx.status(404), ctx.json({ error: 'User not found' }));
  }),

  rest.put('/api/users/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        ...req.body,
        updatedAt: new Date().toISOString(),
      })
    );
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'new-id',
        ...req.body,
        createdAt: new Date().toISOString(),
      })
    );
  })
);

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());

describe('User API Integration', () => {
  it('should fetch user successfully', async () => {
    const user = await getUser('1');

    expect(user).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should handle user not found', async () => {
    await expect(getUser('999')).rejects.toThrow('User not found');
  });

  it('should update user successfully', async () => {
    const updatedUser = await updateUser('1', {
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    expect(updatedUser).toEqual({
      id: '1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      updatedAt: expect.any(String),
    });
  });

  it('should create user successfully', async () => {
    const newUser = await createUser({
      name: 'Alice Smith',
      email: 'alice@example.com',
    });

    expect(newUser).toEqual({
      id: 'new-id',
      name: 'Alice Smith',
      email: 'alice@example.com',
      createdAt: expect.any(String),
    });
  });
});
```

---

## E2E Tests (End-to-End Testing)

### User Journey Testing

```typescript
// ✅ Good - E2E testing with Playwright
// tests/e2e/user-registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete registration successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePass123!');

    // Agree to terms
    await page.check('[data-testid="terms-checkbox"]');

    // Verify submit button is enabled
    await expect(page.locator('[data-testid="submit-button"]')).toBeEnabled();

    // Submit form
    await page.click('[data-testid="submit-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Registration successful'
    );

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('John Doe');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/register');

    // Submit empty form
    await page.click('[data-testid="submit-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toHaveText('Name is required');
    await expect(page.locator('[data-testid="email-error"]')).toHaveText('Email is required');

    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', '123'); // Too short

    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toHaveText(
      'Please enter a valid email address'
    );
    await expect(page.locator('[data-testid="password-error"]')).toHaveText(
      'Password must be at least 8 characters'
    );
  });
});
```

### Authentication Flow Testing

```typescript
// ✅ Good - Authentication E2E testing
// tests/e2e/authentication.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login and logout successfully', async ({ page }) => {
    // Login
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    await page.click('[data-testid="login-button"]');

    // Verify login success
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify logout
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-link"]')).toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="login-required-message"]')).toContainText(
      'Please log in to access this page'
    );
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Verify login
    await expect(page).toHaveURL('/dashboard');

    // Create new page in same context (simulates new tab)
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');

    // Should still be logged in
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.locator('[data-testid="welcome-message"]')).toBeVisible();
  });
});
```

---

## Testing Best Practices

### Test Structure and Organization

```typescript
// ✅ Good - Test organization
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when found', () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: '123', name: 'John' };
      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUser(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', () => {
      // Arrange
      const userId = '999';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', () => {
      // Test implementation
    });

    it('should validate email format', () => {
      // Test implementation
    });
  });
});
```

### Test Data Management

```typescript
// ✅ Good - Test data factories
// tests/factories/user.factory.ts
export const createUserData = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  createdAt: new Date('2023-01-01'),
  ...overrides,
});

export const createAdminUser = (overrides?: Partial<User>): User =>
  createUserData({
    role: 'admin',
    ...overrides,
  });

// Usage in tests
describe('UserComponent', () => {
  it('should display user information', () => {
    const user = createUserData({ name: 'Jane Smith' });
    render(<UserComponent user={user} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});
```

### Async Testing

```typescript
// ✅ Good - Async testing patterns
describe('AsyncComponent', () => {
  it('should handle loading states', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
    );

    render(<AsyncComponent fetchData={mockFetch} />);

    // Verify loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify final state
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });

  it('should handle errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));

    render(<AsyncComponent fetchData={mockFetch} />);

    await waitFor(() => {
      expect(screen.getByText('Error: API Error')).toBeInTheDocument();
    });
  });
});
```

---

## Mocks and Stubs

### API Mocking

```typescript
// ✅ Good - API mocking with MSW
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ])
    );
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: Date.now().toString(),
        ...req.body,
      })
    );
  }),

  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;

    if (id === '404') {
      return res(ctx.status(404), ctx.json({ error: 'User not found' }));
    }

    return res(
      ctx.json({
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`,
      })
    );
  }),
];

// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Mocking

```typescript
// ✅ Good - Component mocking
// tests/components/Dashboard.test.tsx
import { vi } from 'vitest';

// Mock heavy components
vi.mock('@/components/Chart', () => ({
  Chart: ({ data }: { data: any }) => (
    <div data-testid="mock-chart">Chart with {data.length} items</div>
  ),
}));

vi.mock('@/components/DataTable', () => ({
  DataTable: ({ columns, data }: { columns: any; data: any }) => (
    <div data-testid="mock-data-table">
      Table with {columns.length} columns and {data.length} rows
    </div>
  ),
}));

describe('Dashboard', () => {
  it('should render dashboard with mocked components', () => {
    const dashboardData = {
      chartData: [1, 2, 3],
      tableData: [{ id: 1 }, { id: 2 }],
      columns: [{ key: 'id' }],
    };

    render(<Dashboard data={dashboardData} />);

    expect(screen.getByTestId('mock-chart')).toHaveTextContent('Chart with 3 items');
    expect(screen.getByTestId('mock-data-table')).toHaveTextContent(
      'Table with 1 columns and 2 rows'
    );
  });
});
```

### External Service Mocking

```typescript
// ✅ Good - External service mocking
// tests/services/EmailService.test.ts
import { vi } from 'vitest';
import { EmailService } from '@/services/EmailService';

// Mock external email provider
const mockSendEmail = vi.fn();
vi.mock('nodemailer', () => ({
  createTransporter: () => ({
    sendMail: mockSendEmail,
  }),
}));

describe('EmailService', () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
  });

  it('should send email successfully', async () => {
    mockSendEmail.mockResolvedValue({ messageId: 'test-id' });

    const emailService = new EmailService();
    const result = await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome to our platform',
      html: expect.stringContaining('John Doe'),
    });

    expect(result.success).toBe(true);
  });

  it('should handle email sending errors', async () => {
    mockSendEmail.mockRejectedValue(new Error('SMTP Error'));

    const emailService = new EmailService();
    const result = await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP Error');
  });
});
```

---

## Summary

This testing strategy guide emphasizes:

1. **Test Pyramid Structure** - Balanced approach with 70% unit, 20% integration, 10% E2E tests
2. **Comprehensive Coverage** - Testing all layers from utilities to user journeys
3. **Effective Mocking** - Strategic use of mocks and stubs for isolation
4. **Best Practices** - Clear test structure, data factories, and async handling
5. **Real-world Scenarios** - Testing error cases, edge cases, and user workflows

By following these guidelines, you can create:

- Fast and reliable test suites
- Comprehensive coverage of critical functionality
- Maintainable and readable tests
- Confidence in code changes and deployments

---

## Related Documentation

- [Development Guidelines](../development/development-guidelines.en.md) - Development best practices
- [TypeScript Guidelines](../core/typescript-guidelines.en.md) - Type-safe testing patterns
- [Review Checklist](./review-checklist.en.md) - Testing review criteria
