/**
 * Large-Number Expression Regression Tests
 *
 * Guards against the correctness bug where display-formatting thousands
 * separators (commas) leaked into the mathematical evaluator, causing large
 * numbers like 1,500 to produce "Error".
 *
 * The rule under test: DISPLAY formatting is separated from CALCULATION data.
 * The standard calculator's display expression keeps its commas (e.g. "1,500 + 2")
 * while the evaluator receives a clean numeric expression.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import StandardCalculator from '../src/modes/StandardCalculator.js';
import { getResultScreen } from '../src/core/ResultScreen.js';

/**
 * Drive the StandardCalculator's handleEquals() through a state that mirrors a
 * user typing "<acc> <op> <rhs>" then pressing "=". A ResultScreen is mounted so
 * buildExpressionString() inserts real thousands separators (exactly as the UI
 * would), reproducing the comma-formatted expression path.
 */
function runEquals(acc, op, rhs) {
  const sc = new StandardCalculator();
  sc.resultScreen = getResultScreen();
  sc.state = {
    displayValue: String(rhs),
    expression: '',
    pendingOperator: op,
    storedValue: String(acc),
    startNewNumber: false,
    hasPressedEquals: false
  };
  sc.handleEquals();
  return sc;
}

test('large numbers with thousands separators evaluate correctly', () => {
  // 1500 + 2 = 1502
  assert.equal(runEquals(1500, '+', 2).state.displayValue, '1502');
  // 150000 + 250000 = 400000
  assert.equal(runEquals(150000, '+', 250000).state.displayValue, '400000');
  // 1000 x 2 = 2000
  assert.equal(runEquals(1000, '*', 2).state.displayValue, '2000');
  // 1500 / 3 = 500
  assert.equal(runEquals(1500, '/', 3).state.displayValue, '500');
  // 999999 + 1 = 1000000
  assert.equal(runEquals(999999, '+', 1).state.displayValue, '1000000');
});

test('display keeps thousands separators while evaluation is clean', () => {
  const sc = runEquals(1500, '+', 2);
  // The expression rendered for display/history retains its commas and "=".
  assert.equal(sc.state.expression, '1,500 + 2 =');
  assert.equal(sc.state.displayValue, '1502');
});

test('decimal, negative and chained large-number behavior preserved', () => {
  // Decimal operand: 1500 + 0.5 = 1500.5
  assert.equal(runEquals(1500, '+', 0.5).state.displayValue, '1500.5');
  // Negative stored operand: -1500 + 2 = -1498
  assert.equal(runEquals(-1500, '+', 2).state.displayValue, '-1498');
  // Chained operation step: (1500+2) + 3 = 1505
  assert.equal(runEquals(1502, '+', 3).state.displayValue, '1505');
});
