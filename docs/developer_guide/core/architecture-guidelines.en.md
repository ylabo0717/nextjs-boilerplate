# Architecture Design Guidelines

This document defines architectural design best practices for Next.js 15.x + React 19 + TypeScript projects.

## Table of Contents

1. [Core Philosophy: Pure Functions First](#core-philosophy-pure-functions-first)
2. [Why We Strongly Recommend Functional Programming](#why-we-strongly-recommend-functional-programming)
3. [Architecture Layer Design Principles](#architecture-layer-design-principles)
4. [Domain Layer Design Strategy](#domain-layer-design-strategy)
5. [Service & Use Case Layer](#service--use-case-layer)
6. [API Client Design](#api-client-design)
7. [Serialization Boundary Handling](#serialization-boundary-handling)

---

## Core Philosophy: Pure Functions First

**Core Design Philosophy of This Project**

This project adopts **functional programming centered on pure functions** as the fundamental design paradigm. Object-oriented class design is positioned as an exceptional choice to be considered only in extremely limited situations.

### Basic Principles

**Purpose**: Prioritize stateless pure functions as the **top priority** implementation approach, and carefully utilize object-oriented benefits only in **extremely special cases**.

**Benefits**:

- Improved testability
- Ensuring maintainability and scalability
- Compatibility with Next.js serialization boundaries

---

## Why We Strongly Recommend Functional Programming

### 1. Overwhelming Improvement in Testability

- Always returns the same output for the same input
- No side effects make unit tests concise and reliable
- Tests run fast without needing mocks

### 2. Predictability and Ease of Debugging

- Function behavior depends only on input, preventing unexpected behavior
- Stack traces are easy to understand, enabling quick problem identification

### 3. Concurrency Safety

- Immutability prevents race conditions and deadlocks
- High compatibility with Next.js React Server Components

### 4. Improved Maintainability

- Clear dependencies between functions with limited scope of change impact
- Safe refactoring and easy feature additions

### 5. High TypeScript Compatibility

- Type inference works effectively with rich compile-time error detection
- Pure functions can maximize type safety benefits

---

## Architecture Layer Design Principles

**🚨 Important**: Prioritize pure functional approaches in all layers, consider class usage as a last resort.

### Presentation Layer (Absolute Principle)

Use only React functional components + Hooks to enforce stateless implementation.

```typescript
// ✅ Good - Presentation layer with functional components
interface UserProfileProps {
  user: User;
  onEdit: (user: User) => void;
}

export const UserProfile = ({ user, onEdit }: UserProfileProps) => {
  return (
    <div className="user-profile">
      <img src={user.avatar} alt={`${user.name}'s profile image`} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user)} type="button">
        Edit
      </button>
    </div>
  );
};

// ❌ Bad - Class usage in UI components (completely prohibited)
class UserProfile extends Component<UserProfileProps> {
  render() {
    // Cannot benefit from React Hooks
  }
}
```

### Business Logic Layer (Pure Functions Only)

```typescript
// ✅ Good - Pure function business logic
export const calculateOrderTotal = (
  items: OrderItem[],
  discountRate: number = 0,
  taxRate: number = 0.1
): number => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedTotal = subtotal * (1 - discountRate);
  return discountedTotal * (1 + taxRate);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

// ❌ Bad - Class-based business logic
class OrderCalculator {
  private discountRate: number;

  constructor(discountRate: number) {
    this.discountRate = discountRate;
  }

  calculateTotal(items: OrderItem[]): number {
    // Stateful implementation makes testing harder
  }
}
```

### Data Access Layer (Functional with Limited Exceptions)

```typescript
// ✅ Good - Functional data access
export const fetchUser = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.status}`);
  }

  return await response.json();
};

// Database connection management (acceptable class usage)
export class DatabaseConnection {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  // Acceptable: Managing external resource connections
  async connect(): Promise<void> {
    // Connection management logic
  }

  async disconnect(): Promise<void> {
    // Cleanup logic
  }
}
```

---

## Domain Layer Design Strategy

### Pure Domain Models

```typescript
// ✅ Good - Pure domain models
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Order {
  readonly id: string;
  readonly userId: string;
  readonly items: readonly OrderItem[];
  readonly status: OrderStatus;
  readonly total: number;
  readonly createdAt: Date;
}

// Pure functions for domain operations
export const createUser = (
  id: string,
  email: string,
  name: string,
  role: UserRole = 'user'
): User => ({
  id,
  email,
  name,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const updateUserName = (user: User, name: string): User => ({
  ...user,
  name,
  updatedAt: new Date(),
});

export const addOrderItem = (order: Order, item: OrderItem): Order => ({
  ...order,
  items: [...order.items, item],
  total: calculateOrderTotal([...order.items, item]),
  updatedAt: new Date(),
});
```

### Domain Validation

```typescript
// ✅ Good - Pure validation functions
export const validateUserCreation = (data: CreateUserRequest): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  if (!data.name || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }

  if (!data.password || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateOrderItem = (item: OrderItem): ValidationResult => {
  const errors: ValidationError[] = [];

  if (item.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }

  if (item.price < 0) {
    errors.push({ field: 'price', message: 'Price cannot be negative' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

---

## Service & Use Case Layer

### Pure Service Functions

```typescript
// ✅ Good - Pure service functions
export const userService = {
  async registerUser(userData: CreateUserRequest): Promise<ServiceResult<User>> {
    // Validate input
    const validation = validateUserCreation(userData);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      };
    }

    try {
      // Check if user exists
      const existingUser = await findUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User already exists',
        };
      }

      // Create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await createUser({
        ...userData,
        password: hashedPassword,
      });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create user',
        details: error,
      };
    }
  },

  async updateUser(
    userId: string,
    updates: Partial<UpdateUserRequest>
  ): Promise<ServiceResult<User>> {
    try {
      const existingUser = await fetchUser(userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const updatedUser = await updateUser(userId, updates);
      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user',
        details: error,
      };
    }
  },
};
```

### Complex Use Case Composition

```typescript
// ✅ Good - Use case composition with pure functions
export const orderService = {
  async createOrder(userId: string, items: OrderItem[]): Promise<ServiceResult<Order>> {
    try {
      // Validate user
      const user = await fetchUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Validate items
      const itemValidations = items.map(validateOrderItem);
      const invalidItems = itemValidations.filter((v) => !v.isValid);
      if (invalidItems.length > 0) {
        return {
          success: false,
          error: 'Invalid order items',
          details: invalidItems,
        };
      }

      // Check inventory
      const inventoryCheck = await checkInventoryAvailability(items);
      if (!inventoryCheck.available) {
        return {
          success: false,
          error: 'Insufficient inventory',
          details: inventoryCheck.unavailableItems,
        };
      }

      // Calculate total
      const total = calculateOrderTotal(items);

      // Create order
      const order = await createOrder({
        userId,
        items,
        total,
        status: 'pending',
      });

      // Reserve inventory
      await reserveInventory(items);

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create order',
        details: error,
      };
    }
  },
};
```

---

## API Client Design

### Functional API Client

```typescript
// ✅ Good - Functional API client design
export const apiClient = {
  async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return makeRequest<T>('GET', url, undefined, options);
  },

  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return makeRequest<T>('POST', url, data, options);
  },

  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return makeRequest<T>('PUT', url, data, options);
  },

  async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return makeRequest<T>('DELETE', url, undefined, options);
  },
};

