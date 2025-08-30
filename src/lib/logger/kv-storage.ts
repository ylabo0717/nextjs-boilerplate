/**
 * Key-Value Storage Abstraction Layer
 * Supports Redis, Vercel Edge Config, and Memory storage
 *
 * Pure function-based implementation following project architecture principles.
 * Provides unified interface for different KV storage backends with graceful fallbacks.
 */

// Type definitions for Redis client (ioredis)
/**
 * Redis client interface for type-safe operations.
 * Defines the essential Redis commands used by the storage system.
 *
 * @public
 */
/**
 * Redis client interface for type-safe operations.
 * Defines the essential Redis commands used by the storage system.
 *
 * @internal
 */
/**
 * Redis client interface for type-safe operations.
 * Defines the essential Redis commands used by the storage system.
 *
 * @public
 */
/**
 * Redis client interface for type-safe operations.
 * Defines the essential Redis commands used by the storage system.
 *
 * @public
 */
export interface RedisClient {
  /**
   * Get a value by key from Redis.
   *
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in Redis with optional expiration.
   *
   * @param key - The key to set
   * @param value - The value to store
   * @param mode - Optional mode (e.g., 'EX' for seconds)
   * @param duration - Optional duration in seconds
   * @returns Promise resolving to 'OK' on success
   */
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'>;

  /**
   * Set a value in Redis with expiration in seconds.
   *
   * @param key - The key to set
   * @param seconds - Expiration time in seconds
   * @param value - The value to store
   * @returns Promise resolving to 'OK' on success
   */
  setex(key: string, seconds: number, value: string): Promise<'OK'>;

  /**
   * Delete a key from Redis.
   *
   * @param key - The key to delete
   * @returns Promise resolving to the number of keys deleted
   */
  del(key: string): Promise<number>;

  /**
   * Check if a key exists in Redis.
   *
   * @param key - The key to check
   * @returns Promise resolving to 1 if exists, 0 otherwise
   */
  exists(key: string): Promise<number>;

  /**
   * Ping the Redis server to test connectivity.
   *
   * @returns Promise resolving to 'PONG'
   */
  ping(): Promise<string>;

  /**
   * Register event listeners for Redis client events.
   *
   * @param event - The event type to listen for
   * @param listener - The event handler function
   * @returns The Redis client instance for chaining
   */
  on(event: 'connect' | 'error' | 'close', listener: (...args: unknown[]) => void): this;
}

// Storage type constants
const REDIS_TYPE = 'redis' as const;
const EDGE_CONFIG_TYPE = 'edge-config' as const;
const MEMORY_TYPE = 'memory' as const;

/**
 * Unified Key-Value Storage interface
 *
 * Interface to handle Redis, Vercel Edge Config, and Memory storage uniformly.
 * Designed following a pure-function approach with side effects clearly separated.
 *
 * @public
 */
export interface KVStorage {
  /**
   * Retrieve the value for the specified key
   * @param key - Key to retrieve
   * @returns Value for the key, or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set the value for the specified key
   * @param key - Key to set
   * @param value - Value to store
   * @param ttl - TTL in seconds; defaults to configured value when omitted
   */
  set(key: string, value: string, ttl?: number): Promise<void>;

  /**
   * Delete the specified key
   * @param key - Key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Check whether the specified key exists
   * @param key - Key to check
   * @returns true if the key exists
   */
  exists(key: string): Promise<boolean>;

  /** Storage type identifier */
  readonly type: typeof REDIS_TYPE | typeof EDGE_CONFIG_TYPE | typeof MEMORY_TYPE;
}

/**
 * Storage configuration interface (immutable)
 *
 * Defines configuration parameters for KV storage.
 * All properties are readonly to guarantee immutability.
 *
 * @public
 */
export interface StorageConfig {
  /** Storage type */
  readonly type: typeof REDIS_TYPE | typeof EDGE_CONFIG_TYPE | typeof MEMORY_TYPE;
  /** Connection string (for Redis or Edge Config) */
  readonly connection_string?: string;
  /** Default TTL in seconds */
  readonly ttl_default: number;
  /** Maximum number of retries */
  readonly max_retries: number;
  /** Timeout in milliseconds */
  readonly timeout_ms: number;
  /** Flag to enable fallback behavior */
  readonly fallback_enabled: boolean;
}

/**
 * Storage operation result interface
 *
 * Provides a consistent shape for success/failure outcomes and error handling.
 *
 * @typeParam T - Data type when the operation succeeds
 * @public
 */
export interface StorageOperationResult<T = void> {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Data when the operation succeeds */
  readonly data?: T;
  /** Error message when the operation fails */
  readonly error?: string;
  /** Time to wait before retry (seconds) */
  readonly retry_after?: number;
}

/**
 * Create storage configuration (pure function)
 */
