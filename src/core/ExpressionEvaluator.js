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
 * Convert an angle from the current angle mode to radians for internal calculation.
 * @param {Decimal|number} angle - The angle in the current mode.
 * @returns {Decimal} The angle in radians.
 */
function toRadians(angle) {
  const rad = new Decimal(angle);
  if (angleMode === 'DEG') {
    // Degrees to radians: multiply by π/180
    const pi = new Decimal(Math.PI);
    return rad.mul(pi.div(180));
  } else if (angleMode === 'GRAD') {
    // Gradians to radians: multiply by π/200
    const pi = new Decimal(Math.PI);
    return rad.mul(pi.div(200));
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
 * @param {string} expr - The expression string.
 * @returns {Array} Array of tokens.
 */
function tokenizeExpression(expr) {
  const tokens = [];
  let i = 0;
  const str = String(expr).trim();
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let numStr = '';
      while (i < str.length && (/[\d.]/.test(str[i]))) {
        numStr += str[i];
        i++;
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
      // Convert to radians based on angle mode, then compute sin
      const radians = toRadians(value);
      const result = new Decimal(Math.sin(Number(radians.toString())));
      return result;
    }
    if (token.type === 'FUNC_COS') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after cos');
      const value = parseExpressionTokens();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after cos');
      // Convert to radians based on angle mode, then compute cos
      const radians = toRadians(value);
      const result = new Decimal(Math.cos(Number(radians.toString())));
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
      const result = new Decimal(Math.tan(val));
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
    return parsePostfix();
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
    let left = parseUnary();
    let token = peek();
    while (token && token.type === 'POWER') {
      next();
      const right = parseUnary();
      left = left.pow ? left.pow(right) : new Decimal(Math.pow(Number(left.toString()), Number(right.toString())));
      token = peek();
    }
    return left;
  }
  function parseTerm() {
    let left = parsePower();
    let token = peek();
    while (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
      next();
      const right = parsePower();
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
  for (const tok of tokens) {
    if (out.length > 0) {
      const prev = out[out.length - 1];
      // A previous NUMBER / ')' is a complete operand — a following NUMBER,
      // '(' or sqrt( is implicit multiplication. A POWER ('^') token is NOT an
      // operand-end: "4^2" (x²) must stay "4^2", not "4^*2". Implicit
      // multiplication after a power still works via the exponent NUMBER when a
      // '(' follows, e.g. "2^2(3)" -> "2^2*(3)".
      const endsOperand = prev.type === 'NUMBER' || prev.type === 'RPAREN' || prev.type === 'CONST_PI' || prev.type === 'CONST_E' || prev.type === 'PERCENT' || prev.type === 'FACTORIAL';
      const startsOperand = tok.type === 'NUMBER' || tok.type === 'LPAREN' || tok.type === 'FUNC_SQRT' || tok.type === 'CONST_PI' || tok.type === 'CONST_E';
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