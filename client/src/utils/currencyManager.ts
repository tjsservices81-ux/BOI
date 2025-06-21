// Currency Management System
// Handles currency switching between EUR and GBP with live updates

import { UserDataManager } from './userDataManager';

export type Currency = 'EUR' | 'GBP';

export interface CurrencyConfig {
  symbol: string;
  code: string;
  name: string;
  showDecimals: boolean;
}

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  EUR: {
    symbol: '€',
    code: 'EUR',
    name: 'Euro',
    showDecimals: true
  },
  GBP: {
    symbol: '£',
    code: 'GBP',
    name: 'Pound Sterling',
    showDecimals: false // GBP shows no decimals as per requirements
  }
};

export class CurrencyManager {
  private static listeners: Set<(currency: Currency) => void> = new Set();
  
  // Get current user's primary currency
  static getCurrentCurrency(): Currency {
    return UserDataManager.getUserData('primaryCurrency', 'EUR') as Currency;
  }
  
  // Set current user's primary currency
  static setCurrency(currency: Currency): void {
    UserDataManager.setUserData('primaryCurrency', currency);
    this.notifyListeners(currency);
  }
  
  // Subscribe to currency changes
  static subscribe(callback: (currency: Currency) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  // Notify all listeners of currency change
  private static notifyListeners(currency: Currency): void {
    this.listeners.forEach(callback => callback(currency));
  }
  
  // Format amount with correct currency symbol and decimal places
  static formatAmount(amount: string | number, currency?: Currency): string {
    const currentCurrency = currency || this.getCurrentCurrency();
    const config = CURRENCY_CONFIGS[currentCurrency];
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return `${config.symbol}0${config.showDecimals ? '.00' : ''}`;
    
    if (config.showDecimals) {
      return `${config.symbol}${numAmount.toFixed(2)}`;
    } else {
      return `${config.symbol}${Math.round(numAmount)}`;
    }
  }
  
  // Get currency symbol
  static getSymbol(currency?: Currency): string {
    const currentCurrency = currency || this.getCurrentCurrency();
    return CURRENCY_CONFIGS[currentCurrency].symbol;
  }
  
  // Get currency code
  static getCode(currency?: Currency): string {
    const currentCurrency = currency || this.getCurrentCurrency();
    return CURRENCY_CONFIGS[currentCurrency].code;
  }
  
  // Check if currency conversion should be hidden
  static shouldHideConversion(): boolean {
    return this.getCurrentCurrency() === 'GBP';
  }
  
  // Get transfer timing text based on currency
  static getTransferTiming(transferType: 'UK' | 'SEPA'): string {
    const currency = this.getCurrentCurrency();
    
    if (transferType === 'SEPA') {
      return 'SEPA Transfer: Transfers within the SEPA zone typically take 1 business day to complete.';
    }
    
    if (transferType === 'UK') {
      if (currency === 'GBP') {
        return 'This transfer will be processed within 2–24 hours due to international banking regulations.';
      } else {
        return 'This transfer will be processed within 1-2 business days due to international banking regulations.';
      }
    }
    
    return '';
  }
  
  // Initialize currency manager with event listeners
  static initialize(): void {
    // Listen for currency change events from admin panel
    window.addEventListener('currencyChanged', (event: CustomEvent) => {
      const { currency } = event.detail;
      this.notifyListeners(currency);
    });
  }
}

// Initialize on module load
CurrencyManager.initialize();