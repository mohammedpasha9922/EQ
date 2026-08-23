/**
 * Standard Calculator Mode
 * Provides only: buttons, input logic, calculation logic.
 * Everything else is shared through the shared core services.
 *
 * This is the AUTHORITATIVE implementation of the standard calculator's
 * input/calculation state machine. The UI/event layer (app.js) delegates to
 * these methods; there is no second copy of this logic anywhere.
 *
 * Side-effect integrations (history, speech, error reporting) are delegated
 * via injected callbacks (onAddHistory / onSpeak / onError) so that the
 * app-level history, speech and toast behavior is preserved exactly. When no
 * callback is injected, the shared core engines are used as a fallback.
 */

import { Decimal } from '../core/Decimal.js';
import { getResultScreen } from '../core/ResultScreen.js';
import { getClipboardEngine } from '../core/ClipboardEngine.js';
import { getHistoryEngine } from '../core/HistoryEngine.js';
import { getDisplayRenderer } from '../core/DisplayRenderer.js';
import { evaluateExpression } from '../core/ExpressionEvaluator.js';

/**
 * Standard Calculator Mode
 * Encapsulates the standard calculator's state and logic.
 */
class StandardCalculator {
  constructor() {
    this.id = 'general';
    this.panelId = 'generalCalculatorPanel';
    this.label = 'General Calculator';
    this.state = null; // Set by the app (shared app state)
    this.translations = null; // Set by the app (shared translations)
    this.locale = 'en';
    this.historyEngine = null;
    this.speech = null;
    this.clipboard = getClipboardEngine();
    this.feedback = null; // Callback for button feedback (haptics)
    this.onAddHistory = null; // Callback (expression, result) provided by the app
    this.onSpeak = null; // Callback () provided by the app, speaks the current result
    this.onError = null; // Callback () provided by the app, reports a calculation error
  }

  /**
   * Called by CalculatorManager when this mode becomes active.
   * @param {object} services - Shared services.
   */
  mount(services) {
    this.resultScreen = services.resultScreen;
    this.speech = services.speech;
    this.historyEngine = services.history;
  }

