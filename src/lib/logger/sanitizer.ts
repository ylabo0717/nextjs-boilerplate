/**
 * 🚨 高リスク対応: 制御文字サニタイザー実装
 * ログインジェクション攻撃による監視システム汚染防止
 */

import type { SanitizedLogEntry } from './types';

/**
 * 🚨 高リスク対応: 制御文字サニタイザー実装
 *
 * ログインジェクション攻撃による監視システム汚染防止機能を提供します。
 * 制御文字のサニタイゼーション、JSONシリアライゼーション、オブジェクトサイズ制限など
 * セキュリティ重要な機能を実装しています。
 *
 * @public
 */
export class LogSanitizer {
  /**
   * 制御文字（0x00-0x1F, 0x7F-0x9F）のサニタイゼーション
   *
   * ログインジェクション攻撃を防ぐため、制御文字をUnicodeエスケープ形式（\\uXXXX）に変換します。
   *
   * @param input - サニタイズ対象のデータ
   * @returns サニタイズされたデータ
   *
   * @example
   * ```typescript
   * LogSanitizer.sanitizeControlCharacters("Hello\x00World")
   * // → "Hello\\u0000World"
   * ```
   *
   * @public
   */
  static sanitizeControlCharacters(input: unknown): unknown {
    if (typeof input === 'string') {
      return input.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`;
      });
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeControlCharacters(item));
    }

    if (input && typeof input === 'object') {
      // 循環参照検出用のセット
      const seen = new Set<object>();
      return this.sanitizeObjectWithCircularCheck(input, seen);
    }

    return input;
  }

  /**
   * 循環参照を考慮したオブジェクトサニタイゼーション
   */
  private static sanitizeObjectWithCircularCheck(
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
        const sanitizedKey = this.sanitizeControlCharacters(key) as string;

        if (value && typeof value === 'object') {
          if (seen.has(value)) {
            Object.assign(sanitized, { [sanitizedKey]: { _circular_reference: true } });
          } else {
            // 再帰的に処理する際に同じseenセットを渡す
            Object.assign(sanitized, {
              [sanitizedKey]: this.sanitizeObjectWithCircularCheck(value, seen),
            });
          }
        } else {
          Object.assign(sanitized, { [sanitizedKey]: this.sanitizeControlCharacters(value) });
        }
      }

      return sanitized;
    } finally {
      seen.delete(input);
    }
  }

  /**
   * CRLF注入防止
   *
   * ログファイルへのCRLF注入攻撃を防ぐため、改行文字をエスケープ形式に変換します。
   *
   * @param input - サニタイズ対象の文字列
   * @returns エスケープされた文字列
   *
   * @example
   * ```typescript
   * LogSanitizer.sanitizeNewlines("Line1\nLine2\r\nLine3")
   * // → "Line1\\nLine2\\r\\nLine3"
   * ```
   *
   * @public
   */
  static sanitizeNewlines(input: string): string {
    return input.replace(/\r\n/g, '\\r\\n').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  }

  /**
   * JSON-safe 文字列エスケープ
   *
   * 制御文字と改行文字の両方をサニタイズし、JSON形式で安全に出力できるようにします。
   *
   * @param input - サニタイズ対象のデータ
   * @returns JSONシリアライゼーション安全なデータ
   *
   * @example
   * ```typescript
   * LogSanitizer.sanitizeForJson("Hello\x00\nWorld")
   * // → "Hello\\u0000\\nWorld"
   * ```
   *
   * @public
   */
  static sanitizeForJson(input: unknown): unknown {
    if (typeof input === 'string') {
      return this.sanitizeNewlines(this.sanitizeControlCharacters(input) as string);
    }

    return this.sanitizeControlCharacters(input);
  }

  /**
   * ログメッセージの総合サニタイゼーション
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
   * LogSanitizer.sanitizeLogEntry("User login\x00", { user: "admin\ntest" })
   * // → { message: "User login\\u0000", data: { user: "admin\\ntest" } }
   * ```
   *
   * @public
   */
  static sanitizeLogEntry(message: string, data?: unknown): SanitizedLogEntry {
    const sanitizedMessage = this.sanitizeForJson(message);
    const sanitizedData = data ? this.sanitizeForJson(data) : undefined;

    return {
      message: String(sanitizedMessage), // 明示的にStringに変換
      data: sanitizedData,
    };
  }

  /**
   * 大きなオブジェクトの制限
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
   * LogSanitizer.limitObjectSize(largeObj, 10, 50);
   * // Returns: { a: 1, b: 2, _truncated: "150 more keys" }
   * ```
   *
   * @public
   */
  static limitObjectSize(input: unknown, maxDepth: number = 10, maxKeys: number = 100): unknown {
    return this.limitObjectSizeRecursive(input, maxDepth, maxKeys, 0, new Set());
  }

  /**
   * オブジェクトサイズ制限の再帰処理
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
  private static limitObjectSizeRecursive(
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
      return this.processArray(input, maxDepth, maxKeys, currentDepth, seen);
    }

    if (input && typeof input === 'object') {
      return this.processObject(input, maxDepth, maxKeys, currentDepth, seen);
    }

    return input;
  }

  /**
   * 配列データの処理
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
  private static processArray(
    input: unknown[],
    maxDepth: number,
    maxKeys: number,
    currentDepth: number,
    seen: Set<object>
  ): unknown[] {
    if (input.length > maxKeys) {
      const truncated = input
        .slice(0, maxKeys)
        .map((item) =>
          this.limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen)
        );
      truncated.push({ _truncated: `${input.length - maxKeys} more items` });
      return truncated;
    }
    return input.map((item) =>
      this.limitObjectSizeRecursive(item, maxDepth, maxKeys, currentDepth + 1, seen)
    );
  }

  /**
   * オブジェクトデータの処理
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
  private static processObject(
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
        return this.createLimitedObject(entries, maxDepth, maxKeys, currentDepth, seen, maxKeys);
      }

      return this.createCompleteObject(entries, maxDepth, maxKeys, currentDepth, seen);
    } finally {
      seen.delete(input);
    }
  }

  /**
   * キー数制限されたオブジェクトの作成
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
  private static createLimitedObject(
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
      const processedValue = this.limitObjectSizeRecursive(
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
   * 完全なオブジェクトの作成
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
  private static createCompleteObject(
    entries: [string, unknown][],
    maxDepth: number,
    maxKeys: number,
    currentDepth: number,
    seen: Set<object>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of entries) {
      const processedValue = this.limitObjectSizeRecursive(
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
}

/**
 * ユーティリティ関数のエクスポート
 *
 * LogSanitizerクラスの主要機能へのショートカット関数を提供します。
 */

/**
 * 制御文字のサニタイゼーション
 *
 * @param input - サニタイズ対象のデータ
 * @returns サニタイズされたデータ
 * @public
 */
export const sanitizeControlCharacters = (input: unknown) =>
  LogSanitizer.sanitizeControlCharacters(input);

/**
 * JSON安全な文字列エスケープ
 *
 * @param input - サニタイズ対象のデータ
 * @returns JSONシリアライゼーション安全なデータ
 * @public
 */
export const sanitizeForJson = (input: unknown) => LogSanitizer.sanitizeForJson(input);

/**
 * ログエントリの総合サニタイゼーション
 *
 * @param message - ログメッセージ
 * @param data - ログデータ（オプション）
 * @returns サニタイズされたログエントリ
 * @public
 */
export const sanitizeLogEntry = (message: string, data?: unknown): SanitizedLogEntry =>
  LogSanitizer.sanitizeLogEntry(message, data);

/**
 * オブジェクトサイズ制限
 *
 * @param input - 制限対象のデータ
 * @param maxDepth - 最大深度（オプション）
 * @param maxKeys - 最大キー数（オプション）
 * @returns サイズ制限されたデータ
 * @public
 */
export const limitObjectSize = (input: unknown, maxDepth?: number, maxKeys?: number) =>
  LogSanitizer.limitObjectSize(input, maxDepth, maxKeys);
