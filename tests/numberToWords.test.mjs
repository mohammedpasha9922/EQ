import test from 'node:test';
import assert from 'node:assert/strict';
import { numberToWords } from '../numberToWords.js';

test('Arabic thousand wording avoids "واحد ألف"', () => {
  assert.equal(numberToWords(1573, 'ar'), 'ألف وخمسمائة وثلاثة وسبعون');
});

test('Arabic decimal reading uses a natural conjunction', () => {
  assert.equal(numberToWords(1.5, 'ar'), 'واحد و خمسة');
});

test('Turkish number-to-words conversion is supported', () => {
  assert.equal(numberToWords(1573, 'tr'), 'Bin beş yüz yetmiş üç');
});

// Guards the Currency Converter Number-to-Words fix: the converter passes the
// display string (which contains thousands separators, e.g. "1,250.5") to the
// engine AFTER stripping commas, so the words must match the visible number.
test('Currency Converter words accept a separated plain decimal string', () => {
  // whole number with thousands separators removed -> "1250"
  assert.equal(numberToWords('1250', 'en'), 'one thousand two hundred fifty');
  // decimal with thousands separators removed -> "1250.5"
  assert.equal(numberToWords('1250.5', 'en'), 'one thousand two hundred fifty point five');
  // decimal in Arabic -> "1250.5"
  assert.equal(numberToWords('1250.5', 'ar'), 'ألف ومئتان وخمسون و خمسة');
  // small decimal -> "5.5"
  assert.equal(numberToWords('5.5', 'en'), 'five point five');
});
