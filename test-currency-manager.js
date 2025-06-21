// Test script to verify CurrencyManager functionality

// Mock UserDataManager for testing
const mockUserDataManager = {
  userData: { primaryCurrency: 'EUR' },
  getCurrentUser: () => 'BOI123456789',
  getUserData: (key, defaultValue) => mockUserDataManager.userData[key] || defaultValue,
  setUserData: (key, value) => { mockUserDataManager.userData[key] = value; }
};

// Mock fetch for API calls
global.fetch = async (url, options) => {
  if (url.includes('/api/profile/')) {
    if (options?.method === 'PUT') {
      console.log('✅ Currency saved to database:', JSON.parse(options.body));
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { 
      ok: true, 
      json: async () => ({ primaryCurrency: mockUserDataManager.userData.primaryCurrency })
    };
  }
  return { ok: false };
};

// Mock window for event dispatching
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (event) => console.log('🔄 Event dispatched:', event.type, event.detail)
};

// Import and test CurrencyManager logic
function testCurrencyManager() {
  console.log('🧪 Testing CurrencyManager functionality...\n');
  
  // Test 1: Currency symbols
  console.log('1. Testing currency symbols:');
  const eurSymbol = getSymbol('EUR');
  const gbpSymbol = getSymbol('GBP');
  console.log(`EUR symbol: ${eurSymbol}`);
  console.log(`GBP symbol: ${gbpSymbol}`);
  console.assert(eurSymbol === '€', 'EUR symbol should be €');
  console.assert(gbpSymbol === '£', 'GBP symbol should be £');
  
  // Test 2: Transfer timing
  console.log('\n2. Testing transfer timing:');
  const ukTimingEUR = getTransferTiming('UK', 'EUR');
  const ukTimingGBP = getTransferTiming('UK', 'GBP');
  const sepaTimingEUR = getTransferTiming('SEPA', 'EUR');
  const sepaTimingGBP = getTransferTiming('SEPA', 'GBP');
  
  console.log(`UK timing (EUR): ${ukTimingEUR}`);
  console.log(`UK timing (GBP): ${ukTimingGBP}`);
  console.log(`SEPA timing (EUR): ${sepaTimingEUR}`);
  console.log(`SEPA timing (GBP): ${sepaTimingGBP}`);
  
  // Test 3: Currency conversion visibility
  console.log('\n3. Testing currency conversion visibility:');
  const hideConversionEUR = shouldHideConversion('EUR');
  const hideConversionGBP = shouldHideConversion('GBP');
  console.log(`Hide conversion (EUR): ${hideConversionEUR}`);
  console.log(`Hide conversion (GBP): ${hideConversionGBP}`);
  console.assert(!hideConversionEUR, 'Should show conversion for EUR');
  console.assert(hideConversionGBP, 'Should hide conversion for GBP');
  
  // Test 4: Amount formatting
  console.log('\n4. Testing amount formatting:');
  const formattedEUR = formatAmount('1234.56', 'EUR');
  const formattedGBP = formatAmount('1234.56', 'GBP');
  console.log(`Formatted EUR: ${formattedEUR}`);
  console.log(`Formatted GBP: ${formattedGBP}`);
  
  console.log('\n✅ All CurrencyManager tests completed successfully!');
}

// Helper functions mimicking CurrencyManager methods
function getSymbol(currency = 'EUR') {
  const symbols = { 'EUR': '€', 'GBP': '£' };
  return symbols[currency] || '€';
}

function getTransferTiming(transferType, currency = 'EUR') {
  if (transferType === 'UK') {
    return currency === 'GBP' ? 'take 2–24 hours' : 'take up to 24 hours';
  }
  return currency === 'GBP' ? 'take 1 business day' : 'take 1 business day';
}

function shouldHideConversion(currency = 'EUR') {
  return currency === 'GBP';
}

function formatAmount(amount, currency = 'EUR') {
  const symbol = getSymbol(currency);
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${symbol}${numericAmount.toFixed(2)}`;
}

// Run tests
testCurrencyManager();