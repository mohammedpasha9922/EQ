/**
 * Shared Result Screen
 * The single shared result screen used by every calculator mode.
 * Provides the standard interface to the three display layers.
 */

import { getDisplayRenderer } from './DisplayRenderer.js';
import { getSpeechEngine } from './SpeechEngine.js';

/**
 * Shared Result Screen
 * Wraps the display renderer and speech engine to provide one consistent
 * result screen interface for every calculator mode.
 */
class ResultScreen {
  constructor() {
    this.display = getDisplayRenderer();
    this.speech = getSpeechEngine();
  }

  /**
   * Update all display layers.
   * @param {object} options - { primary, expression, secondary, locale }
   */
  update({ primary, expression, secondary, locale }) {
    this.display.updateAll({ primary, expression, secondary, locale });
  }

  /**
   * Update the primary (numeric) display.
   * @param {string} value - The value to display.
   */
  updatePrimary(value) {
    this.display.updatePrimary(value);
  }

  /**
   * Update the expression display.
   * @param {string} expression - The expression to display.
   */
  updateExpression(expression) {
    this.display.updateExpression(expression);
  }

  /**
   * Update the secondary (words) display.
   * @param {string} value - The numeric value.
   * @param {string} locale - The locale.
   */
  updateSecondary(value, locale) {
    this.display.updateSecondary(value, locale);
  }

  /**
   * Format a number for display.
   * @param {*} value - The value to format.
   * @returns {string} The formatted string.
   */
  formatNumber(value) {
    return this.display.formatNumber(value);
  }

  /**
   * Speak the current result.
   * @param {string} text - The text to speak.
   * @param {string} locale - The locale for speech.
   */
  speak(text, locale) {
    this.speech.speak(text, locale);
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared ResultScreen instance.
 * @returns {ResultScreen} The shared instance.
 */
export function getResultScreen() {
  if (!instance) {
    instance = new ResultScreen();
  }
  return instance;
}

export default getResultScreen;