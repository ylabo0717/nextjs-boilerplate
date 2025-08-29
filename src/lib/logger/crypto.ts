/**
 * 🚨 High-risk response: GDPR-compliant IP hashing implementation
 * HMAC-SHA256 encryption for personal identification information protection
 */

import { randomBytes, createHmac } from 'node:crypto';

/**
 * IP hashing configuration type
 *
 * Configuration object for IP address encryption using HMAC-SHA256.
 * Immutable configuration used as arguments for pure functions.
 *
 * @public
 */
export type IPHashConfig = {
  /** Secret key for HMAC-SHA256 */
  readonly secret: string;
};

/**
 * Create IP hashing configuration (pure function)
 *
 * Obtains secret key from environment variables or auto-generation and creates immutable configuration object.
 * Environment variables are required in production, but auto-generation works in development environment.
 *
 * @returns Immutable IP hashing configuration object
 * @throws Error When environment variable is not set in production environment
 *
 * @public
 */
export function createIPHashConfig(): IPHashConfig {
  // Environment variables are required in production environment - early validation
  if (process.env.NODE_ENV === 'production' && !process.env.LOG_IP_HASH_SECRET) {
    throw new Error(
      'LOG_IP_HASH_SECRET environment variable is required in production environment for GDPR compliance'
    );
  }

  const secret = process.env.LOG_IP_HASH_SECRET || generateSecret();

  if (!process.env.LOG_IP_HASH_SECRET) {
    console.warn(
      'LOG_IP_HASH_SECRET not set. Generated temporary secret for IP hashing. ' +
        'Please set LOG_IP_HASH_SECRET environment variable for production.'
    );
  }

  return Object.freeze({
    secret,
  });
}

/**
 * Automatic secret key generation (pure function)
 *
 * Generates a 32-byte secret key using cryptographically secure random numbers.
 * Not available in production environment, development environment only.
 *
 * @returns Generated secret key (Hex format)
 * @throws Error When called in production environment
 *
 * @internal
 */
function generateSecret(): string {
  // Environment variables must be set in production environment
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'LOG_IP_HASH_SECRET environment variable is required in production environment for GDPR compliance'
    );
  }
  // Use statically imported randomBytes
  return randomBytes(32).toString('hex');
}

/**
 * IPv6 address normalization (pure function)
 *
 * Unifies IPv6 address notation and handles special cases.
 * Used as preprocessing before hashing.
 *
 * Normalization rules:
 * - IPv4-mapped IPv6 (::ffff:x.x.x.x) → Extract IPv4 part
 * - IPv6 localhost (::1) → 127.0.0.1
 * - Others → Remove leading/trailing whitespace
 *
 * @param ip - IP address to normalize
 * @returns Normalized IP address
 *
 * @internal
 */
function normalizeIPv6(ip: string): string {
  // IPv4-mapped IPv6 normalization
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7); // Extract only IPv4 part
  }

  // Localhost normalization
  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip.trim();
}

/**
 * GDPR-compliant IP address hashing (pure function)
 *
 * Irreversibly hashes using HMAC-SHA256(ip + salt).
 * Achieves both personal identification information protection and log analysis.
 *
 * Processing flow:
 * 1. IPv6 address normalization
 * 2. Irreversible hashing using HMAC-SHA256
 * 3. Output results in Hex format
 *
 * @param config - IP hashing configuration
 * @param ipAddress - IP address to hash
 * @returns Hashed IP (Hex format), 'ip_invalid' or 'ip_hash_error' if invalid
 *
 * @public
 */
export function hashIP(config: IPHashConfig, ipAddress: string): string {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return 'ip_invalid';
  }

  try {
    // IPv6 normalization
    const normalizedIP = normalizeIPv6(ipAddress);

    // Hash with HMAC-SHA256
    const hmac = createHmac('sha256', config.secret);
    hmac.update(normalizedIP);
    const hash = hmac.digest('hex');

    // Balance between security and readability (use only first 8 characters)
    return `ip_${hash.substring(0, 8)}`;
  } catch (error) {
    console.error('Failed to hash IP address:', error);
    return 'ip_hash_error';
  }
}

/**
 * Secret key validity check (pure function)
 *
 * Verifies whether the configured secret key meets cryptographic requirements.
 * Requires a minimum length of 128 bits (32 characters).
 *
 * @param config - IP hashing configuration
 * @returns true if secret key is valid
 *
 * @public
 */
export function validateIPHashSecret(config: IPHashConfig): boolean {
  // Minimum 32 characters (128bit) requirement check
  return config.secret.length >= 32;
}

/**
 * Create configuration for testing (pure function)
 *
 * Creates fixed configuration available only in unit test environments.
 * Used for state clearing between tests.
 *
 * @param secret - Test secret key (optional)
 * @returns Test configuration object
 * @throws Error When called outside test environment
 *
 * @public
 */
export function createTestIPHashConfig(
  secret: string = 'test-secret-key-32-chars-long!'
): IPHashConfig {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('createTestIPHashConfig() can only be called in test environment');
  }

  return {
    secret,
  } as const;
}

// ===================================================================
// Default instances and helper functions (backward compatibility)
// ===================================================================

/**
 * Default IP hashing configuration
 *
 * Default configuration used throughout the application.
 * Created only once and used as immutable thereafter.
 *
 * @public
 */
export const defaultIPHashConfig = createIPHashConfig();

/**
 * IP hashing utility function (backward compatibility)
 *
 * Convenient alias using default configuration.
 * Provided for compatibility with existing code.
 *
 * @param ipAddress - IP address to hash
 * @returns Hashed IP
 *
 * @public
 */
export const hashIPWithDefault = (ipAddress: string) => hashIP(defaultIPHashConfig, ipAddress);

/**
 * Validation function (backward compatibility)
 *
 * Secret key validity check using default configuration.
 * Provided for compatibility with existing code.
 *
 * @returns true if secret key is valid
 *
 * @public
 */
export const validateIPHashSecretWithDefault = () => validateIPHashSecret(defaultIPHashConfig);
