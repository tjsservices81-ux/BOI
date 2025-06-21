import { UserDataManager } from './userDataManager';

// Currency utility functions
export const getUserCurrency = (): 'EUR' | 'GBP' => {
  return UserDataManager.getUserData('primaryCurrency', 'EUR') as 'EUR' | 'GBP';
};

export const setCurrencyPreference = (currency: 'EUR' | 'GBP') => {
  UserDataManager.setUserData('primaryCurrency', currency);
  
  // Dispatch currency update event to notify all components
  window.dispatchEvent(new CustomEvent('currencyUpdate', {
    detail: { currency }
  }));
};

export const getCurrencySymbol = (): string => {
  return getUserCurrency() === 'GBP' ? '£' : '€';
};

export const shouldShowExchangeRate = (): boolean => {
  return getUserCurrency() === 'EUR';
};

export const getTransferTiming = (): string => {
  return getUserCurrency() === 'GBP' ? '2-24 hours' : '1-2 business days';
};

export const formatAmount = (amount: string | number): string => {
  const symbol = getCurrencySymbol();
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${symbol}${numAmount.toFixed(2)}`;
};

export const formatAmountInput = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toFixed(2);
};

export const getCurrencyLabel = (): string => {
  return getUserCurrency() === 'GBP' ? 'GBP' : 'EUR';
};