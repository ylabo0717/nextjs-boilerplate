/// <reference types="vitest/globals" />
import { cn } from '@/utils/index';

describe('utils/index re-exports', () => {
  it('exports cn function', () => {
    expect(cn).toBeDefined();
    expect(typeof cn).toBe('function');
  });

  it('cn function works correctly when imported from index', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('handles empty arguments', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')).toBe(
      'btn btn-active'
    );
  });
});
