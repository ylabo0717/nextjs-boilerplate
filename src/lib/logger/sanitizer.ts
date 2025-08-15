/**
 * セキュリティ強化: ログインジェクション防止サニタイザー実装
 *
 * 制御文字・改行文字のエスケープ処理により、ログインジェクション攻撃を防御。
 * ユーザー入力の完全サニタイゼーションでログシステムのセキュリティを保証。
 */

import type { SanitizedLogEntry } from './types';

/**
 * 制御文字（0x00-0x1F, 0x7F-0x9F）のサニタイゼーション（純粋関数）
 *
 * ログインジェクション攻撃を防ぐため、制御文字をUnicodeエスケープ形式（\\uXXXX）に変換します。
 *
 * @param input - サニタイズ対象のデータ
 * @returns サニタイズされたデータ
 *
 * @example
 * ```typescript
 * sanitizeControlCharacters("Hello\\x00World")
 * // → "Hello\\\\u0000World"
 * ```
 *
 * @public
 */
export function sanitizeControlCharacters(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`;
    });
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeControlCharacters(item));
  }

  if (input && typeof input === 'object') {
    // 循環参照検出用のセット
    const seen = new Set<object>();
    return sanitizeObjectWithCircularCheck(input, seen);
  }

  return input;
}

/**
 * 循環参照を考慮したオブジェクトサニタイゼーション（純粋関数）
 *
 * @param input - サニタイズ対象のオブジェクト
 * @param seen - 循環参照検出用のセット
 * @returns サニタイズされたオブジェクト
 *
 * @internal
 */
function sanitizeObjectWithCircularCheck(
  input: object,
  seen: Set<object>
): Record<string, unknown> {
  if (seen.has(input)) {
    return { _circular_reference: true };
  }

  seen.add(input);

  try {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeControlCharacters(key) as string;

      if (value && typeof value === 'object') {
        if (seen.has(value)) {
          Object.assign(sanitized, { [sanitizedKey]: { _circular_reference: true } });
        } else {
          // 再帰的に処理する際に同じseenセットを渡す
          Object.assign(sanitized, {
            [sanitizedKey]: sanitizeObjectWithCircularCheck(value, seen),
          });
        }
      } else {
        Object.assign(sanitized, { [sanitizedKey]: sanitizeControlCharacters(value) });
      }
    }

    return sanitized;
  } finally {
    seen.delete(input);
  }
}

/**
 * CRLF 注入防止（純粋関数）
 *
 * ログファイルへのCRLF注入攻撃を防ぐため、改行文字をエスケープ形式に変換します。
 *
 * @param input - サニタイズ対象の文字列
 * @returns エスケープされた文字列
 *
 * @example
 * ```typescript
 * sanitizeNewlines("Line1\\nLine2\\r\\nLine3")
 * // → "Line1\\\\nLine2\\\\r\\\\nLine3"
 * ```
 *
 * @public
 */
export function sanitizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\\r\\n').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

/**
 * JSON-safe 文字列エスケープ（純粋関数）
 *
 * 制御文字と改行文字の両方をサニタイズし、JSON形式で安全に出力できるようにします。
 *
 * @param input - サニタイズ対象のデータ
 * @returns JSONシリアライゼーション安全なデータ
 *
 * @example
 * ```typescript
 * sanitizeForJson("Hello\\x00\\nWorld")
 * // → "Hello\\\\u0000\\\\nWorld"
 * ```
 *
 * @public
 */
export function sanitizeForJson(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeNewlines(sanitizeControlCharacters(input) as string);
  }

  return sanitizeControlCharacters(input);
}

/**
 * ログメッセージの総合サニタイゼーション（純粋関数）
 *
 * ログメッセージとデータの両方をサニタイズし、安全な形式で返します。
 * ログインジェクション攻撃やデータ破損を防ぐための包括的な処理を行います。
 *
 * @param message - ログメッセージ
 * @param data - ログに含めるデータ（オプション）
 * @returns サニタイズされたログエントリ
 *
 * @example
 * ```typescript
 * sanitizeLogEntry("User login\\x00", { user: "admin\\ntest" })
 * // → { message: "User login\\\\u0000", data: { user: "admin\\\\ntest" } }
 * ```
 *
 * @public
 */
export function sanitizeLogEntry(message: string, data?: unknown): SanitizedLogEntry {
  const sanitizedMessage = sanitizeForJson(message);
  const sanitizedData = data ? sanitizeForJson(data) : undefined;

  return {
    message: String(sanitizedMessage), // 明示的にStringに変換
    data: sanitizedData,
  };
}

/**
 * 大きなオブジェクトの制限（純粋関数）
 *
 * メモリ枯渇防止のため、オブジェクトの深度とキー数を制限します。
 * 循環参照の検出と処理も行い、安全なログ出力を保証します。
 *
 * @param input - 制限対象のデータ
 * @param maxDepth - 最大深度（デフォルト: 10）
 * @param maxKeys - 最大キー数（デフォルト: 100）
 * @returns サイズ制限されたデータ
 *
 * @example
 * ```typescript
 * const largeObj = { a: 1, b: 2 }; // 200 keys example
 * limitObjectSize(largeObj, 10, 50);
 * // Returns: { a: 1, b: 2, _truncated: "150 more keys" }
 * ```
 *
 * @public
 */
export function limitObjectSize(
  input: unknown,
  maxDepth: number = 10,
  maxKeys: number = 100
): unknown {
  return limitObjectSizeRecursive(input, maxDepth, maxKeys, 0, new Set());
}

/**
 * オブジェクトサイズ制限の再帰処理（純粋関数）
 *
 * @param input - 処理対象のデータ
 * @param maxDepth - 最大深度
 * @param maxKeys - 最大キー数
 * @param currentDepth - 現在の深度
 * @param seen - 循環参照検出用のセット
 * @returns 制限されたデータ
 *
 * @internal
 */
function limitObjectSizeRecursive(
  input: unknown,
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown {
  if (currentDepth >= maxDepth) {
    return { _truncated: 'max_depth_reached' };
  }

  if (typeof input === 'string' && input.length > 1000) {
    return input.substring(0, 1000) + '... [TRUNCATED]';
  }

  if (Array.isArray(input)) {
    return processArray(input, maxDepth, maxKeys, currentDepth, seen);
  }

  if (input && typeof input === 'object') {
    return processObject(input, maxDepth, maxKeys, currentDepth, seen);
  }

  return input;
}

/**
 * 配列データの処理（純粋関数）
 *
 * @param input - 処理対象の配列
 * @param maxDepth - 最大深度
 * @param maxKeys - 最大要素数
 * @param currentDepth - 現在の深度
 * @param seen - 循環参照検出用のセット
 * @returns 制限された配列
 *
 * @internal
 */
function processArray(
  input: unknown[],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown[] {
  if (input.length > maxKeys) {
    const truncated = input
      .slice(0, maxKeys)
      .map((item) => limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen));
    truncated.push({ _truncated: `${input.length - maxKeys} more items` });
    return truncated;
  }
  return input.map((item) =>
    limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen)
  );
}

/**
 * オブジェクトデータの処理（純粋関数）
 *
 * @param input - 処理対象のオブジェクト
 * @param maxDepth - 最大深度
 * @param maxKeys - 最大キー数
 * @param currentDepth - 現在の深度
 * @param seen - 循環参照検出用のセット
 * @returns 制限されたオブジェクト
 *
 * @internal
 */
function processObject(
  input: object,
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): unknown {
  if (seen.has(input)) {
    return { _circular_reference: true };
  }

  seen.add(input);

  try {
    const entries = Object.entries(input);
    if (entries.length > maxKeys) {
      return createLimitedObject(entries, maxDepth, maxKeys, currentDepth, seen, maxKeys);
    }

    return createCompleteObject(entries, maxDepth, maxKeys, currentDepth, seen);
  } finally {
    seen.delete(input);
  }
}

/**
 * キー数制限されたオブジェクトの作成（純粋関数）
 *
 * @param entries - オブジェクトのキー・値ペア
 * @param maxDepth - 最大深度
 * @param maxKeys - 最大キー数
 * @param currentDepth - 現在の深度
 * @param seen - 循環参照検出用のセット
 * @param keyLimit - キー制限数
 * @returns 制限されたオブジェクト
 *
 * @internal
 */
function createLimitedObject(
  entries: [string, unknown][],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>,
  keyLimit: number
): Record<string, unknown> {
  const limited: Record<string, unknown> = {};
  const limitedEntries = entries.slice(0, keyLimit);

  for (const [key, value] of limitedEntries) {
    const processedValue = limitObjectSizeRecursive(
      value,
      maxDepth,
      maxKeys,
      currentDepth + 1,
      seen
    );
    Object.assign(limited, { [key]: processedValue });
  }

  Object.assign(limited, { _truncated: `${entries.length - keyLimit} more keys` });
  return limited;
}

/**
 * 完全なオブジェクトの作成（純粋関数）
 *
 * @param entries - オブジェクトのキー・値ペア
 * @param maxDepth - 最大深度
 * @param maxKeys - 最大キー数
 * @param currentDepth - 現在の深度
 * @param seen - 循環参照検出用のセット
 * @returns 処理されたオブジェクト
 *
 * @internal
 */
function createCompleteObject(
  entries: [string, unknown][],
  maxDepth: number,
  maxKeys: number,
  currentDepth: number,
  seen: Set<object>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const processedValue = limitObjectSizeRecursive(
      value,
      maxDepth,
      maxKeys,
      currentDepth + 1,
      seen
    );
    Object.assign(result, { [key]: processedValue });
  }

  return result;
}
