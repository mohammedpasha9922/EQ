/**
 * Shared Expression Evaluator
 * Recursive-descent parser for mathematical expressions.
 * Used by every calculator mode.
 */

import { Decimal } from './Decimal.js';

/**
 * Angle mode for trigonometric functions.
 * Default is DEG (degrees).
 */
let angleMode = 'DEG'; // 'DEG' | 'RAD' | 'GRAD'

/**
 * Get the current angle mode.
 * @returns {string} The current angle mode.
 */
export function getAngleMode() {
  return angleMode;
}

/**
 * Set the angle mode for trigonometric functions.
 * @param {string} mode - The angle mode: 'DEG', 'RAD', or 'GRAD'.
 */
export function setAngleMode(mode) {
  if (mode === 'DEG' || mode === 'RAD' || mode === 'GRAD') {
    angleMode = mode;
  }
}

/**
 * Snap near-exact trigonometric results to clean landmarks:
 * e.g. 0, ±0.5, ±1, ±(√3/2), ±(√2/2), etc.
 * Avoids 0.49999999999999994 or 1e-16 when computing sin(30°), sin(180°), etc.
 * Uses a tight epsilon of 1e-12 so true numbers are not corrupted.
 * @param {number} val
 * @returns {number}
 */
function snapTrig(val) {
  if (Math.abs(val) < 1e-12) return 0;
  if (Math.abs(val - 1) < 1e-12) return 1;
  if (Math.abs(val + 1) < 1e-12) return -1;
  if (Math.abs(val - 0.5) < 1e-12) return 0.5;
  if (Math.abs(val + 0.5) < 1e-12) return -0.5;
  const sqrt3_2 = Math.sqrt(3) / 2;
  if (Math.abs(val - sqrt3_2) < 1e-12) return sqrt3_2;
  if (Math.abs(val + sqrt3_2) < 1e-12) return -sqrt3_2;
  const sqrt2_2 = Math.SQRT1_2;
  if (Math.abs(val - sqrt2_2) < 1e-12) return sqrt2_2;
  if (Math.abs(val + sqrt2_2) < 1e-12) return -sqrt2_2;
  return val;
}

/**
 * Convert an angle from the current angle mode to radians for internal calculation.
 * @param {Decimal|number} angle - The angle in the current mode.
 * @returns {Decimal} The angle in radians.
 */
function toRadians(angle) {
  const rad = new Decimal(angle);
  if (angleMode === 'DEG') {
    // Degrees to radians: multiply by π/180. Use full-precision Number
    // arithmetic here (NOT the 12-digit fallback cleanup): the radian value
    // feeds Math.sin/cos/tan directly, and pre-rounding it to 12 digits
    // injects ~1e-12 rad error (sin(30°) -> 0.4999999999988751).
    const radNum = Number(rad.toString()) * Math.PI / 180;
    return new Decimal(String(radNum));
  } else if (angleMode === 'GRAD') {
    // Gradians to radians: multiply by π/200 (same full-precision note).
    const radNum = Number(rad.toString()) * Math.PI / 200;
    return new Decimal(String(radNum));
  }
  // RAD: already in radians
  return rad;
}

/**
 * Convert an angle from radians to the current angle mode for inverse functions.
 * @param {Decimal} radians - The angle in radians.
 * @returns {Decimal} The angle in the current mode.
 */
function fromRadians(radians) {
  if (angleMode === 'DEG') {
    // Radians to degrees: multiply by 180/π
    const pi = new Decimal(Math.PI);
    return radians.mul(180).div(pi);
  } else if (angleMode === 'GRAD') {
    // Radians to gradians: multiply by 200/π
    const pi = new Decimal(Math.PI);
    return radians.mul(200).div(pi);
  }
  // RAD: already in radians
  return new Decimal(radians);
}

/**
 * Tokenize an expression string into tokens.
 * Normalizes UI symbols (× ÷ − π) so direct evaluator calls and the
 * button-built buffer behave identically. Rejects malformed numbers
 * (multiple decimal points) instead of silently accepting them.
 * @param {string} expr - The expression string.
 * @returns {Array} Array of tokens.
 */
