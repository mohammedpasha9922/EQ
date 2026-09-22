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
    // PHASE 37G (Test Point 8 — Parentheses): free-expression mode. When the
    // user has opened a parenthesis, all further digits/operators/parens are
    // accumulated verbatim into state.freeExpression and evaluated with the
    // existing ExpressionEvaluator on `=`. Reuses existing implementation.
    if (state.freeExpression !== null && state.freeExpression !== undefined) {
      let expr = String(state.freeExpression);
      const last = expr.slice(-1);
      if (digit === '.') {
        // Avoid a second decimal point inside the current number segment.
        const seg = expr.match(/(\d*\.?\d*)$/);
        if (seg && seg[1].includes('.')) return;
        if (/[\d)]$/.test(expr) === false && last !== '(' && last !== '' && /[+\-*/^]$/.test(expr) === false && expr !== '') {
          // e.g. "(." -> "(0."
          if (last === '(' || /[+\-*/^]$/.test(expr)) {
            expr += '0';
          } else if (expr === '') {
            expr += '0';
          }
        } else if (expr === '' || /[+\-*/^(]$/.test(expr)) {
          expr += '0';
        }
        state.freeExpression = expr + '.';
      } else {
        // Implicit multiplication: "(2+3)4" -> "(2+3)*4", ")2" -> ")*2",
        // operand-ending postfix/constant tokens ("5!2","50%2","pi2") -> "*2".
        const tailPi = /pi$/.test(expr);
        const tailE = !tailPi && /(^|[^a-zA-Z])e$/.test(expr);
        if ((last === ')' || last === '%' || last === '!' || tailPi || tailE) && /^\d$/.test(digit)) {
          expr += '*';
        }
        state.freeExpression = expr + digit;
      }
      state.hasPressedEquals = false;
      state.startNewNumber = false;
      state.displayValue = state.freeExpression;
      state.expression = state.freeExpression;
      this.refreshDisplay();
      return;
    }
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
  appendParenthesis(p) {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    if (p !== '(' && p !== ')') return;
    state.hasPressedEquals = false;
    // Enter free-expression mode on first '(' and accumulate verbatim.
    if (state.freeExpression === null || state.freeExpression === undefined) {
      if (p === ')') {
        // No open paren yet — start from the current two-operand state so a
        // stray ')' never corrupts state (renders as-is, `=` keeps old path).
        const base = this.buildExpressionString();
        state.freeExpression = (base ? base.replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-') : state.displayValue) + ')';
      } else {
        // Implicit multiplication: "5(" -> "5*(" using current entry.
        let prefix = '';
        if (!state.startNewNumber && state.displayValue !== '0') {
          prefix = String(state.displayValue).replace(/,/g, '');
          if (state.storedValue !== null && state.pendingOperator) {
            prefix = `${String(state.storedValue).replace(/,/g, '')}${state.pendingOperator}${prefix}`;
          }
        } else if (state.storedValue !== null && state.pendingOperator) {
          prefix = `${String(state.storedValue).replace(/,/g, '')}${state.pendingOperator}`;
        }
        // PHASE 39: insert an explicit '*' for implicit multiplication on entry
        // ("2(" -> "2*(", ")(" -> ")*("). Unary minus ("(-5)") is never affected
        // because '-' is not covered by the trailing operand set.
        if (prefix !== '' && /[0-9.)]$/.test(prefix)) prefix += '*';
        state.freeExpression = prefix + '(';
      }
    } else {
      let expr = String(state.freeExpression);
      if (p === '(') {
        // Implicit multiplication: "2(" or ")(" -> insert '*'.
        // PHASE 40: operand-ending tokens pi/e/!/% also trigger it.
        const last = expr.slice(-1);
        const tailPi = /pi$/.test(expr);
        const tailE = !tailPi && /(^|[^a-zA-Z])e$/.test(expr);
        if (/[\d)]$/.test(last) || last === '%' || last === '!' || tailPi || tailE) expr += '*';
        state.freeExpression = expr + '(';
      } else {
        // Only allow ')' when there is an unmatched '(' and it follows a
        // number, ')', constant or postfix token. Otherwise ignore.
        const open = (expr.match(/\(/g) || []).length;
        const close = (expr.match(/\)/g) || []).length;
        const last = expr.slice(-1);
        const tailPi = /pi$/.test(expr);
        const tailE = !tailPi && /(^|[^a-zA-Z])e$/.test(expr);
        if (open > close && (/[\d)]$/.test(last) || last === '%' || last === '!' || tailPi || tailE)) {
          state.freeExpression = expr + ')';
        } else {
          return;
        }
      }
    }
    state.startNewNumber = false;
    state.displayValue = state.freeExpression;
    state.expression = state.freeExpression;
    this.refreshDisplay();
  }

  // ============================================================
  // PHASE 39 — Scientific expression building
  // The SINGLE source of truth for the scientific expression is
  // state.freeExpression. √ / x² / ( / ) all build into that same buffer so
  // displayValue and the expression the evaluator sees on `=` never diverge.
  // ============================================================

  /**
   * Called by the UI layer for scientific expression operations (√ / x² / ( / )).
   * @param {string} value - 'sqrt(' | '^2' | '(' | ')' plus PHASE 40 '^' | 'pi' |
   *   'e' | '!' | '%' | 'negate' | 'reciprocal' (same single freeExpression).
   */
  appendScientific(value) {
    // Delegate trig tokens to appendScientificToken which inserts `name(`
    // into freeExpression (they were previously dropped here, so `sin` `3`
    // `0` `)` produced "30)" instead of "sin(30)").
    if (value === 'sin' || value === 'cos' || value === 'tan' || value === 'asin' || value === 'acos' || value === 'atan') {
      this.appendScientificToken(value);
      return;
    }
    if (value === '^' || value === 'pi' || value === 'e' || value === '!' || value === '%' || value === 'negate' || value === 'reciprocal') {
      this.appendScientificToken(value);
      return;
    }
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    if (value === '(' || value === ')') {
      this.appendParenthesis(value);
      return;
    }
    if (value !== 'sqrt(' && value !== '^2') return;
    this.ensureFreeExpression();
    let expr = String(state.freeExpression);
    if (value === 'sqrt(') {
      expr = this.wrapSqrt(expr);
    } else { // '^2'
      if (expr === '' || /[+\-*/^(]$/.test(expr)) return;
      expr += '^2';
    }
    state.hasPressedEquals = false;
    state.startNewNumber = false;
    state.freeExpression = expr;
    state.displayValue = expr;
    state.expression = expr;
    this.refreshDisplay();
  }

  /**
   * Seed the free-expression buffer from the legacy two-operand state when it is
   * not active yet, so a scientific button can build on exactly what the user
   * already typed. Guarantees one consistent expression source during building.
   */
  ensureFreeExpression() {
    const state = this.state;
    if (state.freeExpression !== null && state.freeExpression !== undefined) return;
    let seed = '';
    if (state.storedValue !== null) {
      seed = String(state.storedValue).replace(/,/g, '');
      if (state.pendingOperator) seed += state.pendingOperator;
      if (!state.startNewNumber && state.displayValue !== '0') {
        seed += String(state.displayValue).replace(/,/g, '');
      }
    } else if (!state.startNewNumber && state.displayValue !== '0') {
      seed = String(state.displayValue).replace(/,/g, '');
    }
    state.freeExpression = seed;
  }

  /**
   * Apply the √ operator to a free expression. If the trailing token is a
   * complete operand (a number or a parenthesized group) wrap it as
   * sqrt(operand) — "9" -> "sqrt(9)", "(9)" -> "sqrt((9))"; never produces
   * "sqrt(9*)". Otherwise open sqrt( for continued typing.
   * @param {string} expr - the current free expression.
   * @returns {string} the transformed expression.
   */
  wrapSqrt(expr) {
    expr = String(expr || '');
    if (expr === '') return 'sqrt(';
    const last = expr.slice(-1);
    if (/[0-9.]$/.test(last)) {
      const m = expr.match(/([0-9.]+)$/);
      const num = m[1];
      return expr.slice(0, expr.length - num.length) + 'sqrt(' + num + ')';
    }
    if (last === ')') {
      let depth = 0;
      for (let i = expr.length - 1; i >= 0; i--) {
        if (expr[i] === ')') depth++;
        else if (expr[i] === '(') {
          depth--;
          if (depth === 0) {
            return expr.slice(0, i) + 'sqrt(' + expr.slice(i) + ')';
          }
        }
      }
    }
    // Ends with an operator or '(' -> open sqrt( for continued typing.
    return expr + 'sqrt(';
  }

  /**
   * Remove the last meaningful token/character from a free expression.
   * Handles power tokens ("4^2" -> "4") and otherwise deletes one trailing char
   * ("12.5" -> "12.", "(2+3)" -> "(2+3", "12+34" -> "12+3").
   * @param {string} expr - the current free expression.
   * @returns {string} the remaining expression.
   */
  freeBackspaceStep(expr) {
    const s = String(expr);
    const sciTails = ['sqrt(', 'pi'];
    for (const t of sciTails) {
      if (s.endsWith(t)) return s.slice(0, -t.length);
    }
    if (/\^2$/.test(s)) return s.slice(0, -2);
    const powerMatch = s.match(/(.+)\^[0-9.]+$/);
    if (powerMatch) return powerMatch[1];
    return s.slice(0, -1);
  }

  /**
   * Called by the UI/event layer and shared KeyboardHandler for operator input.
   * @param {string} op - The operator ('+', '-', '*', '/').
   */
  applyOperator(op) {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    // PHASE 37G (Test Point 8): in free-expression mode append the operator
    // verbatim (replacing a trailing operator, allowing unary minus after
    // '(' or another operator). Reuses evaluateExpression on `=`.
    if (state.freeExpression !== null && state.freeExpression !== undefined) {
      let expr = String(state.freeExpression);
      state.hasPressedEquals = false;
      if (expr === '') {
        state.freeExpression = (op === '-') ? '-' : state.displayValue + op;
      } else if (/[+\-*/^(]$/.test(expr)) {
        if (op === '-' && (/[(+\-*/^]$/.test(expr))) {
          state.freeExpression = expr + '-';
        } else if (/[+\-*/^]$/.test(expr)) {
          state.freeExpression = expr.slice(0, -1) + op;
        } else {
          // expr ends with '(' and op is not unary minus: ignore.
          return;
        }
      } else {
        state.freeExpression = expr + op;
      }
      state.startNewNumber = false;
      state.displayValue = state.freeExpression;
      state.expression = state.freeExpression;
      this.refreshDisplay();
      return;
    }
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
    // PHASE 37G (Test Point 8): free-expression path. Evaluate the verbatim
    // parenthesized expression with the EXISTING ExpressionEvaluator.
    // Incomplete/unbalanced input must never throw a JS error out: on failure
    // keep monolith error behavior (toast + 'Error' display) exactly.
    if (state.freeExpression !== null && state.freeExpression !== undefined) {
      let rawExpr = String(state.freeExpression).replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
      if (!rawExpr) return;
      // PHASE 40 scientific `%`: `<base>*<n>%` means base percent-of (the
      // intended `200*10% = 20`), implemented as base*(n/100) on this exact
      // shape only. Bare `50%` stays postfix (0.5); Percentage panel untouched.
      const sciPct = rawExpr.match(/^(.+)\*([\d.]+)%$/);
      if (sciPct) rawExpr = sciPct[1] + '*(' + sciPct[2] + '%)';
      try {
        const open = (rawExpr.match(/\(/g) || []).length;
        const close = (rawExpr.match(/\)/g) || []).length;
        if (open !== close) throw new Error('Incomplete parentheses');
        if (/[+\-*/^(]$/.test(rawExpr)) throw new Error('Incomplete expression');
        const result = evaluateExpression(rawExpr);
        const historyExpr = rawExpr;
        state.freeExpression = null;
        try { delete state.freeExpression; } catch (e) { /* keep null */ }
        state.storedValue = null;
        state.pendingOperator = null;
        state.displayValue = result;
        state.startNewNumber = true;
        state.hasPressedEquals = true;
        state.expression = `${historyExpr} =`;
        this.refreshDisplay();
        if (this.onAddHistory) {
          this.onAddHistory(historyExpr, result);
        } else if (this.historyEngine) {
          this.historyEngine.add(historyExpr, result);
        }
        if (state.speakerEnabled) {
          if (this.onSpeak) {
            this.onSpeak();
          } else if (this.speech) {
            this.speech.speak(state.displayValue, this.locale);
          }
        }
      } catch (e) {
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
      return;
    }
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
    // PHASE 39: free-expression backspace is token-aware (removes "^2" as a
    // unit, otherwise one trailing char) and always keeps display/expression in
    // sync (same single buffer). Leaving/entering empty buffer restores legacy.
    if (state.freeExpression !== null && state.freeExpression !== undefined) {
      let expr = String(state.freeExpression);
      expr = this.freeBackspaceStep(expr);
      if (!expr) {
        state.freeExpression = null;
        try { delete state.freeExpression; } catch (e) { /* keep null */ }
        state.displayValue = '0';
        state.startNewNumber = true;
        state.storedValue = null;
        state.pendingOperator = null;
        state.expression = '';
        this.refreshDisplay();
        return;
      }
      state.freeExpression = expr;
      state.displayValue = expr;
      state.expression = expr;
      state.startNewNumber = false;
      state.hasPressedEquals = false;
      this.refreshDisplay();
      return;
    }
    // PHASE 39: in the legacy two-operand state, when a second operand has
    // already been typed (e.g. "12+34"), unify into the single free-expression
    // buffer before deleting, so backspace can edit the whole chain
    // ("12+34" -> "12+3") and a later `=` evaluates the full expression.
    if (state.pendingOperator && state.storedValue !== null && !state.startNewNumber && state.displayValue !== '0') {
      const full = String(state.storedValue).replace(/,/g, '') + state.pendingOperator + String(state.displayValue).replace(/,/g, '');
      const next = this.freeBackspaceStep(full);
      if (!next) {
        state.freeExpression = null;
        try { delete state.freeExpression; } catch (e) { /* keep null */ }
        state.displayValue = '0';
        state.startNewNumber = true;
      } else {
        state.freeExpression = next;
        state.displayValue = next;
      }
      state.storedValue = null;
      state.pendingOperator = null;
      state.startNewNumber = false;
      state.hasPressedEquals = false;
      state.expression = state.freeExpression !== null ? String(state.freeExpression) : '';
      this.refreshDisplay();
      return;
    }
    // PHASE 37G (Test Point 14 — Backspace): legacy two-operand state has no
    // full expression buffer, only displayValue + pendingOperator/storedValue.
    // Minimal fix: (1) if typing the second operand, delete one digit;
    // (2) if the second operand is empty (startNewNumber with a pending op),
    // delete the operator itself instead of doing nothing; (3) otherwise
    // delete one digit of the current entry. Never clears the whole op.
    if (state.pendingOperator && state.startNewNumber) {
      state.pendingOperator = null;
      state.displayValue = state.storedValue !== null ? String(state.storedValue) : '0';
      state.storedValue = null;
      state.startNewNumber = false;
      state.expression = this.buildExpressionString();
      this.refreshDisplay();
      return;
    }
    if (state.startNewNumber) return;
    if (state.displayValue.length > 1) {
      state.displayValue = state.displayValue.slice(0, -1);
      // PHASE 39: keep a single trailing '.' after the first backspace so the
      // required decimal sequence "12.5" -> "12." -> "12" works. Guard only
      // against a fully-empty entry (or a lone '-'), never auto-advance the dot.
      if (state.displayValue === '' || state.displayValue === '-') {
        state.displayValue = '0';
        state.startNewNumber = true;
      }
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
    state.freeExpression = null;
    try { delete state.freeExpression; } catch (e) { /* keep null */ }
    state.displayValue = '0';
    state.expression = '';
    state.pendingOperator = null;
    state.storedValue = null;
    state.startNewNumber = true;
    state.hasPressedEquals = false;
    this.refreshDisplay();
  }

  /**
   * PHASE 40 — Scientific extension helpers (single freeExpression source of truth).
   * All scientific keys build the SAME freeExpression buffer evaluated by the
   * SAME shared ExpressionEvaluator; nothing creates a second evaluator/display.
   */
  _sciStartFreeFromTyping() {
    if (!this.state) return null;
    const state = this.state;
    if (state.freeExpression !== null && state.freeExpression !== undefined) {
      return String(state.freeExpression);
    }
    let base = '';
    if (state.hasPressedEquals && state.displayValue !== undefined) {
      base = String(state.displayValue).replace(/,/g, '');
      state.pendingOperator = null;
      state.storedValue = null;
    } else if (!state.startNewNumber && state.displayValue !== undefined && state.displayValue !== '0') {
      // PHASE 40: fold a pending classic `stored op` (e.g. `200*` then `10`)
      // into the single buffer so nothing is lost (`200*10%`).
      const dv = String(state.displayValue).replace(/,/g, '');
      if (state.storedValue !== null && state.storedValue !== undefined && state.pendingOperator) {
        base = String(state.storedValue).replace(/,/g, '') + state.pendingOperator + dv;
        state.pendingOperator = null;
        state.storedValue = null;
      } else {
        base = dv;
      }
    } else if (state.storedValue !== null && state.storedValue !== undefined && state.pendingOperator) {
      base = String(state.storedValue).replace(/,/g, '') + state.pendingOperator;
      state.pendingOperator = null;
      state.storedValue = null;
    } else if (state.storedValue !== null && state.storedValue !== undefined && (state.startNewNumber || state.displayValue === '0')) {
      base = String(state.storedValue).replace(/,/g, '');
      state.pendingOperator = null;
      state.storedValue = null;
    }
    state.freeExpression = base;
    state.displayValue = '0';
    state.startNewNumber = true;
    state.hasPressedEquals = false;
    return base;
  }

  _sciCommit(expr) {
    if (!this.state) return;
    const state = this.state;
    state.freeExpression = expr;
    state.expression = expr;
    state.displayValue = expr === '' ? '0' : expr;
    state.startNewNumber = false;
    state.hasPressedEquals = false;
    this.refreshDisplay();
  }
  _sciNeedsMult(expr, token) {
    if (!expr) return false;
    const last = expr.slice(-1);
    if (token === 'pi' || token === 'e' || token === 'sqrt(' || token === '(') {
      if (/[\d)!%]$/.test(last)) return true;
      // constant tokens end in letters: "...pi"/"...e" also end an operand
      if (last === 'i' && expr.endsWith('pi')) return true;
      if (last === 'e' && /(^|[^a-zA-Z])e$/.test(expr)) return true;
      if (last === ')') return true;
      return false;
    }
    return false;
  }

  appendScientificToken(value) {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    let expr = this._sciStartFreeFromTyping();
    if (expr === null) return;
    if (value === 'sqrt(' || value === '(' || value === ')') {
      this.appendParenthesis(value === 'sqrt(' ? 'sqrt(' : value);
      return;
    }
    if (value === '^2' || value === '^') {
      if (expr === '' || /[+\-*/^(]$/.test(expr)) {
        const dv = String(state.displayValue || '').replace(/,/g, '');
        if (dv && dv !== '0' && /^-?[\d.]+$/.test(dv)) expr += dv;
        else return;
      }
      expr += value;
      this._sciCommit(expr);
      return;
    }
    if (value === 'pi' || value === 'e') {
      const tok = value === 'pi' ? 'pi' : 'e';
      if (this._sciNeedsMult(expr, tok)) expr += '*';
      expr += tok;
      this._sciCommit(expr);
      return;
    }
    if (value === '!') {
      if (expr === '') {
        // PHASE 40: allow `0!` — a lone typed zero is a valid operand even
        // though the seeded buffer shows it as empty.
        const dv0 = String(state.displayValue || '').replace(/,/g, '');
        if (/^0(\.0+)?$/.test(dv0)) expr = '0';
        else return;
      }
      if (/[+\-*/^(]$/.test(expr)) return;
      if (expr.slice(-1) === '!') return;
      expr += '!';
      this._sciCommit(expr);
      return;
    }
    if (value === '%') {
      if (expr === '') {
        // Same lone-zero seeding as factorial (`0%` -> 0).
        const dv0 = String(state.displayValue || '').replace(/,/g, '');
        if (/^0(\.0+)?$/.test(dv0)) expr = '0';
        else return;
      }
      if (/[+\-*/^(]$/.test(expr)) return;
      if (expr.slice(-1) === '%' || expr.slice(-1) === '!') return;
      expr += '%';
      this._sciCommit(expr);
      return;
    }
    if (value === 'negate') { this.toggleSignScientific(); return; }
    if (value === 'reciprocal') { this.applyReciprocalScientific(); return; }
    if (value === 'sin' || value === 'cos' || value === 'tan') {
      expr += value + '(';
      this._sciCommit(expr);
      return;
    }
    if (value === 'asin' || value === 'acos' || value === 'atan') {
      expr += value + '(';
      this._sciCommit(expr);
      return;
    }
    // Angle mode selector - handled separately in app.js
  }

  _sciLastOperandRange(expr) {
    if (!expr) return null;
    let end = expr.length;
    while (end > 0 && (expr[end - 1] === '!' || expr[end - 1] === '%')) end--;
    if (end <= 0) return null;
    // PHASE 40: a trailing constant token (pi/e) is an atomic operand.
    if (expr.slice(0, end).endsWith('pi')) {
      return { start: end - 2, end, core: 'pi' };
    }
    if (/e$/.test(expr.slice(0, end))) {
      return { start: end - 1, end, core: 'e' };
    }
    if (expr[end - 1] === ')') {
      let depth = 1;
      let i = end - 2;
      while (i >= 0 && depth > 0) {
        if (expr[i] === ')') depth++;
        else if (expr[i] === '(') depth--;
        i--;
      }
      const openIdx = i + 1;
      let start = openIdx;
      if (expr.slice(Math.max(0, openIdx - 5), openIdx) === 'sqrt(') start = Math.max(0, openIdx - 5);
      return { start, end, core: expr.slice(start, end) };
    }
    const m = expr.slice(0, end).match(/(\d*\.?\d+)\s*$/);
    if (!m) return null;
    const start = end - m[1].length;
    return { start, end, core: m[1] };
  }

  toggleSignScientific() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    if (state.freeExpression === null || state.freeExpression === undefined) {
      const dv = String(state.displayValue || '0');
      if (state.startNewNumber || dv === '0') {
        if (dv.startsWith('-')) state.displayValue = dv.slice(1);
        else if (dv !== '0') state.displayValue = '-' + dv;
        this.refreshDisplay();
        return;
      }
      this._sciStartFreeFromTyping();
    }
    let expr = String(state.freeExpression || '');
    if (expr === '') {
      const dv = String(state.displayValue || '').replace(/,/g, '');
      expr = dv && dv !== '0' ? dv : '';
      if (expr === '') return;
    }
    const r = this._sciLastOperandRange(expr);
    if (!r) return;
    const before = expr.slice(0, r.start);
    const after = expr.slice(r.end);
    let core = r.core;
    if (/^sqrt\(.*\)$/.test(core)) {
      const inner = core.slice(5, -1);
      const toggled = inner.startsWith('-') ? inner.slice(1) : '-' + inner;
      core = 'sqrt(' + toggled + ')';
    } else if (core.startsWith('(-') && core.endsWith(')')) {
      core = core.slice(2, -1);
    } else if (core.startsWith('-')) {
      core = core.slice(1);
    } else {
      const prevChar = before.slice(-1);
      if ((prevChar === '(' || prevChar === '' || /[+\-*/^]/.test(prevChar)) && !/sqrt\($/.test(before)) {
        core = '-' + core;
      } else {
        core = '(-' + core + ')';
      }
    }
    this._sciCommit(before + core + after);
  }

  applyReciprocalScientific() {
    if (this.feedback) this.feedback();
    if (!this.state) return;
    const state = this.state;
    let expr = this._sciStartFreeFromTyping();
    if (expr === null) return;
    if (expr === '' || /[+\-*/^(]$/.test(expr)) {
      const dv = String(state.displayValue || '').replace(/,/g, '');
      if (dv && /^-?[\d.]+$/.test(dv) && dv !== '0') expr += dv;
      else if (expr === '') expr = '0';
      else return;
    }
    const r = this._sciLastOperandRange(expr);
    if (!r) return;
    const before = expr.slice(0, r.start);
    const after = expr.slice(r.end);
    const core = r.core;
    this._sciCommit(before + '(1/(' + core + '))' + after);
  }

  backspaceScientificToken() {
    const state = this.state;
    if (!state) return false;
    if (state.freeExpression === null || state.freeExpression === undefined) return false;
    let expr = String(state.freeExpression);
    if (expr === '') return true;
    const sciTails = ['sqrt(', 'pi', 'sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan('];
    for (const t of sciTails) {
      if (expr.endsWith(t)) {
        expr = expr.slice(0, -t.length);
        this._sciCommit(expr);
        return true;
      }
    }
    if (/\^2$/.test(expr)) {
      expr = expr.slice(0, -2);
      this._sciCommit(expr);
      return true;
    }
    expr = expr.slice(0, -1);
    this._sciCommit(expr);
    return true;
  }


  /**
   * Build doc.
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
    // A COMPUTED RESULT (after `=`) is rounded for display only (max 4 decimals
    // on the number, 2 on the words), while live typing/operand values stay at
    // full precision. The raw value in state.displayValue is never touched, so
    // history and any downstream calculation keep the exact result.
    const roundResult = state.hasPressedEquals === true;
    this.resultScreen.update({
      primary: state.displayValue,
      expression: state.expression,
      secondary: state.displayValue,
      // Prefer the LIVE locale from the shared app state so the number-to-words
      // secondary display stays in sync when the user changes language. The
      // mode-level `this.locale` is only a snapshot taken at mount time and can
      // go stale after setLanguage(); fall back to it only when state has no
      // locale (as in headless tests).
      locale: (state.locale !== undefined) ? state.locale : this.locale,
      round: roundResult
    });
  }
}

export default StandardCalculator;