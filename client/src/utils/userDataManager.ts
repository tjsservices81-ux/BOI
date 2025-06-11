// User Data Management System
// Handles isolated data storage for each user account

export interface UserData {
  customerNumber: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
  joinDate: string;
  dateCreated: string;
}

export class UserDataManager {
  private static currentUser: string | null = null;

  // Set the current active user
  static setCurrentUser(customerNumber: string) {
    this.currentUser = customerNumber;
    localStorage.setItem('currentUser', customerNumber);
  }

  // Get the current active user
  static getCurrentUser(): string | null {
    if (!this.currentUser) {
      this.currentUser = localStorage.getItem('currentUser');
    }
    return this.currentUser;
  }

  // Clear current user session
  static clearCurrentUser() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  // Get user-specific storage key
  private static getUserKey(key: string): string {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }
    return `user_${currentUser}_${key}`;
  }

  // Store user-specific data
  static setUserData(key: string, data: any) {
    const userKey = this.getUserKey(key);
    localStorage.setItem(userKey, JSON.stringify(data));
  }

  // Retrieve user-specific data
  static getUserData(key: string, defaultValue: any = null) {
    try {
      const userKey = this.getUserKey(key);
      const stored = localStorage.getItem(userKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  // Clear all data for the current user
  static clearCurrentUserData() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`user_${currentUser}_`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // Get all registered users
  static getAllUsers(): { [customerNumber: string]: UserData } {
    return JSON.parse(localStorage.getItem('bankUsers') || '{}');
  }

  // Register a new user
  static registerUser(userData: UserData) {
    const existingUsers = this.getAllUsers();
    existingUsers[userData.customerNumber] = userData;
    localStorage.setItem('bankUsers', JSON.stringify(existingUsers));
  }

  // Get user profile data
  static getUserProfile(): UserData | null {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    const allUsers = this.getAllUsers();
    return allUsers[currentUser] || null;
  }

  // Update user profile
  static updateUserProfile(updates: Partial<UserData>) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const allUsers = this.getAllUsers();
    if (allUsers[currentUser]) {
      allUsers[currentUser] = { ...allUsers[currentUser], ...updates };
      localStorage.setItem('bankUsers', JSON.stringify(allUsers));
    }
  }

  // User-specific account operations
  static getUserAccounts() {
    return this.getUserData('bankAccounts', [
      { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "2322.40", accountType: "current" },
      { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "2000.00", accountType: "credit" },
      { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "7500.00", accountType: "savings" },
    ]);
  }

  static setUserAccounts(accounts: any[]) {
    this.setUserData('bankAccounts', accounts);
  }

  // User-specific transaction operations
  static getUserTransactions() {
    return this.getUserData('bankTransactions', []);
  }

  static setUserTransactions(transactions: any[]) {
    this.setUserData('bankTransactions', transactions);
  }

  // User-specific payee operations
  static getUserPayees() {
    return this.getUserData('savedPayees', []);
  }

  static setUserPayees(payees: any[]) {
    this.setUserData('savedPayees', payees);
  }

  // User-specific transfer history
  static getUserTransferHistory() {
    return this.getUserData('transferHistory', []);
  }

  static setUserTransferHistory(transfers: any[]) {
    this.setUserData('transferHistory', transfers);
  }

  static addUserTransfer(transfer: any) {
    const transfers = this.getUserTransferHistory();
    transfers.unshift(transfer);
    this.setUserTransferHistory(transfers);
  }

  // User-specific cards
  static getUserCards() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];
    
    const userProfile = this.getUserProfile();
    const name = userProfile?.name || 'Cardholder';
    
    return this.getUserData('userCards', [
      {
        id: 1,
        type: 'debit',
        name: 'Bank of Ireland Debit Card',
        number: '**** **** **** 2091',
        expiryMonth: '12',
        expiryYear: '27',
        cvv: '***',
        cardholderName: name,
        isActive: true,
        dailyLimit: '€1,500',
        monthlySpent: '€234.50'
      },
      {
        id: 2,
        type: 'credit',
        name: 'Bank of Ireland Credit Card',
        number: '**** **** **** 1820',
        expiryMonth: '08',
        expiryYear: '28',
        cvv: '***',
        cardholderName: name,
        isActive: true,
        creditLimit: '€5,000',
        availableCredit: '€4,765.50'
      }
    ]);
  }

  static setUserCards(cards: any[]) {
    this.setUserData('userCards', cards);
  }

  // User-specific settings and preferences
  static getUserSettings() {
    return this.getUserData('userSettings', {
      notifications: true,
      biometricEnabled: true,
      darkMode: false,
      language: 'en',
      currency: 'EUR'
    });
  }

  static setUserSettings(settings: any) {
    this.setUserData('userSettings', settings);
  }

  // Check if user exists
  static userExists(customerNumber: string): boolean {
    const allUsers = this.getAllUsers();
    return customerNumber in allUsers;
  }

  // Admin function to clear all data
  static clearAllData() {
    // Clear all localStorage data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_') || key === 'bankUsers' || key === 'currentUser') {
        localStorage.removeItem(key);
      }
    });
    
    // Reset current user
    this.currentUser = null;
  }
}