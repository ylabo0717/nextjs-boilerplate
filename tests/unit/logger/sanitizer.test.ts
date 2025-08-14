/**
 * 🚨 高リスク項目テスト: 制御文字サニタイザー機能
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeControlCharacters,
  sanitizeForJson,
  sanitizeLogEntry,
  limitObjectSize,
  sanitizeNewlines,
} from '../../../src/lib/logger/sanitizer';

describe('LogSanitizer - ログインジェクション攻撃防止', () => {
  describe('🚨 制御文字サニタイゼーション', () => {
    it('should sanitize null bytes', () => {
      const input = 'test\x00string';
      const result = sanitizeControlCharacters(input);
      expect(result).toBe('test\\u0000string');
    });

    it('should sanitize all control characters (0x00-0x1F)', () => {
      const controlChars = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i));
      const input = 'start' + controlChars.join('') + 'end';
      const result = sanitizeControlCharacters(input) as string;

      // 制御文字がすべてエスケープされていることを確認
      expect(result).toContain('\\u0000');
      expect(result).toContain('\\u0001');
      expect(result).toContain('\\u001F');
      expect(result).toMatch(/^start(\\u[0-9A-F]{4})+end$/);
    });

    it('should sanitize extended control characters (0x7F-0x9F)', () => {
      const input = 'test\x7F\x80\x9Fstring';
      const result = sanitizeControlCharacters(input);
      expect(result).toBe('test\\u007F\\u0080\\u009Fstring');
    });

    it('should preserve normal characters', () => {
      const input = 'Normal text with 日本語 and émojis 🚀';
      const result = sanitizeControlCharacters(input);
      expect(result).toBe(input);
    });

    it('should handle arrays recursively', () => {
      const input = ['normal', 'with\x00null', { key: 'value\x01' }];
      const result = sanitizeControlCharacters(input) as any[];

      expect(result[0]).toBe('normal');
      expect(result[1]).toBe('with\\u0000null');
      expect(result[2].key).toBe('value\\u0001');
    });

    it('should handle nested objects deeply', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              dangerous: 'content\x00\x01\x02',
              safe: 'normal content',
            },
          },
        },
      };

      const result = sanitizeControlCharacters(input) as any;
      expect(result.level1.level2.level3.dangerous).toBe('content\\u0000\\u0001\\u0002');
      expect(result.level1.level2.level3.safe).toBe('normal content');
    });
  });

  describe('🔄 循環参照対応', () => {
    it('should handle circular references safely', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      obj.dangerous = 'content\x00';

      const result = sanitizeControlCharacters(obj) as any;

      expect(result.name).toBe('test');
      expect(result.dangerous).toBe('content\\u0000');
      expect(result.self._circular_reference).toBe(true);
    });

    it('should handle complex circular references', () => {
      const parent: any = { name: 'parent' };
      const child: any = { name: 'child', parent };
      parent.child = child;
      parent.dangerous = 'data\x01';

      const result = sanitizeControlCharacters(parent) as any;

      expect(result.name).toBe('parent');
      expect(result.dangerous).toBe('data\\u0001');
      expect(result.child.name).toBe('child');
      expect(result.child.parent._circular_reference).toBe(true);
    });
  });

  describe('📜 CRLF注入防止', () => {
    it('should sanitize newline characters', () => {
      const input = 'line1\nline2\rline3\r\nline4';
      const result = sanitizeNewlines(input);
      expect(result).toBe('line1\\nline2\\rline3\\r\\nline4');
    });

    it('should handle mixed line endings', () => {
      const input = 'unix\nwindows\r\nmac\r';
      const result = sanitizeNewlines(input);
      expect(result).toBe('unix\\nwindows\\r\\nmac\\r');
    });
  });

  describe('🛡️ ログインジェクション攻撃対策', () => {
    it('should prevent log forging with newlines', () => {
      const maliciousInput = 'Normal log\n[FAKE] Injected malicious log entry';
      const result = sanitizeForJson(maliciousInput);

      expect(result).not.toContain('\n');
      expect(result).toContain('\\u000A');
      expect(result as string).toBe('Normal log\\u000A[FAKE] Injected malicious log entry');
    });

    it('should prevent log forging with control characters', () => {
      const maliciousInput = 'Log entry\x1b[31mFAKE ERROR\x1b[0m';
      const result = sanitizeForJson(maliciousInput);

      expect(result).not.toContain('\x1b');
      expect(result as string).toContain('\\u001B');
    });

    it('should handle complex injection attempts', () => {
      const maliciousInput = {
        userInput: 'normal\r\n[ERROR] FAKE\x00\x01',
        message: 'another\nfake\rentry',
      };

      const result = sanitizeLogEntry('Processing user input', maliciousInput);

      const data = result.data as any;
      expect(data.userInput).toBe('normal\\u000D\\u000A[ERROR] FAKE\\u0000\\u0001');
      expect(data.message).toBe('another\\u000Afake\\u000Dentry');
    });
  });

  describe('📏 オブジェクトサイズ制限', () => {
    it('should limit object depth', () => {
      const deepObject = Array.from({ length: 15 }).reduce((acc) => ({ nested: acc }), {
        value: 'deep',
      } as any);

      const result = limitObjectSize(deepObject, 5);

      let current = result;
      let depth = 0;
      while (current && typeof current === 'object' && 'nested' in current) {
        current = (current as any).nested;
        depth++;
        if (depth > 10) break; // 無限ループ防止
      }

      expect(depth).toBeLessThanOrEqual(5);
    });

    it('should limit object key count', () => {
      const wideObject = Array.from({ length: 150 }, (_, i) => [`key${i}`, `value${i}`]).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value }),
        {}
      );

      const result = limitObjectSize(wideObject, 10, 100) as any;

      const keys = Object.keys(result);
      expect(keys.length).toBeLessThanOrEqual(101); // 100 + _truncated key
      expect(result._truncated).toContain('more keys');
    });

    it('should limit string length', () => {
      const longString = 'x'.repeat(2000);
      const result = limitObjectSize(longString);

      expect((result as string).length).toBeLessThanOrEqual(1015); // 1000 + "... [TRUNCATED]"
      expect((result as string).endsWith('... [TRUNCATED]')).toBe(true);
    });

    it('should limit array length', () => {
      const longArray = Array.from({ length: 150 }, (_, i) => i);
      const result = limitObjectSize(longArray, 10, 100) as any[];

      expect(result.length).toBeLessThanOrEqual(101); // 100 + truncation info
      expect(result[100]).toHaveProperty('_truncated');
    });
  });

  describe('⚡ パフォーマンステスト', () => {
    it('should sanitize large objects efficiently', () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          content: `content\x00${i}`,
          nested: { value: `nested\x01${i}` },
        })),
      };

      const start = Date.now();
      const result = sanitizeControlCharacters(largeObject);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // 100ms以内
      expect(result).toBeDefined();
    });

    it('should handle deeply nested objects efficiently', () => {
      const deepObject = Array.from({ length: 20 }).reduce(
        (acc, _, i) => ({ [`level${i}`]: acc, dangerous: `data\x00${i}` }),
        { leaf: 'value\x01' } as any
      );

      const start = Date.now();
      const result = limitObjectSize(deepObject, 15, 50);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // 50ms以内
      expect(result).toBeDefined();
    });
  });

  describe('🔍 エッジケーステスト', () => {
    it('should handle null and undefined values', () => {
      expect(sanitizeControlCharacters(null)).toBe(null);
      expect(sanitizeControlCharacters(undefined)).toBe(undefined);
      expect(sanitizeControlCharacters('')).toBe('');
    });

    it('should handle special JavaScript values', () => {
      expect(sanitizeControlCharacters(NaN)).toBe(NaN);
      expect(sanitizeControlCharacters(Infinity)).toBe(Infinity);
      expect(sanitizeControlCharacters(-Infinity)).toBe(-Infinity);
    });

    it('should handle Buffer objects', () => {
      const buffer = Buffer.from('test\x00data');
      const result = sanitizeControlCharacters(buffer);

      // Buffer は object として扱われ、各プロパティがサニタイズされる
      expect(typeof result).toBe('object');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01');
      const result = sanitizeControlCharacters(date);

      // Date オブジェクトのプロパティがサニタイズされる
      expect(typeof result).toBe('object');
    });
  });
});
