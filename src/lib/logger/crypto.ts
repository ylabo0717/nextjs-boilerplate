/**
 * 🚨 高リスク対応: GDPR準拠IPハッシュ化実装
 * 個人識別情報保護のためのHMAC-SHA256暗号化
 */

import { randomBytes, createHmac } from 'node:crypto';

/**
 * IP ハッシュ化設定型
 *
 * HMAC-SHA256 によるIPアドレス暗号化用の設定オブジェクト。
 * 純粋関数の引数として使用される不変設定。
 *
 * @public
 */
export type IPHashConfig = {
  /** HMAC-SHA256用の秘密鍵 */
  readonly secret: string;
};

/**
 * IP ハッシュ化設定を作成（純粋関数）
 *
 * 環境変数または自動生成から秘密鍵を取得し、不変設定オブジェクトを生成。
 * 本番環境では環境変数必須、開発環境では自動生成でも動作。
 *
 * @returns 不変なIPハッシュ化設定オブジェクト
 * @throws Error 本番環境で環境変数未設定の場合
 *
 * @public
 */
export function createIPHashConfig(): IPHashConfig {
  // 本番環境では環境変数が必須 - 早期バリデーション
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
 * 秘密鍵の自動生成（純粋関数）
 *
 * 暗号学的に安全な乱数を使用して32バイトの秘密鍵を生成。
 * 本番環境では使用不可、開発環境専用。
 *
 * @returns 生成された秘密鍵（Hex形式）
 * @throws Error 本番環境で呼び出された場合
 *
 * @internal
 */
function generateSecret(): string {
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
 * IPv6 アドレスの正規化（純粋関数）
 *
 * IPv6 アドレス表記の統一化と特殊ケースの処理。
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
function normalizeIPv6(ip: string): string {
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
 * GDPR 準拠の IP アドレスハッシュ化（純粋関数）
 *
 * HMAC-SHA256(ip + salt) により不可逆的にハッシュ化。
 * 個人識別情報保護とログ分析の両立を実現。
 *
 * 処理フロー:
 * 1. IPv6 アドレスの正規化
 * 2. HMAC-SHA256 による不可逆ハッシュ化
 * 3. Hex 形式での結果出力
 *
 * @param config - IP ハッシュ化設定
 * @param ipAddress - ハッシュ化対象のIPアドレス
 * @returns ハッシュ化されたIP（Hex形式）、無効な場合は'ip_invalid'または'ip_hash_error'
 *
 * @public
 */
export function hashIP(config: IPHashConfig, ipAddress: string): string {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return 'ip_invalid';
  }

  try {
    // IPv6 正規化
    const normalizedIP = normalizeIPv6(ipAddress);

    // HMAC-SHA256 でハッシュ化
    const hmac = createHmac('sha256', config.secret);
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
 * シークレットキーの妥当性チェック（純粋関数）
 *
 * 設定されたシークレットキーが暗号学的要件を満たすか検証。
 * 最低128ビット（32文字）の長さを要求。
 *
 * @param config - IP ハッシュ化設定
 * @returns シークレットキーが有効な場合true
 *
 * @public
 */
export function validateIPHashSecret(config: IPHashConfig): boolean {
  // 最低32文字（128bit）の要件チェック
  return config.secret.length >= 32;
}

/**
 * テスト用の設定作成（純粋関数）
 *
 * ユニットテスト環境でのみ使用可能な固定設定作成。
 * テスト間での状態クリアに使用。
 *
 * @param secret - テスト用秘密鍵（オプション）
 * @returns テスト用設定オブジェクト
 * @throws Error テスト環境以外で呼び出された場合
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
// デフォルトインスタンスとヘルパー関数（後方互換性）
// ===================================================================

/**
 * デフォルト IP ハッシュ化設定
 *
 * アプリケーション全体で使用されるデフォルト設定。
 * 一度だけ作成され、以降は immutable として使用。
 *
 * @public
 */
export const defaultIPHashConfig = createIPHashConfig();

/**
 * IP ハッシュ化ユーティリティ関数（後方互換性）
 *
 * デフォルト設定を使用した便利なエイリアス。
 * 既存コードとの互換性のために提供。
 *
 * @param ipAddress - ハッシュ化対象のIPアドレス
 * @returns ハッシュ化されたIP
 *
 * @public
 */
export const hashIPWithDefault = (ipAddress: string) => hashIP(defaultIPHashConfig, ipAddress);

/**
 * バリデーション関数（後方互換性）
 *
 * デフォルト設定を使用したシークレットキー妥当性チェック。
 * 既存コードとの互換性のために提供。
 *
 * @returns シークレットキーが有効な場合true
 *
 * @public
 */
export const validateIPHashSecretWithDefault = () => validateIPHashSecret(defaultIPHashConfig);
