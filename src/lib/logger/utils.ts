/**
 * 構造化ログユーティリティ関数
 * セキュリティクリティカルな機能を含む
 */

import { LogLevel, LOG_LEVELS, BaseProperties, SEVERITY_NUMBERS } from './types';

/**
 * デフォルトログレベル
 */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

/**
 * 環境変数からログレベルを取得
 */
export function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();

  if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  return DEFAULT_LOG_LEVEL;
}

/**
 * クライアントサイドログレベル取得
 */
export function getClientLogLevel(): LogLevel {
  if (typeof window === 'undefined') {
    // サーバーサイドでは環境変数から取得
    return getLogLevelFromEnv();
  }

  // ブラウザ環境では NEXT_PUBLIC_ プレフィックス付きの環境変数を使用
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase();

  if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  // 開発環境では詳細ログ、本番環境ではデフォルト
  return process.env.NODE_ENV === 'development' ? 'debug' : DEFAULT_LOG_LEVEL;
}

/**
 * ベースプロパティ生成
 */
export function createBaseProperties(): BaseProperties {
  return {
    app: process.env.NEXT_PUBLIC_APP_NAME || 'nextjs-boilerplate',
    env: process.env.NODE_ENV || 'development',
    pid: typeof process !== 'undefined' ? process.pid : 0,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    log_schema_version: '1.0.0',
  };
}

/**
 * 機密情報Redactionパス
 */
export const REDACT_PATHS = [
  // 認証情報
  'password',
  'token',
  'authorization',
  'auth',
  'secret',
  'key',
  '*.password',
  '*.token',
  '*.authorization',
  '*.auth',
  '*.secret',
  '*.key',

  // HTTPヘッダー
  'headers.authorization',
  'headers.cookie',
  'headers.x-api-key',
  'headers.set-cookie',

  // 個人情報（PII）
  'user.email',
  'user.phone',
  'user.ssn',
  'user.credit_card',
  '*.email',
  '*.phone',
  '*.ssn',
  '*.credit_card',
  'email',
  'phone',
  'ssn',
  'credit_card',

  // 機密ビジネス情報
  'payment.card_number',
  'payment.cvv',
  'bank.account_number',
  'card_number',
  'cvv',
  'account_number',
];

/**
 * ログレベルの数値変換
 */
export function getLogLevelValue(level: LogLevel): number {
  const severityNumber = SEVERITY_NUMBERS[level as keyof typeof SEVERITY_NUMBERS];
  return severityNumber || 30;
}

/**
 * ログレベル比較
 */
export function isLogLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return getLogLevelValue(targetLevel) >= getLogLevelValue(currentLevel);
}

/**
 * リクエストIDジェネレーター（UUID v7使用予定、暫定実装）
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * エラーオブジェクトのシリアライズ
 */
export function serializeError(error: Error | unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return {
    message: String(error),
    type: typeof error,
  };
}
