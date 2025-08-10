/// <reference types="vitest/globals" />
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and dedupes Tailwind variants', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', undefined, 'text-sm')).toBe('px-4 text-sm');
  });
});
