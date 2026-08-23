/**
 * Shared Copy & Paste Engine
 * Single shared copy/paste engine used by every calculator mode.
 * Handles clipboard operations with fallbacks.
 */

/**
 * Shared Clipboard Engine
 * Provides copy and paste operations with graceful fallbacks.
 */
class ClipboardEngine {
  /**
   * Copy text to the clipboard.
   * @param {string} text - The text to copy.
   * @param {string} successMessage - The toast message to show on success.
   * @param {function} showToast - The toast display function.
   * @returns {Promise<boolean>} True if copy succeeded.
   */
  async copy(text, successMessage, showToast) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (showToast) showToast(successMessage || 'Result copied');
        return true;
      }
      throw new Error('Clipboard API not available');
    } catch (e) {
      // Fallback: temporary textarea + execCommand
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (e2) {
        success = false;
      }
      document.body.removeChild(textarea);
      if (success) {
        if (showToast) showToast(successMessage || 'Result copied');
      } else {
        if (showToast) showToast('Copy failed');
      }
      return success;
    }
  }

  /**
   * Paste text from the clipboard.
   * @param {boolean} userInitiated - Whether this was triggered by user action.
   * @param {function} showToast - The toast display function.
   * @returns {Promise<string|null>} The pasted text, or null on failure.
   */
  async paste(userInitiated = false, showToast) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API not available');
      }
      const text = await navigator.clipboard.readText();
      return text;
    } catch (e) {
      if (userInitiated) {
        if (showToast) showToast('Paste failed');
      }
      return null;
    }
  }

  /**
   * Extract a valid numeric value from pasted text.
   * @param {string} text - The raw pasted text.
   * @returns {string|null} A cleaned numeric string, or null if not numeric.
   */
  extractNumber(text) {
    if (!text) return null;
    // Accept only valid numeric values: digits, decimal point, optional minus sign
    const cleaned = text.replace(/[^\d.-]/g, '');
    if (cleaned && !isNaN(Number(cleaned))) {
      return cleaned;
    }
    return null;
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared ClipboardEngine instance.
 * @returns {ClipboardEngine} The shared instance.
 */
export function getClipboardEngine() {
  if (!instance) {
    instance = new ClipboardEngine();
  }
  return instance;
}

export default getClipboardEngine;