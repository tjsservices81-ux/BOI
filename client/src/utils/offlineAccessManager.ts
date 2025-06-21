// Enhanced Offline Access Manager for Initial App Launch
import { OfflineManager } from './offlineManager';
import { OfflineAuthManager } from './offlineAuthManager';
import { UserDataManager } from './userDataManager';

interface OfflineAccessConfig {
  affectedScreen: string;
  fallbackBehavior: 'loadFromIndexedDBCache' | 'showOfflineMessage';
  conditions: {
    networkUnavailable: boolean;
    cachedDataAvailable: boolean;
    lastOnlineLoginWithin: string;
  };
  preventRedirects: boolean;
  preserve: string[];
  debugMode: boolean;
  testDevice: string;
}

export class OfflineAccessManager {
  private static readonly OFFLINE_WINDOW_24H = 24 * 60 * 60 * 1000;

  /**
   * Ensure offline support for initial app launch
   */
  static async ensureOfflineSupport(config: OfflineAccessConfig): Promise<{
    success: boolean;
    action: string;
    userData?: any;
    message?: string;
    debugInfo?: any;
  }> {
    const debugInfo: any = {
      timestamp: Date.now(),
      config,
      checks: {}
    };

    try {
      // Initialize IndexedDB
      await OfflineManager.initialize();
      debugInfo.checks.indexedDBInitialized = true;

      // Check network status
      const isOnline = navigator.onLine;
      debugInfo.checks.networkOnline = isOnline;

      if (config.conditions.networkUnavailable && isOnline) {
        return {
          success: true,
          action: 'network_available_proceed_online',
          debugInfo: config.debugMode ? debugInfo : undefined
        };
      }

      // Network is unavailable, check for cached data
      const lastActiveUser = UserDataManager.getLastActiveUser();
      debugInfo.checks.lastActiveUser = lastActiveUser;

      if (!lastActiveUser) {
        return {
          success: false,
          action: 'no_cached_user_require_online',
          message: 'No cached user data found. Please connect to the internet to log in.',
          debugInfo: config.debugMode ? debugInfo : undefined
        };
      }

      // Check if cached data is available and valid
      const offlineEligibility = await OfflineManager.canLoginOffline(lastActiveUser);
      debugInfo.checks.offlineEligible = offlineEligibility;

      if (!offlineEligibility.allowed) {
        return {
          success: false,
          action: 'offline_expired_require_online',
          message: 'Offline access expired. Please reconnect to the internet to log in.',
          debugInfo: config.debugMode ? debugInfo : undefined
        };
      }

      // Load cached user data for offline access
      const cachedUserData = await OfflineManager.getCachedUserData(lastActiveUser);
      const cachedAccounts = await OfflineManager.getCachedAccountData(lastActiveUser);
      const cachedTransactions = await OfflineManager.getCachedTransactionData(lastActiveUser);

      debugInfo.checks.cachedData = {
        userData: !!cachedUserData,
        accounts: !!cachedAccounts,
        transactions: !!cachedTransactions
      };

      if (!cachedUserData) {
        return {
          success: false,
          action: 'no_cached_data_require_online',
          message: 'No cached user data available. Please connect to the internet to log in.',
          debugInfo: config.debugMode ? debugInfo : undefined
        };
      }

      // Restore cached data to UserDataManager
      if (config.preserve.includes('authSession')) {
        UserDataManager.setCurrentUser(lastActiveUser);
      }

      if (config.preserve.includes('localUserData')) {
        if (cachedAccounts && cachedAccounts.length > 0) {
          UserDataManager.setUserData('bankAccounts', cachedAccounts);
        }
        
        if (cachedTransactions && cachedTransactions.length > 0) {
          UserDataManager.setUserData('bankTransactions', cachedTransactions);
        }
      }

      // Mark app as properly initialized from cache
      if (!config.preventRedirects) {
        localStorage.setItem('app_session_active', 'true');
        localStorage.setItem('splash_completed', 'true');
        localStorage.setItem('offline_mode_active', 'true');
        localStorage.setItem('offline_user', lastActiveUser);
        localStorage.setItem('offline_time_remaining', offlineEligibility.timeRemaining || '');
      }

      debugInfo.checks.restoration = 'success';

      return {
        success: true,
        action: 'offline_access_granted',
        userData: cachedUserData,
        message: `Offline access granted. Time remaining: ${offlineEligibility.timeRemaining || 'Limited'}`,
        debugInfo: config.debugMode ? debugInfo : undefined
      };

    } catch (error) {
      debugInfo.checks.error = error;
      console.error('OfflineAccessManager: Error ensuring offline support:', error);
      
      return {
        success: false,
        action: 'error_fallback_to_online',
        message: 'Error accessing offline data. Please connect to the internet.',
        debugInfo: config.debugMode ? debugInfo : undefined
      };
    }
  }

