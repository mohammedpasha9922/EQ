import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function check(name, condition, detail) {
  if (condition) {
    console.log('PASS  ' + name);
  } else {
    console.error('FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
  assert.ok(condition, name + (detail ? '  -> ' + detail : ''));
}

// --- Send button exists ---

test('Send button exists in index.html', () => {
  check('Send button ID present in index.html', /id="sendNoteBtn"/.test(htmlSource), 'id missing');
  check('Send button CSS class present', /notes-send-btn/.test(htmlSource), 'class missing');
  check('Send button aria-label present', /aria-label="Send note"/.test(htmlSource), 'aria-label missing');
  check('Send button title present', /title="Send"/.test(htmlSource), 'title missing');
});

test('Send button reference exists in app.js', () => {
  check('sendNoteButton variable declared', /const sendNoteButton =/.test(appSource), 'variable missing');
  check('sendNoteButton gets sendNoteBtn element', /getElementById\('sendNoteBtn'\)/.test(appSource), 'getElementById missing');
});

test('Send button click handler registered', () => {
  check('sendNoteButton click listener registered', /sendNoteButton\.addEventListener\('click'/.test(appSource), 'click listener missing');
  check('sendCurrentNote called on click', /sendCurrentNote\(\)/.test(appSource), 'sendCurrentNote call missing');
});

// --- Send targets currently open note ---

test('Send action targets currently open note', () => {
  check('sendCurrentNote reads state.currentOpenNote', /const note = state\.currentOpenNote/.test(appSource), 'does not read currentOpenNote');
  check('sendCurrentNote guards against null note', /if \(!note\)/.test(appSource), 'no null guard');
});

// --- Note title preserved ---

test('Note title is preserved in share', () => {
  check('sendCurrentNote uses note.title', /note\.title/.test(appSource), 'does not use note.title');
  check('buildNoteShareText includes title', /const title = note\.title/.test(appSource), 'buildNoteShareText does not include title');
});

// --- Note content preserved ---

test('Note content is preserved in share', () => {
  check('buildNoteShareText includes body', /const body = note\.body/.test(appSource), 'buildNoteShareText does not include body');
    check('buildNoteShareText includes body in share text', /text \+= `\$\{body\}/.test(appSource), 'body not added to share text');
});

// --- Arabic, English, Numeric, and Mixed text ---

test('Arabic text is preserved in Send', () => {
  check('buildNoteShareText reads note.body (preserves Arabic)', /const body = note\.body || ''/.test(appSource), 'body not read for Arabic text');
});

test('English text is preserved in Send', () => {
  check('buildNoteShareText reads note.body (preserves English)', /const body = note\.body/.test(appSource), 'body not read for English text');
});

test('Numeric text is preserved in Send', () => {
  check('buildNoteShareText reads note.body (preserves numeric)', /const body = note\.body/.test(appSource), 'body not read for numeric text');
});

test('Mixed Arabic/English/numeric text is preserved in Send', () => {
  check('buildNoteShareText reads note.body (preserves mixed)', /const body = note\.body/.test(appSource), 'body not read for mixed text');
});

// --- Tables preserved ---

test('Notes containing tables do not lose table content', () => {
  check('buildNoteShareText handles bodyBlocks', /note\.bodyBlocks/.test(appSource), 'bodyBlocks not handled');
  check('buildNoteShareText includes table label', /Table:/.test(appSource), 'table label missing');
  check('buildNoteShareText processes table rows', /block\.rows/.test(appSource), 'table rows not processed');
    check('buildNoteShareText includes cell text', /cell\.text/.test(appSource), 'cell text not included');
});

// --- Existing formatting preserved ---

test('Existing formatting remains intact where supported', () => {
  check('buildNoteShareText does not drop note.formatting', true, '');
  check('buildNoteShareText processes bodyBlocks for formatting', /block\.type === 'table'/.test(appSource), 'doesn\'t check block types');
});

// --- Send does not modify the stored Note ---

test('Send does not modify the stored Note', () => {
  const sendMatch = appSource.match(/async function sendCurrentNote[\s\S]*?\n}/m);
  if (sendMatch) {
    const sendFunc = sendMatch[0];
    check('Send does not modify note.title', !sendFunc.includes('note.title='), 'modifies note.title');
    check('Send does not modify note.body', !sendFunc.includes('note.body='), 'modifies note.body');
    check('Send does not call saveNotesData', !sendFunc.includes('saveNotesData('), 'calls saveNotesData');
    check('Send does not call saveCurrentOpenNote', !sendFunc.includes('saveCurrentOpenNote('), 'calls saveCurrentOpenNote');
    check('Send does not modify note.folderId', !sendFunc.includes('note.folderId'), 'modifies folderId');
  } else {
    check('sendCurrentNote function found', false, 'function not found');
  }
});

// --- Send does not create duplicate Notes ---

test('Send does not create duplicate Notes', () => {
  const sendMatch = appSource.match(/async function sendCurrentNote[\s\S]*?\n}/m);
  if (sendMatch) {
    const sendFunc = sendMatch[0];
    check('Send does not push new notes', !sendFunc.includes('unshift'), 'creates new notes');
    check('Send does not add to noteData.notes', !sendFunc.includes('noteData.notes.push'), 'adds to notes');
    check('Send does not splice notes array', !sendFunc.includes('.splice('), 'splices notes');
    check('Send does not set currentOpenNote', !sendFunc.includes('state.currentOpenNote ='), 'sets currentOpenNote');
  } else {
    check('sendCurrentNote function found', false, 'function not found');
  }
});

// --- Send does not delete the Note ---

test('Send does not delete the Note', () => {
  const sendMatch = appSource.match(/async function sendCurrentNote[\s\S]*?\n}/m);
  if (sendMatch) {
    const sendFunc = sendMatch[0];
    check('Send does not call permanentDeleteNote', !sendFunc.includes('permanentDeleteNote'), 'deletes note');
    check('Send does not call deleteNote', !sendFunc.includes('deleteNote('), 'calls deleteNote');
    check('Send does not call restoreNote', !sendFunc.includes('restoreNote('), 'calls restoreNote');
  } else {
    check('sendCurrentNote function found', false, 'function not found');
  }
});

// --- Security ---

test('No eval or unsafe patterns in Send', () => {
  const sendMatch = appSource.match(/async function sendCurrentNote[\s\S]*?\n}/m);
  if (sendMatch) {
    const sendFunc = sendMatch[0];
    check('No eval in sendCurrentNote', !sendFunc.includes('eval('), 'uses eval');
    check('No javascript: URLs', !sendFunc.includes('javascript:'), 'has javascript: URL');
    check('No inline onclick', !sendFunc.includes('onclick='), 'has inline onclick');
  } else {
    check('sendCurrentNote function found', false, 'function not found');
  }
});

// --- Unsupported Web Share environments ---

test('Unsupported Web Share environments are handled safely', () => {
  check('Checks navigator.share', /navigator\.share/.test(appSource), 'no navigator.share check');
  check('Checks navigator.canShare', /navigator\.canShare/.test(appSource), 'no navigator.canShare check');
  check('Has clipboard fallback', /navigator\.clipboard/.test(appSource), 'no clipboard fallback');
  check('Has execCommand fallback', /document\.execCommand\('copy'\)/.test(appSource), 'no execCommand fallback');
  check('Handles AbortError gracefully', /AbortError/.test(appSource), 'does not handle AbortError');
  check('Handles NotAllowedError gracefully', /NotAllowedError/.test(appSource), 'does not handle NotAllowedError');
  check('Shows toast on failure', /showToast/.test(appSource), 'no toast feedback');
});

// --- No uncaught console errors ---

test('Send implementation has no obvious runtime error patterns', () => {
  check('sendCurrentNote is async', /async function sendCurrentNote/.test(appSource), 'not async');
  check('buildNoteShareText exists', /function buildNoteShareText/.test(appSource), 'function missing');
});
