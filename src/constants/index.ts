/**
 * Application constants
 */

/** Application name */
export const APP_NAME = 'Next.js Boilerplate';

/** Application description */
export const APP_DESCRIPTION = 'Production-ready Next.js boilerplate for enterprise applications';

/**
 * API Configuration
 */

/** Base URL for API endpoints */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

/** API request timeout in milliseconds */
export const API_TIMEOUT = 30000; // 30 seconds

/**
 * UI Constants
 */

/** Default page size for pagination */
export const PAGE_SIZE = 20;

/** Debounce delay for user input in milliseconds */
export const DEBOUNCE_DELAY = 300;

/**
 * Localization
 */

/** Supported locale codes */
export const SUPPORTED_LOCALES = ['ja', 'en', 'en-US', 'ja-JP'] as const;

/** Type representing supported locale codes */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Validates language codes against ISO 639-1 standard
 *
 * @param code - Language code to validate
 * @returns True if the code matches ISO 639-1 format
 *
 * @example
 * ```typescript
 * isValidLanguageCode('en'); // true
 * isValidLanguageCode('en-US'); // true
 * isValidLanguageCode('invalid'); // false
 * ```
 */
export const isValidLanguageCode = (code: string): boolean => {
  // Basic ISO 639-1 (2-letter) or ISO 639-1 with region (e.g., en-US)
  // eslint-disable-next-line security/detect-unsafe-regex
  const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageCodePattern.test(code);
};