function tokenizeExpression(expr) {
  const tokens = [];
  let i = 0;
  // SCOPE-LOCKED normalization: only Calculation Engine input symbols.
  // Buttons already convert × ÷ − before calling; this makes direct calls
  // (tests, chaining) behave identically. No UI/display change.
  const str = String(expr)
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .trim();
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let numStr = '';
      while (i < str.length && (/[\d.]/.test(str[i]))) {
        numStr += str[i];
        i++;
      }
      // Strict decimal validation: ".", "1.2.3" are syntax errors -> Error.
      if (!/^(?:\d+\.?\d*|\.\d+)$/.test(numStr)) {
        throw new Error(`Invalid number: ${numStr}`);
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }
    if (ch === '+' || ch === '-') {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }
    if (ch === '*' || ch === '/') {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }
    if (ch === '^') {
      tokens.push({ type: 'POWER', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch });
      i++;
      continue;
    }
    if (ch === '%') {
      tokens.push({ type: 'PERCENT', value: ch });
      i++;
      continue;
    }
    if (ch === '!') {
      tokens.push({ type: 'FACTORIAL', value: ch });
      i++;
      continue;
    }
    // Check for function names and constants
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        name += str[i];
        i++;
      }
      if (name === 'sqrt') {
        tokens.push({ type: 'FUNC_SQRT', value: name });
      } else if (name === 'sin') {
        tokens.push({ type: 'FUNC_SIN', value: name });
      } else if (name === 'cos') {
        tokens.push({ type: 'FUNC_COS', value: name });
      } else if (name === 'tan') {
        tokens.push({ type: 'FUNC_TAN', value: name });
      } else if (name === 'asin') {
        tokens.push({ type: 'FUNC_ASIN', value: name });
      } else if (name === 'acos') {
        tokens.push({ type: 'FUNC_ACOS', value: name });
      } else if (name === 'atan') {
        tokens.push({ type: 'FUNC_ATAN', value: name });
      } else if (name === 'pi') {
        tokens.push({ type: 'CONST_PI', value: name });
      } else if (name === 'e') {
        tokens.push({ type: 'CONST_E', value: name });
      } else {
        throw new Error(`Unknown function: ${name}`);
      }
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

/**
 * Parse tokens into a Decimal result.
 * @param {Array} tokens - The tokens to parse.
 * @returns {Decimal} The evaluated result.
 */
