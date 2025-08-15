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
 * 環境変数からログレベルを取得する関数
 *
 * 環境変数 LOG_LEVEL を読み取り、有効なログレベルを返します。
 * 無効な値または未設定の場合はデフォルトログレベルを返します。
 *
 * @returns 有効なログレベル値
 *
 * @example
 * ```typescript
 * // LOG_LEVEL=debug の場合
 * const level = getLogLevelFromEnv(); // 'debug'
 *
 * // LOG_LEVEL が未設定または無効の場合
 * const level = getLogLevelFromEnv(); // 'info' (デフォルト)
 * ```
 *
 * @public
 */
export function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();

  if (envLevel && LOG_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }

  return DEFAULT_LOG_LEVEL;
}

/**
 * クライアントサイドで適切なログレベルを取得する関数
 *
 * サーバーサイドとクライアントサイドの環境に応じて適切なログレベルを決定します。
 * クライアントサイドでは NEXT_PUBLIC_LOG_LEVEL 環境変数を使用し、
 * サーバーサイドでは通常の LOG_LEVEL 環境変数を使用します。
 *
 * @returns クライアント環境に適したログレベル
 *
 * @example
 * ```typescript
 * // ブラウザ環境での使用
 * const clientLevel = getClientLogLevel(); // NEXT_PUBLIC_LOG_LEVEL から取得
 *
 * // サーバーサイドでの使用
 * const serverLevel = getClientLogLevel(); // LOG_LEVEL から取得
 * ```
 *
 * @public
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
 * 構造化ログのベースプロパティを生成する関数
 *
 * すべてのログエントリに含まれる共通のベースプロパティを生成します。
 * アプリケーション名、環境、プロセスID、バージョン情報などが含まれます。
 *
 * @returns 構造化ログのベースプロパティオブジェクト
 *
 * @example
 * ```typescript
 * const baseProps = createBaseProperties();
 * // {
 * //   app: 'nextjs-boilerplate',
 * //   env: 'development',
 * //   pid: 12345,
 * //   version: '1.0.0',
 * //   log_schema_version: '1.0.0'
 * // }
 * ```
 *
 * @public
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
 * ログから機密情報をマスクするためのパス定義
 *
 * セキュリティクリティカルな情報を含む可能性があるオブジェクトパスのリストです。
 * これらのパスにマッチするデータは自動的に '[REDACTED]' に置換されます。
 * 認証情報、個人情報（PII）、機密ビジネス情報が含まれます。
 *
 * @example
 * ```typescript
 * // 以下のデータがログに含まれる場合
 * const userData = {
 *   user: { email: 'user@example.com', name: 'John' },
 *   password: 'secret123'
 * };
 *
 * // REDACT_PATHS により以下のように変換される
 * // {
 * //   user: { email: '[REDACTED]', name: 'John' },
 * //   password: '[REDACTED]'
 * // }
 * ```
 *
 * @public
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
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',

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
 * ログレベルを対応する数値に変換する関数
 *
 * OpenTelemetry の SeverityNumber 仕様に基づいてログレベルを数値に変換します。
 * この数値はログレベルの重要度比較やフィルタリングに使用されます。
 *
 * @param level - 変換するログレベル
 * @returns ログレベルに対応する数値（SeverityNumber）
 *
 * @example
 * ```typescript
 * const errorValue = getLogLevelValue('error'); // 17
 * const infoValue = getLogLevelValue('info');   // 9
 * const debugValue = getLogLevelValue('debug'); // 5
 * ```
 *
 * @public
 */
export function getLogLevelValue(level: LogLevel): number {
  const severityNumber = SEVERITY_NUMBERS[level as keyof typeof SEVERITY_NUMBERS];
  return severityNumber || 30;
}

