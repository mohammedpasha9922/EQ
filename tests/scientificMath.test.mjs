import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression } from '../app.js';

test('supports square roots, powers, and parentheses', () => {
  assert.equal(evaluateExpression('sqrt(9)'), '3');
  assert.equal(evaluateExpression('2^3'), '8');
  assert.equal(evaluateExpression('(2+3)*4'), '20');
});
