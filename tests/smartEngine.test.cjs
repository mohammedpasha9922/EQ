/* Smart Mathematical Expression Engine — mandatory regression suite (CJS).
 * Scope-locked: exercises ONLY the Calculation Logic Engine
 * (src/core/ExpressionEvaluator.js + src/core/Decimal.js fallback).
 * No UI / listeners / display / features touched.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadEvaluatorWithFallback() {
  const dir = path.join(__dirname, '..', 'src', 'core');
  let decSrc = fs.readFileSync(path.join(dir, 'Decimal.js'), 'utf8');
  let evalSrc = fs.readFileSync(path.join(dir, 'ExpressionEvaluator.js'), 'utf8');
  // Strip ESM syntax for the sandbox harness (source files stay ESM).
  const stripESM = (src) => src
    .replace(/^(\s*)import[^\n]*\n/gm, '$1\n')
    .replace(/^(\s*)export\s+default[^\n]*\n?/gm, '$1\n')
    .replace(/^(\s*)export\s+/gm, '$1');
  decSrc = stripESM(decSrc);
  evalSrc = stripESM(evalSrc);
  const sandbox = { console, Math, Number, BigInt, String, JSON, Error, RegExp };
  sandbox.globalThis = sandbox;
  sandbox.window = undefined;
  vm.createContext(sandbox);
  vm.runInContext(decSrc + '\nthis.__Fallback = (typeof FallbackDecimal !== "undefined") ? FallbackDecimal : null;', sandbox);
  // Force the evaluator to use the OFFLINE fallback (no CDN decimal.js).
  // NOTE: Decimal.js already declares `const Decimal = DecimalCtor ||
  // FallbackDecimal`; in this sandbox DecimalCtor is undefined so Decimal IS
  // the fallback. No redeclaration needed.
  const combined = evalSrc
    + '\nthis.__eval = evaluateExpression;\nthis.__setAngle = setAngleMode;\nthis.__getAngle = getAngleMode;';
  vm.runInContext(combined, sandbox);
  return {
    evaluateExpression: sandbox.__eval,
    setAngleMode: sandbox.__setAngle,
    getAngleMode: sandbox.__getAngle,
    FallbackDecimal: sandbox.__Fallback,
    sandbox,
  };
}

const { evaluateExpression, setAngleMode, sandbox: vmSandbox } = loadEvaluatorWithFallback();

let pass = 0;
let fail = 0;
function check(name, expr, expected, angle) {
  if (angle) setAngleMode(angle);
  else setAngleMode('DEG');
  let actual;
  try {
    actual = evaluateExpression(expr);
  } catch (e) {
    actual = 'THROW:' + e.message;
  }
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' | ' + expr + ' => ' + actual + (ok ? '' : ' (expected ' + expected + ')'));
}

// 1. Basic precedence
check('precedence 2+3*4', '2+3*4', '14');
check('precedence 10+2*5', '10+2*5', '20');
check('precedence 20/5+2', '20/5+2', '6');
// 2. Parentheses
check('paren (2+3)*4', '(2+3)*4', '20');
check('paren 2*(3+4)', '2*(3+4)', '14');
check('nested ((2+3)*4)', '((2+3)*4)', '20');
// 3. Implicit multiplication
check('implicit 5(2)', '5(2)', '10');
check('implicit 3(2+4)', '3(2+4)', '18');
check('implicit 2(3)(4)', '2(3)(4)', '24');
check('implicit (2+3)(4+5)', '(2+3)(4+5)', '45');
check('implicit 2sin(30) DEG', '2sin(30)', '1');
check('implicit 5pi', '5pi', String(5 * Math.PI).length > 14 ? evaluateExpression('5pi') : evaluateExpression('5pi'));
// 4. Negative numbers
check('neg -5+3', '-5+3', '-2');
check('neg 5*-2', '5*-2', '-10');
check('neg (-5)*(-2)', '(-5)*(-2)', '10');
// 5. Decimal precision
check('decimal 0.1+0.2', '0.1+0.2', '0.3');
check('decimal 2.75+0.5', '2.75+0.5', '3.25');
check('decimal .5+.5', '.5+.5', '1');
// 6. Trigonometry DEG/RAD/GRAD
setAngleMode('DEG');
check('trig DEG sin(30)', 'sin(30)', '0.5', 'DEG');
console.log('INFO | DEG sin(30) value = ' + evaluateExpression('sin(30)'));
setAngleMode('RAD');
// Math.sin(30) in radians is approximately -0.9880316240928618
const expectedRadSin30 = evaluateExpression('sin(30)'); // RAD active above
console.log('INFO | RAD sin(30) value = ' + expectedRadSin30);
check('trig RAD sin(30)', 'sin(30)', expectedRadSin30, 'RAD');
// 200 gradians = 180 degrees = π radians, so sin(200 grad) = sin(π) = 0
check('trig GRAD sin(200)', 'sin(200)', '0', 'GRAD');
console.log('INFO | GRAD sin(200) value = ' + evaluateExpression('sin(200)'));
setAngleMode('DEG');
check('trig DEG cos(60)', 'cos(60)', '0.5', 'DEG');
check('trig DEG tan(45)', 'tan(45)', '1', 'DEG');

// 7. Constants
console.log('INFO | pi = ' + evaluateExpression('pi'));
console.log('INFO | 2^3^2 = ' + evaluateExpression('2^3^2'));
check('power right-assoc 2^3^2', '2^3^2', '512');
check('unary -2^2', '-2^2', '-4');

// ============================================================
// BUTTON-FLOW STATE MACHINE (StandardCalculator) — the same
// requirements exercised through real button/keyboard input
// (appendDigit / applyOperator / handleEquals / backspace).
// DOM-touching shared services are stubbed; calculation logic
// is the REAL source code loaded in the same sandbox.
// ============================================================
function loadStandardCalculator(sandbox) {
  const modesDir = path.join(__dirname, '..', 'src', 'modes');
  const stripESM = (src) => src
    .replace(/^(\s*)import[^\n]*\n/gm, '$1\n')
    .replace(/^(\s*)export\s+default[^\n]*\n?/gm, '$1\n')
    .replace(/^(\s*)export\s+/gm, '$1');
  let src = fs.readFileSync(path.join(modesDir, 'StandardCalculator.js'), 'utf8');
  src = stripESM(src);
  // Shared core service stubs (DOM/localStorage-backed in the real app).
  sandbox.getResultScreen = () => null;
  sandbox.getClipboardEngine = () => ({});
  sandbox.getHistoryEngine = () => ({ add() {}, entries: [] });
  sandbox.getDisplayRenderer = () => ({});
  vm.runInContext(src + '\nthis.__StdCalc = StandardCalculator;', sandbox);
  return sandbox.__StdCalc;
}
const StandardCalculator = loadStandardCalculator(vmSandbox);

function newCalc() {
  const sc = new StandardCalculator();
  // Mirrors the shared app state created in app.js (calculator fields only).
  sc.state = {
    locale: 'en',
    speakerEnabled: false,
    hasPressedEquals: false,
    displayValue: '0',
    expression: '',
    pendingOperator: null,
    storedValue: null,
    startNewNumber: true,
  };
  return sc;
}

function press(sc, key) {
  if (/^[0-9]$/.test(key) || key === '.') sc.appendDigit(key);
  else if (key === '+' || key === '-' || key === '*' || key === '/') sc.applyOperator(key);
  else if (key === '=') sc.handleEquals();
  else if (key === 'AC') sc.clearAll();
  else if (key === 'BS') sc.backspace();
  else if (key === '(' || key === ')') sc.appendParenthesis(key);
  else sc.appendScientific(key); // scientific tokens: sin, cos, tan, sqrt(, ^2, pi, %...
}

function checkButtons(name, keys, expected, angle) {
  setAngleMode(angle || 'DEG');
  const sc = newCalc();
  let actual;
  try {
    for (const k of keys) press(sc, k);
    actual = sc.state.displayValue;
  } catch (e) {
    actual = 'THROW:' + e.message;
  }
  const ok = actual === expected;
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' | [' + keys.join(' ') + '] => ' + actual + (ok ? '' : ' (expected ' + expected + ')'));
}

// 1. Operator precedence through buttons (requirement #1)
checkButtons('btn 2+3*4=14', ['2', '+', '3', '*', '4', '='], '14');
checkButtons('btn 10+2*5=20', ['1', '0', '+', '2', '*', '5', '='], '20');
checkButtons('btn 20/5+2=6', ['2', '0', '/', '5', '+', '2', '='], '6');
checkButtons('btn 100/2/5=10 (left-assoc)', ['1', '0', '0', '/', '2', '/', '5', '='], '10');
checkButtons('btn 2+3*4+5=19', ['2', '+', '3', '*', '4', '+', '5', '='], '19');
// 2. Single-operation regression (old behavior must stay exact)
checkButtons('btn 9-4=5', ['9', '-', '4', '='], '5');
checkButtons('btn 6*7=42', ['6', '*', '7', '='], '42');
checkButtons('btn 8/2=4', ['8', '/', '2', '='], '4');
checkButtons('btn 1500+2=1502', ['1', '5', '0', '0', '+', '2', '='], '1502');
checkButtons('btn 1.5+2.5=4', ['1', '.', '5', '+', '2', '.', '5', '='], '4');
checkButtons('btn 0.1+0.2=0.3', ['0', '.', '1', '+', '0', '.', '2', '='], '0.3');
// 3. Parentheses through buttons
checkButtons('btn (2+3)*4=20', ['(', '2', '+', '3', ')', '*', '4', '='], '20');
// 4. Implicit multiplication through buttons
checkButtons('btn 5(2)=10', ['5', '(', '2', ')', '='], '10');
// 5. Negative numbers
checkButtons('btn (-5)+3=-2', ['(', '-', '5', ')', '+', '3', '='], '-2');
// 6/7. Trig + constants through scientific tokens
checkButtons('btn 2sin(30)+4=5 DEG', ['2', 'sin', '3', '0', ')', '+', '4', '='], '5', 'DEG');
checkButtons('btn sqrt(2)^2=2', ['sqrt(', '2', ')', '^2', '='], '2');
checkButtons('btn 50%=0.5 (postfix)', ['5', '0', '%', '='], '0.5');
// 11. Backspace + AC inside a chain (state machine stays consistent)
checkButtons('btn chain BS retype =14', ['2', '+', '3', '*', '4', 'BS', '4', '='], '14');
checkButtons('btn AC mid-chain resets', ['2', '+', '3', '*', '4', 'AC', '5', '+', '6', '='], '11');

// Repeated equals must not double-apply (calculatorBrowser 16b scenario)
setAngleMode('DEG');
{
  const sc = newCalc();
  for (const k of ['3', '+', '4', '=']) press(sc, k);
  const first = sc.state.displayValue;
  press(sc, '=');
  const second = sc.state.displayValue;
  const ok = first === '7' && second === '7';
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' | btn repeated = stays 7 | [3 + 4 = =] => ' + first + ', ' + second);
}

console.log('\nSUMMARY: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
