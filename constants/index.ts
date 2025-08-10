// Application constants
export const APP_NAME = 'Next.js Boilerplate';
export const APP_DESCRIPTION = 'Production-ready Next.js boilerplate for enterprise applications';

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
export const API_TIMEOUT = 30000; // 30 seconds

// UI Constants
export const PAGE_SIZE = 20;
export const DEBOUNCE_DELAY = 300;

// Localization
export const SUPPORTED_LOCALES = ['ja', 'en', 'en-US', 'ja-JP'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Validation function for language codes
export const isValidLanguageCode = (code: string): boolean => {
  // Basic ISO 639-1 (2-letter) or ISO 639-1 with region (e.g., en-US)
  const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageCodePattern.test(code);
};
