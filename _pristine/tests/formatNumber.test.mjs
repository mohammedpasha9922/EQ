import test from 'node:test';
import assert from 'node:assert/strict';
import { getDisplayRenderer } from '../src/core/DisplayRenderer.js';

/**
 * Guards the display pipeline against crashing when it receives a
 * non-numeric value. With the real decimal.js (loaded in the browser),
 * `new Decimal('sqrt(3)')` throws, which previously crashed the scientific
 * button display path. The renderer must return such strings as-is.
 */
test('formatNumber keeps numeric formatting unchanged', () => {
  const renderer = getDisplayRenderer();
  assert.equal(renderer.formatNumber(1500), '1,500');
  assert.equal(renderer.formatNumber('1500.5'), '1,500.5');
  assert.equal(renderer.formatNumber(0), '0');
  assert.equal(renderer.formatNumber(''), '0');
  assert.equal(renderer.formatNumber(null), '0');
});

test('formatNumber renders non-numeric strings as-is without throwing', () => {
  const renderer = getDisplayRenderer();
  assert.equal(renderer.formatNumber('sqrt(3)'), 'sqrt(3)');
  assert.equal(renderer.formatNumber('3^2'), '3^2');
  assert.equal(renderer.formatNumber('3*('), '3*(');
});
