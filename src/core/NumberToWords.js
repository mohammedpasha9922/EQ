/**
 * Shared Number-To-Words Engine
 * Single shared engine used by every calculator mode.
 * Re-exports the existing numberToWords implementation to maintain 100% backward compatibility.
 */

import { numberToWords as numberToWordsImpl } from '../../numberToWords.js';

/**
 * Convert a number to its written form in the given locale.
 * @param {string|number} value - The numeric value to convert.
 * @param {string} locale - The locale code (e.g. 'en', 'ar', 'es', ...).
 * @returns {string} The number written in words.
 */
export function numberToWords(value, locale = 'en') {
  return numberToWordsImpl(value, locale);
}

/**
 * Get the list of supported locales for number-to-words conversion.
 * @returns {string[]} Array of supported locale codes.
 */
export function getSupportedLocales() {
  return ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr'];
}

export default {
  numberToWords,
  getSupportedLocales
};