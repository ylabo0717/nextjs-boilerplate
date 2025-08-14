/**
 * Next.js Middleware統合ロガー
 * Edge Runtime対応のリクエスト追跡とログ機能
 */

import type { NextRequest, NextResponse } from 'next/server';

// hashIPはcreateRequestContext内で動的にインポートされるため、ここでは不要
import { incrementLogCounter, incrementErrorCounter, recordRequestDuration } from './metrics';
import { sanitizeLogEntry, limitObjectSize } from './sanitizer';
import { generateRequestId, serializeError } from './utils';

import type { LoggerContext } from './types';

/**
 * Middleware用ログエントリ型定義
 *
 * @internal
 */
export interface MiddlewareLogEntry {
  /** リクエスト固有の識別子 */
  requestId: string;
  /** HTTPメソッド */
  method: string;
  /** リクエストURL */
  url: string;
  /** ユーザーエージェント文字列 */
  userAgent?: string;
  /** ハッシュ化されたIPアドレス */
  hashedIP: string;
  /** タイムスタンプ（ISO 8601形式） */
  timestamp: string;
  /** リクエスト処理時間（ミリ秒） */
  duration?: number;
  /** HTTPステータスコード */
  status?: number;
  /** エラー情報 */
  error?: Record<string, unknown>;
  /** イベント名 */
  event_name: string;
  /** イベントカテゴリ */
  event_category: 'middleware_event' | 'security_event' | 'error_event';
  /** イベント属性 */
  event_attributes?: Record<string, unknown>;
}

/**
 * Edge Runtime対応の軽量ロガー
 * Node.js固有機能を使用しない実装
 */
/**
 * Edge Runtime用ログ出力（純粋関数 + 制御された副作用）
 *
 * Edge Runtimeの制約に対応した軽量ログ出力。
 * console APIのみを使用し、Node.js固有機能を使用しない実装。
 *
 * @param level - ログレベル
 * @param entry - ログエントリ
 *
 * @public
 */
export function logForEdgeRuntime(
  level: 'info' | 'warn' | 'error',
  entry: MiddlewareLogEntry
): void {
  // サニタイズ処理
  const sanitized = sanitizeLogEntry(
    `${entry.event_name}: ${entry.method} ${entry.url}`,
    limitObjectSize(entry, 5, 30)
  );

  // 📊 Metrics: Log entry counter (middleware)
  try {
    incrementLogCounter(level, 'middleware');

    // Error-level logs also increment error counter
    if (level === 'error') {
      const errorType = entry.error ? 'middleware_error' : 'request_error';
      incrementErrorCounter(errorType, 'middleware', 'high');
    }

    // Record request duration if available
    if (entry.duration && typeof entry.duration === 'number') {
      const statusCode = entry.status || 200;
      recordRequestDuration(entry.duration, entry.method, statusCode, entry.url);
    }
  } catch (metricsError) {
    // Metrics errors should not break logging functionality
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to update middleware metrics:', metricsError);
    }
  }

  // Edge Runtimeでは console のみ使用可能
  const logData = {
    level,
    timestamp: entry.timestamp,
    message: sanitized.message,
    data: sanitized.data,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'info':
    default:
      console.log(JSON.stringify(logData));
      break;
  }
}

/**
 * リクエスト追跡用のコンテキスト生成
 */
/**
 * リクエスト追跡用のコンテキスト生成
 */
export function createRequestContext(request: NextRequest): LoggerContext {
  const requestId = generateRequestId();
  // Next.js 15ではrequest.ipが利用可能、存在しない場合は'unknown'を使用
  // 型安全にipプロパティをチェック
  const ip = 'ip' in request ? (request as { ip?: string }).ip || 'unknown' : 'unknown';

  // 純粋関数形式でIPハッシュ化を実行
  // デフォルト設定を使用（後方互換性エイリアス）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hashIPWithDefault } = require('./crypto') as typeof import('./crypto');
  const hashedIP = hashIPWithDefault(ip);

  return {
    requestId,
    hashedIP,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
  } as LoggerContext;
}

/**
 * リクエスト開始ログ
 */
/**
 * リクエスト開始ログ
 */
export function logRequestStart(request: NextRequest, context: LoggerContext): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.request_start',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      headers: sanitizeHeaders(request.headers),
    },
  };

  logForEdgeRuntime('info', entry);
}

/**
 * リクエスト終了ログ
 */
/**
 * リクエスト終了ログ
 */
export function logRequestEnd(
  request: NextRequest,
  response: NextResponse,
  context: LoggerContext,
  startTime: number
): void {
  const duration = Date.now() - startTime;

  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    duration,
    status: response.status,
    event_name: 'middleware.request_end',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      duration_ms: duration,
      response_size: response.headers.get('content-length') || undefined,
      cache_status: response.headers.get('x-cache') || undefined,
    },
  };

  const level = response.status >= 400 ? 'error' : 'info';
  logForEdgeRuntime(level, entry);
}