function parseExpression(tokens) {
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function next() {
    return tokens[pos++];
  }
  function factorialOf(dec) {
    // PHASE 40: only non-negative integers; decimals/negatives are a clean
    // Error (no Gamma). Normalize Decimal output ("5.0", "1e+2") before check.
    let s = String(dec.toString());
    if (/[eE]/.test(s)) {
      const n0 = Number(s);
      if (!Number.isFinite(n0) || !Number.isInteger(n0)) throw new Error('Factorial only defined for non-negative integers');
      s = String(n0);
    }
    if (/\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
    if (!/^\d+$/.test(s)) throw new Error('Factorial only defined for non-negative integers');
    const n = Number(s);
    if (!Number.isSafeInteger(n)) throw new Error('Factorial input too large');
    // PHASE 40: guard huge factorials so the UI never hangs/crashes.
    if (n > 170) throw new Error('Factorial result too large');
    let acc = 1;
    for (let k = 2; k <= n; k++) acc *= k;
    return new Decimal(acc);
  }
  function parsePrimary() {
    const token = next();
    if (!token) throw new Error('Unexpected end of expression');
    if (token.type === 'NUMBER') {
      return new Decimal(token.value);
    }
    if (token.type === 'CONST_PI') {
      return new Decimal(Math.PI.toString());
    }
    if (token.type === 'CONST_E') {
      return new Decimal(Math.E.toString());
    }
    if (token.type === 'LPAREN') {
      const value = parseExpressionTokens();
      const closing = next();
      if (!closing || closing.type !== 'RPAREN') throw new Error('Missing closing parenthesis');
      return value;
    }
    if (token.type === 'FUNC_SQRT') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after sqrt');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after sqrt');
      return value.sqrt ? value.sqrt() : new Decimal(Math.sqrt(Number(value.toString())));
    }
    if (token.type === 'FUNC_SIN') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after sin');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after sin');
      // Convert to radians based on angle mode, then compute sin.
      // Snap near-exact float noise (sin(30°) = 0.49999999999999994) to the
      // exact value so DEG/GRAD landmarks display cleanly. Tolerance 1e-12
      // only touches float dust, never genuine digits.
      const radians = toRadians(value);
      const sinV = Math.sin(Number(radians.toString()));
      const result = new Decimal(snapTrig(sinV));
      return result;
    }
    if (token.type === 'FUNC_COS') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after cos');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after cos');
      // Convert to radians based on angle mode, then compute cos (same snap).
      const radians = toRadians(value);
      const cosV = Math.cos(Number(radians.toString()));
      const result = new Decimal(snapTrig(cosV));
      return result;
    }
    if (token.type === 'FUNC_TAN') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after tan');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after tan');
      // Convert to radians based on angle mode, then compute tan
      const radians = toRadians(value);
      const val = Number(radians.toString());
      // Handle tan near π/2 + kπ (undefined)
      const eps = 1e-10;
      if (Math.abs(Math.abs(val % Math.PI) - Math.PI / 2) < eps) {
        throw new Error('tan is undefined for this angle');
      }
      const result = new Decimal(snapTrig(Math.tan(val)));
      return result;
    }
    if (token.type === 'FUNC_ASIN') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after asin');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after asin');
      const val = Number(value.toString());
      // Domain check for asin: -1 ≤ x ≤ 1
      if (val < -1 || val > 1) {
        throw new Error('asin domain error: value must be between -1 and 1');
      }
      // Compute asin in radians, then convert to current angle mode
      const radians = new Decimal(Math.asin(val));
      const result = fromRadians(radians);
      return result;
    }
    if (token.type === 'FUNC_ACOS') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after acos');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after acos');
      const val = Number(value.toString());
      // Domain check for acos: -1 ≤ x ≤ 1
      if (val < -1 || val > 1) {
        throw new Error('acos domain error: value must be between -1 and 1');
      }
      // Compute acos in radians, then convert to current angle mode
      const radians = new Decimal(Math.acos(val));
      const result = fromRadians(radians);
      return result;
    }
    if (token.type === 'FUNC_ATAN') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after atan');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after atan');
      // Compute atan in radians, then convert to current angle mode
      const radians = new Decimal(Math.atan(Number(value.toString())));
      const result = fromRadians(radians);
      return result;
    }
    if (token.type === 'PERCENT') {
      // Leading percent not valid
      throw new Error('Unexpected %');
    }
    if (token.type === 'FACTORIAL') {
      throw new Error('Unexpected !');
    }
    throw new Error(`Unexpected token: ${token.type}`);
  }
  function parseUnary() {
    const token = peek();
    if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      next();
      const operand = parseUnary();
      if (token.value === '-') return operand.neg ? operand.neg() : new Decimal(-Number(operand.toString()));
      return operand;
    }
    return parsePower();
  }
  // PHASE 40: postfix `%` and `!` bind to the immediately-preceding operand
  // (postfix precedence, above unary/power): `50%` -> 50/100, `5!` -> 120.
  function parsePostfix() {
    let value = parsePrimary();
    for (;;) {
      const t = peek();
      if (t && t.type === 'FACTORIAL') {
        next();
        value = factorialOf(value);
        continue;
      }
      if (t && t.type === 'PERCENT') {
        next();
        value = value.div(new Decimal(100));
        continue;
      }
      return value;
    }
  }
  function parsePower() {
    // POWER is right-associative and binds tighter than unary minus:
    // "2^3^2" = 2^(3^2) = 512; "-2^2" = -(2^2) = -4.
    const base = parsePostfix();
    const token = peek();
    if (token && token.type === 'POWER') {
      next();
      const exponent = parseUnary();
      return base.pow ? base.pow(exponent) : new Decimal(Math.pow(Number(base.toString()), Number(exponent.toString())));
    }
    return base;
  }
  function parseTerm() {
    let left = parseUnary();
    let token = peek();
    while (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
      next();
      const right = parseUnary();
      if (token.value === '*') {
        left = left.mul(right);
      } else {
        left = left.div(right);
      }
      token = peek();
    }
    return left;
  }
  function parseExpressionTokens() {
    let left = parseTerm();
    let token = peek();
    while (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      next();
      const right = parseTerm();
      if (token.value === '+') {
        left = left.add(right);
      } else {
        left = left.sub(right);
      }
      token = peek();
    }
    return left;
  }
  const result = parseExpressionTokens();
  if (pos < tokens.length) {
    // A trailing binary operator means incomplete input; a leftover OPERATOR
    // where an operand was expected is a syntax error. Both surface as
    // 'Error' via the caller's catch — never a JS crash.
    throw new Error('Unexpected tokens at end of expression');
  }
  return result;
}

