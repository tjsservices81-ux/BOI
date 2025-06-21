export type Currency = 'EUR' | 'GBP';

export interface CurrencyFormat {
  symbol: string;
  code: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyFormat> = {
  EUR: {
    symbol: '€',
    code: 'EUR',
    name: 'Euro'
  },
  GBP: {
    symbol: '£',
    code: 'GBP',
    name: 'British Pound'
  }
};

export const formatCurrency = (amount: string | number, currency: Currency = 'EUR'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const currencyInfo = CURRENCIES[currency];
  
  // Format with proper locale and currency symbol
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

export const getCurrencySymbol = (currency: Currency = 'EUR'): string => {
  return CURRENCIES[currency].symbol;
};

export const getUserCurrency = (): Currency => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const allUsers = JSON.parse(localStorage.getItem('bankUsers') || '{}');
      const userData = allUsers[currentUser];
      return userData?.currency || 'EUR';
    }
  } catch (error) {
    console.error('Error getting user currency:', error);
  }
  return 'EUR';
};

export const setUserCurrency = (currency: Currency): void => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const allUsers = JSON.parse(localStorage.getItem('bankUsers') || '{}');
      if (allUsers[currentUser]) {
        allUsers[currentUser].currency = currency;
        localStorage.setItem('bankUsers', JSON.stringify(allUsers));
      }
    }
  } catch (error) {
    console.error('Error setting user currency:', error);
  }
};