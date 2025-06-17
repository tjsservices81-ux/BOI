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
    // Mark session as valid when user is set
    this.setSessionValid(customerNumber, true);
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
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.setSessionValid(currentUser, false);
    }
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  // Store last active user for biometric authentication
  static setLastActiveUser(customerNumber: string) {
    localStorage.setItem('lastActiveUser', customerNumber);
  }

  // Get last active user for biometric authentication
  static getLastActiveUser(): string | null {
    return localStorage.getItem('lastActiveUser');
  }

  // Session validation for biometric authentication - persistent sessions
  static setSessionValid(customerNumber: string, isValid: boolean) {
    const sessionKey = `session_valid_${customerNumber}`;
    if (isValid) {
      localStorage.setItem(sessionKey, 'true');
      // Store creation time for audit purposes only - no expiry enforcement
      localStorage.setItem(`session_created_${customerNumber}`, Date.now().toString());
    } else {
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(`session_created_${customerNumber}`);
    }
  }

  // Check if session is valid for biometric authentication
  static isSessionValid(customerNumber: string): boolean {
    const sessionKey = `session_valid_${customerNumber}`;
    
    // Session is valid if it exists in localStorage
    // No expiry check - sessions persist until manually invalidated
    const isValid = localStorage.getItem(sessionKey) === 'true';
    
    return isValid;
  }

  // Invalidate session (called when admin logs out user)
  static invalidateSession(customerNumber: string) {
    this.setSessionValid(customerNumber, false);
    // Also clear current user if it matches
    if (this.getCurrentUser() === customerNumber) {
      this.clearCurrentUser();
    }
    console.log(`🔒 Session invalidated for customer ${customerNumber}`);
  }

  // Validate session on server-side
  static async validateSessionWithServer(customerNumber: string): Promise<boolean> {
    try {
      const response = await fetch('/api/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerNumber }),
      });
      
      const result = await response.json();
      
      if (result.valid) {
        this.setSessionValid(customerNumber, true);
        return true;
      } else {
        this.setSessionValid(customerNumber, false);
        return false;
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
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
      for (const [cacheKey] of this.dataCache) {
        if (cacheKey.startsWith(`${currentUser}_`)) {
          this.dataCache.delete(cacheKey);
          this.cacheTimestamps.delete(cacheKey);
        }
      }
    }
  }

  // Check if user exists
  static userExists(customerNumber: string): boolean {
    const userKey = `user_${customerNumber}_profile`;
    return localStorage.getItem(userKey) !== null;
  }

  // Register new user
  static registerUser(userData: UserData): boolean {
    try {
      const userKey = `user_${userData.customerNumber}_profile`;
      localStorage.setItem(userKey, JSON.stringify(userData));
      
      // Set as current user after registration
      this.setCurrentUser(userData.customerNumber);
      
      return true;
    } catch (error) {
      console.error('Failed to register user:', error);
      return false;
    }
  }

  // Initialize fresh account with default data
  static initializeFreshAccount(customerNumber: string) {
    this.setCurrentUser(customerNumber);
    
    // Initialize default accounts
    const defaultAccounts = [
      {
        id: '1',
        name: 'Current Account',
        balance: 2540.75,
        type: 'current',
        sortCode: '90-12-34',
        accountNumber: '12345678',
        iban: 'IE12BOFI90123412345678',
        currency: 'EUR'
      },
      {
        id: '2', 
        name: 'Savings Account',
        balance: 15750.00,
        type: 'savings',
        sortCode: '90-12-34',
        accountNumber: '87654321',
        iban: 'IE12BOFI90123487654321',
        currency: 'EUR'
      }
    ];
    
    this.setUserData('accounts', defaultAccounts);
    this.setUserData('payees', []);
    this.setUserData('transactions', []);
    this.clearCache(); // Clear any stale cache
  }

  // Clear all current user data
  static clearCurrentUserData() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;
    
    // Clear all localStorage items for this user
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`user_${currentUser}_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.clearCache();
  }

  // Remove user completely
  static removeUser(customerNumber: string) {
    // Clear all data for this user
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`user_${customerNumber}_`) || key.includes(`_${customerNumber}`))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // If this was current user, clear current user
    if (this.getCurrentUser() === customerNumber) {
      this.clearCurrentUser();
    }
    
    // Clear cache entries
    for (const [cacheKey] of this.dataCache) {
      if (cacheKey.startsWith(`${customerNumber}_`)) {
        this.dataCache.delete(cacheKey);
        this.cacheTimestamps.delete(cacheKey);
      }
    }
  }

  // Clear temporary authentication state
  static clearTemporaryState() {
    // Clear any temporary auth states but keep user data
    this.clearCache();
  }

  // Get all registered users
  static getAllUsers(): Record<string, UserData> {
    const users: Record<string, UserData> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith('_profile')) {
        try {
          const customerNumber = key.split('_')[1];
          const userData = JSON.parse(localStorage.getItem(key) || '');
          users[customerNumber] = userData;
        } catch (error) {
          // Skip invalid entries
        }
      }
    }
    
    return users;
  }

  // Clear all application data
  static clearAllData() {
    localStorage.clear();
    this.dataCache.clear();
    this.cacheTimestamps.clear();
    this.currentUser = null;
  }

  // Admin delete user with proper cleanup
  static adminDeleteUser(customerNumber: string) {
    // Invalidate session first
    this.invalidateSession(customerNumber);
    
    // Remove all user data
    this.removeUser(customerNumber);
    
    // If this was the current user, clear current session
    if (this.getCurrentUser() === customerNumber) {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
    }
    
    // Remove from last active user if it matches
    if (this.getLastActiveUser() === customerNumber) {
      localStorage.removeItem('lastActiveUser');
    }
    
    // Clear any session-related data
    localStorage.removeItem(`session_valid_${customerNumber}`);
    localStorage.removeItem(`session_timestamp_${customerNumber}`);
    localStorage.removeItem(`lastLogin_${customerNumber}`);
    
    console.log(`🧹 Admin cleanup: Removed all browser data for customer ${customerNumber}`);
  }

  // Get user profile
  static getUserProfile(customerNumber?: string): UserData | null {
    const targetUser = customerNumber || this.getCurrentUser();
    if (!targetUser) return null;
    
    try {
      const userKey = `user_${targetUser}_profile`;
      const userData = localStorage.getItem(userKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  static updateUserProfile(customerNumber: string, updates: Partial<UserData>) {
    const currentProfile = this.getUserProfile(customerNumber);
    if (!currentProfile) return false;
    
    const updatedProfile = { ...currentProfile, ...updates };
    const userKey = `user_${customerNumber}_profile`;
    localStorage.setItem(userKey, JSON.stringify(updatedProfile));
    
    // Clear cache to force refresh
    this.clearCache('profile');
    
    return true;
  }

  // Add recent payee
  static addRecentPayee(payee: any) {
    const recentPayees = this.getUserData('recentPayees', []);
    
    // Remove if already exists (to avoid duplicates)
    const filtered = recentPayees.filter((p: any) => 
      p.iban !== payee.iban && p.accountNumber !== payee.accountNumber
    );
    
    // Add to beginning and limit to 10
    filtered.unshift(payee);
    const limited = filtered.slice(0, 10);
    
    this.setUserData('recentPayees', limited);
    this.clearCache('recentPayees');
  }
}