/**
 * 指定されたログレベルが現在の設定で有効かどうかを判定する関数
 *
 * 現在のログレベル設定に基づいて、対象のログレベルが出力対象かどうかを判定します。
 * より高い重要度のログレベルのみが有効として判定されます。
 *
 * @param currentLevel - 現在設定されているログレベル
 * @param targetLevel - 判定対象のログレベル
 * @returns 対象ログレベルが有効な場合 true、無効な場合 false
 *
 * @example
 * ```typescript
 * // 現在のレベルが 'info' の場合
 * isLogLevelEnabled('info', 'error'); // true (error は info より重要)
 * isLogLevelEnabled('info', 'debug'); // false (debug は info より軽微)
 * isLogLevelEnabled('info', 'info');  // true (同レベル)
 * ```
 *
 * @public
 */
export function isLogLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return getLogLevelValue(targetLevel) >= getLogLevelValue(currentLevel);
}

/**
 * 一意なリクエストIDを生成する関数（暫定実装）
 *
 * ログの相関分析やリクエストトレーシングに使用する一意なIDを生成します。
 * 現在はタイムスタンプとランダム文字列の組み合わせを使用していますが、
 * 将来的には UUID v7 に移行予定です。
 *
 * @returns 一意なリクエストID文字列
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * // 'req_1703952000000_a1b2c3'
 *
 * // ログでの使用例
 * logger.info('Request started', { requestId });
 * ```
 *
 * @public
 * @remarks 将来的にUUID v7実装への移行を予定
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Edge Runtime環境検出（純粋関数）
 *
 * Vercel Edge Runtime環境かどうかを検出します。
 * グローバル変数 EdgeRuntime の存在をチェックして判定します。
 *
 * @returns Edge Runtime環境の場合true
 *
 * @example
 * ```typescript
 * if (isEdgeRuntime()) {
 *   // Edge Runtime対応のコード
 * } else {
 *   // Node.js環境のコード
 * }
 * ```
 *
 * @public
 */
export function isEdgeRuntime(): boolean {
  try {
    // EdgeRuntimeグローバル変数の存在チェック
    return typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime === 'string';
  } catch {
    return false;
  }
}

/**
 * 実行環境のタイプを検出（純粋関数）
 *
 * 現在の実行環境のタイプを識別します。
 * Edge Runtime、Node.js、ブラウザ環境を区別します。
 *
 * @returns 実行環境のタイプ
 *
 * @public
 */
export function detectRuntimeEnvironment(): 'edge' | 'nodejs' | 'browser' {
  // Edge Runtime環境
  if (isEdgeRuntime()) {
    return 'edge';
  }

  // Node.js環境（サーバーサイド）
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    return 'nodejs';
  }

  // ブラウザ環境
  return 'browser';
}

/**
 * Edge Runtime対応コンテキストストレージ
 *
 * AsyncLocalStorageが使用できないEdge Runtime環境で
 * リクエストスコープのコンテキスト管理を提供します。
 * WeakMapとPromise chaining を使用して実装します。
 *
 * @internal
 */
class EdgeContextStorage<T> {
  private contextMap = new WeakMap<object, T>();
  private currentContext: T | null = null;

  /**
   * コンテキストを設定してコールバックを実行
   */
  run(context: T, callback: () => void): void;
  run<R>(context: T, callback: () => R): R;
  run<R>(context: T, callback: () => R): R {
    const previousContext = this.currentContext;
    this.currentContext = context;

    try {
      return callback();
    } finally {
      this.currentContext = previousContext;
    }
  }

  /**
   * 現在のコンテキストを取得
   */
  getStore(): T | undefined {
    return this.currentContext ?? undefined;
  }

  /**
   * オブジェクトにコンテキストを関連付け
   */
  bind<Args extends unknown[]>(fn: (...args: Args) => void, context?: T): (...args: Args) => void {
    const boundContext = context ?? this.currentContext;
    if (!boundContext) {
      return fn;
    }

    return (...args: Args) => {
      return this.run(boundContext, () => fn(...args));
    };
  }
}

