import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind CSS classes using tailwind-merge.
 *
 * @param inputs - Class values to combine
 * @returns Merged class string
 *
 * @example
 * ```typescript
 * cn('text-red-500', 'bg-blue-500'); // 'text-red-500 bg-blue-500'
 * cn('p-4', 'p-2'); // 'p-2' (tailwind-merge resolves conflicts)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
