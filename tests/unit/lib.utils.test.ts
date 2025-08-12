/// <reference types="vitest/globals" />
import { cn as cnFromLib } from '@/lib/utils';
import { cn } from '@/utils/cn';

describe('cn', () => {
  it('merges class names and dedupes Tailwind variants', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', undefined, 'text-sm')).toBe('px-4 text-sm');
  });
});

describe('lib/utils re-export', () => {
  it('exports cn function from lib/utils', () => {
    expect(cnFromLib).toBeDefined();
    expect(typeof cnFromLib).toBe('function');
  });

  it('cn from lib/utils works the same as from utils/cn', () => {
    const result = cnFromLib('px-2', 'px-4', 'text-sm');
    expect(result).toBe('px-4 text-sm');
  });
});