/**
 * Pure function to create storage configuration
 *
 * Automatically selects the appropriate KV storage configuration based on environment variables
 * and returns a configuration object. Selection priority: Redis, Edge Config, then Memory storage.
 * Applies values specific to each storage type.
 *
 * @returns Immutable StorageConfig object
 *
 * @example
 * ```typescript
 * // Auto-configure from environment variables
 * const config = createStorageConfig();
 * // {
 * //   type: 'redis', // or 'edge-config', 'memory'
 * //   connection_string: 'redis://localhost:6379',
 * //   ttl_default: 3600,
 * //   max_retries: 5,
 * //   timeout_ms: 10000,
 * //   fallback_enabled: true
 * // }
 * ```
 *
 * @public
 */
export function createStorageConfig(): StorageConfig {
  return Object.freeze({
    type: detectStorageType(),
    connection_string: process.env.KV_CONNECTION_STRING || process.env.REDIS_URL,
    ttl_default: parseInt(process.env.KV_TTL_DEFAULT || '3600', 10), // 1 hour
    max_retries: parseInt(process.env.KV_MAX_RETRIES || '3', 10),
    timeout_ms: parseInt(process.env.KV_TIMEOUT_MS || '5000', 10),
    fallback_enabled: process.env.KV_FALLBACK_ENABLED !== 'false',
  }) as StorageConfig;
}

/**
 * Detect appropriate storage type (pure function)
 */
function detectStorageType(): typeof REDIS_TYPE | typeof EDGE_CONFIG_TYPE | typeof MEMORY_TYPE {
  // Redis detection
  if (process.env.REDIS_URL || process.env.KV_CONNECTION_STRING) {
    return REDIS_TYPE;
  }

  // Vercel Edge Config detection
  if (process.env.EDGE_CONFIG_ID && process.env.EDGE_CONFIG_TOKEN) {
    return EDGE_CONFIG_TYPE;
  }

  // Default to memory storage
  return MEMORY_TYPE;
}

/**
 * Validate storage configuration (pure function)
 */
export function validateStorageConfig(config: StorageConfig): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const validTypes = [REDIS_TYPE, EDGE_CONFIG_TYPE, MEMORY_TYPE];
  if (!validTypes.includes(config.type)) {
    return false;
  }

  if (config.type === 'redis' && !config.connection_string) {
    return false;
  }

  // Additional: Validate Redis URL format
  if (config.type === 'redis' && config.connection_string) {
    try {
      const url = new URL(config.connection_string);
      if (!['redis:', 'rediss:'].includes(url.protocol)) {
        return false;
      }
    } catch {
      return false; // Invalid URL format
    }
  }

  if (config.ttl_default <= 0 || config.max_retries < 0 || config.timeout_ms <= 0) {
    return false;
  }

  return true;
}

/**
 * Redis Storage Implementation
 *
 * Implementation using the ioredis library.
 * Includes connection management, error handling, and timeout processing.
 *
 * ## Why a class implementation
 *
 * As an exception to the Pure Functions First principle, a class is used for:
 * - Connection management: handling client connection state and pool
 * - Resource management: lifecycle and disposal of connection resources
 * - State tracking: monitoring connection, error, and retry states
 * - Configuration retention: immutable management of connection/timeouts/retries
 * - Interface implementation: unified implementation of the KVStorage interface
 */
export class RedisStorage implements KVStorage {
  public readonly type = 'redis' as const;
  /** Storage configuration (immutable) */
  private config: StorageConfig;
  /** Redis client instance with proper typing */
  private client: RedisClient | null = null;
  /** Redis connection state */
  private isConnected: boolean = false;

