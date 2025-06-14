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
  private static dataCache: Map<string, any> = new Map();
  private static cacheTimestamps: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  // Set the current active user
  static setCurrentUser(customerNumber: string) {
    this.currentUser = customerNumber;
    localStorage.setItem('currentUser', customerNumber);
    // Also store as last active user for biometric authentication
    this.setLastActiveUser(customerNumber);
  }

  // Get the current active user
  static getCurrentUser(): string | null {
    if (!this.currentUser) {
      this.currentUser = localStorage.getItem('currentUser');
    }
    return this.currentUser;
  }

  // Store last active user for biometric authentication
  static setLastActiveUser(customerNumber: string) {
    localStorage.setItem('lastActiveUser', customerNumber);
  }

  // Get last active user for biometric authentication
  static getLastActiveUser(): string | null {
    return localStorage.getItem('lastActiveUser');
  }

  // Get formatted last login time
  static getLastLoginTime(): string {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return 'Never';
    
    const lastLoginKey = `lastLogin_${currentUser}`;
    const lastLoginTimestamp = localStorage.getItem(lastLoginKey);
    
    if (!lastLoginTimestamp) return 'Never';
    
    const date = new Date(parseInt(lastLoginTimestamp));
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}.${minutes} GMT, ${day}/${month}/${year}`;
  }

  // Record login time
  static recordLoginTime(customerNumber: string) {
    const loginKey = `lastLogin_${customerNumber}`;
    localStorage.setItem(loginKey, Date.now().toString());
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

  // Retrieve user-specific data with caching
  static getUserData(key: string, defaultValue: any = null) {
    try {
      const userKey = this.getUserKey(key);
      const cacheKey = `${this.getCurrentUser()}_${key}`;
      
      // Check cache first
      const cachedData = this.dataCache.get(cacheKey);
      const cacheTime = this.cacheTimestamps.get(cacheKey);
      
      if (cachedData !== undefined && cacheTime && (Date.now() - cacheTime) < this.CACHE_DURATION) {
        return cachedData;
      }
      
      // Get from localStorage
      const stored = localStorage.getItem(userKey);
      const data = stored ? JSON.parse(stored) : defaultValue;
      
      // Cache the result
      this.dataCache.set(cacheKey, data);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return data;
    } catch (error) {
      return defaultValue;
    }
  }

  // Clear cache for specific user data
  static clearCache(key?: string) {
    if (key) {
      const cacheKey = `${this.getCurrentUser()}_${key}`;
      this.dataCache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    } else {
      this.dataCache.clear();
      this.cacheTimestamps.clear();
    }
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
      const previousData = { ...allUsers[currentUser] };
      allUsers[currentUser] = { ...allUsers[currentUser], ...updates };
      localStorage.setItem('bankUsers', JSON.stringify(allUsers));
      
      // Dispatch storage event for cross-component synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'bankUsers',
        newValue: JSON.stringify(allUsers),
        oldValue: JSON.stringify({ ...allUsers, [currentUser]: previousData })
      }));
      
      // Dispatch comprehensive profile update events
      const updatedProfile = allUsers[currentUser];
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: updatedProfile
      }));
      
      window.dispatchEvent(new CustomEvent('userProfileUpdate', {
        detail: updatedProfile
      }));
      
      // Dispatch specific events for name changes (affects cards)
      if (updates.name && updates.name !== previousData.name) {
        window.dispatchEvent(new CustomEvent('cardNameUpdate', {
          detail: { name: updates.name }
        }));
      }
    }
  }

  // User-specific account operations
  static getUserAccounts() {
    return this.getUserData('bankAccounts', [
      { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
      { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
      { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" },
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

  // Recent payees operations
  static getRecentPayees() {
    return this.getUserData('recentPayees', []);
  }

  static addRecentPayee(payee: { name: string; accountInfo: string; transferType: string; timestamp: string }) {
    const recentPayees = this.getRecentPayees();
    
    // Check if payee already exists (by name and account info)
    const existingIndex = recentPayees.findIndex((p: any) => 
      p.name === payee.name && p.accountInfo === payee.accountInfo
    );
    
    if (existingIndex !== -1) {
      // Update existing payee timestamp and move to front
      recentPayees.splice(existingIndex, 1);
    }
    
    // Add to front of list
    recentPayees.unshift(payee);
    
    // Keep only last 10 recent payees
    const updatedPayees = recentPayees.slice(0, 10);
    
    this.setUserData('recentPayees', updatedPayees);
    return updatedPayees;
  }

  static removeRecentPayee(name: string, accountInfo: string) {
    const recentPayees = this.getRecentPayees();
    const updatedPayees = recentPayees.filter((p: any) => 
      !(p.name === name && p.accountInfo === accountInfo)
    );
    this.setUserData('recentPayees', updatedPayees);
    return updatedPayees;
  }

  // Check if user exists
  static userExists(customerNumber: string): boolean {
    const allUsers = this.getAllUsers();
    return customerNumber in allUsers;
  }

  // Initialize fresh account data for new user only
  static initializeFreshAccount(customerNumber: string) {
    // Set current user first
    this.setCurrentUser(customerNumber);
    
    // Only initialize fresh data if user has no existing account data
    const existingAccounts = this.getUserData('bankAccounts', null);
    if (existingAccounts === null) {
      // Initialize with fresh account data (zero balances)
      const freshAccounts = [
        { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
        { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
        { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" },
      ];
      
      // Set fresh data only for new accounts
      this.setUserData('bankAccounts', freshAccounts);
      this.setUserData('bankTransactions', []);
      this.setUserData('savedPayees', []);
      this.setUserData('recentPayees', []);
    }
  }

  // Clear current user's data (transactions, payees) but preserve accounts
  static clearCurrentUserData() {
    this.setUserData('bankTransactions', []);
    this.setUserData('savedPayees', []);
    // Keep accounts intact - don't clear them
  }

  // Remove specific user and their data
  static removeUser(customerNumber: string) {
    // Remove from users list
    const allUsers = this.getAllUsers();
    delete allUsers[customerNumber];
    localStorage.setItem('bankUsers', JSON.stringify(allUsers));
    
    // Clear user-specific data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`user_${customerNumber}_`)) {
        localStorage.removeItem(key);
      }
    });
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