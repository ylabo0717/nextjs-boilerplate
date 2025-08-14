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
 * Remote configuration structure (immutable)
 */
export interface RemoteLogConfig {
  readonly global_level: LogLevel;
  readonly service_levels: Readonly<Record<string, LogLevel>>;
  readonly rate_limits: Readonly<Record<string, number>>;
  readonly last_updated: string;
  readonly version: number;
  readonly enabled: boolean;
}

/**
 * Configuration fetch result (pure function return type)
 */
export interface ConfigFetchResult {
  readonly success: boolean;
  readonly config?: RemoteLogConfig;
  readonly error?: string;
  readonly cached: boolean;
  readonly source: 'remote' | 'cache' | 'default';
}

/**
 * Configuration cache entry
 */
interface CacheEntry {
  readonly config: RemoteLogConfig;
  readonly cached_at: number;
  readonly expires_at: number;
}

/**
 * Configuration update result
 */
export interface ConfigUpdateResult {
  readonly success: boolean;
  readonly config?: RemoteLogConfig;
  readonly error?: string;
  readonly previous_version?: number;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  readonly valid: boolean;
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
 * Validate remote configuration (pure function)
 */
export function validateRemoteConfig(config: unknown): ValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: ['Configuration must be an object'],
    };
  }

  const cfg = config as Record<string, unknown>;

  // Validate global_level
  if (typeof cfg.global_level !== 'string') {
    errors.push('global_level must be a string');
  } else if (!isValidLogLevel(cfg.global_level)) {
    errors.push(`global_level must be one of: trace, debug, info, warn, error, fatal. Got: ${cfg.global_level}`);
  }

  // Validate service_levels
  if (cfg.service_levels !== undefined) {
    if (typeof cfg.service_levels !== 'object' || cfg.service_levels === null) {
      errors.push('service_levels must be an object');
    } else {
      const serviceLevels = cfg.service_levels as Record<string, unknown>;
      for (const [service, level] of Object.entries(serviceLevels)) {
        if (typeof level !== 'string') {
          errors.push(`service_levels.${service} must be a string`);
        } else if (!isValidLogLevel(level)) {
          errors.push(`service_levels.${service} must be a valid log level. Got: ${level}`);
        }
      }
    }
  }

  // Validate rate_limits
  if (cfg.rate_limits !== undefined) {
    if (typeof cfg.rate_limits !== 'object' || cfg.rate_limits === null) {
      errors.push('rate_limits must be an object');
    } else {
      const rateLimits = cfg.rate_limits as Record<string, unknown>;
      for (const [key, limit] of Object.entries(rateLimits)) {
        if (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit)) {
          errors.push(`rate_limits.${key} must be a non-negative integer. Got: ${limit}`);
        }
      }
    }
  }

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

  return {
    valid: errors.length === 0,
    errors: Object.freeze(errors),
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
    expires_at: now + (ttl * 1000),
  };
}

/**
 * Check if cache entry is valid (pure function)
 */
function isCacheValid(entry: CacheEntry, maxAge: number = MAX_CACHE_AGE): boolean {
  const now = Date.now();
  const age = now - entry.cached_at;
  
  return now < entry.expires_at && age < (maxAge * 1000);
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
export function getEffectiveLogLevel(
  config: RemoteLogConfig,
  serviceName?: string
): LogLevel {
  if (!config.enabled) {
    return 'info'; // Fallback when remote config is disabled
  }

  if (serviceName && config.service_levels[serviceName]) {
    return config.service_levels[serviceName];
  }

  return config.global_level;
}

/**
 * Merge configurations with precedence (pure function)
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
export function shouldUpdateConfig(
  current: RemoteLogConfig,
  remote: RemoteLogConfig
): boolean {
  return remote.version > current.version;
}

/**
 * Get configuration with fallback (side effect function)
 */
export async function getConfigWithFallback(
  storage?: KVStorage
): Promise<ConfigFetchResult> {
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