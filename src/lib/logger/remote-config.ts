/**
 * Dynamic Remote Log Level Configuration
 * Pure function-based implementation with Redis/Edge KV integration
 *
 * Enables runtime log level changes without application restart.
 * Provides fail-safe fallback and caching mechanisms.
 */

import { getDefaultStorage, type KVStorage } from './kv-storage';

import type { LogLevel } from './types';

/**
 * リモートログ設定構造（不変）
 *
 * 動的に更新可能なログレベル設定を定義します。
 * すべてのプロパティがreadonlyで不変性を保証しています。
 *
 * @public
 */
export interface RemoteLogConfig {
  /** グローバルログレベル */
  readonly global_level: LogLevel;
  /** サービス別ログレベル設定 */
  readonly service_levels: Readonly<Record<string, LogLevel>>;
  /** レート制限設定 */
  readonly rate_limits: Readonly<Record<string, number>>;
  /** 最終更新日時（ISO文字列） */
  readonly last_updated: string;
  /** 設定バージョン番号 */
  readonly version: number;
  /** リモート設定の有効化フラグ */
  readonly enabled: boolean;
}

/**
 * 設定取得結果（純粋関数戻り値型）
 *
 * リモート設定の取得操作の結果を表します。
 *
 * @public
 */
export interface ConfigFetchResult {
  /** 取得操作が成功したかどうか */
  readonly success: boolean;
  /** 取得された設定（成功時のみ） */
  readonly config?: RemoteLogConfig;
  /** エラーメッセージ（失敗時） */
  readonly error?: string;
  /** キャッシュからの取得かどうか */
  readonly cached: boolean;
  /** 設定の取得元 */
  readonly source: 'remote' | 'cache' | 'default';
}

/**
 * 設定キャッシュエントリ
 *
 * メモリキャッシュに保存される設定データとメタデータ。
 */
interface CacheEntry {
  /** キャッシュされた設定 */
  readonly config: RemoteLogConfig;
  /** キャッシュ作成時刻（Unix時刻） */
  readonly cached_at: number;
  /** キャッシュ有効期限（Unix時刻） */
  readonly expires_at: number;
}

/**
 * 設定更新結果
 *
 * リモート設定の更新操作の結果を表します。
 *
 * @public
 */
export interface ConfigUpdateResult {
  /** 更新操作が成功したかどうか */
  readonly success: boolean;
  /** 更新後の設定（成功時のみ） */
  readonly config?: RemoteLogConfig;
  /** エラーメッセージ（失敗時） */
  readonly error?: string;
  /** 更新前のバージョン番号 */
  readonly previous_version?: number;
}

/**
 * 設定バリデーション結果
 *
 * 設定データの妥当性検証結果を表します。
 *
 * @public
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  readonly valid: boolean;
  /** バリデーションエラーの詳細リスト */
  readonly errors: readonly string[];
}

// Configuration constants
const CONFIG_KEY = 'logger_remote_config';
const CACHE_KEY = 'logger_config_cache';
const DEFAULT_CACHE_TTL = 300; // 5 minutes
const MAX_CACHE_AGE = 3600; // 1 hour

/**
 * Create default configuration (pure function)
 */
export function createDefaultConfig(): RemoteLogConfig {
  return Object.freeze({
    global_level: 'info',
    service_levels: Object.freeze({}),
    rate_limits: Object.freeze({
      error_logs: 100,
      warn_logs: 500,
      info_logs: 1000,
      debug_logs: 50,
    }),
    last_updated: new Date().toISOString(),
    version: 1,
    enabled: true,
  }) as RemoteLogConfig;
}

/**
 * Validate log level (pure function)
 */
function isValidLogLevel(level: string): level is LogLevel {
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  return validLevels.includes(level as LogLevel);
}

/**
 * Validate global_level field
 */
function validateGlobalLevel(cfg: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof cfg.global_level !== 'string') {
    errors.push('global_level must be a string');
  } else if (!isValidLogLevel(cfg.global_level)) {
    errors.push(
      `global_level must be one of: trace, debug, info, warn, error, fatal. Got: ${cfg.global_level}`
    );
  }
  return errors;
}

/**
 * Validate service_levels field
 */
function validateServiceLevels(cfg: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (cfg.service_levels === undefined) return errors;

  if (typeof cfg.service_levels !== 'object' || cfg.service_levels === null) {
    errors.push('service_levels must be an object');
    return errors;
  }

  const serviceLevels = cfg.service_levels as Record<string, unknown>;
  for (const [service, level] of Object.entries(serviceLevels)) {
    if (typeof level !== 'string') {
      errors.push(`service_levels.${service} must be a string`);
    } else if (!isValidLogLevel(level)) {
      errors.push(`service_levels.${service} must be a valid log level. Got: ${level}`);
    }
  }
  return errors;
}

/**
 * Validate rate_limits field
 */
