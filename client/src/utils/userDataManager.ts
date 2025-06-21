// User Data Management System
// Handles isolated data storage for each user account

export interface UserData {
  id?: number;
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
    this.setLastActiveUser(customerNumber);
  }

  // Get the current active user
  static getCurrentUser(): string | null {
    if (!this.currentUser) {
      this.currentUser = localStorage.getItem('currentUser');
    }
    return this.currentUser;
  }

  // Clear current user session - SECURITY: Only admin deletion should log users out
  static clearCurrentUser() {
    // This method is disabled to prevent automatic logouts
    console.warn('clearCurrentUser() disabled - users can only be logged out via admin deletion');
    return;
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

  // Clear cache for specific user data with proper synchronization
  static clearCache(key?: string) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    if (key) {
      const cacheKey = `${currentUser}_${key}`;
      this.dataCache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
    } else {
      // Clear all cache entries for current user
      const userPrefix = `${currentUser}_`;
      this.dataCache.forEach((value, key) => {
        if (key.startsWith(userPrefix)) {
          this.dataCache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      });
    }
  }

  // Clear user-specific data from cache for key
  static clearUserData(key: string) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    const cacheKey = `${currentUser}_${key}`;
    this.dataCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    
    // Also clear from localStorage
    localStorage.removeItem(`user_${currentUser}_${key}`);
  }

  // Get all registered users
  static getAllUsers(): { [customerNumber: string]: UserData } {
    return JSON.parse(localStorage.getItem('allBankUsers') || '{}');
  }

  // Register a new user
  static registerUser(userData: UserData) {
    const existingUsers = this.getAllUsers();
    existingUsers[userData.customerNumber] = userData;
    localStorage.setItem('allBankUsers', JSON.stringify(existingUsers));
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
      localStorage.setItem('allBankUsers', JSON.stringify(allUsers));
      
      // Dispatch storage event for cross-component synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'allBankUsers',
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

  static addRecentPayee(payee: { name: string; accountInfo: string; transferType: string; timestamp: string; reference?: string; bicCode?: string }) {
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

  // Remove specific user and their data - ADMIN ONLY
  static removeUser(customerNumber: string) {
    // SECURITY: Only admin can remove users
    if (!this.isAdminContext()) {
      console.error('SECURITY VIOLATION: removeUser() can only be called by admin');
      return false;
    }
    
    // Remove from users list
    const allUsers = this.getAllUsers();
    delete allUsers[customerNumber];
    localStorage.setItem('allBankUsers', JSON.stringify(allUsers));
    
    // Clear user-specific data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`user_${customerNumber}_`)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log(`Admin authorized: User ${customerNumber} removed`);
    return true;
  }

  // Clear temporary state for cold launch - ONLY clears cache, NOT user data
  static clearTemporaryState() {
    // SECURITY: Only clear memory cache and temporary items, never user data
    this.dataCache.clear();
    this.cacheTimestamps.clear();
    
    // Clear ONLY temporary storage items - exclude user data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('chat') || key.includes('liveChat') || key.includes('tempState') || key.includes('session_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Preserve user login state and authentication data
  }

  // Admin function to clear all data - RESTRICTED ACCESS
  static clearAllData() {
    // SECURITY: This function can only be called from admin context
    if (!this.isAdminContext()) {
      console.error('SECURITY VIOLATION: clearAllData() can only be called by admin');
      return false;
    }
    
    // Clear all localStorage data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('user_') || key === 'currentUser') {
        localStorage.removeItem(key);
      }
    });
    
    // Reset current user
    this.currentUser = null;
    console.log('Admin authorized: All user data cleared');
    return true;
  }

  // Admin context verification
  private static isAdminContext(): boolean {
    // Check if we're in admin panel context
    return window.location.pathname.includes('/admin') || 
           document.title.includes('Admin') ||
           window.location.hostname === 'localhost'; // Allow in development
  }

  // Admin-triggered cleanup - removes all traces of a deleted user
  static adminDeleteUser(customerNumber: string) {
    // Remove user from the users registry
    const allUsers = this.getAllUsers();
    if (allUsers[customerNumber]) {
      delete allUsers[customerNumber];
      localStorage.setItem('allBankUsers', JSON.stringify(allUsers));
    }
    
    // Remove from current user if this was the active user
    if (this.currentUser === customerNumber) {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
    }
    
    // Remove from last active user
    if (this.getLastActiveUser() === customerNumber) {
      localStorage.removeItem('lastActiveUser');
    }
    
    // Clear any cached data for this user
    this.dataCache.delete(customerNumber);
    this.cacheTimestamps.delete(customerNumber);
    
    // Clear all user-specific localStorage entries
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.includes(customerNumber) || key.startsWith(`user_${customerNumber}_`)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear sessionStorage entries
    const sessionKeys = Object.keys(sessionStorage);
    for (const key of sessionKeys) {
      if (key.includes(customerNumber)) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log(`Admin cleanup: All data for customer ${customerNumber} removed from browser storage`);
  }
}