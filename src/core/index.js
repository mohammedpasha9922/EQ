/**
 * Shared Core Modules
 * Barrel file re-exporting all shared engine modules used by every calculator mode.
 */

export { Decimal, default as DecimalDefault } from './Decimal.js';
export { numberToWords, getSupportedLocales, default as NumberToWordsEngine } from './NumberToWords.js';
export { getDisplayRenderer, default as DisplayRenderer } from './DisplayRenderer.js';
export { getSpeechEngine, default as SpeechEngine } from './SpeechEngine.js';
export { getClipboardEngine, default as ClipboardEngine } from './ClipboardEngine.js';
export { getHistoryEngine, default as HistoryEngine } from './HistoryEngine.js';
export { getKeyboardHandler, default as KeyboardHandler } from './KeyboardHandler.js';
export { getResultScreen, default as ResultScreen } from './ResultScreen.js';
export { evaluateExpression, default as evaluateExpressionDefault } from './ExpressionEvaluator.js';
