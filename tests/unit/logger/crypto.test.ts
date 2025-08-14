/**
 * 🚨 高リスク項目テスト: HMAC-SHA256 IPハッシュ機能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IPHasher, hashIP, validateIPHashSecret } from '../../../src/lib/logger/crypto';

describe('IPHasher - GDPR Compliance', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // テスト環境をクリーンな状態に
    process.env = { ...originalEnv };
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    IPHasher.resetForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('🔒 GDPR準拠のIPハッシュ化', () => {
    it('should hash IPv4 addresses consistently', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ip = '192.168.1.1';
      const hash1 = hashIP(ip);
      const hash2 = hashIP(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^ip_[a-f0-9]{8}$/);
      expect(hash1).not.toContain(ip);
    });

    it('should hash IPv6 addresses consistently', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const hash1 = hashIP(ip);
      const hash2 = hashIP(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^ip_[a-f0-9]{8}$/);
      expect(hash1).not.toContain(ip);
    });

    it('should normalize IPv4-mapped IPv6 addresses', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ipv4 = '192.168.1.1';
      const ipv6Mapped = '::ffff:192.168.1.1';

      const hash1 = hashIP(ipv4);
      const hash2 = hashIP(ipv6Mapped);

      expect(hash1).toBe(hash2);
    });

    it('should normalize localhost addresses', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ipv4Localhost = '127.0.0.1';
      const ipv6Localhost = '::1';

      const hash1 = hashIP(ipv4Localhost);
      const hash2 = hashIP(ipv6Localhost);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different IPs', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      const hash1 = hashIP(ip1);
      const hash2 = hashIP(ip2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different secrets', () => {
      const ip = '192.168.1.1';

      process.env.LOG_IP_HASH_SECRET = 'secret1-32-characters-long-test';
      const hash1 = hashIP(ip);

      IPHasher.resetForTesting();
      process.env.LOG_IP_HASH_SECRET = 'secret2-32-characters-long-test';
      const hash2 = hashIP(ip);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('🚨 セキュリティ要件', () => {
    it('should require LOG_IP_HASH_SECRET in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      delete process.env.LOG_IP_HASH_SECRET;

      expect(() => {
        hashIP('192.168.1.1');
      }).toThrow(/LOG_IP_HASH_SECRET environment variable is required in production/);
    });

    it('should warn when LOG_IP_HASH_SECRET is not set in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      delete process.env.LOG_IP_HASH_SECRET;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      hashIP('192.168.1.1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LOG_IP_HASH_SECRET not set')
      );

      consoleSpy.mockRestore();
    });

    it('should validate secret key strength', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';
      expect(validateIPHashSecret()).toBe(true);

      process.env.LOG_IP_HASH_SECRET = 'short';
      IPHasher.resetForTesting();
      expect(validateIPHashSecret()).toBe(false);
    });
  });

  describe('🛡️ エラーハンドリング', () => {
    it('should handle invalid IP addresses gracefully', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      expect(hashIP('')).toBe('ip_invalid');
      expect(hashIP(null as any)).toBe('ip_invalid');
      expect(hashIP(undefined as any)).toBe('ip_invalid');
      expect(hashIP(123 as any)).toBe('ip_invalid');
    });

    it('should handle crypto errors gracefully', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 非常に長い文字列でメモリエラーを誘発
      const veryLongString = 'x'.repeat(1000000);
      const result = hashIP(veryLongString);

      // エラーが発生した場合でも適切なフォールバック値を返す
      expect(result).toMatch(/^ip_[a-f0-9]{8}|ip_hash_error$/);

      consoleSpy.mockRestore();
    });
  });

  describe('📊 パフォーマンス要件', () => {
    it('should hash IPs efficiently', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ips = Array.from({ length: 1000 }, (_, i) => `192.168.1.${i % 255}`);

      const start = Date.now();
      const hashes = ips.map((ip) => hashIP(ip));
      const duration = Date.now() - start;

      expect(hashes).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // 100ms以内で1000個のIPをハッシュ化
    });

    it('should maintain consistent performance', () => {
      process.env.LOG_IP_HASH_SECRET = 'test-secret-32-characters-long!!';

      const ip = '192.168.1.1';
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        hashIP(ip);
      }
      const duration = Date.now() - start;

      const avgTimePerHash = duration / iterations;
      expect(avgTimePerHash).toBeLessThan(0.1); // 0.1ms以内/回
    });
  });
});
