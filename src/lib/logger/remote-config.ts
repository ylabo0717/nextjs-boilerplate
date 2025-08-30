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
 * Remote Log Configuration Structure (Immutable)
 *
 * Defines dynamically updatable log level configuration.
 * All properties are readonly to guarantee immutability.
 *
 * @public
 */
export interface RemoteLogConfig {
  /** Global log level */
  readonly global_level: LogLevel;
  /** Service-specific log level settings */
  readonly service_levels: Readonly<Record<string, LogLevel>>;
  /** Rate limit settings */
  readonly rate_limits: Readonly<Record<string, number>>;
  /** Last update timestamp (ISO string) */
  readonly last_updated: string;
  /** Configuration version number */
  readonly version: number;
  /** Remote configuration enabled flag */
  readonly enabled: boolean;
}

/**
 * Configuration Fetch Result (Pure Function Return Type)
 *
 * Represents the result of remote configuration fetch operation.
 *
 * @public
 */
export interface ConfigFetchResult {
  /** Whether the fetch operation was successful */
  readonly success: boolean;
  /** Fetched configuration (only on success) */
  readonly config?: RemoteLogConfig;
  /** Error message (on failure) */
  readonly error?: string;
  /** Whether fetched from cache */
  readonly cached: boolean;
  /** Source of the configuration */
  readonly source: 'remote' | 'cache' | 'default';
}

/**
 * Configuration Cache Entry
 *
 * Configuration data and metadata stored in memory cache.
 */
interface CacheEntry {
  /** Cached configuration */
  readonly config: RemoteLogConfig;
  /** Cache creation timestamp (Unix time) */
  readonly cached_at: number;
  /** Cache expiration timestamp (Unix time) */
  readonly expires_at: number;
}

/**
 * Configuration Update Result
 *
 * Represents the result of remote configuration update operation.
 *
 * @public
 */
export interface ConfigUpdateResult {
  /** Whether the update operation was successful */
  readonly success: boolean;
  /** Updated configuration (only on success) */
  readonly config?: RemoteLogConfig;
  /** Error message (on failure) */
  readonly error?: string;
  /** Version number before update */
  readonly previous_version?: number;
}

/**
 * Configuration Validation Result
 *
 * Represents the result of configuration data validation.
 *
 * @public
 */
export interface ValidationResult {
  /** Whether validation was successful */
  readonly valid: boolean;
  /** List of detailed validation errors */
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
 * Function to merge two configurations and create a new configuration
 *
 * Creates a new configuration by merging partial update data with the current configuration as base.
 * Performs version increment, timestamp update, and proper merging of nested objects.
 *
 * @param base - Current configuration (base)
 * @param override - Partial update data
 * @returns Merged new configuration object
 *
 * @example
 * ```typescript
 * const currentConfig = {
 *   global_level: 'info',
 *   service_levels: { api: 'debug' },
 *   rate_limits: { error: 100 },
 *   version: 1,
 *   // ... other fields
 * };
 *
 * const updates = {
 *   global_level: 'warn',
 *   service_levels: { auth: 'error' }, // 'api' is preserved, 'auth' is added
 * };
 *
 * const merged = mergeConfigurations(currentConfig, updates);
 * // Result: global_level='warn', version=2, service_levels={api:'debug', auth:'error'}
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
