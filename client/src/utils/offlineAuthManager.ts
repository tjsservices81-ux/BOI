// Enhanced Offline Authentication Manager
import { OfflineManager } from './offlineManager';
import { UserDataManager } from './userDataManager';

export class OfflineAuthManager {
  private static readonly OFFLINE_LOGIN_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if user can login offline based on recent online activity
   */
  static async canLoginOffline(customerNumber: string): Promise<{
    allowed: boolean;
    timeRemaining?: string;
    message?: string;
  }> {
    try {
      // Check if OfflineManager allows offline login
      const offlineEligibility = await OfflineManager.canLoginOffline(customerNumber);
      
      if (!offlineEligibility.allowed) {
        return {
          allowed: false,
          message: 'Please connect to the internet to login. Offline access requires a recent online login within 24 hours.'
        };
      }

      return {
        allowed: true,
        timeRemaining: offlineEligibility.timeRemaining,
        message: `Offline access available for ${offlineEligibility.timeRemaining || 'limited time'}`
      };
    } catch (error) {
      console.error('OfflineAuthManager: Error checking offline eligibility:', error);
      return {
        allowed: false,
        message: 'Unable to verify offline access. Please connect to the internet.'
      };
    }
  }

  /**
   * Perform offline authentication using cached data
   */
  static async authenticateOffline(customerNumber: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
    timeRemaining?: string;
  }> {
    try {
      // Check offline eligibility first
      const eligibility = await this.canLoginOffline(customerNumber);
      
      if (!eligibility.allowed) {
        return {
          success: false,
          message: eligibility.message
        };
      }

      // Get cached user data
      const cachedUserData = await OfflineManager.getCachedUserData(customerNumber);
      
      if (!cachedUserData) {
        return {
          success: false,
          message: 'No cached user data available. Please login online first.'
        };
      }

      // Load cached account and transaction data
      const cachedAccounts = await OfflineManager.getCachedAccountData(customerNumber);
      const cachedTransactions = await OfflineManager.getCachedTransactionData(customerNumber);

      // Restore data to UserDataManager
      if (cachedAccounts && cachedAccounts.length > 0) {
        UserDataManager.setUserData('bankAccounts', cachedAccounts);
      }
      
      if (cachedTransactions && cachedTransactions.length > 0) {
        UserDataManager.setUserData('bankTransactions', cachedTransactions);
      }

      console.log('✅ OfflineAuthManager: Offline authentication successful');
      
      return {
        success: true,
        user: cachedUserData,
        timeRemaining: eligibility.timeRemaining,
        message: eligibility.message
      };
    } catch (error) {
      console.error('❌ OfflineAuthManager: Offline authentication failed:', error);
      return {
        success: false,
        message: 'Offline authentication failed. Please try connecting to the internet.'
      };
    }
  }

  /**
   * Store successful online login for offline access
   */
  static async recordOnlineLogin(customerNumber: string, userData: any): Promise<void> {
    try {
      const accountData = UserDataManager.getUserData('bankAccounts', []);
      const transactionData = UserDataManager.getUserData('bankTransactions', []);

      // Store in IndexedDB for offline access
      await OfflineManager.storeUserData(customerNumber, userData, {});
      await OfflineManager.storeAccountData(customerNumber, accountData);
      await OfflineManager.storeTransactionData(customerNumber, transactionData);

      console.log('✅ OfflineAuthManager: Online login recorded for offline access');
    } catch (error) {
      console.error('❌ OfflineAuthManager: Failed to record online login:', error);
    }
  }

  /**
   * Check if device is currently online
   */
  static isOnline(): boolean {
    return OfflineManager.isOnline();
  }

  /**
   * Sync data when coming back online
   */
  static async syncOnReconnect(customerNumber: string): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    try {
      await OfflineManager.syncOnReconnect(customerNumber);
      console.log('✅ OfflineAuthManager: Data synced on reconnect');
    } catch (error) {
      console.error('❌ OfflineAuthManager: Failed to sync on reconnect:', error);
    }
  }

  /**
   * Clear offline data for admin deletion
   */
  static async clearOfflineData(customerNumber: string): Promise<void> {
    try {
      await OfflineManager.clearUserData(customerNumber);
      console.log('✅ OfflineAuthManager: Offline data cleared');
    } catch (error) {
      console.error('❌ OfflineAuthManager: Failed to clear offline data:', error);
    }
  }
}