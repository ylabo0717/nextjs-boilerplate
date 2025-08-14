/**
 * Key-Value Storage Abstraction Layer
 * Supports Redis, Vercel Edge Config, and Memory storage
 *
 * Pure function-based implementation following project architecture principles.
 * Provides unified interface for different KV storage backends with graceful fallbacks.
 */

/**
 * KV Storage interface (pure abstraction)
 */
export interface KVStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  readonly type: 'redis' | 'edge-config' | 'memory';
}

/**
 * Storage configuration (immutable)
 */
export interface StorageConfig {
  readonly type: 'redis' | 'edge-config' | 'memory';
  readonly connection_string?: string;
  readonly ttl_default: number;
  readonly max_retries: number;
  readonly timeout_ms: number;
  readonly fallback_enabled: boolean;
}

/**
 * Operation result with error handling
 */
export interface StorageOperationResult<T = void> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly retry_after?: number;
}

/**
 * Create storage configuration (pure function)
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
function detectStorageType(): 'redis' | 'edge-config' | 'memory' {
  // Redis detection
  if (process.env.REDIS_URL || process.env.KV_CONNECTION_STRING) {
    return 'redis';
  }

  // Vercel Edge Config detection
  if (process.env.EDGE_CONFIG_ID && process.env.EDGE_CONFIG_TOKEN) {
    return 'edge-config';
  }

  // Default to memory storage
  return 'memory';
}

/**
 * Validate storage configuration (pure function)
 */
export function validateStorageConfig(config: StorageConfig): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const validTypes = ['redis', 'edge-config', 'memory'];
  if (!validTypes.includes(config.type)) {
    return false;
  }

  if (config.type === 'redis' && !config.connection_string) {
    return false;
  }

  if (config.ttl_default <= 0 || config.max_retries < 0 || config.timeout_ms <= 0) {
    return false;
  }

  return true;
}

/**
 * Redis Storage Implementation
 */
export class RedisStorage implements KVStorage {
  public readonly type = 'redis' as const;
  private config: StorageConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any; // Redis client type
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

  private async getClient() {
    if (!this.client || !this.isConnected) {
      try {
        // Dynamic import for Redis (edge runtime compatibility)
        const Redis = await import('ioredis');
        this.client = new Redis.default(this.config.connection_string!, {
          maxRetriesPerRequest: this.config.max_retries,
          connectTimeout: this.config.timeout_ms,
          commandTimeout: this.config.timeout_ms,
        });

        // Connection event listeners
        this.client.on('connect', () => {
          this.isConnected = true;
        });

        this.client.on('error', (error: Error) => {
          console.error('Redis connection error:', {
            error: error.message,
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

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Memory Storage Implementation (fallback)
 */
export class MemoryStorage implements KVStorage {
  public readonly type = 'memory' as const;
  private store: Map<string, { value: string; expires: number }>;
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
 */
export class EdgeConfigStorage implements KVStorage {
  public readonly type = 'edge-config' as const;
  private config: StorageConfig;
  private baseUrl: string;
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
export function createKVStorage(config?: StorageConfig): KVStorage {
  const storageConfig = config || createStorageConfig();

  if (!validateStorageConfig(storageConfig)) {
    console.warn('Invalid storage configuration, falling back to memory storage');
    // Use safe defaults for memory storage
    const memoryConfig = Object.freeze({
      type: 'memory' as const,
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
      case 'redis':
        return new RedisStorage(storageConfig);
      case 'edge-config':
        return new EdgeConfigStorage(storageConfig);
      case 'memory':
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
      type: 'memory' as const,
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
 * Storage health check (pure function)
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
export function getDefaultStorage(): KVStorage {
  if (!defaultStorageInstance) {
    defaultStorageInstance = createKVStorage();
  }
  return defaultStorageInstance;
}

/**
 * Reset default storage instance (for testing)
 */
export function resetDefaultStorage(): void {
  defaultStorageInstance = null;
}
