/**
 * Locale-Sync Regression Test
 *
 * Guards against the display-synchronization bug where the StandardCalculator
 * kept a snapshot of the locale (taken at mount time) and rendered the
 * number-to-words secondary display in that stale language after the user
 * changed the app language.
 *
 * The rule under test: refreshDisplay() must use the LIVE locale from the
 * shared app state (state.locale), because that is what the user actually
 * selected, and not a stale this.locale copy that is only set once.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import StandardCalculator from '../src/modes/StandardCalculator.js';

function captureUpdate() {
  const sc = new StandardCalculator();
  let captured = null;
  sc.resultScreen = {
    update: (options) => { captured = options; },
    formatNumber: (value) => String(value)
  };
  return { sc, getCaptured: () => captured };
}

test('refreshDisplay uses the live state.locale for the words display', () => {
  const { sc, getCaptured } = captureUpdate();
  // Simulate the app: state.locale changed to 'ar', but the mode's mount-time
  // snapshot (this.locale) is still the stale 'en'.
  sc.locale = 'en';
  sc.state = {
    displayValue: '5',
    expression: '5 =',
    pendingOperator: null,
    storedValue: null,
    startNewNumber: true,
    hasPressedEquals: true,
    locale: 'ar'
  };
  sc.refreshDisplay();
  assert.equal(getCaptured().locale, 'ar', 'words display must follow the live app locale');
});

test('refreshDisplay falls back to this.locale when state has no locale', () => {
  const { sc, getCaptured } = captureUpdate();
  sc.locale = 'de';
  sc.state = {
    displayValue: '5',
    expression: '5 =',
    pendingOperator: null,
    storedValue: null,
    startNewNumber: true,
    hasPressedEquals: true
  };
  sc.refreshDisplay();
  assert.equal(getCaptured().locale, 'de', 'headless state without locale falls back to this.locale');
});
