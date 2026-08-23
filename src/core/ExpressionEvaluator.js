/**
 * Shared Expression Evaluator
 * Recursive-descent parser for mathematical expressions.
 * Used by every calculator mode.
 */

import { Decimal } from './Decimal.js';

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
    // Check for sqrt( function name
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        name += str[i];
        i++;
      }
      if (name === 'sqrt') {
        tokens.push({ type: 'FUNC_SQRT', value: name });
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
  function parsePrimary() {
    const token = next();
    if (!token) throw new Error('Unexpected end of expression');
    if (token.type === 'NUMBER') {
      return new Decimal(token.value);
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
      const value = parseTerm();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after sqrt');
      return value.sqrt ? value.sqrt() : new Decimal(Math.sqrt(Number(value.toString())));
    }
    if (token.type === 'PERCENT') {
      // Leading percent not valid
      throw new Error('Unexpected %');
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
    return parsePrimary();
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
 * Evaluate a mathematical expression string.
 * @param {string} expr - The expression to evaluate.
 * @returns {string} The normalized result string.
 */
export function evaluateExpression(expr) {
  const tokens = tokenizeExpression(expr);
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
  return normalized;
}

export default evaluateExpression;