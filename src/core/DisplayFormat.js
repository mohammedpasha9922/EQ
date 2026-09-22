/**
 * Shared Display-Format Util
 * Copy-only formatting helpers for on-screen result display.
 *
 * IMPORTANT: These functions NEVER mutate the calculator state,
 * the raw calculation value, stored history, or any engine. They format a
 * COPY of a value purely for presentation purposes (primary result display
 * and number-to-words input). Live typing of operands uses the exact raw
 * value; only the computed result path rounds for display.
 */

import { numberToWords } from './NumberToWords.js';

/**
 * Round a copied numeric value for display to at most `maxDecimals` decimal
 * places, then drop unnecessary trailing zeros:
 *   2099.87654321098765 -> "2099.8765"   (maxDecimals 4)
 *   18243.956666666666  -> "18243.96"    (maxDecimals 2)
 *   25                  -> "25"
 *   25.00               -> "25"
 *   -0.0045             -> "-0.0045"
 *
 * Non-numeric / symbolic values (e.g. "sqrt(3)", "Error", "25%") are returned
 * untouched so the display pipeline never breaks on them.
 *
 * @param {*} value - The raw value (number or numeric string).
 * @param {number} maxDecimals - Maximum decimals (2–4 recommended).
 * @returns {string} The display-only rounded string (no thousands separators).
 */
export function roundDisplayValue(value, maxDecimals = 4) {
  if (value === null || value === undefined || value === '') return '0';
  const s = String(value);
  if (!s) return '0';

  const neg = s.startsWith('-');
  const ns = neg ? s.slice(1) : s;

  // Non-numeric / symbolic path: return as-is (e.g. "sqrt(3)", "Error", "3^2").
  if (!/^\d+(\.\d+)?$/.test(ns)) return s;

  const hasFraction = ns.includes('.');

  let fixed;
  try {
    const n = Number(ns);
    if (Number.isNaN(n)) return s;
    // Beyond toFixed's fixed-point range toFixed returns exponential notation;
    // keep the literal so huge integers still render (grouped upstream).
    if (hasFraction && Math.abs(n) >= 1e21) return s;
    fixed = n.toFixed(maxDecimals);
  } catch (e) {
    return s;
  }
  if (!fixed || fixed === 'NaN') return s;

  // Strip trailing zeros and a dangling decimal point: 25.0000 -> "25".
  fixed = fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (fixed === '-0') fixed = '0';
  return neg ? '-' + fixed : fixed;
}

/**
 * Round a displayed value exactly like roundDisplayValue but then wire it
 * through the thousands-separator grouping used by the on-screen primary
 * display. Purely a copy — never touches state/history.
 */
export function formatRounded(value, maxDecimals = 4) {
  const plain = roundDisplayValue(value, maxDecimals);
  if (plain !== null && /[^\d.-]/.test(plain)) return plain;
  const neg = plain.startsWith('-');
  const core = neg ? plain.slice(1) : plain;
  const [whole, fraction] = core.split('.');
  const grouped = whole.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + grouped + (fraction ? `.${fraction}` : '');
}

/**
 * Round a copied value to its written (number-to-words) form and hand back a
 * clean numeric string WITHOUT thousands separators. Non-numeric values pass
 * through.
 */
export function roundWordsInput(value, maxDecimals = 2) {
  return roundDisplayValue(value, maxDecimals);
}

/**
 * Number-to-words for the COMPUTED RESULT (display path only).
 *
 * The result is read financially as Integer + parts-of-100 (cents). This is
 * what makes the "and 96/100 only" / "و X جزءًا من مئة" phrasing and — above
 * all — guarantees a long decimal tail is NEVER spelled out as a giant number
 * (مليون/مليار/ترليون). The shared numberToWords engine stays untouched; the
 * integer part is delegated to it and only the integer + first two decimals
 * (as cents) are used.
 *
 * @param {*} value - A display-rounded numeric string (e.g. "18243.96").
 * @param {string} locale - The locale.
 * @returns {string} Words for the rounded result (no raw long decimals).
 */
export function resultNumberToWords(value, locale) {
  const s = String(value).trim();
  if (!s) return locale === 'ar' ? 'صفر' : 'zero';
  const negative = s.startsWith('-');
  const ns = negative ? s.slice(1) : s;
  // Non-numeric / symbolic pass-through (affected result, expressions, etc).
  if (!/^\d+(\.\d+)?$/.test(ns)) return s;

  const [wholeRaw, fracRaw = ''] = ns.split('.');
  // Fraction read as hundredths: "5" -> 50, "96" -> 96, "95666" -> 95.
  const cents = fracRaw ? parseInt(fracRaw.padEnd(2, '0').slice(0, 2), 10) : 0;
  const wholeSigned = (negative ? '-' : '') + wholeRaw;

  let words;
  if (locale === 'ar') {
    words = numberToWords(wholeSigned, 'ar');
    if (cents > 0) words += ' و' + numberToWords(String(cents), 'ar') + ' جزءًا من مئة';
    words = words.replace(/ و /g, ' و');
  } else if (locale === 'en') {
    words = numberToWords(wholeSigned, 'en');
    if (cents > 0) words += ` and ${cents}/100`;
    words += ' only';
  } else {
    // Other locales: reuse the engine's digit-by-digit decimal reading.
    words = numberToWords(negative ? '-' + ns : ns, locale);
  }
  return words;
}

export default {
  roundDisplayValue,
  formatRounded,
  roundWordsInput,
  resultNumberToWords
};