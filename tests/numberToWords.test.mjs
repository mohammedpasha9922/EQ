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