const makeRequest = async <T>(
  method: HttpMethod,
  url: string,
  data?: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`, response.status, await response.text());
    }

    const responseData = await response.json();

    return {
      success: true,
      data: responseData,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof ApiError ? error : new ApiError('Network error'),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
};
```

### Type-Safe API Definitions

```typescript
// ✅ Good - Type-safe API definitions
export const userApi = {
  getUser: (id: string) => apiClient.get<User>(`/api/users/${id}`),

  createUser: (userData: CreateUserRequest) => apiClient.post<User>('/api/users', userData),

  updateUser: (id: string, updates: UpdateUserRequest) =>
    apiClient.put<User>(`/api/users/${id}`, updates),

  deleteUser: (id: string) => apiClient.delete<void>(`/api/users/${id}`),

  listUsers: (params?: ListUsersParams) =>
    apiClient.get<PaginatedResponse<User>>('/api/users', { params }),
};

export const orderApi = {
  getOrder: (id: string) => apiClient.get<Order>(`/api/orders/${id}`),

  createOrder: (orderData: CreateOrderRequest) => apiClient.post<Order>('/api/orders', orderData),

  listOrders: (userId: string, params?: ListOrdersParams) =>
    apiClient.get<PaginatedResponse<Order>>(`/api/orders`, {
      params: { userId, ...params },
    }),
};
```

---

## Serialization Boundary Handling

### Server Component Data Passing

```typescript
// ✅ Good - Serializable data structures
export interface SerializableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string; // ISO string instead of Date
  updatedAt: string; // ISO string instead of Date
}

export const convertUserToSerializable = (user: User): SerializableUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export const convertSerializableToUser = (serializable: SerializableUser): User => ({
  id: serializable.id,
  name: serializable.name,
  email: serializable.email,
  role: serializable.role as UserRole,
  createdAt: new Date(serializable.createdAt),
  updatedAt: new Date(serializable.updatedAt),
});

// Server Component usage
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await fetchUser(params.id);

  if (!user) {
    notFound();
  }

  // Convert to serializable format
  const serializableUser = convertUserToSerializable(user);

  return <UserProfile user={serializableUser} />;
}
```

### Client-Server Data Synchronization

```typescript
// ✅ Good - Pure functions for data synchronization
export const syncUserData = async (
  localUser: SerializableUser,
  serverUser: SerializableUser
): Promise<SerializableUser> => {
  // Compare timestamps to determine which is newer
  const localUpdated = new Date(localUser.updatedAt);
  const serverUpdated = new Date(serverUser.updatedAt);

  if (serverUpdated > localUpdated) {
    return serverUser;
  }

  return localUser;
};

export const mergeUserUpdates = (
  original: SerializableUser,
  updates: Partial<SerializableUser>
): SerializableUser => ({
  ...original,
  ...updates,
  updatedAt: new Date().toISOString(),
});
```

---

## Class Usage Guidelines (Exceptional Cases)

### When Classes Are Acceptable

```typescript
// ✅ Acceptable - External resource management
export class DatabasePool {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ✅ Acceptable - Complex state machines
export class PaymentProcessor {
  private state: PaymentState = 'idle';

  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    if (this.state !== 'idle') {
      throw new Error('Payment processor is busy');
    }

    this.state = 'processing';

    try {
      const result = await this.executePayment(paymentData);
      this.state = 'completed';
      return result;
    } catch (error) {
      this.state = 'failed';
      throw error;
    } finally {
      this.state = 'idle';
    }
  }

  private async executePayment(data: PaymentData): Promise<PaymentResult> {
    // Complex payment processing logic
  }
}

// ❌ Not acceptable - Simple data operations
class UserUtilities {
  static formatName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// ✅ Better - Pure functions
export const formatUserName = (user: User): string => {
  return `${user.firstName} ${user.lastName}`;
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

## Summary

This architecture guideline emphasizes:

1. **Pure Functions First** - Default to pure functions for all business logic
2. **Minimal Class Usage** - Classes only for external resource management
3. **Functional Composition** - Building complex functionality through function composition
4. **Type Safety** - Leveraging TypeScript for compile-time guarantees
5. **Serialization Awareness** - Designing for Next.js server/client boundaries
6. **Testable Design** - Architecture that facilitates easy testing

By following these principles, you create:

- Highly testable and maintainable code
- Predictable and debuggable applications
- Scalable architecture that grows with your project
- Better compatibility with React and Next.js patterns

---

## Related Documentation

- [TypeScript Guidelines](./typescript-guidelines.en.md) - Type-safe architecture patterns
- [Next.js Patterns](./nextjs-patterns.en.md) - Framework-specific architecture
- [Testing Guidelines](../quality/testing-guidelines.en.md) - Testing functional architecture