function validateRateLimits(cfg: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (cfg.rate_limits === undefined) return errors;

  if (typeof cfg.rate_limits !== 'object' || cfg.rate_limits === null) {
    errors.push('rate_limits must be an object');
    return errors;
  }

  const rateLimits = cfg.rate_limits as Record<string, unknown>;
  for (const [key, limit] of Object.entries(rateLimits)) {
    if (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit)) {
      errors.push(`rate_limits.${key} must be a non-negative integer. Got: ${limit}`);
    }
  }
  return errors;
}

/**
 * Validate metadata fields
 */
function validateMetadataFields(cfg: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // Validate last_updated
  if (typeof cfg.last_updated !== 'string') {
    errors.push('last_updated must be a string');
  } else {
    const date = new Date(cfg.last_updated);
    if (isNaN(date.getTime())) {
      errors.push('last_updated must be a valid ISO date string');
    }
  }

  // Validate version
  if (typeof cfg.version !== 'number' || cfg.version < 1 || !Number.isInteger(cfg.version)) {
    errors.push('version must be a positive integer');
  }

  // Validate enabled
  if (cfg.enabled !== undefined && typeof cfg.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  return errors;
}

/**
 * Validate remote configuration (pure function)
 */
export function validateRemoteConfig(config: unknown): ValidationResult {
  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: ['Configuration must be an object'],
    };
  }

  const cfg = config as Record<string, unknown>;
  const allErrors = [
    ...validateGlobalLevel(cfg),
    ...validateServiceLevels(cfg),
    ...validateRateLimits(cfg),
    ...validateMetadataFields(cfg),
  ];

  return {
    valid: allErrors.length === 0,
    errors: Object.freeze(allErrors),
  };
}

/**
 * Sanitize and freeze configuration (pure function)
 */
export function sanitizeConfig(config: Partial<RemoteLogConfig>): RemoteLogConfig {
  const defaultConfig = createDefaultConfig();

  return Object.freeze({
    global_level: config.global_level || defaultConfig.global_level,
    service_levels: Object.freeze({
      ...defaultConfig.service_levels,
      ...(config.service_levels || {}),
    }),
    rate_limits: Object.freeze({
      ...defaultConfig.rate_limits,
      ...(config.rate_limits || {}),
    }),
    last_updated: config.last_updated || new Date().toISOString(),
    version: config.version || defaultConfig.version,
    enabled: config.enabled !== undefined ? config.enabled : defaultConfig.enabled,
  }) as RemoteLogConfig;
}

/**
 * Create cache entry (pure function)
 */
function createCacheEntry(config: RemoteLogConfig, ttl: number = DEFAULT_CACHE_TTL): CacheEntry {
  const now = Date.now();
  return {
    config,
    cached_at: now,
    expires_at: now + ttl * 1000,
  };
}

/**
 * Check if cache entry is valid (pure function)
 */
function isCacheValid(entry: CacheEntry, maxAge: number = MAX_CACHE_AGE): boolean {
  const now = Date.now();
  const age = now - entry.cached_at;

  return now < entry.expires_at && age < maxAge * 1000;
}

/**
 * Fetch configuration from cache (side effect function)
 */
