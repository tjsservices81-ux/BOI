// IndexedDB fallback for secure storage when localStorage is unavailable
export class IndexedDBFallback {
  private static dbName = 'BankOfIrelandSecure';
  private static version = 1;
  private static storeName = 'UserSessions';

  static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      console.error('IndexedDB setItem failed:', error);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return result ? result.value : null;
    } catch (error) {
      console.error('IndexedDB getItem failed:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      console.error('IndexedDB removeItem failed:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      console.log('🗑️ IndexedDB cleared by admin deletion');
    } catch (error) {
      console.error('IndexedDB clear failed:', error);
    }
  }
}

// Secure Storage Manager with localStorage and IndexedDB fallback
export class SecureStorageManager {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      // Try localStorage first
      localStorage.setItem(key, value);
    } catch (error) {
      // Fallback to IndexedDB if localStorage fails
      console.warn('localStorage failed, using IndexedDB fallback');
      await IndexedDBFallback.setItem(key, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      // Try localStorage first
      const value = localStorage.getItem(key);
      if (value !== null) return value;
      
      // Fallback to IndexedDB
      return await IndexedDBFallback.getItem(key);
    } catch (error) {
      // Final fallback to IndexedDB
      console.warn('localStorage failed, using IndexedDB fallback');
      return await IndexedDBFallback.getItem(key);
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      // Remove from both storages
      localStorage.removeItem(key);
      await IndexedDBFallback.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from secure storage:', error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      // Clear critical authentication keys
      const keysToRemove = [
        'permanentlyLoggedIn',
        'currentUser', 
        'lastActiveUser',
        'allBankUsers'
      ];
      
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      
      await IndexedDBFallback.clear();
      console.log('🗑️ All secure storage cleared');
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }
}