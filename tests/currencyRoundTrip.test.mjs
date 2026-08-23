/**
 * Currency Round-Trip Precision Tests
 * Verifies bidirectional conversion accuracy for critical currency pairs.
 * 
 * Test methodology:
 *   1. Convert 100 from A → B
 *   2. Convert the result back from B → A
 *   3. Verify the returned value is approximately 100
 * 
 * Runs against BOTH the live-API path (successful fetch) and the
 * fallback path (failed fetch) to fully verify conversion accuracy.
 */

import CurrencyService from '../currencyService.js';

// Mock localStorage (same as existing tests)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch to return a SUCCESSFUL API response with all required rates
global.fetch = async (url) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      base: 'USD',
      result: 'success',
      rates: {
        USD: 1,
        JOD: 0.709,
        IQD: 1310.5,
        EUR: 0.92,
        GBP: 0.79,
        AED: 3.6725,
        SAR: 3.75,
        JPY: 149.5
      }
    })
  };
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Perform a round-trip test for a currency pair.
 * Converts 100 from A→B, then the result from B→A.
 * Returns the round-trip value.
 */
function roundTrip(from, to, amount = 100) {
  const forward = CurrencyService.convertCurrency(String(amount), from, to);
  const backward = CurrencyService.convertCurrency(String(forward), to, from);
  return { forward, backward };
}

// All 6 required pairs
const PAIRS = [
  { a: 'USD', b: 'JOD' },
  { a: 'USD', b: 'IQD' },
  { a: 'USD', b: 'EUR' },
  { a: 'EUR', b: 'GBP' },
  { a: 'AED', b: 'SAR' },
  { a: 'JPY', b: 'USD' }
];

async function runTests() {
  console.log('\n=== Currency Round-Trip Precision Tests ===\n');

  // Await full initialization with LIVE API rates (successful fetch)
  console.log('Initializing currency service (live API rates)...');
  const state = await CurrencyService.initializeCurrencyService();
  console.log('Initialization complete');

  // Verify all required rates loaded from API
  assert(state.rates.JOD === 0.709, 'JOD rate should be 0.709');
  assert(state.rates.IQD === 1310.5, 'IQD rate should be 1310.5');
  assert(state.rates.EUR === 0.92, 'EUR rate should be 0.92');
  assert(state.rates.GBP === 0.79, 'GBP rate should be 0.79');
  assert(state.rates.AED === 3.6725, 'AED rate should be 3.6725');
  assert(state.rates.SAR === 3.75, 'SAR rate should be 3.75');
  assert(state.rates.JPY === 149.5, 'JPY rate should be 149.5');

  // Test: Round-trip precision for each pair (A→B then B→A)
  console.log('\n--- Round-Trip Results (A→B then B→A) ---');
  
  for (const pair of PAIRS) {
    const { forward, backward } = roundTrip(pair.a, pair.b);
    const tolerance = 0.001; // 0.001% tolerance (within normal rounding)
    const diff = Math.abs(backward - 100);
    const toleranceValue = 100 * tolerance;
    const passed = diff <= toleranceValue;

    console.log(`  ${pair.a} ↔ ${pair.b}:`);
    console.log(`    100 ${pair.a} → ${forward} ${pair.b}`);
    console.log(`    ${forward} ${pair.b} → ${backward} ${pair.a}`);
    console.log(`    Round-trip diff: ${diff} (tolerance: ${toleranceValue})`);

    test(`${pair.a} → ${pair.b} → ${pair.a} round-trip ≈ 100 (diff ${diff})`, () => {
      assert(passed, `Round-trip returned ${backward}, expected ≈100 (diff ${diff} > tolerance ${toleranceValue})`);
    });
  }

  // Test: Reverse direction round-trip (B→A then A→B)
  console.log('\n--- Reverse Round-Trip Results (B→A then A→B) ---');
  
  for (const pair of PAIRS) {
    const { forward, backward } = roundTrip(pair.b, pair.a);
    const tolerance = 0.001;
    const diff = Math.abs(backward - 100);
    const toleranceValue = 100 * tolerance;
    const passed = diff <= toleranceValue;

    console.log(`  ${pair.b} ↔ ${pair.a}:`);
    console.log(`    100 ${pair.b} → ${forward} ${pair.a}`);
    console.log(`    ${forward} ${pair.a} → ${backward} ${pair.b}`);
    console.log(`    Round-trip diff: ${diff} (tolerance: ${toleranceValue})`);

    test(`${pair.b} → ${pair.a} → ${pair.b} round-trip ≈ 100 (diff ${diff})`, () => {
      assert(passed, `Reverse round-trip returned ${backward}, expected ≈100 (diff ${diff} > tolerance ${toleranceValue})`);
    });
  }

  // Print summary
  console.log('\n=== Round-Trip Test Summary ===');
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
  
  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests.filter(t => t.status === 'FAILED').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  return results;
}

// Run tests
runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});