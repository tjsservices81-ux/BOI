// Enhanced Offline Manager for Full Banking App Functionality
export class OfflineManager {
  private static instance: OfflineManager;
  private dbName = 'BOI_OfflineDB';
  private version = 2;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      this.db = await this.openDatabase();
      await this.setupOfflineData();
      console.log('✅ OfflineManager: Fully initialized for offline banking');
      return true;
    } catch (error) {
      console.error('❌ OfflineManager initialization failed:', error);
      return false;
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // User data store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('customerNumber', 'customerNumber', { unique: true });
        }

        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
          accountStore.createIndex('userId', 'userId', { unique: false });
        }

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('accountId', 'accountId', { unique: false });
          transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Pending operations store
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('synced', 'synced', { unique: false });
        }

        // Chat messages store
        if (!db.objectStoreNames.contains('chatMessages')) {
          const chatStore = db.createObjectStore('chatMessages', { keyPath: 'id' });
          chatStore.createIndex('sessionId', 'sessionId', { unique: false });
        }

        // App settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  private async setupOfflineData(): Promise<void> {
    // Set offline mode flag
    await this.setSetting('offlineMode', true);
    await this.setSetting('lastOnlineSync', new Date().toISOString());
    
    // Initialize offline authentication cache
    await this.cacheOfflineAuth();
  }

  // User Management
  async storeUser(userData: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const user = {
      ...userData,
      lastLogin: new Date().toISOString(),
      offlineAccess: true
    };

    await this.promisifyRequest(store.put(user));
  }

  async getUser(customerNumber: string): Promise<any | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const index = store.index('customerNumber');
    
    const result = await this.promisifyRequest(index.get(customerNumber));
    return result || null;
  }

  // Account Management
  async storeAccounts(accounts: any[]): Promise<void> {
    if (!this.db || !accounts.length) return;

    const transaction = this.db.transaction(['accounts'], 'readwrite');
    const store = transaction.objectStore('accounts');

    for (const account of accounts) {
      await this.promisifyRequest(store.put({
        ...account,
        lastUpdated: new Date().toISOString()
      }));
    }
  }

  async getAccounts(userId: number): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['accounts'], 'readonly');
    const store = transaction.objectStore('accounts');
    const index = store.index('userId');
    
    const result = await this.promisifyRequest(index.getAll(userId));
    return result || [];
  }

  // Transaction Management
  async storeTransactions(transactions: any[]): Promise<void> {
    if (!this.db || !transactions.length) return;

    const transaction = this.db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');

    for (const txn of transactions) {
      await this.promisifyRequest(store.put({
        ...txn,
        cached: true,
        lastUpdated: new Date().toISOString()
      }));
    }
  }

  async getTransactions(accountId: number): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const index = store.index('accountId');
    
    const result = await this.promisifyRequest(index.getAll(accountId));
    return (result || []).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Offline Transfer Processing
  async processOfflineTransfer(transferData: any): Promise<{ success: boolean; reference: string }> {
    if (!this.db) throw new Error('Database not initialized');

    const reference = `OFFLINE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create pending operation
    const operation = {
      id: Date.now(),
      type: 'TRANSFER',
      data: { ...transferData, reference },
      timestamp: new Date().toISOString(),
      synced: false,
      status: 'pending'
    };

    const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    await this.promisifyRequest(store.put(operation));

    // Update local account balances immediately for better UX
    await this.updateLocalBalance(transferData.fromAccount, -parseFloat(transferData.amount));

    // Create local transaction record
    const localTransaction = {
      id: Date.now() + 1,
      accountId: parseInt(transferData.fromAccount),
      amount: `-${transferData.amount}`,
      description: `${transferData.transferType} Transfer to ${transferData.recipientName}`,
      category: 'transfer',
      type: 'debit',
      paymentMethod: `${transferData.transferType} Transfer`,
      reference,
      recipientName: transferData.recipientName,
      timestamp: new Date().toISOString(),
      offline: true,
      pending: true
    };

    await this.storeTransactions([localTransaction]);

    return { success: true, reference };
  }

  private async updateLocalBalance(accountId: string, amount: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['accounts'], 'readwrite');
    const store = transaction.objectStore('accounts');
    
    const account = await this.promisifyRequest(store.get(parseInt(accountId)));
    if (account) {
      account.balance = (parseFloat(account.balance) + amount).toFixed(2);
      account.lastUpdated = new Date().toISOString();
      await this.promisifyRequest(store.put(account));
    }
  }

  // Chat Message Management
  async storeChatMessage(message: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['chatMessages'], 'readwrite');
    const store = transaction.objectStore('chatMessages');
    
    await this.promisifyRequest(store.put({
      ...message,
      offline: true,
      timestamp: new Date().toISOString()
    }));
  }

  async getChatHistory(sessionId: string): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['chatMessages'], 'readonly');
    const store = transaction.objectStore('chatMessages');
    const index = store.index('sessionId');
    
    const result = await this.promisifyRequest(index.getAll(sessionId));
    return result || [];
  }

  // Settings Management
  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    
    await this.promisifyRequest(store.put({ key, value, updated: new Date().toISOString() }));
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    
    const result = await this.promisifyRequest(store.get(key));
    return result?.value || null;
  }

  // Network Status
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Sync Management
  async getPendingOperations(): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const index = store.index('synced');
    
    const result = await this.promisifyRequest(index.getAll(IDBKeyRange.only(false)));
    return result || [];
  }

  async markOperationSynced(operationId: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    
    const operation = await this.promisifyRequest(store.get(operationId));
    if (operation) {
      operation.synced = true;
      operation.syncedAt = new Date().toISOString();
      await this.promisifyRequest(store.put(operation));
    }
  }

  // Authentication Cache
  private async cacheOfflineAuth(): Promise<void> {
    await this.setSetting('offlineAuthEnabled', true);
    await this.setSetting('authValidUntil', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days
  }

  async isOfflineAuthValid(): Promise<boolean> {
    const enabled = await this.getSetting('offlineAuthEnabled');
    const validUntil = await this.getSetting('authValidUntil');
    
    if (!enabled || !validUntil) return false;
    
    return new Date() < new Date(validUntil);
  }

  // Utility method
  private promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Data synchronization when back online
  async syncWhenOnline(): Promise<void> {
    if (!this.isOnline()) return;

    const pendingOps = await this.getPendingOperations();
    console.log(`🔄 Syncing ${pendingOps.length} pending operations...`);

    for (const op of pendingOps) {
      try {
        if (op.type === 'TRANSFER') {
          // Sync transfer with server
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

    await this.setSetting('lastOnlineSync', new Date().toISOString());
  }
}

// Initialize and export singleton instance
export const offlineManager = OfflineManager.getInstance();