  /**
   * Called by CalculatorManager when this mode is deactivated.
   */
  unmount() {
    // No-op for now
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for digit input.
   * @param {string} digit - A digit (0-9) or '.'.
   */
  appendDigit(digit) {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    state.hasPressedEquals = false;
    if (state.startNewNumber || state.displayValue === '0') {
      if (digit === '.') {
        state.displayValue = '0.';
      } else {
        state.displayValue = digit;
      }
      state.startNewNumber = false;
    } else {
      if (digit === '.' && state.displayValue.includes('.')) {
        return;
      }
      state.displayValue += digit;
    }
    state.expression = this.buildExpressionString();
    this.refreshDisplay();
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for operator input.
   * @param {string} op - The operator ('+', '-', '*', '/').
   */
  applyOperator(op) {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    const currentValue = new Decimal(state.displayValue);
    state.hasPressedEquals = false;

    if (state.pendingOperator && !state.startNewNumber) {
      // Chain operation: compute previous with current
      const prev = new Decimal(state.storedValue);
      let result;
      switch (state.pendingOperator) {
        case '+': result = prev.add(currentValue); break;
        case '-': result = prev.sub(currentValue); break;
        case '*': result = prev.mul(currentValue); break;
        case '/': result = currentValue.isZero && currentValue.isZero() ? new Decimal(0) : prev.div(currentValue); break;
        default: result = currentValue;
      }
      state.storedValue = result.toString();
    } else {
      state.storedValue = state.displayValue;
    }
    state.pendingOperator = op;
    state.startNewNumber = true;
    state.displayValue = state.storedValue;
    state.expression = this.buildExpressionString();
    this.refreshDisplay();
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for percent.
   */
  handlePercent() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    if (state.displayValue !== '' && state.displayValue !== '0') {
      const value = new Decimal(state.displayValue);
      state.displayValue = value.div(100).toString();
      state.expression = this.buildExpressionString();
      this.refreshDisplay();
    }
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for equals.
   */
  handleEquals() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    const expr = this.buildExpressionString();
    if (!expr.trim()) return;
    try {
      // Separate DISPLAY formatting from CALCULATION data: the expression
      // string built by buildExpressionString() is comma-formatted for display
      // (e.g. "1,500 + 2"). The evaluator must receive a clean numeric
      // expression, so strip display-only thousands separators here before
      // evaluation. Display output below still keeps the formatted expression.
      const cleanExpr = expr.replace(/,/g, '');
      const result = evaluateExpression(cleanExpr);
      state.storedValue = null;
      state.pendingOperator = null;
      state.displayValue = result;
      state.startNewNumber = true;
      state.hasPressedEquals = true;
      // Keep the full expression string for history display
      const displayExpr = state.expression || expr;
      state.expression = `${displayExpr} =`;
      this.refreshDisplay();

      const historyExpr = displayExpr.replace(/ =$/, '').trim();
      if (this.onAddHistory) {
        this.onAddHistory(historyExpr, result);
      } else if (this.historyEngine) {
        this.historyEngine.add(historyExpr, result);
      }

      // Auto-read the result on `=` only when the Speaker / Voice Reading
      // setting is ON. The manual speaker button (in app.js) always works as
      // an explicit override regardless of this setting. App Sounds does NOT
      // control this — Speaker is fully independent.
      if (state.speakerEnabled) {
        if (this.onSpeak) {
          this.onSpeak();
        } else if (this.speech) {
          this.speech.speak(state.displayValue, this.locale);
        }
      }
    } catch (e) {
      // Preserve the monolith error behavior exactly: toast + primary display.
      state.displayValue = 'Error';
      if (this.onError) {
        this.onError();
      } else if (this.resultScreen) {
        this.resultScreen.speak('Error', this.locale);
      }
      if (this.resultScreen) {
        this.resultScreen.updatePrimary(state.displayValue);
      }
    }
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for backspace.
   */
  backspace() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    if (state.startNewNumber) return;
    if (state.displayValue.length > 1) {
      state.displayValue = state.displayValue.slice(0, -1);
    } else {
      state.displayValue = '0';
      state.startNewNumber = true;
    }
    state.expression = this.buildExpressionString();
    this.refreshDisplay();
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for Escape/AC.
   */
  clearAll() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    state.displayValue = '0';
    state.expression = '';
    state.pendingOperator = null;
    state.storedValue = null;
    state.startNewNumber = true;
    state.hasPressedEquals = false;
    this.refreshDisplay();
  }

  /**
   * Build the current expression string for display.
   * Matches the legacy monolith format exactly: comma-formatted operands and
   * the raw pending operator symbol (e.g. "1,000 * 5").
   * @returns {string} The expression string.
   */
  buildExpressionString() {
    if (!this.state) return '';
    const state = this.state;
    const parts = [];
    if (state.storedValue !== null) parts.push(this.formatNumber(state.storedValue));
    if (state.pendingOperator) parts.push(state.pendingOperator);
    if (state.displayValue !== '0' && !state.startNewNumber && !state.hasPressedEquals) {
      parts.push(this.formatNumber(state.displayValue));
    }
    return parts.join(' ');
  }

  /**
   * Format a number for display.
   * @param {*} value - The value to format.
   * @returns {string} The formatted number.
   */
  formatNumber(value) {
    if (this.resultScreen) {
      return this.resultScreen.formatNumber(value);
    }
    return String(value);
  }

  /**
   * Refresh all display layers from the current state.
   * Equivalent to the monolith's updatePrimaryDisplay + updateSecondaryDisplay
   * + expression-display update for the standard calculator.
   */
  refreshDisplay() {
    if (!this.state || !this.resultScreen) return;
    const state = this.state;
    this.resultScreen.update({
      primary: state.displayValue,
      expression: state.expression,
      secondary: state.displayValue,
      // Prefer the LIVE locale from the shared app state so the number-to-words
      // secondary display stays in sync when the user changes language. The
      // mode-level `this.locale` is only a snapshot taken at mount time and can
      // go stale after setLanguage(); fall back to it only when state has no
      // locale (as in headless tests).
      locale: (state.locale !== undefined) ? state.locale : this.locale
    });
  }
}

export default StandardCalculator;