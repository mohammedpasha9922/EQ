/**
 * Phase 1 Verification Script
 * Confirms the new shared architecture loads without circular dependency errors
 * and that existing functionality remains intact.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Verify core shared modules load correctly
import { Decimal } from '../src/core/Decimal.js';
import { numberToWords, getSupportedLocales } from '../src/core/NumberToWords.js';
import { evaluateExpression } from '../src/core/ExpressionEvaluator.js';
import { getResultScreen } from '../src/core/ResultScreen.js';
import { getSpeechEngine } from '../src/core/SpeechEngine.js';
import { getClipboardEngine } from '../src/core/ClipboardEngine.js';
import { getHistoryEngine } from '../src/core/HistoryEngine.js';
import { getKeyboardHandler } from '../src/core/KeyboardHandler.js';
import { getDisplayRenderer } from '../src/core/DisplayRenderer.js';
import { getCalculatorManager } from '../src/CalculatorManager.js';
import StandardCalculator from '../src/modes/StandardCalculator.js';

test('Shared Decimal module loads', () => {
  const a = new Decimal('0.1');
  const b = new Decimal('0.2');
  assert.equal(Number(a.add(b).toString()), 0.30000000000000004);
});

test('Shared NumberToWords engine works', () => {
  assert.equal(numberToWords('1573', 'ar'), 'ألف وخمسمائة وثلاثة وسبعون');
  assert.equal(numberToWords('1573', 'tr'), 'Bin beş yüz yetmiş üç');
  assert.equal(numberToWords('5', 'en'), 'five');
  assert.ok(getSupportedLocales().includes('en'));
});

test('Shared ExpressionEvaluator works', () => {
  assert.equal(evaluateExpression('sqrt(9)'), '3');
  assert.equal(evaluateExpression('2^3'), '8');
  assert.equal(evaluateExpression('(2+3)*4'), '20');
});

test('Shared service singletons return consistent instances', () => {
  assert.equal(getResultScreen(), getResultScreen());
  assert.equal(getSpeechEngine(), getSpeechEngine());
  assert.equal(getClipboardEngine(), getClipboardEngine());
  assert.equal(getHistoryEngine(), getHistoryEngine());
  assert.equal(getKeyboardHandler(), getKeyboardHandler());
  assert.equal(getDisplayRenderer(), getDisplayRenderer());
  assert.equal(getCalculatorManager(), getCalculatorManager());
});

test('CalculatorManager registers and switches modes', () => {
  const manager = getCalculatorManager();
  const sc = new StandardCalculator();
  manager.registerMode('general', sc);
  manager.switchMode('general');
  assert.equal(manager.getActiveModeName(), 'general');
});