/**
 * セキュリティイベントログ
 */
/**
 * セキュリティイベントログ
 */
export function logSecurityEvent(
  request: NextRequest,
  context: LoggerContext,
  event: string,
  details: Record<string, unknown> = {}
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: `security.${event}`,
    event_category: 'security_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      security_event: event,
      ...details,
    },
  };

  logForEdgeRuntime('warn', entry);
}

/**
 * Middlewareエラーログ
 */
/**
 * Middlewareエラーログ
 */
export function logMiddlewareError(
  request: NextRequest,
  context: LoggerContext,
  error: Error | unknown,
  details: Record<string, unknown> = {}
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    error: serializeError(error),
    event_name: 'middleware.error',
    event_category: 'error_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      error_type: error instanceof Error ? error.name : typeof error,
      ...details,
    },
  };

  logForEdgeRuntime('error', entry);
}

/**
 * ヘッダーのサニタイズ（機密情報の除去）
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-session-id',
  ]);

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.has(lowerKey)) {
      // 型安全な方法でプロパティを設定
      Object.assign(sanitized, { [key]: '[REDACTED]' });
    } else {
      // 型安全な方法でプロパティを設定
      Object.assign(sanitized, { [key]: value });
    }
  });

  return sanitized;
}

/**
 * レート制限ログ
 */
/**
 * レート制限ログ
 */
export function logRateLimit(
  request: NextRequest,
  context: LoggerContext,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.rate_limit',
    event_category: 'middleware_event',
    event_attributes: {
      path: new URL(request.url).pathname,
      rate_limit: limit,
      rate_remaining: remaining,
      rate_reset: resetTime,
      rate_exceeded: remaining <= 0,
    },
  };

  const level = remaining <= 0 ? 'warn' : 'info';
  logForEdgeRuntime(level, entry);
}

/**
 * リダイレクトログ
 */
/**
 * リダイレクトログ
 */
export function logRedirect(
  request: NextRequest,
  context: LoggerContext,
  destination: string,
  permanent: boolean = false
): void {
  const entry: MiddlewareLogEntry = {
    requestId: context.requestId,
    method: request.method,
    url: request.url,
    userAgent: context.userAgent as string | undefined,
    hashedIP: (context.hashedIP as string) || 'unknown',
    timestamp: new Date().toISOString(),
    event_name: 'middleware.redirect',
    event_category: 'middleware_event',
    event_attributes: {
      from_path: new URL(request.url).pathname,
      to_path: destination,
      permanent,
      redirect_type: permanent ? '301' : '302',
    },
  };

  logForEdgeRuntime('info', entry);
}

/**
 * Middleware統合用のヘルパー関数
 */
export const middlewareLoggerHelpers = {
  /**
   * リクエスト全体のログ装飾
   */
  wrapRequest: async (
    request: NextRequest,
    handler: (request: NextRequest, context: LoggerContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const context = createRequestContext(request);

    // リクエスト開始ログ
    logRequestStart(request, context);

    try {
      // ハンドラー実行
      const response = await handler(request, context);

      // リクエスト終了ログ
      logRequestEnd(request, response, context, startTime);

      // レスポンスヘッダーにリクエストIDを追加
      response.headers.set('x-request-id', context.requestId);

      return response;
    } catch (error) {
      // エラーログ
      logMiddlewareError(request, context, error);
      throw error;
    }
  },

  /**
   * セキュリティチェック付きラッパー
   */
  withSecurity: (
    request: NextRequest,
    context: LoggerContext,
    checks: {
      checkUserAgent?: boolean;
      checkReferer?: boolean;
      logSuspiciousActivity?: boolean;
    } = {}
  ): void => {
    const { checkUserAgent = true, checkReferer = false, logSuspiciousActivity = true } = checks;

    // User-Agentチェック
    if (checkUserAgent && !context.userAgent) {
      logSecurityEvent(request, context, 'missing_user_agent');
    }

    // Refererチェック
    if (checkReferer) {
      const referer = request.headers.get('referer');
      if (!referer) {
        logSecurityEvent(request, context, 'missing_referer');
      }
    }

    // 疑わしいアクティビティの検出
    if (logSuspiciousActivity) {
      const path = new URL(request.url).pathname;

      // 一般的な攻撃パターンの検出
      const suspiciousPatterns = [
        /\.\.\//, // Path traversal
        /<script/i, // XSS attempt
        /union.*select/i, // SQL injection
        /\/admin\//, // Admin path access
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(path) || pattern.test(request.url)) {
          logSecurityEvent(request, context, 'suspicious_pattern', {
            pattern: pattern.source,
            matched_url: request.url,
          });
        }
      }
    }
  },
};

export default middlewareLoggerHelpers;
