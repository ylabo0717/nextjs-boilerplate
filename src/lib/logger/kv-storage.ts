/**
 * Key-Value Storage Abstraction Layer
 * Supports Redis, Vercel Edge Config, and Memory storage
 *
 * Pure function-based implementation following project architecture principles.
 * Provides unified interface for different KV storage backends with graceful fallbacks.
 */

// Storage type constants
const REDIS_TYPE = 'redis' as const;
const EDGE_CONFIG_TYPE = 'edge-config' as const;
const MEMORY_TYPE = 'memory' as const;

/**
 * KV Storage interface (pure abstraction)
 */
export interface KVStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  readonly type: typeof REDIS_TYPE | typeof EDGE_CONFIG_TYPE | typeof MEMORY_TYPE;
}

/**
 * Storage configuration (immutable)
 */
export interface StorageConfig {
  readonly type: typeof REDIS_TYPE | typeof EDGE_CONFIG_TYPE | typeof MEMORY_TYPE;
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
/**
 * ストレージ設定を作成する純粋関数
 *
 * 環境変数に基づいて適切なKVストレージ設定を自動選択し、設定オブジェクトを作成します。
 * Redis、Edge Config、メモリストレージの優先順で選択され、
 * 各ストレージタイプに応じた設定値が適用されます。
 *
 * @returns 不変のStorageConfig設定オブジェクト
 *
 * @example
 * ```typescript
 * // 環境変数に基づく自動設定
 * const config = createStorageConfig();
 * // {
 * //   type: 'redis', // または 'edge-config', 'memory'
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
  public readonly type = EDGE_CONFIG_TYPE;
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
/**
 * KVストレージインスタンスを作成する関数
 *
 * 指定された設定または自動検出された環境に基づいて、適切なKVストレージ実装を作成します。
 * Redis、Edge Config、メモリストレージのいずれかが選択され、
 * 統一されたKVStorageインターフェースを提供します。
 *
 * @param config - ストレージ設定（オプション、未指定時は自動設定）
 * @returns KVStorageインターフェースを実装したストレージインスタンス
 *
 * @example
 * ```typescript
 * // 自動設定でストレージ作成
 * const storage = createKVStorage();
 *
 * // カスタム設定でストレージ作成
 * const customStorage = createKVStorage({
 *   type: 'memory',
 *   ttl_default: 1800,
 *   max_retries: 3,
 *   timeout_ms: 5000,
 *   fallback_enabled: true
 * });
 *
 * // ストレージの使用
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
 * ストレージの接続状態とヘルスチェックを実行する関数
 *
 * 指定されたKVストレージインスタンスに対してヘルスチェックを実行し、
 * 接続状態、読み書き操作の可用性を確認します。一時的なテストキーを使用して
 * 実際の操作をテストし、エラーハンドリングも含めて検証します。
 *
 * @param storage - ヘルスチェック対象のKVStorageインスタンス
 * @returns ヘルスチェック結果を含むStorageOperationResult
 *
 * @example
 * ```typescript
 * const storage = getDefaultStorage();
 * const healthResult = await checkStorageHealth(storage);
 *
 * if (healthResult.success) {
 *   console.log('ストレージは正常に動作しています');
 * } else {
 *   console.error('ストレージエラー:', healthResult.error);
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
 * デフォルトKVストレージインスタンスを取得する関数（シングルトン）
 *
 * アプリケーション全体で共有されるデフォルトのKVストレージインスタンスを返します。
 * 初回呼び出し時にインスタンスが作成され、以降は同じインスタンスが返されます。
 * テストや特別な用途でのリセットが可能です。
 *
 * @returns 共有KVStorageインスタンス
 *
 * @example
 * ```typescript
 * // アプリケーション全体で同じインスタンスを使用
 * const storage1 = getDefaultStorage();
 * const storage2 = getDefaultStorage();
 * console.log(storage1 === storage2); // true
 *
 * // ストレージの使用
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
 * デフォルトストレージインスタンスをリセットする関数
 *
 * 現在のデフォルトストレージインスタンスを破棄し、次回getDefaultStorage()呼び出し時に
 * 新しいインスタンスが作成されるようにします。主にテスト環境や設定変更時に使用します。
 *
 * @example
 * ```typescript
 * // テストの前処理でストレージをリセット
 * beforeEach(() => {
 *   resetDefaultStorage();
 * });
 *
 * // 設定変更後のリセット
 * process.env.REDIS_URL = 'redis://new-host:6379';
 * resetDefaultStorage(); // 新しい設定でインスタンスを再作成
 * const newStorage = getDefaultStorage();
 * ```
 *
 * @public
 */
export function resetDefaultStorage(): void {
  defaultStorageInstance = null;
}
