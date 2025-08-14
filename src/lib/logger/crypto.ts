/**
 * 🚨 高リスク対応: HMAC-SHA256 IPハッシュ実装
 * GDPR準拠の個人データ保護機能
 */

import { createHmac, randomBytes } from 'node:crypto';

export class IPHasher {
  private static secret: string;

  static initialize() {
    this.secret = process.env.LOG_IP_HASH_SECRET || this.generateSecret();
    if (!process.env.LOG_IP_HASH_SECRET) {
      console.warn(
        'LOG_IP_HASH_SECRET not set. Generated temporary secret for IP hashing. ' +
          'Please set LOG_IP_HASH_SECRET environment variable for production.'
      );
    }
  }

  private static generateSecret(): string {
    // 本番環境では必ず環境変数を設定する必要がある
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'LOG_IP_HASH_SECRET environment variable is required in production environment for GDPR compliance'
      );
    }
    // 静的にインポートしたrandomBytesを使用
    return randomBytes(32).toString('hex');
  }

  /**
   * GDPR準拠のIPアドレスハッシュ化
   * HMAC-SHA256(ip + salt) により不可逆的にハッシュ化
   */
  static hashIP(ipAddress: string): string {
    if (!this.secret) {
      this.initialize();
    }

    if (!ipAddress || typeof ipAddress !== 'string') {
      return 'ip_invalid';
    }

    try {
      // IPv6正規化
      const normalizedIP = this.normalizeIPv6(ipAddress);

      // HMAC-SHA256でハッシュ化
      const hmac = createHmac('sha256', this.secret);
      hmac.update(normalizedIP);
      const hash = hmac.digest('hex');

      // セキュリティと可読性のバランス（最初8文字のみ使用）
      return `ip_${hash.substring(0, 8)}`;
    } catch (error) {
      console.error('Failed to hash IP address:', error);
      return 'ip_hash_error';
    }
  }

  private static normalizeIPv6(ip: string): string {
    // IPv4-mapped IPv6 の正規化
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7); // IPv4部分のみ抽出
    }

    // ローカルホストの正規化
    if (ip === '::1') {
      return '127.0.0.1';
    }

    return ip.trim();
  }

  /**
   * シークレットキーの妥当性チェック
   */
  static validateSecret(): boolean {
    if (!this.secret) {
      this.initialize();
    }

    // 最低32文字（128bit）の要件チェック
    return this.secret.length >= 32;
  }

  /**
   * テスト用途でのシークレットリセット
   */
  static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting() can only be called in test environment');
    }
    this.secret = '';
  }
}

// 初期化
IPHasher.initialize();

/**
 * ユーティリティ関数
 */
export const hashIP = (ip: string) => IPHasher.hashIP(ip);

/**
 * バリデーション関数
 */
export const validateIPHashSecret = () => IPHasher.validateSecret();
