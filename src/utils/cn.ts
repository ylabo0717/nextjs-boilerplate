import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine and merge Tailwind CSS class names
 * 
 * This function combines multiple class values using clsx and merges conflicting
 * Tailwind classes using tailwind-merge to ensure proper CSS class precedence.
 * 
 * @param inputs - Class values to be combined and merged
 * @returns A string of merged class names
 * 
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-4') // Returns: 'py-1 px-4'
 * cn('text-red-500', isError && 'text-blue-500') // Conditional classes
 * ```
 * 
 * @public
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
