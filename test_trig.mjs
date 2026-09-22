import { evaluateExpression, setAngleMode, getAngleMode } from './src/core/ExpressionEvaluator.js';

console.log('=== PHASE 41 TESTS ===\n');

let passed = 0;
let failed = 0;

function test(name, actual, expected, tolerance = 0.0001) {
  const actualNum = parseFloat(actual);
  const expectedNum = parseFloat(expected);
  const ok = Math.abs(actualNum - expectedNum) < tolerance;
  if (ok) {
    console.log(`PASS: ${name} = ${actual}`);
    passed++;
  } else {
    console.log(`FAIL: ${name} - expected ${expected}, got ${actual}`);
    failed++;
  }
}

// Test DEG mode
setAngleMode('DEG');
console.log('--- DEG MODE ---');
test('sin(30)', evaluateExpression('sin(30)'), '0.5');
test('cos(60)', evaluateExpression('cos(60)'), '0.5');
test('tan(45)', evaluateExpression('tan(45)'), '1');
test('asin(0.5)', evaluateExpression('asin(0.5)'), '30');
test('acos(0.5)', evaluateExpression('acos(0.5)'), '60');
test('atan(1)', evaluateExpression('atan(1)'), '45');

// Test RAD mode
setAngleMode('RAD');
console.log('\n--- RAD MODE ---');
test('sin(pi/2)', evaluateExpression('sin(pi/2)'), '1');
test('cos(pi)', evaluateExpression('cos(pi)'), '-1');
test('tan(pi/4)', evaluateExpression('tan(pi/4)'), '1');
test('asin(0.5)', evaluateExpression('asin(0.5)'), '0.5235987756');
test('acos(0.5)', evaluateExpression('acos(0.5)'), '1.0471975512');
test('atan(1)', evaluateExpression('atan(1)'), '0.7853981634');

// Test GRAD mode
setAngleMode('GRAD');
console.log('\n--- GRAD MODE ---');
test('sin(50)', evaluateExpression('sin(50)'), '1');
test('cos(100)', evaluateExpression('cos(100)'), '-1');
test('tan(50)', evaluateExpression('tan(50)'), '1');
test('asin(1)', evaluateExpression('asin(1)'), '100');
test('acos(0)', evaluateExpression('acos(0)'), '100');
test('atan(1)', evaluateExpression('atan(1)'), '50');

// Test expressions
console.log('\n--- EXPRESSIONS ---');
setAngleMode('DEG');
test('sin(30)+cos(60)', evaluateExpression('sin(30)+cos(60)'), '1');
test('2*sin(30)', evaluateExpression('2*sin(30)'), '1');
test('sin(30)^2', evaluateExpression('sin(30)^2'), '0.25');
test('(sin(30)+cos(60))^2', evaluateExpression('(sin(30)+cos(60))^2'), '1');
test('sin(pi/2)', evaluateExpression('sin(pi/2)'), '1');
test('cos(pi)', evaluateExpression('cos(pi)'), '-1');
test('sqrt(sin(30))', evaluateExpression('sqrt(sin(30))'), '0.7071067812');

// Test domain errors
console.log('\n--- DOMAIN ERRORS ---');
try {
  evaluateExpression('asin(2)');
  console.log('FAIL: asin(2) should throw error');
  failed++;
} catch (e) {
  console.log(`PASS: asin(2) throws error: ${e.message}`);
  passed++;
}

try {
  evaluateExpression('acos(2)');
  console.log('FAIL: acos(2) should throw error');
  failed++;
} catch (e) {
  console.log(`PASS: acos(2) throws error: ${e.message}`);
  passed++;
}

// Test tan edge cases
console.log('\n--- TAN EDGE CASES ---');
try {
  setAngleMode('DEG');
  evaluateExpression('tan(90)');
  console.log('FAIL: tan(90) DEG should throw error');
  failed++;
} catch (e) {
  console.log(`PASS: tan(90) DEG throws error: ${e.message}`);
  passed++;
}

try {
  setAngleMode('RAD');
  evaluateExpression('tan(pi/2)');
  console.log('FAIL: tan(pi/2) RAD should throw error');
  failed++;
} catch (e) {
  console.log(`PASS: tan(pi/2) RAD throws error: ${e.message}`);
  passed++;
}

try {
  setAngleMode('GRAD');
  evaluateExpression('tan(100)');
  console.log('FAIL: tan(100) GRAD should throw error');
  failed++;
} catch (e) {
  console.log(`PASS: tan(100) GRAD throws error: ${e.message}`);
  passed++;
}

console.log(`\n=== RESULTS: ${passed}/${passed+failed} passed ===`);
process.exit(failed > 0 ? 1 : 0);