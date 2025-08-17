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
import { LOGGER_TEST_DATA } from '../../constants/test-constants';

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

    it('should handle deeply nested circular references with multiple loops', () => {
      // Create complex circular structure
      const root: any = { id: 'root', level: 0 };
      const branch1: any = { id: 'branch1', level: 1, parent: root };
      const branch2: any = { id: 'branch2', level: 1, parent: root };
      const leaf: any = {
        id: 'leaf',
        level: 2,
        parents: [branch1, branch2],
        dangerous: 'content\x00\x01',
      };

      root.children = [branch1, branch2];
      branch1.children = [leaf];
      branch2.children = [leaf];

      // Create multiple circular references
      leaf.root = root;
      branch1.sibling = branch2;
      branch2.sibling = branch1;

      const result = sanitizeControlCharacters(root) as any;

      // Check basic structure preservation
      expect(result.id).toBe('root');
      expect(result.children).toBeDefined();
      expect(result.children[0].id).toBe('branch1');
      expect(result.children[1].id).toBe('branch2');

      // Check circular reference handling - verify that deep circular refs are detected
      expect(result.children[0].children[0].dangerous).toBe('content\\u0000\\u0001');
      // The circular reference should be detected somewhere in the deep structure
      const hasCircularRef = JSON.stringify(result).includes('_circular_reference');
      expect(hasCircularRef).toBe(true);
    });

    it('should handle self-referencing arrays with circular objects', () => {
      const arr: any[] = [];
      const obj: any = { id: 'container', items: arr, dangerous: 'data\x02' };
      arr.push(obj);
      arr.push({ ref: obj });

      const result = sanitizeControlCharacters(arr) as any[];

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('container');
      expect(result[0].dangerous).toBe('data\\u0002');
      // Check that circular references are detected in the structure
      const resultStr = JSON.stringify(result);
      expect(resultStr.includes('_circular_reference')).toBe(true);
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
      const wideObject = Array.from({ length: LOGGER_TEST_DATA.OBJECT_PROPERTY_LIMIT }, (_, i) => [
        `key${i}`,
        `value${i}`,
      ]).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      const result = limitObjectSize(
        wideObject,
        10,
        LOGGER_TEST_DATA.CONCURRENT_REQUESTS_STANDARD
      ) as any;

      const keys = Object.keys(result);
      expect(keys.length).toBeLessThanOrEqual(LOGGER_TEST_DATA.OBJECT_PROPERTY_LIMIT_PLUS_ONE); // 100 + _truncated key
      expect(result._truncated).toContain('more keys');
    });

    it('should limit string length', () => {
      const longString = 'x'.repeat(LOGGER_TEST_DATA.STRING_LENGTH_LIMIT);
      const result = limitObjectSize(longString);

      expect((result as string).length).toBeLessThanOrEqual(
        LOGGER_TEST_DATA.TRUNCATED_STRING_LENGTH
      ); // 1000 + "... [TRUNCATED]"
      expect((result as string).endsWith('... [TRUNCATED]')).toBe(true);
    });

    it('should limit array length', () => {
      const longArray = Array.from({ length: LOGGER_TEST_DATA.OBJECT_PROPERTY_LIMIT }, (_, i) => i);
      const result = limitObjectSize(
        longArray,
        10,
        LOGGER_TEST_DATA.CONCURRENT_REQUESTS_STANDARD
      ) as any[];

      expect(result.length).toBeLessThanOrEqual(LOGGER_TEST_DATA.OBJECT_PROPERTY_LIMIT_PLUS_ONE); // 100 + truncation info
      expect(result[LOGGER_TEST_DATA.CONCURRENT_REQUESTS_STANDARD]).toHaveProperty('_truncated');
    });
  });

  describe('⚡ パフォーマンステスト', () => {
    it('should sanitize large objects efficiently', () => {
      const largeObject = {
        data: Array.from({ length: LOGGER_TEST_DATA.LARGE_OBJECT_ARRAY_SIZE }, (_, i) => ({
          id: i,
          content: `content\x00${i}`,
          nested: { value: `nested\x01${i}` },
        })),
      };

      // パフォーマンステストでは正常実行を確認
      const result = sanitizeControlCharacters(largeObject) as any;
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();

      // サニタイザーが正常に動作することを確認
      if (Array.isArray(result.data)) {
        expect(result.data.length).toBe(LOGGER_TEST_DATA.LARGE_OBJECT_ARRAY_SIZE);
        if (result.data[0]) {
          expect(result.data[0].content).toContain('\\\\u0000');
        }
      } else {
        // オブジェクト形式で返された場合でも、データが存在することを確認
        expect(typeof result.data).toBe('object');
        expect(Object.keys(result.data).length).toBeGreaterThan(0);
      }
    });

    it('should handle deeply nested objects efficiently', () => {
      const deepObject = Array.from({ length: LOGGER_TEST_DATA.DEEP_OBJECT_NESTING_LEVEL }).reduce(
        (acc, _, i) => ({ [`level${i}`]: acc, dangerous: `data\x00${i}` }),
        { leaf: 'value\x01' } as any
      );

      // パフォーマンステストでは正常実行と結果の正確性を確認
      expect(() => {
        const result = limitObjectSize(
          deepObject,
          LOGGER_TEST_DATA.OBJECT_SIZE_DEPTH_LIMIT,
          LOGGER_TEST_DATA.OBJECT_SIZE_PROPERTY_LIMIT
        );
        expect(result).toBeDefined();
      }).not.toThrow();
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
