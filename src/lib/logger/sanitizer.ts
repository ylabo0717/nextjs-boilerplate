/**
 * 🚨 高リスク対応: 制御文字サニタイザー実装
 * ログインジェクション攻撃による監視システム汚染防止
 */

import type { SanitizedLogEntry } from './types';

export class LogSanitizer {
  /**
   * 制御文字（0x00-0x1F, 0x7F-0x9F）のサニタイゼーション
   * Unicode エスケープ形式（\\uXXXX）に変換
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
   * 改行文字をエスケープ形式に変換
   */
  static sanitizeNewlines(input: string): string {
    return input.replace(/\r\n/g, '\\r\\n').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  }

  /**
   * JSON-safe 文字列エスケープ
   * 制御文字と改行文字の両方をサニタイズ
   */
  static sanitizeForJson(input: unknown): unknown {
    if (typeof input === 'string') {
      return this.sanitizeNewlines(this.sanitizeControlCharacters(input) as string);
    }

    return this.sanitizeControlCharacters(input);
  }

  /**
   * ログメッセージの総合サニタイゼーション
   * メッセージとデータの両方をサニタイズ
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
   * メモリ枯渇防止のためのサイズ制限
   */
  static limitObjectSize(input: unknown, maxDepth: number = 10, maxKeys: number = 100): unknown {
    return this.limitObjectSizeRecursive(input, maxDepth, maxKeys, 0, new Set());
  }

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

    if (input && typeof input === 'object') {
      if (seen.has(input)) {
        return { _circular_reference: true };
      }

      seen.add(input);

      try {
        const entries = Object.entries(input);
        if (entries.length > maxKeys) {
          const limited: Record<string, unknown> = {};
          const limitedEntries = entries.slice(0, maxKeys);
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
          Object.assign(limited, { _truncated: `${entries.length - maxKeys} more keys` });
          return limited;
        }

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
      } finally {
        seen.delete(input);
      }
    }

    return input;
  }
}

/**
 * ユーティリティ関数のエクスポート
 */
export const sanitizeControlCharacters = (input: unknown) =>
  LogSanitizer.sanitizeControlCharacters(input);

export const sanitizeForJson = (input: unknown) => LogSanitizer.sanitizeForJson(input);

export const sanitizeLogEntry = (message: string, data?: unknown): SanitizedLogEntry =>
  LogSanitizer.sanitizeLogEntry(message, data);

export const limitObjectSize = (input: unknown, maxDepth?: number, maxKeys?: number) =>
  LogSanitizer.limitObjectSize(input, maxDepth, maxKeys);