  constructor(config: StorageConfig) {
    this.config = Object.freeze(config);
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = await this.getClient();
      const result = await this.withTimeout(client.get(key), this.config.timeout_ms);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      console.warn('Redis get operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const client = await this.getClient();
      const ttlValue = ttl || this.config.ttl_default;

      await this.withTimeout(client.setex(key, ttlValue, value), this.config.timeout_ms);
    } catch (error) {
      console.warn('Redis set operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await this.withTimeout(client.del(key), this.config.timeout_ms);
    } catch (error) {
      console.warn('Redis delete operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await this.withTimeout(client.exists(key), this.config.timeout_ms);
      return result === 1;
    } catch (error) {
      console.warn('Redis exists operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /** Internal method to get/initialize the Redis client */
  private async getClient(): Promise<RedisClient> {
    if (!this.client || !this.isConnected) {
      try {
        // Dynamic import for Redis (edge runtime compatibility)
        const Redis = await import('ioredis');
        this.client = new Redis.default(this.config.connection_string!, {
          maxRetriesPerRequest: this.config.max_retries,
          connectTimeout: 2000, // shortened to 2s
          commandTimeout: 2000, // shortened to 2s
          enableOfflineQueue: false, // disable offline queue
        }) as RedisClient;

        // Connection event listeners
        this.client.on('connect', () => {
          this.isConnected = true;
        });

        this.client.on('error', (...args: unknown[]) => {
          const error = args[0] as Error;
          console.error('Redis connection error:', {
            error: error?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          this.isConnected = false;
        });

        this.client.on('close', () => {
          this.isConnected = false;
        });

        // Wait for connection
        await this.client.ping();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to initialize Redis client:', {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    }
    return this.client;
  }

  /** Internal method to apply a timeout to a Promise */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Memory Storage Implementation (fallback)
 *
 * In-memory storage implementation used as a fallback.
 * Provides periodic cleanup and TTL management.
 *
 * ## Why a class implementation
 *
 * As an exception to the Pure Functions First principle, a class is used for:
 * - State management: continuous management of in-memory key-value pairs and TTLs
 * - Timer management: controlling timers for automatic deletion of expired items
 * - Memory management: efficient handling of GC-targeted data
 * - Interface implementation: unified implementation of the KVStorage interface
 * - Fallback behavior: acts as a substitute when other storages are unavailable
 */
export class MemoryStorage implements KVStorage {
  public readonly type = 'memory' as const;
  /** Data store (keys with TTL-bound values) */
  private store: Map<string, { value: string; expires: number }>;
  /** Storage configuration (immutable) */
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.store = new Map();
    this.config = Object.freeze(config);

    // Cleanup expired entries periodically
    this.startCleanupInterval();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const ttlValue = ttl || this.config.ttl_default;
    const expires = Date.now() + ttlValue * 1000;

    this.store.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /** Internal method to start periodic cleanup of expired entries */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (now > entry.expires) {
            this.store.delete(key);
          }
        }
      },
      5 * 60 * 1000
    );
  }
}

/**
 * Edge Config Storage Implementation (Vercel)
 *
 * Storage implementation using Vercel Edge Config.
 * Provides fast data access in edge environments.
 *
 * ## Why a class implementation
 *
 * As an exception to the Pure Functions First principle, a class is used for:
 * - Connection management: managing Vercel Edge Config client connections
 * - Configuration retention: handling edge-specific settings and access tokens
 * - Error handling: addressing network issues and API limits
 * - Interface implementation: unified implementation of the KVStorage interface
 * - Environment dependency: integration with Vercel-specific features and Edge Runtime
 */
export class EdgeConfigStorage implements KVStorage {
  public readonly type = EDGE_CONFIG_TYPE;
  /** Storage configuration (immutable) */
  private config: StorageConfig;
  /** Edge Config API base URL */
  private baseUrl: string;
  /** Authentication token */
  private token: string;

  constructor(config: StorageConfig) {
    this.config = Object.freeze(config);
    this.baseUrl = `https://edge-config.vercel.com/${process.env.EDGE_CONFIG_ID}`;
    this.token = process.env.EDGE_CONFIG_TOKEN!;
  }

  async get(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/item/${key}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout_ms) || undefined,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Edge Config API error: ${response.status}`);
      }

      const data = await response.json();
      return typeof data === 'string' ? data : data.value || null;
    } catch (error) {
      console.warn('Edge Config get operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  async set(key: string, value: string, _ttl?: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: value,
        }),
        signal: AbortSignal.timeout(this.config.timeout_ms) || undefined,
      });

      if (!response.ok) {
        throw new Error(`Edge Config API error: ${response.status}`);
      }
    } catch (error) {
      console.warn('Edge Config set operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: null,
        }),
        signal: AbortSignal.timeout(this.config.timeout_ms) || undefined,
      });

      if (!response.ok) {
        throw new Error(`Edge Config API error: ${response.status}`);
      }
    } catch (error) {
      console.warn('Edge Config delete operation failed:', {
        key,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

/**
 * Storage factory with fallback logic (pure function + controlled side effects)
 */
/**
 * Function to create a KV storage instance
 *
 * Creates the appropriate KV storage implementation based on the provided configuration
 * or auto-detected environment. Selects one of Redis, Edge Config, or Memory storage
 * and provides a unified KVStorage interface.
 *
 * @param config - Storage configuration (optional; auto-configured if omitted)
 * @returns Storage instance implementing the KVStorage interface
 *
 * @example
 * ```typescript
 * // Create storage with auto-configuration
 * const storage = createKVStorage();
 *
 * // Create storage with custom configuration
 * const customStorage = createKVStorage({
 *   type: 'memory',
 *   ttl_default: 1800,
 *   max_retries: 3,
 *   timeout_ms: 5000,
 *   fallback_enabled: true
 * });
 *
 * // Using the storage
 * await storage.set('key', 'value', 3600);
 * const value = await storage.get('key');
 * ```
 *
 * @public
 */
export function createKVStorage(config?: StorageConfig): KVStorage {
  const storageConfig = config || createStorageConfig();

  if (!validateStorageConfig(storageConfig)) {
    console.warn('Invalid storage configuration, falling back to memory storage');
    // Use safe defaults for memory storage
    const memoryConfig = Object.freeze({
      type: MEMORY_TYPE,
      connection_string: undefined,
      ttl_default: Math.max(1, storageConfig.ttl_default || 3600),
      max_retries: Math.max(0, storageConfig.max_retries || 3),
      timeout_ms: Math.max(1, storageConfig.timeout_ms || 5000),
      fallback_enabled: storageConfig.fallback_enabled ?? true,
    }) as StorageConfig;
    return new MemoryStorage(memoryConfig);
  }

  try {
    switch (storageConfig.type) {
      case REDIS_TYPE:
        return new RedisStorage(storageConfig);
      case EDGE_CONFIG_TYPE:
        return new EdgeConfigStorage(storageConfig);
      case MEMORY_TYPE:
      default:
        return new MemoryStorage(storageConfig);
    }
  } catch (error) {
    console.error('Failed to create KV storage, falling back to memory:', {
      type: storageConfig.type,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // Use safe defaults for fallback
    const fallbackConfig = Object.freeze({
      type: MEMORY_TYPE,
      connection_string: undefined,
      ttl_default: 3600,
      max_retries: 3,
      timeout_ms: 5000,
      fallback_enabled: true,
    }) as StorageConfig;
    return new MemoryStorage(fallbackConfig);
  }
}

/**
 * Function to perform connection and health checks on storage
 *
 * Runs a health check against the provided KV storage instance, verifying connectivity
 * and read/write availability. Uses a temporary test key to exercise real operations and
 * includes error handling in the validation.
 *
 * @param storage - KVStorage instance to check
 * @returns StorageOperationResult containing the health check result
 *
 * @example
 * ```typescript
 * const storage = getDefaultStorage();
 * const healthResult = await checkStorageHealth(storage);
 *
 * if (healthResult.success) {
 *   console.log('Storage is operating normally');
 * } else {
 *   console.error('Storage error:', healthResult.error);
 * }
 * ```
 *
 * @public
 */
export async function checkStorageHealth(
  storage: KVStorage
): Promise<StorageOperationResult<boolean>> {
  const testKey = `health_check_${Date.now()}`;
  const testValue = 'health_check_value';

  try {
    // Test write
    await storage.set(testKey, testValue, 10); // 10 seconds TTL

    // Test read
    const readValue = await storage.get(testKey);
    if (readValue !== testValue) {
      return {
        success: false,
        error: 'Read operation returned unexpected value',
      };
    }

    // Test exists
    const exists = await storage.exists(testKey);
    if (!exists) {
      return {
        success: false,
        error: 'Exists operation returned false for existing key',
      };
    }

    // Test delete
    await storage.delete(testKey);
    const deletedExists = await storage.exists(testKey);
    if (deletedExists) {
      return {
        success: false,
        error: 'Delete operation failed',
      };
    }

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Default storage instance (singleton pattern)
 */
let defaultStorageInstance: KVStorage | null = null;

/**
 * Get or create default storage instance
 */
/**
 * Get the default KV storage instance (singleton)
 *
 * Returns the default KV storage instance shared across the application.
 * The instance is created on the first call and reused thereafter. Can be reset
 * for tests or special use cases.
 *
 * @returns Shared KVStorage instance
 *
 * @example
 * ```typescript
 * // Use the same instance across the app
 * const storage1 = getDefaultStorage();
 * const storage2 = getDefaultStorage();
 * console.log(storage1 === storage2); // true
 *
 * // Using the storage
 * await storage1.set('user:123', JSON.stringify(userData));
 * const userData = JSON.parse(await storage2.get('user:123') || '{}');
 * ```
 *
 * @public
 */
export function getDefaultStorage(): KVStorage {
  if (!defaultStorageInstance) {
    defaultStorageInstance = createKVStorage();
  }
  return defaultStorageInstance;
}

/**
 * Reset default storage instance (for testing)
 */
/**
 * Reset the default storage instance
 *
 * Discards the current default storage instance so that a new one is created
 * on the next getDefaultStorage() call. Mainly used in tests or after config changes.
 *
 * @example
 * ```typescript
 * // Reset storage in test setup
 * beforeEach(() => {
 *   resetDefaultStorage();
 * });
 *
 * // Reset after changing configuration
 * process.env.REDIS_URL = 'redis://new-host:6379';
 * resetDefaultStorage(); // Recreate instance with new settings
 * const newStorage = getDefaultStorage();
 * ```
 *
 * @public
 */
export function resetDefaultStorage(): void {
  defaultStorageInstance = null;
}
