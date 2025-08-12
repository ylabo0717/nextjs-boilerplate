import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines CSS classes using clsx and tailwind-merge
 *
 * @param inputs - Array of class values to combine
 * @returns Combined and optimized CSS class string
 *
 * @remarks
 * This utility function combines conditional class names and resolves
 * Tailwind CSS conflicts by merging classes intelligently.
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', condition && 'bg-blue-500', { 'text-white': active })
 * // Returns optimized class string
 * ```
 *
 * @public
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
