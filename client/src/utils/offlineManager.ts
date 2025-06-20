// Offline Manager - Handles offline data storage and synchronization
export class OfflineManager {
  private static instance: OfflineManager;
  private dbName = 'BankingAppOffline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initDB();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for offline data
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('payees')) {
          db.createObjectStore('payees', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('userProfiles')) {
          db.createObjectStore('userProfiles', { keyPath: 'id' });
        }
      };
    });
  }

  // Cache data for offline access
  async cacheUserData(userId: number, accounts: any[], transactions: any[], payees: any[], userProfile: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['accounts', 'transactions', 'payees', 'userProfiles'], 'readwrite');

    // Cache accounts
    const accountStore = transaction.objectStore('accounts');
    for (const account of accounts) {
      await accountStore.put({ ...account, userId });
    }

    // Cache transactions
    const transactionStore = transaction.objectStore('transactions');
    for (const txn of transactions) {
      await transactionStore.put({ ...txn, userId });
    }

    // Cache payees
    const payeeStore = transaction.objectStore('payees');
    for (const payee of payees) {
      await payeeStore.put({ ...payee, userId });
    }

    // Cache user profile
    const profileStore = transaction.objectStore('userProfiles');
    await profileStore.put({ ...userProfile, id: userId });

    console.log('📱 OFFLINE CACHE: User data cached for offline access');
  }

  // Get cached accounts when offline
  async getCachedAccounts(userId: number): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accounts'], 'readonly');
      const store = transaction.objectStore('accounts');
      const request = store.getAll();

      request.onsuccess = () => {
        const accounts = request.result.filter(account => account.userId === userId);
        resolve(accounts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached transactions when offline
  async getCachedTransactions(accountId: number): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.getAll();

      request.onsuccess = () => {
        const transactions = request.result.filter(txn => txn.accountId === accountId);
        resolve(transactions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached payees when offline
  async getCachedPayees(userId: number): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['payees'], 'readonly');
      const store = transaction.objectStore('payees');
      const request = store.getAll();

      request.onsuccess = () => {
        const payees = request.result.filter(payee => payee.userId === userId);
        resolve(payees);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Queue actions for when back online
  async queuePendingAction(action: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    
    await store.add({
      ...action,
      timestamp: new Date().toISOString(),
      synced: false
    });

    console.log('📤 OFFLINE QUEUE: Action queued for sync when online');
  }

  // Get pending actions to sync
  async getPendingActions(): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();

      request.onsuccess = () => {
        const pending = request.result.filter(action => !action.synced);
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Mark action as synced
  async markActionSynced(actionId: number): Promise<void> {
    if (!this.db) await this.initDB();
    
    const transaction = this.db!.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const request = store.get(actionId);

    request.onsuccess = () => {
      const action = request.result;
      if (action) {
        action.synced = true;
        store.put(action);
      }
    };
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Get offline banner message
  getOfflineStatus(): { isOffline: boolean; message: string } {
    const offline = !this.isOnline();
    return {
      isOffline: offline,
      message: offline ? 'You\'re offline. Using cached data.' : ''
    };
  }
}

export const offlineManager = OfflineManager.getInstance();