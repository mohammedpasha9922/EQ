import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuickNoteLabels } from '../app.js';

test('returns localized quick-note labels', () => {
  assert.equal(getQuickNoteLabels('en').title, 'Quick Notes');
  assert.equal(getQuickNoteLabels('ar').title, 'الملاحظات السريعة');
  assert.equal(getQuickNoteLabels('ar').addButton, '+ ملاحظة جديدة');
});
