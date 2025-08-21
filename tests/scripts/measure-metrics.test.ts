/**
 * Measure Metrics Script Tests
 *
 * Unit tests for the measure-metrics script that collects and analyzes
 * code quality metrics including bundle size, build times, and performance
 * measurements. Tests script functionality and error handling.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules
vi.mock('fs');
vi.mock('child_process');

// Mock process.exit to prevent test runner from exiting
vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit called with ${code}`);
});

// Import after mocks
import { measureMetrics } from '../../scripts/measure-metrics';

/**
 * Metrics Measurement Function Test Suite
 *
 * Verifies that the measureMetrics function in scripts/measure-metrics.ts
 * correctly measures build time, test execution time, and bundle size.
 */
describe('measure-metrics', () => {
  const PNPM_BUILD_COMMAND = 'pnpm build';
  const PNPM_TEST_COMMAND = 'pnpm test';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset process.argv
    process.argv = ['node', 'test.js'];
  });

  describe('measureMetrics', () => {
    /**
     * すべてのメトリクス測定が正常に完了するケースを検証
     * ビルド、テスト、バンドルサイズを測定し、metricsフォルダに保存されることを確認
     */
    it('should successfully measure all metrics', async () => {
      // Mock successful build output
      const buildOutput = `
      Route (app)                                Size     First Load JS
      ┌ ○ /                                      5.44 kB        105 kB
      └ ○ /about                                 3.2 kB         98 kB
      + First Load JS shared by all              85 kB
      `;

      vi.mocked(execSync).mockImplementation((command: string) => {
        if (command.includes(PNPM_BUILD_COMMAND)) {
          return buildOutput;
        }
        if (command.includes(PNPM_TEST_COMMAND)) {
          return Buffer.from('Tests passed');
        }
        return Buffer.from('');
      });

      // Mock file system
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // @ts-expect-error - Mocking fs.readdirSync return value
      vi.mocked(fs.readdirSync).mockReturnValue(['file.js', 'file.css']);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000,
      } as ReturnType<typeof fs.statSync>);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await measureMetrics();

      // Verify that metrics were saved
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    /**
     * ビルドコマンドが失敗した場合のエラーハンドリングを検証
     * process.exit(1)が呼ばれ、適切なエラーメッセージが出力されることを確認
     */
    it('should handle build failure', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Build failed');
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(measureMetrics()).rejects.toThrow('process.exit called with 1');
      expect(console.error).toHaveBeenCalledWith('❌ Error measuring metrics:', expect.any(Error));
    });

    /**
     * --buildフラグ指定時、ビルド時間のみを測定することを検証
     * テストやバンドルサイズの測定はスキップされることを確認
     */
    it('should measure only build time with --build flag', async () => {
      process.argv = ['node', 'test.js', '--build'];

      const buildOutput = `
      Route (app)                                Size     First Load JS
      ┌ ○ /                                      5.44 kB        105 kB
      `;

      vi.mocked(execSync).mockImplementation((command: string) => {
        if (command.includes(PNPM_BUILD_COMMAND)) {
          return buildOutput;
        }
        return Buffer.from('');
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await measureMetrics();

      // Verify build command was called
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining(PNPM_BUILD_COMMAND),
        expect.any(Object)
      );
    });

    /**
     * --testフラグ指定時、テスト実行時間のみを測定することを検証
     * ビルドやバンドルサイズの測定はスキップされることを確認
     */
    it('should measure only test time with --test flag', async () => {
      process.argv = ['node', 'test.js', '--test'];

      vi.mocked(execSync).mockImplementation((command: string) => {
        if (command.includes(PNPM_TEST_COMMAND)) {
          return Buffer.from('Tests passed');
        }
        return Buffer.from('');
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await measureMetrics();

      // Verify test command was called
      expect(execSync).toHaveBeenCalledWith(PNPM_TEST_COMMAND, expect.any(Object));
    });

    /**
     * --bundleフラグ指定時、バンドルサイズのみを測定することを検証
     * .nextフォルダ内のファイルサイズを再帰的に計算することを確認
     */
    it('should measure bundle size with --bundle flag', async () => {
      process.argv = ['node', 'test.js', '--bundle'];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      // @ts-expect-error - Mocking fs.readdirSync return value
      vi.mocked(fs.readdirSync).mockReturnValue(['file.js', 'file.css']);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1000,
      } as ReturnType<typeof fs.statSync>);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await measureMetrics();

      // Verify that bundle size was calculated
      expect(fs.readdirSync).toHaveBeenCalled();
    });
  });
});