  /**
   * Check if offline access is currently active
   */
  static isOfflineMode(): boolean {
    return localStorage.getItem('offline_mode_active') === 'true';
  }

  /**
   * Get current offline user
   */
  static getOfflineUser(): string | null {
    return localStorage.getItem('offline_user');
  }

  /**
   * Get remaining offline time
   */
  static getOfflineTimeRemaining(): string | null {
    return localStorage.getItem('offline_time_remaining');
  }

  /**
   * Clear offline mode when coming back online
   */
  static clearOfflineMode(): void {
    localStorage.removeItem('offline_mode_active');
    localStorage.removeItem('offline_user');
    localStorage.removeItem('offline_time_remaining');
  }

  /**
   * Handle reconnection scenarios
   */
  static async handleReconnection(): Promise<void> {
    const offlineUser = this.getOfflineUser();
    
    if (offlineUser && navigator.onLine) {
      try {
        // Sync data when coming back online
        await OfflineManager.syncOnReconnect(offlineUser);
        
        // Clear offline mode flags
        this.clearOfflineMode();
        
        console.log('✅ OfflineAccessManager: Reconnection sync completed');
      } catch (error) {
        console.error('❌ OfflineAccessManager: Reconnection sync failed:', error);
      }
    }
  }

  /**
   * Pre-cache essential data for offline access
   */
  static async precacheEssentialData(customerNumber: string): Promise<void> {
    try {
      // This would typically fetch and cache user's most recent data
      // For now, we ensure IndexedDB is ready
      await OfflineManager.initialize();
      
      // Store current timestamp for offline eligibility
      const userData = UserDataManager.getUserProfile();
      if (userData) {
        await OfflineManager.storeUserData(customerNumber, userData, {
          lastAccess: Date.now(),
          deviceType: this.detectDevice()
        });
      }
      
      console.log('✅ OfflineAccessManager: Essential data precached');
    } catch (error) {
      console.error('❌ OfflineAccessManager: Failed to precache data:', error);
    }
  }

  /**
   * Detect device type for optimization
   */
  private static detectDevice(): string {
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return 'iOS';
    } else if (/Android/.test(userAgent)) {
      return 'Android';
    } else {
      return 'Desktop';
    }
  }

  /**
   * Enhanced offline eligibility check with device-specific optimizations
   */
  static async checkOfflineEligibilityEnhanced(customerNumber: string): Promise<{
    eligible: boolean;
    timeRemaining?: string;
    deviceOptimized: boolean;
    cacheSize?: string;
    reason?: string;
  }> {
    try {
      const basicEligibility = await OfflineManager.canLoginOffline(customerNumber);
      
      if (!basicEligibility.allowed) {
        return {
          eligible: false,
          deviceOptimized: false,
          reason: 'Offline window expired or no cached data'
        };
      }

      // Check cache size and device optimization
      const deviceType = this.detectDevice();
      const cachedData = await OfflineManager.getCachedUserData(customerNumber);
      const cachedAccounts = await OfflineManager.getCachedAccountData(customerNumber);
      const cachedTransactions = await OfflineManager.getCachedTransactionData(customerNumber);

      const cacheSize = this.estimateCacheSize(cachedData, cachedAccounts, cachedTransactions);
      
      return {
        eligible: true,
        timeRemaining: basicEligibility.timeRemaining,
        deviceOptimized: deviceType === 'iOS' || deviceType === 'Android',
        cacheSize: this.formatCacheSize(cacheSize),
        reason: 'Offline access available'
      };

    } catch (error) {
      return {
        eligible: false,
        deviceOptimized: false,
        reason: 'Error checking offline eligibility'
      };
    }
  }

  /**
   * Estimate cache size for display
   */
  private static estimateCacheSize(userData: any, accounts: any, transactions: any): number {
    const dataStr = JSON.stringify({ userData, accounts, transactions });
    return new Blob([dataStr]).size;
  }

  /**
   * Format cache size for human reading
   */
  private static formatCacheSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
}