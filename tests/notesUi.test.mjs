import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuickNoteLabels } from '../app.js';

test('returns localized quick-note labels', () => {
  assert.equal(getQuickNoteLabels('en').title, 'Quick Notes');
  assert.equal(getQuickNoteLabels('ar').title, 'الملاحظات السريعة');
  assert.equal(getQuickNoteLabels('ar').addButton, '+ ملاحظة جديدة');
});

test('new notes translation keys exist in source', async () => {
  const fs = await import('node:fs');
  const content = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const keys = [
    'recentlyDeletedTitle',
    'emptyNotesText',
    'emptyNotesAction',
    'emptyDeletedText',
    'deleteConfirmTitle',
    'deleteConfirmText',
    'cancelBtn',
    'deletePermanentBtn',
    'doneBtn',
    'deleteNoteBtn',
    'restoreBtn'
  ];
  for (const key of keys) {
    assert.match(content, new RegExp(`${key}:\\s*['"]`), `Missing translation key: ${key}`);
  }
});
