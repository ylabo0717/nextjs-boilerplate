/**
 * 🚨 高リスク項目テスト: HMAC-SHA256 IPハッシュ機能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createIPHashConfig,
  hashIP,
  validateIPHashSecret,
  defaultIPHashConfig,
  createTestIPHashConfig,
} from '../../../src/lib/logger/crypto';
import type { IPHashConfig } from '../../../src/lib/logger/crypto';

describe('IP Hash - GDPR Compliance (Pure Functions)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // テスト環境をクリーンな状態に
    process.env = { ...originalEnv };
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('🔒 GDPR準拠のIPハッシュ化', () => {
    it('should hash IPv4 addresses consistently', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ip = '192.168.1.1';
      const hash1 = hashIP(config, ip);
      const hash2 = hashIP(config, ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^ip_[a-f0-9]{8}$/);
      expect(hash1).not.toContain(ip);
    });

    it('should hash IPv6 addresses consistently', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const hash1 = hashIP(config, ip);
      const hash2 = hashIP(config, ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^ip_[a-f0-9]{8}$/);
      expect(hash1).not.toContain(ip);
    });

    it('should normalize IPv4-mapped IPv6 addresses', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ipv4 = '192.168.1.1';
      const ipv6Mapped = '::ffff:192.168.1.1';

      const hash1 = hashIP(config, ipv4);
      const hash2 = hashIP(config, ipv6Mapped);

      expect(hash1).toBe(hash2);
    });

    it('should normalize localhost addresses', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ipv4Localhost = '127.0.0.1';
      const ipv6Localhost = '::1';

      const hash1 = hashIP(config, ipv4Localhost);
      const hash2 = hashIP(config, ipv6Localhost);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different IPs', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      const hash1 = hashIP(config, ip1);
      const hash2 = hashIP(config, ip2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different secrets', () => {
      const ip = '192.168.1.1';

      const config1 = {
        secret: 'secret1-32-characters-long-test',
      };
      const config2 = {
        secret: 'secret2-32-characters-long-test',
      };

      const hash1 = hashIP(config1, ip);
      const hash2 = hashIP(config2, ip);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('🚨 セキュリティ要件', () => {
    it('should require LOG_IP_HASH_SECRET in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      delete process.env.LOG_IP_HASH_SECRET;

      expect(() => {
        const config = createIPHashConfig();
        hashIP(config, '192.168.1.1');
      }).toThrow(/LOG_IP_HASH_SECRET environment variable is required in production/);
    });

    it('should warn when LOG_IP_HASH_SECRET is not set in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      delete process.env.LOG_IP_HASH_SECRET;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = createIPHashConfig();
      hashIP(config, '192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LOG_IP_HASH_SECRET not set')
      );

      consoleSpy.mockRestore();
    });

    it('should validate secret key strength', () => {
      const strongSecret = 'test-secret-32-characters-long!!';
      const weakSecret = 'short';

      const config1 = { secret: strongSecret } as IPHashConfig;
      const config2 = { secret: weakSecret } as IPHashConfig;
      expect(validateIPHashSecret(config1)).toBe(true);
      expect(validateIPHashSecret(config2)).toBe(false);
    });
  });

  describe('🛡️ エラーハンドリング', () => {
    it('should handle invalid IP addresses gracefully', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      expect(hashIP(config, '')).toBe('ip_invalid');
      expect(hashIP(config, null as any)).toBe('ip_invalid');
      expect(hashIP(config, undefined as any)).toBe('ip_invalid');
      expect(hashIP(config, 123 as any)).toBe('ip_invalid');
    });

    it('should handle crypto errors gracefully', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 非常に長い文字列でメモリエラーを誘発
      const veryLongString = 'x'.repeat(1000000);
      const result = hashIP(config, veryLongString);

      // エラーが発生した場合でも適切なフォールバック値を返す
      expect(result).toMatch(/^ip_[a-f0-9]{8}|ip_hash_error$/);

      consoleSpy.mockRestore();
    });

    it('should handle crypto module failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Invalid config that might cause crypto error
      const invalidConfig = {
        secret: null as any,
      };

      const result = hashIP(invalidConfig, '192.168.1.1');

      // Should handle error gracefully
      expect(result).toMatch(/^ip_invalid|ip_hash_error$/);
      
      consoleSpy.mockRestore();
    });

    it('should handle extremely large IP input that might cause memory issues', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a pathological IP string that might cause issues
      const problematicIP = 'a'.repeat(100000) + '.'.repeat(100000);
      const result = hashIP(config, problematicIP);

      // Should either hash successfully or return error fallback
      expect(result).toMatch(/^ip_[a-f0-9]{8}|ip_hash_error$/);

      consoleSpy.mockRestore();
    });
  });

  describe('📊 パフォーマンス要件', () => {
    it('should hash IPs efficiently', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ips = Array.from({ length: 1000 }, (_, i) => `192.168.1.${i % 255}`);

      const start = Date.now();
      const hashes = ips.map((ip) => hashIP(config, ip));
      const duration = Date.now() - start;

      expect(hashes).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // 100ms以内で1000個のIPをハッシュ化
    });

    it('should maintain consistent performance', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };

      const ip = '192.168.1.1';
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        hashIP(config, ip);
      }
      const duration = Date.now() - start;

      const avgTimePerHash = duration / iterations;
      expect(avgTimePerHash).toBeLessThan(0.1); // 0.1ms以内/回
    });
  });

  describe('Test Configuration Functions', () => {
    it('createTestIPHashConfig should work in test environment', () => {
      // This test is running in test environment
      expect(process.env.NODE_ENV).toBe('test');
      
      const testConfig = createTestIPHashConfig();
      expect(testConfig).toHaveProperty('secret');
      expect(testConfig.secret).toBe('test-secret-key-32-chars-long!');
      
      // Should work with custom secret
      const customSecret = 'custom-test-secret-32-chars-long';
      const customConfig = createTestIPHashConfig(customSecret);
      expect(customConfig.secret).toBe(customSecret);
    });

    it('createTestIPHashConfig should throw in non-test environment', () => {
      // Temporarily change NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      
      try {
        expect(() => {
          createTestIPHashConfig();
        }).toThrow('createTestIPHashConfig() can only be called in test environment');
      } finally {
        // Restore original environment
        Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
      }
    });
  });

  describe('Pure Function Tests', () => {
    it('createIPHashConfig should create immutable config', () => {
      const config = createIPHashConfig();

      expect(config).toHaveProperty('secret');
      expect(typeof config.secret).toBe('string');

      // オブジェクトが凍結されているかテスト
      expect(() => {
        (config as any).secret = 'modified';
      }).toThrow();
    });

    it('hashIP should be a pure function', () => {
      const config = {
        secret: 'test-secret-32-characters-long!!',
      };
      const ip = '192.168.1.1';

      // 同じ入力に対して同じ出力
      const result1 = hashIP(config, ip);
      const result2 = hashIP(config, ip);
      expect(result1).toBe(result2);

      // 設定オブジェクトを変更しない
      const originalConfig = JSON.parse(JSON.stringify(config));
      hashIP(config, ip);
      expect(config).toEqual(originalConfig);
    });

    it('defaultIPHashConfig should be consistent', () => {
      const config = defaultIPHashConfig;
      expect(config).toHaveProperty('secret');
      expect(typeof config.secret).toBe('string');

      const ip = '192.168.1.1';
      const result = hashIP(config, ip);

      expect(result).toMatch(/^ip_[a-f0-9]{8}$/);
      expect(result).not.toContain(ip);
    });
  });
});
