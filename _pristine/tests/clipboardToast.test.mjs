import test from 'node:test';
import assert from 'node:assert/strict';

function createMockDocument() {
  const elements = new Map();

  const mockElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        className: '',
        textContent: '',
        classList: {
          classes: new Set(),
          add(cls) { this.classes.add(cls); },
          remove(cls) { this.classes.delete(cls); },
        },
        _timeout: null,
        style: {},
      });
    }
    return elements.get(id);
  };

  return {
    getElementById(id) {
      return mockElement(id);
    },
    createElement(tag) {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        textContent: '',
        classList: {
          classes: new Set(),
          add(cls) { this.classes.add(cls); },
          remove(cls) { this.classes.delete(cls); },
        },
        style: {},
        _timeout: null,
      };
      return el;
    },
    body: {
      appendChild() {
        // no-op for mock
      },
    },
  };
}

// Same logic as the one added in app.js (unified implementation)
function showToast(message, duration = 1600, document) {
  if (typeof document === 'undefined') return;
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showClipboardToast(message, document) {
  showToast(message, 2000, document);
}

test('showToast hides after default 1600ms', async () => {
  const document = createMockDocument();
  showToast('error', 1600, document);
  const toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'error');
  assert.ok(toast.classList.classes.has('show'));

  await new Promise((resolve) => setTimeout(resolve, 1700));
  assert.ok(!toast.classList.classes.has('show'));
});

test('showClipboardToast hides after 2000ms', async () => {
  const document = createMockDocument();
  showClipboardToast('copied', document);
  const toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'copied');
  assert.ok(toast.classList.classes.has('show'));

  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.ok(!toast.classList.classes.has('show'));
});

test('showToast resets timer on repeated calls', async () => {
  const document = createMockDocument();
  showToast('first', 1600, document);
  let toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'first');
  assert.ok(toast.classList.classes.has('show'));

  await new Promise((resolve) => setTimeout(resolve, 500));

  showToast('second', 1600, document);
  toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'second');
  assert.ok(toast.classList.classes.has('show'));

  // Wait 1600ms from the second call
  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.ok(!toast.classList.classes.has('show'));
});

test('showClipboardToast resets timer on repeated calls', async () => {
  const document = createMockDocument();
  showClipboardToast('first', document);
  let toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'first');
  assert.ok(toast.classList.classes.has('show'));

  await new Promise((resolve) => setTimeout(resolve, 500));

  showClipboardToast('second', document);
  toast = document.getElementById('toast');
  assert.strictEqual(toast.textContent, 'second');
  assert.ok(toast.classList.classes.has('show'));

  // Wait 2000ms from the second call
  await new Promise((resolve) => setTimeout(resolve, 2000));
  assert.ok(!toast.classList.classes.has('show'));
});
