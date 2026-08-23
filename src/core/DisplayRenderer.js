/**
 * Shared Display Renderer
 * Single shared renderer used by every calculator mode.
 * Handles primary display, expression display, and secondary (words) display.
 */

import { numberToWords } from './NumberToWords.js';
import { Decimal } from './Decimal.js';

/**
 * Shared Display Renderer
 * Manages the three display layers: primary (numeric), expression, and secondary (words).
 */
class DisplayRenderer {
  constructor() {
    this.primaryDisplay = typeof document !== 'undefined' ? document.getElementById('primaryDisplay') : null;
    this.expressionDisplay = typeof document !== 'undefined' ? document.getElementById('expressionDisplay') : null;
    this.secondaryDisplay = typeof document !== 'undefined' ? document.getElementById('secondaryDisplay') : null;
  }

  /**
   * Format a number with thousands separators and scientific-notation expansion.
   * @param {*} value - The value to format.
   * @returns {string} The formatted number string.
   */
  formatNumber(value) {
    if (value === null || value === undefined || value === '') return '0';
    let num;
    try {
      if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
        num = new Decimal(value.toString());
      } else {
        num = new Decimal(String(value));
      }
    } catch (e) {
      // Non-numeric value (e.g. a scientific expression string like "sqrt(3)" or "3^2"):
      // render it as-is instead of crashing the display pipeline.
      return String(value);
    }
    const str = num.toString();
    // Expand scientific notation for display
    let expanded;
    try {
      expanded = num.toFixed && !str.includes('e') && !str.includes('E') ? str : String(num);
    } catch (e) {
      expanded = str;
    }
    // Add thousands separators to integer part
    const [whole, fraction] = expanded.split('.');
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
  }

  /**
   * Update the primary (numeric) display.
   * @param {string} value - The value to display.
   */
  updatePrimary(value) {
    if (this.primaryDisplay) {
      this.primaryDisplay.textContent = this.formatNumber(value);
    }
  }

  /**
   * Update the expression display.
   * @param {string} expression - The expression string to display.
   */
  updateExpression(expression) {
    if (this.expressionDisplay) {
      this.expressionDisplay.textContent = expression || '';
    }
  }

  /**
   * Update the secondary (words) display.
   * @param {string} value - The numeric value to convert to words.
   * @param {string} locale - The locale for number-to-words conversion.
   */
  updateSecondary(value, locale) {
    if (this.secondaryDisplay) {
      if (value !== '' && !isNaN(Number(value))) {
        this.secondaryDisplay.textContent = numberToWords(value, locale);
      } else {
        this.secondaryDisplay.textContent = 'Zero';
      }
    }
  }

  /**
   * Update all three display layers at once.
   * @param {object} options - { primary, expression, secondary, locale }
   */
  updateAll({ primary, expression, secondary, locale }) {
    if (primary !== undefined) this.updatePrimary(primary);
    if (expression !== undefined) this.updateExpression(expression);
    if (secondary !== undefined) this.updateSecondary(secondary, locale);
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared DisplayRenderer instance.
 * @returns {DisplayRenderer} The shared instance.
 */
export function getDisplayRenderer() {
  if (!instance) {
    instance = new DisplayRenderer();
  }
  return instance;
}

export default getDisplayRenderer;