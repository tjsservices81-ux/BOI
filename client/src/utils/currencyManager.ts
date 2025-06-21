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
  
  // Get current currency symbol
  static getCurrentSymbol(): string {
    const currency = this.getCurrentCurrency();
    return CURRENCY_CONFIGS[currency].symbol;
  }
  
  // Set current user's primary currency
  static async setCurrency(currency: Currency): Promise<void> {
    // Save to local storage immediately for instant UI updates
    UserDataManager.setUserData('primaryCurrency', currency);
    this.notifyListeners(currency);
    
    // Save to database for persistence across sessions
    try {
      const customerNumber = UserDataManager.getUserData('customerNumber');
      if (customerNumber) {
        const response = await fetch(`/api/profile/${customerNumber}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            primaryCurrency: currency
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Database save failed: ${response.status}`);
        }
        
        console.log(`Currency preference saved to database: ${currency}`);
      } else {
        throw new Error('Customer number not found');
      }
    } catch (error) {
      console.error('Error saving currency preference:', error);
      throw error; // Re-throw to trigger error handling in UI
    }
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
  
  // Initialize currency manager with event listeners and user preferences
  static initialize(): void {
    // Load user currency preference from profile data
    this.loadUserCurrencyPreference();
    
    // Listen for currency change events from admin panel
    window.addEventListener('currencyChanged', ((event: CustomEvent) => {
      const { currency } = event.detail;
      this.notifyListeners(currency);
    }) as EventListener);
  }

  // Load user currency preference from database
  static async loadUserCurrencyPreference(): Promise<void> {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const response = await fetch(`/api/profile/${currentUser}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData.primaryCurrency) {
            // Set currency without triggering database save to avoid recursion
            UserDataManager.setUserData('primaryCurrency', userData.primaryCurrency);
            this.notifyListeners(userData.primaryCurrency);
          }
        }
      }
    } catch (error) {
      console.log('Using default currency preference');
    }
  }
}

// Initialize on module load
CurrencyManager.initialize();