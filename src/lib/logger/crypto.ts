/**
 * 🚨 高リスク対応: HMAC-SHA256 IPハッシュ実装
 * GDPR準拠の個人データ保護機能
 */

import { createHmac, randomBytes } from 'node:crypto';

/**
 * GDPR準拠IPアドレスハッシュ化クラス
 *
 * 🚨 高リスク対応: HMAC-SHA256 IPハッシュ実装
 * GDPR準拠の個人データ保護機能
 *
 * IPアドレスをHMAC-SHA256で不可逆的にハッシュ化し、
 * 個人識別情報保護とログ分析の両立を実現。
 *
 * セキュリティ要件:
 * - 本番環境では環境変数LOG_IP_HASH_SECRETが必須
 * - SHA256ハッシュによる不可逆暗号化
 * - IPv6アドレスの正規化対応
 * - ソルト付きハッシュで辞書攻撃耐性
 *
 * @public
 */
export class IPHasher {
  /**
   * ハッシュ化用秘密鍵
   *
   * HMAC-SHA256計算で使用する秘密鍵。
   * 環境変数または自動生成された値を保持。
   *
   * @internal
   */
  private static secret: string;

  /**
   * IPHasher初期化
   *
   * 秘密鍵の設定と環境検証を実行。
   * 環境変数LOG_IP_HASH_SECRETが未設定の場合、
   * 開発環境では自動生成、本番環境ではエラー。
   *
   * セキュリティ要件:
   * - 本番環境では環境変数必須
   * - 32バイト（256ビット）秘密鍵
   * - 開発環境でも警告表示
   *
   * @throws Error 本番環境で環境変数未設定の場合
   *
   * @public
   */
  static initialize() {
    this.secret = process.env.LOG_IP_HASH_SECRET || this.generateSecret();
    if (!process.env.LOG_IP_HASH_SECRET) {
      console.warn(
        'LOG_IP_HASH_SECRET not set. Generated temporary secret for IP hashing. ' +
          'Please set LOG_IP_HASH_SECRET environment variable for production.'
      );
    }
  }

  /**
   * 秘密鍵の自動生成
   *
   * 暗号学的に安全な乱数を使用して32バイトの秘密鍵を生成。
   * 本番環境では使用不可、開発環境専用。
   *
   * @returns 生成された秘密鍵（Hex形式）
   * @throws Error 本番環境で呼び出された場合
   *
   * @internal
   */
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
   *
   * HMAC-SHA256(ip + salt) により不可逆的にハッシュ化。
   * 個人識別情報保護とログ分析の両立を実現。
   *
   * 処理フロー:
   * 1. IPv6アドレスの正規化
   * 2. HMAC-SHA256による不可逆ハッシュ化
   * 3. Hex形式での結果出力
   *
   * @param ipAddress - ハッシュ化対象のIPアドレス
   * @returns ハッシュ化されたIP（Hex形式）、無効な場合は'ip_invalid'または'ip_hash_error'
   *
   * @public
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

  /**
   * IPv6アドレスの正規化
   *
   * IPv6アドレス表記の統一化と特殊ケースの処理。
   * ハッシュ化前の前処理として使用。
   *
   * 正規化ルール:
   * - IPv4-mapped IPv6 (::ffff:x.x.x.x) → IPv4部分抽出
   * - IPv6 localhost (::1) → 127.0.0.1
   * - その他 → 前後空白除去
   *
   * @param ip - 正規化対象のIPアドレス
   * @returns 正規化されたIPアドレス
   *
   * @internal
   */
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
   *
   * 設定されたシークレットキーが暗号学的要件を満たすか検証。
   * 最低128ビット（32文字）の長さを要求。
   *
   * @returns シークレットキーが有効な場合true
   *
   * @public
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
   *
   * ユニットテスト環境でのみ使用可能なリセット機能。
   * テスト間での状態クリアに使用。
   *
   * @throws Error テスト環境以外で呼び出された場合
   *
   * @public
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
 *
 * IPハッシュ化の簡単なラッパー関数。
 * IPHasher.hashIPメソッドへの便利なアクセス。
 *
 * @param ip - ハッシュ化対象のIPアドレス
 * @returns ハッシュ化されたIP
 *
 * @public
 */
export const hashIP = (ip: string) => IPHasher.hashIP(ip);

/**
 * バリデーション関数
 *
 * シークレットキー妥当性の簡単なチェック関数。
 * IPHasher.validateSecretメソッドへの便利なアクセス。
 *
 * @returns シークレットキーが有効な場合true
 *
 * @public
 */
export const validateIPHashSecret = () => IPHasher.validateSecret();
