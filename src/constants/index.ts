/**
 * Application name displayed throughout the app
 *
 * @public
 */
export const APP_NAME = 'Next.js Boilerplate';
/**
 * Application description for metadata and SEO
 *
 * @public
 */
export const APP_DESCRIPTION = 'Production-ready Next.js boilerplate for enterprise applications';

/**
 * Base URL for API endpoints
 *
 * @remarks
 * Defaults to '/api' if NEXT_PUBLIC_API_BASE_URL environment variable is not set
 *
 * @public
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
/**
 * API request timeout
 *
 * @remarks
 * Unit: milliseconds (30 seconds)
 *
 * @public
 */
export const API_TIMEOUT = 30000;

/**
 * Default page size for pagination
 *
 * @public
 */
export const PAGE_SIZE = 20;
/**
 * Debounce delay for input fields
 *
 * @remarks
 * Unit: milliseconds
 *
 * @public
 */
export const DEBOUNCE_DELAY = 300;

/**
 * Supported locales for internationalization
 *
 * @public
 */
export const SUPPORTED_LOCALES = ['ja', 'en', 'en-US', 'ja-JP'] as const;
/**
 * Type for supported locale values
 *
 * @public
 */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Validates if a string is a valid language code
 *
 * @param code - The language code to validate
 * @returns True if the code matches ISO 639-1 format (e.g., 'en' or 'en-US')
 *
 * @example
 * ```typescript
 * isValidLanguageCode('en'); // true
 * isValidLanguageCode('en-US'); // true
 * isValidLanguageCode('invalid'); // false
 * ```
 *
 * @public
 */
export const isValidLanguageCode = (code: string): boolean => {
  // Basic ISO 639-1 (2-letter) or ISO 639-1 with region (e.g., en-US)
  // eslint-disable-next-line security/detect-unsafe-regex
  const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageCodePattern.test(code);
};