/**
 * Insert explicit '*' tokens for implicit multiplication between adjacent
 * operand tokens: "2(3)" -> "2*(3)", ")( " -> ")*(" , "2)3" -> "2)*3",
 * "2sqrt(9)" -> "2*sqrt(9)". Unary minus is untouched (it is a leading
 * OPERATOR handled by parseUnary, never two operands side by side).
 * @param {Array} tokens - The tokenized tokens.
 * @returns {Array} Tokens with implicit-multiplication '*' operators inserted.
 */
function implicitMultiplyTokens(tokens) {
  const out = [];
  // FUNC_* tokens also start an operand: "2sin(30)" -> "2*sin(30)".
  const isFuncTok = (t) => t && typeof t.type === 'string' && t.type.startsWith('FUNC_');
  for (const tok of tokens) {
    if (out.length > 0) {
      const prev = out[out.length - 1];
      // A previous NUMBER / ')' is a complete operand — a following NUMBER,
      // '(' or sqrt( is implicit multiplication. A POWER ('^') token is NOT an
      // operand-end: "4^2" (x²) must stay "4^2", not "4^*2". Implicit
      // multiplication after a power still works via the exponent NUMBER when a
      // '(' follows, e.g. "2^2(3)" -> "2^2*(3)".
      const endsOperand = prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'CONST_PI' || prev.type === 'CONST_E' || prev.type === 'PERCENT' || prev.type === 'FACTORIAL';
      const startsOperand = tok.type === 'NUMBER' || tok.type === 'LPAREN' || tok.type === 'FUNC_SQRT' || isFuncTok(tok) || tok.type === 'CONST_PI' || tok.type === 'CONST_E';
      if (endsOperand && startsOperand) {
        out.push({ type: 'OPERATOR', value: '*' });
      }
    }
    out.push(tok);
  }
  return out;
}

/**
 * Evaluate a mathematical expression string.
 * @param {string} expr - The expression to evaluate.
 * @returns {string} The normalized result string.
 */
export function evaluateExpression(expr) {
  const tokens = implicitMultiplyTokens(tokenizeExpression(expr));
  const result = parseExpression(tokens);
  const num = result.toString();
  // Normalize decimal output
  let normalized = num;
  if (num.includes('e') || num.includes('E')) {
    try {
      normalized = new Decimal(num).toFixed();
    } catch (e) {
      normalized = num;
    }
  }
  // Remove trailing zeros in decimal
  if (normalized.includes('.')) {
    normalized = normalized.replace(/\.?0+$/, '');
    if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
  }
  if (normalized === '-0') return '0';
  // Unified result / error handling: invalid mathematical results become Error.
  // Valid zero (0, -0, 0.0) is a real result and must NOT become Error.
  const numValue = Number(normalized);
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
    return 'Error';
  }
  return normalized;
}

export default evaluateExpression;