// Complete Offline Banking Solution
export class OfflineBanking {
  private static dbName = 'BOI_OfflineDB';
  private static db: IDBDatabase | null = null;

  static async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 3);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'customerNumber' });
          userStore.createIndex('name', 'name');
        }
        
        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
          accountStore.createIndex('userId', 'userId');
        }
        
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('accountId', 'accountId');
        }
        
        // Pending operations store
        if (!db.objectStoreNames.contains('pendingOps')) {
          db.createObjectStore('pendingOps', { keyPath: 'id' });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
    
    console.log('✅ Offline Banking: Fully initialized');
  }

  // User authentication offline
  static async authenticateOffline(customerNumber: string, pin: string): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const user = await this.promisify(store.get(customerNumber));
      
      if (user && user.pin === pin) {
        await this.setSetting('currentUser', customerNumber);
        await this.setSetting('lastLogin', new Date().toISOString());
        return true;
      }
    } catch (error) {
      console.error('Offline auth error:', error);
    }
    
    return false;
  }

  // Store user data for offline access
  static async storeUserData(userData: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    const transaction = this.db!.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    await this.promisify(store.put(userData));
  }

  // Get accounts for offline viewing
  static async getAccountsOffline(userId: string): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['accounts'], 'readonly');
      const store = transaction.objectStore('accounts');
      const index = store.index('userId');
      const accounts = await this.promisify(index.getAll(userId));
      return accounts || [];
    } catch (error) {
      console.error('Get accounts offline error:', error);
      return [];
    }
  }

  // Store accounts for offline access
  static async storeAccountsOffline(accounts: any[]): Promise<void> {
    if (!this.db) await this.initialize();
    
    const transaction = this.db!.transaction(['accounts'], 'readwrite');
    const store = transaction.objectStore('accounts');
    
    for (const account of accounts) {
      await this.promisify(store.put(account));
    }
  }

  // Get transactions for offline viewing
  static async getTransactionsOffline(accountId: number): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const index = store.index('accountId');
      const transactions = await this.promisify(index.getAll(accountId));
      
      return (transactions || []).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Get transactions offline error:', error);
      return [];
    }
  }

  // Store transactions for offline access
  static async storeTransactionsOffline(transactions: any[]): Promise<void> {
    if (!this.db) await this.initialize();
    
    const transaction = this.db!.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    
    for (const tx of transactions) {
      await this.promisify(store.put(tx));
    }
  }

  // Process transfers offline
  static async processTransferOffline(transferData: any): Promise<{ success: boolean; reference: string }> {
    if (!this.db) await this.initialize();
    
    const reference = `OFFLINE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    try {
      // Store pending operation
      const pendingOp = {
        id: Date.now(),
        type: 'TRANSFER',
        data: { ...transferData, reference },
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      const pendingTransaction = this.db!.transaction(['pendingOps'], 'readwrite');
      const pendingStore = pendingTransaction.objectStore('pendingOps');
      await this.promisify(pendingStore.put(pendingOp));
      
      // Update account balance locally
      await this.updateAccountBalanceOffline(transferData.fromAccount, -parseFloat(transferData.amount));
      
      // Create local transaction record
      const localTransaction = {
        id: Date.now() + 1,
        accountId: parseInt(transferData.fromAccount),
        amount: `-${transferData.amount}`,
        description: `${transferData.transferType || 'SEPA'} Transfer to ${transferData.recipientName}`,
        category: 'transfer',
        type: 'debit',
        paymentMethod: `${transferData.transferType || 'SEPA'} Transfer`,
        reference,
        recipientName: transferData.recipientName,
        timestamp: new Date().toISOString(),
        offline: true,
        pending: true
      };
      
      await this.storeTransactionsOffline([localTransaction]);
      
      return { success: true, reference };
    } catch (error) {
      console.error('Process transfer offline error:', error);
      return { success: false, reference: '' };
    }
  }

  // Update account balance locally
  static async updateAccountBalanceOffline(accountId: string, amount: number): Promise<void> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['accounts'], 'readwrite');
      const store = transaction.objectStore('accounts');
      const account = await this.promisify(store.get(parseInt(accountId)));
      
      if (account) {
        account.balance = (parseFloat(account.balance) + amount).toFixed(2);
        account.lastUpdated = new Date().toISOString();
        await this.promisify(store.put(account));
      }
    } catch (error) {
      console.error('Update balance offline error:', error);
    }
  }

  // Settings management
  static async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    const transaction = this.db!.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    await this.promisify(store.put({ key, value, updated: new Date().toISOString() }));
  }

  static async getSetting(key: string): Promise<any> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const result = await this.promisify(store.get(key));
      return result?.value || null;
    } catch (error) {
      return null;
    }
  }

  // Check if app is offline
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  // Get pending operations for sync
  static async getPendingOperations(): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['pendingOps'], 'readonly');
      const store = transaction.objectStore('pendingOps');
      const operations = await this.promisify(store.getAll());
      return operations.filter((op: any) => !op.synced);
    } catch (error) {
      return [];
    }
  }

  // Mark operation as synced
  static async markOperationSynced(operationId: number): Promise<void> {
    if (!this.db) await this.initialize();
    
    try {
      const transaction = this.db!.transaction(['pendingOps'], 'readwrite');
      const store = transaction.objectStore('pendingOps');
      const operation = await this.promisify(store.get(operationId));
      
      if (operation) {
        operation.synced = true;
        operation.syncedAt = new Date().toISOString();
        await this.promisify(store.put(operation));
      }
    } catch (error) {
      console.error('Mark operation synced error:', error);
    }
  }

  // Sync when back online
  static async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return;
    
    const pendingOps = await this.getPendingOperations();
    console.log(`🔄 Syncing ${pendingOps.length} pending operations...`);
    
    for (const op of pendingOps) {
      try {
        if (op.type === 'TRANSFER') {
          const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.data)
          });
          
          if (response.ok) {
            await this.markOperationSynced(op.id);
          }
        }
      } catch (error) {
        console.error('Sync failed for operation:', op.id, error);
      }
    }
  }

  // Utility method
  private static promisify(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Enable full offline banking operations
  static async enableOfflineMode(): Promise<void> {
    await this.initialize();
    await this.setSetting('offlineMode', true);
    await this.setSetting('offlineEnabledAt', new Date().toISOString());
    console.log('✅ Offline Banking: Full offline mode enabled');
  }

  // Check if offline mode is enabled
  static async isOfflineModeEnabled(): Promise<boolean> {
    const offlineMode = await this.getSetting('offlineMode');
    return offlineMode === true;
  }
}

// Initialize offline banking on import
OfflineBanking.initialize().catch(console.error);

export default OfflineBanking;