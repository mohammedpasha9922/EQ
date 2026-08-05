/**
 * Currency Service Tests
 * Tests for the professional currency conversion system
 */

import CurrencyService from '../currencyService.js';

// Mock localStorage
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

// Mock fetch
global.fetch = async (url) => {
  // Simulate successful API response
  return {
    ok: true,
    status: 200,
    json: async () => ({
      base: 'USD',
      result: 'success',
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.50,
        IQD: 1310.50,
        EGP: 30.90,
        JOD: 0.709,
        TRY: 32.15,
        CHF: 0.88,
        CAD: 1.36,
        AUD: 1.52
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

async function runTests() {
  console.log('\n=== Currency Service Tests ===\n');

  // Test 1: Initialize currency service
  test('Currency service initializes successfully', async () => {
    const state = await CurrencyService.initializeCurrencyService();
    assert(state !== null, 'State should not be null');
    assert(Array.isArray(state.catalog), 'Catalog should be an array');
    assert(typeof state.rates === 'object', 'Rates should be an object');
  });

  // Test 2: Currency catalog is loaded
  test('Currency catalog is loaded from API', async () => {
    await CurrencyService.initializeCurrencyService();
    const catalog = CurrencyService.getCatalog();
    assert(catalog.length > 0, 'Catalog should not be empty');
    assert(catalog.length >= 6, 'Catalog should have at least 6 currencies');
  });

  // Test 3: Currency search functionality
  test('Currency search works correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    // Search by code
    const usdResults = CurrencyService.searchCurrencies('USD');
    assert(usdResults.some(c => c.code === 'USD'), 'Should find USD by code');
    
    // Search by country
    const iraqResults = CurrencyService.searchCurrencies('Iraq');
    assert(iraqResults.some(c => c.code === 'IQD'), 'Should find IQD by country name');
    
    // Search by currency name
    const dinarResults = CurrencyService.searchCurrencies('Dinar');
    assert(dinarResults.some(c => c.code === 'IQD'), 'Should find IQD by currency name');
  });

  // Test 4: Currency conversion
  test('Currency conversion calculates correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    // Convert 100 USD to EUR (rate ~0.92)
    const eurResult = CurrencyService.convertCurrency('100', 'USD', 'EUR');
    assert(eurResult > 0, 'Conversion result should be positive');
    assert(Math.abs(eurResult - 92) < 1, 'EUR conversion should be approximately 92');
    
    // Convert same currency
    const usdResult = CurrencyService.convertCurrency('100', 'USD', 'USD');
    assert(usdResult === 100, 'Same currency conversion should return same amount');
  });

  // Test 5: Exchange rate retrieval
  test('Exchange rates are retrieved correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    const usdRate = CurrencyService.getExchangeRate('USD');
    assert(usdRate === 1, 'USD rate should be 1');
    
    const eurRate = CurrencyService.getExchangeRate('EUR');
    assert(eurRate > 0, 'EUR rate should be positive');
  });

  // Test 6: Favorites functionality
  test('Favorites system works correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    // Add to favorites
    CurrencyService.addToFavorites('USD');
    assert(CurrencyService.isFavorite('USD'), 'USD should be in favorites');
    
    // Get favorites
    const favorites = CurrencyService.getFavorites();
    assert(favorites.some(f => f.code === 'USD'), 'Favorites list should contain USD');
    
    // Remove from favorites
    CurrencyService.removeFromFavorites('USD');
    assert(!CurrencyService.isFavorite('USD'), 'USD should not be in favorites after removal');
  });

  // Test 7: Recent currencies functionality
  test('Recent currencies system works correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    // Add to recent
    CurrencyService.addToRecent('EUR');
    CurrencyService.addToRecent('GBP');
    
    const recent = CurrencyService.getRecent();
    assert(recent.some(r => r.code === 'EUR'), 'Recent should contain EUR');
    assert(recent.some(r => r.code === 'GBP'), 'Recent should contain GBP');
  });

  // Test 8: Caching functionality
  test('Caching system works correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    // Check that data is cached
    const cachedRates = localStorage.getItem('eq-currency-rates');
    assert(cachedRates !== null, 'Rates should be cached');
    
    const cachedCatalog = localStorage.getItem('eq-currency-catalog');
    assert(cachedCatalog !== null, 'Catalog should be cached');
  });

  // Test 9: Currency metadata
  test('Currency metadata is complete', async () => {
    await CurrencyService.initializeCurrencyService();
    const catalog = CurrencyService.getCatalog();
    
    const usd = catalog.find(c => c.code === 'USD');
    assert(usd !== undefined, 'USD should be in catalog');
    assert(usd.code === 'USD', 'Currency code should match');
    assert(usd.name.length > 0, 'Currency name should not be empty');
    assert(usd.country.length > 0, 'Country name should not be empty');
    assert(usd.flag.length > 0, 'Flag should not be empty');
  });

  // Test 10: Error handling
  test('Error handling works gracefully', async () => {
    // Test with invalid amount
    const result = CurrencyService.convertCurrency('invalid', 'USD', 'EUR');
    assert(result === 0, 'Invalid amount should return 0');
    
    // Test with non-existent currency
    const noRateResult = CurrencyService.convertCurrency('100', 'USD', 'XXX');
    assert(noRateResult === 0, 'Non-existent currency should return 0');
  });

  // Test 11: State management
  test('State management is correct', async () => {
    await CurrencyService.initializeCurrencyService();
    const state = CurrencyService.getState();
    
    assert(typeof state.catalog === 'object', 'State should have catalog');
    assert(typeof state.rates === 'object', 'State should have rates');
    assert(typeof state.base === 'string', 'State should have base currency');
    assert(typeof state.favorites === 'object', 'State should have favorites');
    assert(typeof state.recent === 'object', 'State should have recent');
  });

  // Test 12: Rate text formatting
  test('Rate text is formatted correctly', async () => {
    await CurrencyService.initializeCurrencyService();
    
    const rateText = CurrencyService.getRateText('EUR');
    assert(rateText.includes('USD'), 'Rate text should include base currency');
    assert(rateText.includes('EUR'), 'Rate text should include target currency');
  });

  // Print summary
  console.log('\n=== Test Summary ===');
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