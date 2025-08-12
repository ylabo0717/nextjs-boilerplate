import * as fs from 'node:fs';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks must be declared before importing the module under test
vi.mock('node:child_process', () => {
  const execSync = vi.fn(() => ({ toString: () => '' }));
  return { execSync, default: { execSync } };
});

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  const existsSync = vi.fn((p: import('node:fs').PathLike) => {
    const s = String(p);
    if (s.endsWith('metrics/latest.json')) return false;
    if (s.endsWith('metrics/code-quality-latest.json')) return false;
    return (
      actual as unknown as { existsSync: (p: import('node:fs').PathLike) => boolean }
    ).existsSync(p);
  });
  const mkdirSync = vi.fn();
  const writeFileSync = vi.fn();
  return { ...actual, existsSync, mkdirSync, writeFileSync } as typeof import('node:fs');
});

import { main } from '../../scripts/unified-quality-report';

describe('main smoke (fs and env mocked)', () => {
  const _cwd = process.cwd();
  // paths are validated indirectly via writeFileSync call arguments

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // unset GITHUB_OUTPUT for deterministic behavior
    delete process.env.GITHUB_OUTPUT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs and attempts to write unified reports', async () => {
    await main();
    // ensure our spies were called with expected paths
    const write = vi.mocked(fs.writeFileSync);
    const calls = write.mock.calls.map((c) => String(c[0]));
    expect(calls.some((p) => p.endsWith('metrics/unified-report.json'))).toBeTruthy();
    expect(calls.some((p) => p.endsWith('metrics/unified-report.md'))).toBeTruthy();
  });
});