async function fetchFromCache(storage: KVStorage): Promise<ConfigFetchResult> {
  try {
    const cacheData = await storage.get(CACHE_KEY);
    if (!cacheData) {
      return {
        success: false,
        error: 'No cached configuration found',
        cached: false,
        source: 'cache',
      };
    }

    const cacheEntry: CacheEntry = JSON.parse(cacheData);

    if (!isCacheValid(cacheEntry)) {
      return {
        success: false,
        error: 'Cached configuration expired',
        cached: false,
        source: 'cache',
      };
    }

    return {
      success: true,
      config: cacheEntry.config,
      cached: true,
      source: 'cache',
    };
  } catch (error) {
    return {
      success: false,
      error: `Cache fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      cached: false,
      source: 'cache',
    };
  }
}

/**
 * Save configuration to cache (side effect function)
 */
async function saveToCache(
  storage: KVStorage,
  config: RemoteLogConfig,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    const cacheEntry = createCacheEntry(config, ttl);
    await storage.set(CACHE_KEY, JSON.stringify(cacheEntry), ttl);
  } catch (error) {
    console.warn('Failed to save configuration to cache:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Fetch configuration from remote storage (side effect function)
 */
export async function fetchRemoteConfig(
  storage?: KVStorage,
  useCache: boolean = true
): Promise<ConfigFetchResult> {
  const kvStorage = storage || getDefaultStorage();

  // Try cache first if enabled
  if (useCache) {
    const cacheResult = await fetchFromCache(kvStorage);
    if (cacheResult.success) {
      return cacheResult;
    }
  }

  try {
    const configData = await kvStorage.get(CONFIG_KEY);

    if (!configData) {
      return {
        success: false,
        error: 'Remote configuration not found',
        cached: false,
        source: 'remote',
      };
    }

    const parsedConfig = JSON.parse(configData);
    const validation = validateRemoteConfig(parsedConfig);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid configuration: ${validation.errors.join(', ')}`,
        cached: false,
        source: 'remote',
      };
    }

    const config = sanitizeConfig(parsedConfig);

    // Save to cache for next time
    if (useCache) {
      await saveToCache(kvStorage, config);
    }

    return {
      success: true,
      config,
      cached: false,
      source: 'remote',
    };
  } catch (error) {
    return {
      success: false,
      error: `Remote fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      cached: false,
      source: 'remote',
    };
  }
}

/**
 * Save configuration to remote storage (side effect function)
 */
export async function saveRemoteConfig(
  config: RemoteLogConfig,
  storage?: KVStorage
): Promise<ConfigUpdateResult> {
  const kvStorage = storage || getDefaultStorage();

  try {
    // Validate configuration before saving
    const validation = validateRemoteConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Get current version for comparison
    const currentResult = await fetchRemoteConfig(kvStorage, false);
    const previousVersion = currentResult.success ? currentResult.config!.version : 0;

    // Create new version with incremented number
    const newConfig = sanitizeConfig({
      ...config,
      version: previousVersion + 1,
      last_updated: new Date().toISOString(),
    });

    // Save to remote storage
    await kvStorage.set(CONFIG_KEY, JSON.stringify(newConfig));

    // Update cache
    await saveToCache(kvStorage, newConfig);

    return {
      success: true,
      config: newConfig,
      previous_version: previousVersion,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get effective log level for service (pure function)
 */
export function getEffectiveLogLevel(config: RemoteLogConfig, serviceName?: string): LogLevel {
  if (!config.enabled) {
    return 'info'; // Fallback when remote config is disabled
  }

  if (serviceName) {
    const serviceLevelsMap = new Map(Object.entries(config.service_levels));
    const serviceLevel = serviceLevelsMap.get(serviceName);
    if (serviceLevel) {
      return serviceLevel;
    }
  }

  return config.global_level;
}

/**
 * Merge configurations with precedence (pure function)
 */
/**
 * 2つの設定をマージして新しい設定を作成する関数
 *
 * 現在の設定をベースに、部分的な更新データをマージして新しい設定を作成します。
 * バージョンのインクリメント、タイムスタンプの更新、ネストされたオブジェクトの適切なマージを行います。
 *
 * @param base - 現在の設定（ベース）
 * @param override - 部分的な更新データ
 * @returns マージされた新しい設定オブジェクト
 *
 * @example
 * ```typescript
 * const currentConfig = {
 *   global_level: 'info',
 *   service_levels: { api: 'debug' },
 *   rate_limits: { error: 100 },
 *   version: 1,
 *   // ... その他のフィールド
 * };
 *
 * const updates = {
 *   global_level: 'warn',
 *   service_levels: { auth: 'error' }, // apiは保持、authが追加
 * };
 *
 * const merged = mergeConfigurations(currentConfig, updates);
 * // 結果: global_level='warn', version=2, service_levels={api:'debug', auth:'error'}
 * ```
 *
 * @public
 */
export function mergeConfigurations(
  base: RemoteLogConfig,
  override: Partial<RemoteLogConfig>
): RemoteLogConfig {
  return sanitizeConfig({
    global_level: override.global_level ?? base.global_level,
    service_levels: {
      ...base.service_levels,
      ...override.service_levels,
    },
    rate_limits: {
      ...base.rate_limits,
      ...override.rate_limits,
    },
    last_updated: override.last_updated ?? new Date().toISOString(),
    version: (override.version ?? base.version) + 1,
    enabled: override.enabled ?? base.enabled,
  });
}

/**
 * Check if configuration update is needed (pure function)
 */
export function shouldUpdateConfig(current: RemoteLogConfig, remote: RemoteLogConfig): boolean {
  return remote.version > current.version;
}

/**
 * Get configuration with fallback (side effect function)
 */
export async function getConfigWithFallback(storage?: KVStorage): Promise<ConfigFetchResult> {
  const remoteResult = await fetchRemoteConfig(storage, true);

  if (remoteResult.success) {
    return remoteResult;
  }

  // Fallback to default configuration
  const defaultConfig = createDefaultConfig();

  return {
    success: true,
    config: defaultConfig,
    cached: false,
    source: 'default',
  };
}

/**
 * Clear configuration cache (side effect function)
 */
export async function clearConfigCache(storage?: KVStorage): Promise<void> {
  const kvStorage = storage || getDefaultStorage();

  try {
    await kvStorage.delete(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear configuration cache:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get configuration summary for monitoring (pure function)
 */
export function getConfigSummary(config: RemoteLogConfig): {
  readonly global_level: LogLevel;
  readonly service_count: number;
  readonly rate_limit_count: number;
  readonly version: number;
  readonly enabled: boolean;
  readonly last_updated: string;
} {
  return Object.freeze({
    global_level: config.global_level,
    service_count: Object.keys(config.service_levels).length,
    rate_limit_count: Object.keys(config.rate_limits).length,
    version: config.version,
    enabled: config.enabled,
    last_updated: config.last_updated,
  });
}