/**
 * 環境対応AsyncLocalStorage互換インターフェース
 *
 * Edge Runtime環境では EdgeContextStorage を、
 * Node.js環境では AsyncLocalStorage を使用します。
 *
 * @internal
 */
export interface CompatibleStorage<T> {
  /**
   * 指定されたコンテキストでコールバック関数を実行します
   * @param store - 設定するコンテキスト値
   * @param callback - 実行するコールバック関数
   * @returns コールバック関数の戻り値
   */
  run<R>(store: T, callback: () => R): R;

  /**
   * 現在のコンテキスト値を取得します
   * @returns 現在のコンテキスト値、設定されていない場合はundefined
   */
  getStore(): T | undefined;

  /**
   * 関数を指定されたコンテキストでバインドします
   * @param fn - バインドする関数
   * @param context - バインドするコンテキスト値（省略時は現在のコンテキスト）
   * @returns バインドされた関数
   */
  bind<Args extends unknown[]>(fn: (...args: Args) => void, context?: T): (...args: Args) => void;
}

/**
 * 環境対応ストレージファクトリー（純粋関数）
 *
 * 実行環境に応じて適切なコンテキストストレージを作成します。
 * Edge Runtime環境では独自実装、Node.js環境ではAsyncLocalStorageを使用します。
 *
 * @returns 環境対応ストレージインスタンス
 *
 * @public
 */
export function createCompatibleStorage<T>(): CompatibleStorage<T> {
  const runtime = detectRuntimeEnvironment();

  if (runtime === 'edge') {
    // Edge Runtime環境: 独自実装を使用
    const edgeStorage = new EdgeContextStorage<T>();
    return {
      run: edgeStorage.run.bind(edgeStorage),
      getStore: edgeStorage.getStore.bind(edgeStorage),
      bind: edgeStorage.bind.bind(edgeStorage),
    };
  } else {
    // Node.js環境: AsyncLocalStorageを使用
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AsyncLocalStorage } = require('node:async_hooks');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AsyncLocalStorageConstructor = AsyncLocalStorage as any;
      const als = new AsyncLocalStorageConstructor() as {
        run<R>(store: T, callback: () => R): R;
        getStore(): T | undefined;
      };
      return {
        run: als.run.bind(als),
        getStore: als.getStore.bind(als),
        bind: <Args extends unknown[]>(fn: (...args: Args) => void, context?: T) => {
          if (!context) {
            return fn;
          }
          return (...args: Args) => als.run(context, () => fn(...args));
        },
      };
    } catch {
      // フォールバック: Edge実装を使用
      const fallbackStorage = new EdgeContextStorage<T>();
      return {
        run: fallbackStorage.run.bind(fallbackStorage),
        getStore: fallbackStorage.getStore.bind(fallbackStorage),
        bind: fallbackStorage.bind.bind(fallbackStorage),
      };
    }
  }
}

/**
 * エラーオブジェクトを構造化ログに適した形式にシリアライズする関数
 *
 * Error オブジェクトや任意の値を JSON シリアライズ可能な形式に変換します。
 * Error オブジェクトの場合は name、message、stack、cause を抽出し、
 * その他の値の場合は安全な文字列表現に変換します。
 *
 * @param error - シリアライズするエラーオブジェクトまたは任意の値
 * @returns JSON シリアライズ可能なエラー情報オブジェクト
 *
 * @example
 * ```typescript
 * // Error オブジェクトの場合
 * const err = new Error('Something went wrong');
 * const serialized = serializeError(err);
 * // {
 * //   name: 'Error',
 * //   message: 'Something went wrong',
 * //   stack: '...',
 * //   cause: undefined
 * // }
 *
 * // 文字列の場合
 * const serialized = serializeError('Custom error');
 * // {
 * //   message: 'Custom error',
 * //   type: 'string'
 * // }
 * ```
 *
 * @public
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
