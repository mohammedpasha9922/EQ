/**
 * Shared Keyboard Handler
 * Single shared keyboard handler used by every calculator mode.
 * Routes keyboard input to the active calculator mode's handlers.
 */

/**
 * Shared Keyboard Handler
 * Centralizes keyboard input routing to the active calculator mode.
 */
class KeyboardHandler {
  constructor() {
    this.mode = null; // The active calculator mode
  }

  /**
   * Set the active calculator mode that will receive keyboard input.
   * @param {object} mode - The active mode with appendDigit/applyOperator/etc.
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * Handle a keydown event.
   * @param {KeyboardEvent} event - The keydown event.
   */
  handleKeydown(event) {
    const key = event.key;
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const activeTag = activeEl ? activeEl.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || (activeEl && activeEl.isContentEditable)) {
      return;
    }

    const mode = this.mode;
    if (!mode) return;

    if (/^\d$/.test(key)) {
      if (mode.appendDigit) mode.appendDigit(key);
    } else if (key === '.') {
      if (mode.appendDigit) mode.appendDigit('.');
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      if (mode.applyOperator) mode.applyOperator(key);
    } else if (key === '(' || key === ')') {
      // PHASE 37G (Test Point 8): keyboard parentheses route to the same
      // free-expression buffer as the ( ) buttons.
      if (mode.appendParenthesis) mode.appendParenthesis(key);
    } else if (key === '%') {
      if (mode.handlePercent) mode.handlePercent();
    } else if (key === 'Enter' || key === '=') {
      event.preventDefault();
      if (mode.handleEquals) mode.handleEquals();
    } else if (key === 'Backspace') {
      event.preventDefault();
      if (mode.backspace) mode.backspace();
    } else if (key === 'Escape') {
      if (mode.clearAll) mode.clearAll();
    }
  }

  /**
   * Attach the keydown listener to the document.
   */
  attach() {
    if (!this._boundHandler) {
      this._boundHandler = (e) => this.handleKeydown(e);
    }
    document.addEventListener('keydown', this._boundHandler);
  }

  /**
   * Detach the keydown listener from the document.
   */
  detach() {
    if (this._boundHandler) {
      document.removeEventListener('keydown', this._boundHandler);
    }
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared KeyboardHandler instance.
 * @returns {KeyboardHandler} The shared instance.
 */
export function getKeyboardHandler() {
  if (!instance) {
    instance = new KeyboardHandler();
  }
  return instance;
}

export default getKeyboardHandler;