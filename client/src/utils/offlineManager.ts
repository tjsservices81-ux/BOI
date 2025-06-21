// Offline Data Management with IndexedDB
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema interface
interface BankingDB extends DBSchema {
  users: {
    key: string;
    value: {
      customerNumber: string;
      userData: any;
      lastOnlineLogin: number;
      sessionData: any;
      createdAt: number;
      updatedAt: number;
    };
  };
  accounts: {
    key: string;
    value: {
      customerNumber: string;
      accounts: any[];
      updatedAt: number;
    };
  };
  transactions: {
    key: string;
    value: {
      customerNumber: string;
      transactions: any[];
      updatedAt: number;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

export class OfflineManager {
  private static db: IDBPDatabase<BankingDB> | null = null;
  private static readonly DB_NAME = 'BankOfIrelandDB';
  private static readonly DB_VERSION = 1;
  private static readonly OFFLINE_LOGIN_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  // Initialize IndexedDB
  static async initialize(): Promise<void> {
    try {
      this.db = await openDB<BankingDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Users store
          if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'customerNumber' });
            usersStore.createIndex('lastOnlineLogin', 'lastOnlineLogin');
          }

          // Accounts store
          if (!db.objectStoreNames.contains('accounts')) {
            db.createObjectStore('accounts', { keyPath: 'customerNumber' });
          }

          // Transactions store
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'customerNumber' });
          }

          // Settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        },
      });

      console.log('✅ OfflineManager: IndexedDB initialized successfully');
    } catch (error) {
      console.error('❌ OfflineManager: Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  // Ensure database is initialized
  private static async ensureDB(): Promise<IDBPDatabase<BankingDB>> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  // Check if user is eligible for offline login
  static async canLoginOffline(customerNumber: string): Promise<{ allowed: boolean; timeRemaining?: string }> {
    try {
      const db = await this.ensureDB();
      const userRecord = await db.get('users', customerNumber);

      if (!userRecord || !userRecord.lastOnlineLogin) {
        return { allowed: false };
      }

      const timeSinceLastLogin = Date.now() - userRecord.lastOnlineLogin;
      const isWithinWindow = timeSinceLastLogin <= this.OFFLINE_LOGIN_WINDOW;

      if (isWithinWindow) {
        const remainingTime = this.OFFLINE_LOGIN_WINDOW - timeSinceLastLogin;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const timeRemaining = `${hours}h ${minutes}m`;

        return { allowed: true, timeRemaining };
      }

      return { allowed: false };
    } catch (error) {
      console.error('OfflineManager: Error checking offline login eligibility:', error);
      return { allowed: false };
    }
  }

  // Store user data after successful online login
  static async storeUserData(customerNumber: string, userData: any, sessionData: any): Promise<void> {
    try {
      const db = await this.ensureDB();
      const now = Date.now();

      // Store user data
      await db.put('users', {
        customerNumber,
        userData,
        lastOnlineLogin: now,
        sessionData,
        createdAt: now,
        updatedAt: now
      });

      console.log('✅ OfflineManager: User data stored for offline access');
    } catch (error) {
      console.error('❌ OfflineManager: Failed to store user data:', error);
    }
  }

  // Get cached user data for offline login
  static async getCachedUserData(customerNumber: string): Promise<any | null> {
    try {
      const db = await this.ensureDB();
      const userRecord = await db.get('users', customerNumber);
      return userRecord?.userData || null;
    } catch (error) {
      console.error('OfflineManager: Error retrieving cached user data:', error);
      return null;
    }
  }

  // Store account data
  static async storeAccountData(customerNumber: string, accounts: any[]): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.put('accounts', {
        customerNumber,
        accounts,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('OfflineManager: Failed to store account data:', error);
    }
  }

  // Get cached account data
  static async getCachedAccountData(customerNumber: string): Promise<any[] | null> {
    try {
      const db = await this.ensureDB();
      const accountRecord = await db.get('accounts', customerNumber);
      return accountRecord?.accounts || null;
    } catch (error) {
      console.error('OfflineManager: Error retrieving cached account data:', error);
      return null;
    }
  }

  // Store transaction data
  static async storeTransactionData(customerNumber: string, transactions: any[]): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.put('transactions', {
        customerNumber,
        transactions,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('OfflineManager: Failed to store transaction data:', error);
    }
  }

  // Get cached transaction data
  static async getCachedTransactionData(customerNumber: string): Promise<any[] | null> {
    try {
      const db = await this.ensureDB();
      const transactionRecord = await db.get('transactions', customerNumber);
      return transactionRecord?.transactions || null;
    } catch (error) {
      console.error('OfflineManager: Error retrieving cached transaction data:', error);
      return null;
    }
  }

  // Clear user data (for admin deletion)
  static async clearUserData(customerNumber: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      
      // Clear user data from all stores
      await Promise.all([
        db.delete('users', customerNumber),
        db.delete('accounts', customerNumber),
        db.delete('transactions', customerNumber)
      ]);

      console.log('✅ OfflineManager: User data cleared from IndexedDB');
    } catch (error) {
      console.error('OfflineManager: Failed to clear user data:', error);
    }
  }

  // Get all cached users (for admin purposes)
  static async getAllCachedUsers(): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const users = await db.getAllKeys('users');
      return users;
    } catch (error) {
      console.error('OfflineManager: Error retrieving cached users:', error);
      return [];
    }
  }

  // Check if device is currently online
  static isOnline(): boolean {
    return navigator.onLine;
  }

  // Store app settings
  static async storeSetting(key: string, value: any): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.put('settings', {
        key,
        value,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('OfflineManager: Failed to store setting:', error);
    }
  }

  // Get app setting
  static async getSetting(key: string): Promise<any | null> {
    try {
      const db = await this.ensureDB();
      const setting = await db.get('settings', key);
      return setting?.value || null;
    } catch (error) {
      console.error('OfflineManager: Error retrieving setting:', error);
      return null;
    }
  }

  // Sync data when coming back online
  static async syncOnReconnect(customerNumber: string): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    try {
      console.log('🔄 OfflineManager: Syncing data on reconnect...');
      
      // Get cached data
      const cachedUserData = await this.getCachedUserData(customerNumber);
      const cachedAccounts = await this.getCachedAccountData(customerNumber);
      const cachedTransactions = await this.getCachedTransactionData(customerNumber);

      // Update last online login timestamp
      if (cachedUserData) {
        await this.storeUserData(customerNumber, cachedUserData, {});
      }

      console.log('✅ OfflineManager: Data sync completed');
    } catch (error) {
      console.error('❌ OfflineManager: Failed to sync data:', error);
    }
  }
}