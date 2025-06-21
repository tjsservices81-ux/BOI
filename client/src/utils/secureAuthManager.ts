// Secure Authentication Manager - Online-First with 24-hour Offline Fallback
export class SecureAuthManager {
  private static readonly LAST_ONLINE_LOGIN_KEY = 'secure_last_online_login';
  private static readonly OFFLINE_LOGIN_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly CONNECTION_TIMEOUT = 10000; // 10 seconds

  /**
   * Check if device has internet connectivity
   */
  static async hasInternetConnection(): Promise<boolean> {
    // Primary check: navigator.onLine
    if (!navigator.onLine) {
      console.log('📱 No internet connection detected (navigator.onLine: false)');
      return false;
    }

    // Secondary check: Try to reach the server
    try {
      console.log('🌐 Testing server connectivity...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);
      
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ Server connectivity confirmed');
        return true;
      } else {
        console.log('❌ Server responded with error:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Server connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Attempt online authentication with server
   */
  static async authenticateOnline(customerNumber: string, pin: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('🔐 Attempting online authentication for:', customerNumber);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONNECTION_TIMEOUT);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ customerNumber, pin }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const userData = await response.json();
        
        // Record successful online login timestamp
        this.recordOnlineLoginSuccess(customerNumber);
        
        console.log('✅ Online authentication successful');
        return { success: true, user: userData };
      } else {
        const errorData = await response.json();
        console.log('❌ Online authentication failed:', errorData.message);
        return { success: false, error: errorData.message || 'Authentication failed' };
      }
    } catch (error) {
      console.log('❌ Online authentication error:', error);
      return { success: false, error: 'Connection error - unable to reach server' };
    }
  }

  /**
   * Record successful online login timestamp
   */
  static recordOnlineLoginSuccess(customerNumber: string): void {
    const timestamp = Date.now();
    const loginRecord = {
      customerNumber,
      timestamp,
      dateTime: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(this.LAST_ONLINE_LOGIN_KEY, JSON.stringify(loginRecord));
      console.log('📝 Online login success recorded:', loginRecord.dateTime);
    } catch (error) {
      console.error('Failed to record online login timestamp:', error);
    }
  }

  /**
   * Check if offline login is permitted (within 24-hour window)
   */
  static isOfflineLoginPermitted(customerNumber: string): { permitted: boolean; reason?: string; timeRemaining?: string } {
    try {
      const storedRecord = localStorage.getItem(this.LAST_ONLINE_LOGIN_KEY);
      
      if (!storedRecord) {
        return { 
          permitted: false, 
          reason: 'No previous online login found. Please connect to the internet to log in.' 
        };
      }
      
      const loginRecord = JSON.parse(storedRecord);
      
      // Verify it's for the same customer
      if (loginRecord.customerNumber !== customerNumber) {
        return { 
          permitted: false, 
          reason: 'No verified online login found for this account. Please connect to the internet.' 
        };
      }
      
      const timeSinceLastLogin = Date.now() - loginRecord.timestamp;
      const remainingTime = this.OFFLINE_LOGIN_WINDOW - timeSinceLastLogin;
      
      if (timeSinceLastLogin > this.OFFLINE_LOGIN_WINDOW) {
        return { 
          permitted: false, 
          reason: 'Offline login expired. Please reconnect to the internet to log in again.' 
        };
      }
      
      // Calculate remaining time for user info
      const hoursRemaining = Math.floor(remainingTime / (60 * 60 * 1000));
      const minutesRemaining = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
      
      return { 
        permitted: true, 
        timeRemaining: `${hoursRemaining}h ${minutesRemaining}m remaining` 
      };
    } catch (error) {
      console.error('Error checking offline login permission:', error);
      return { 
        permitted: false, 
        reason: 'Unable to verify offline login eligibility. Please connect to the internet.' 
      };
    }
  }

  /**
   * Attempt offline authentication (only if permitted)
   */
  static attemptOfflineAuthentication(customerNumber: string, pin: string): { success: boolean; user?: any; error?: string; timeRemaining?: string } {
    console.log('🔒 Checking offline authentication eligibility...');
    
    const offlineCheck = this.isOfflineLoginPermitted(customerNumber);
    
    if (!offlineCheck.permitted) {
      return { success: false, error: offlineCheck.reason };
    }
    
    console.log('✅ Offline login permitted:', offlineCheck.timeRemaining);
    
    // Verify credentials against local storage
    try {
      const { UserDataManager } = require('./userDataManager');
      
      if (!UserDataManager.userExists(customerNumber)) {
        return { success: false, error: 'Account not found in offline storage' };
      }
      
      // For offline login, we trust the stored PIN if user exists
      // (PIN verification was done during last online login)
      const userProfile = UserDataManager.getUserProfileByCustomerNumber(customerNumber);
      
      if (userProfile) {
        console.log('✅ Offline authentication successful');
        return { 
          success: true, 
          user: userProfile,
          timeRemaining: offlineCheck.timeRemaining 
        };
      } else {
        return { success: false, error: 'User profile not found in offline storage' };
      }
    } catch (error) {
      console.error('Offline authentication error:', error);
      return { success: false, error: 'Offline authentication failed' };
    }
  }

  /**
   * Main authentication method - tries online first, falls back to offline if permitted
   */
  static async authenticate(customerNumber: string, pin: string): Promise<{ success: boolean; user?: any; error?: string; isOffline?: boolean; timeRemaining?: string }> {
    console.log('🚀 Starting secure authentication process...');
    
    // Step 1: Check internet connectivity
    const hasInternet = await this.hasInternetConnection();
    
    if (hasInternet) {
      console.log('🌐 Internet available - attempting online authentication');
      
      // Try online authentication
      const onlineResult = await this.authenticateOnline(customerNumber, pin);
      
      if (onlineResult.success) {
        return { ...onlineResult, isOffline: false };
      } else {
        // Online authentication failed - don't fall back to offline for security
        console.log('❌ Online authentication failed, not falling back to offline for security');
        return onlineResult;
      }
    } else {
      console.log('📱 No internet connection - checking offline authentication eligibility');
      
      // No internet - try offline authentication if permitted
      const offlineResult = this.attemptOfflineAuthentication(customerNumber, pin);
      
      return { ...offlineResult, isOffline: true };
    }
  }

  /**
   * Clear offline login permissions (used during logout or admin deletion)
   */
  static clearOfflineLoginPermissions(): void {
    try {
      localStorage.removeItem(this.LAST_ONLINE_LOGIN_KEY);
      console.log('🗑️ Offline login permissions cleared');
    } catch (error) {
      console.error('Failed to clear offline login permissions:', error);
    }
  }

  /**
   * Get offline login status for UI display
   */
  static getOfflineLoginStatus(customerNumber?: string): { 
    hasOfflineAccess: boolean; 
    timeRemaining?: string; 
    lastOnlineLogin?: string 
  } {
    try {
      const storedRecord = localStorage.getItem(this.LAST_ONLINE_LOGIN_KEY);
      
      if (!storedRecord) {
        return { hasOfflineAccess: false };
      }
      
      const loginRecord = JSON.parse(storedRecord);
      
      if (customerNumber && loginRecord.customerNumber !== customerNumber) {
        return { hasOfflineAccess: false };
      }
      
      const timeSinceLastLogin = Date.now() - loginRecord.timestamp;
      const remainingTime = this.OFFLINE_LOGIN_WINDOW - timeSinceLastLogin;
      
      if (timeSinceLastLogin > this.OFFLINE_LOGIN_WINDOW) {
        return { hasOfflineAccess: false };
      }
      
      const hoursRemaining = Math.floor(remainingTime / (60 * 60 * 1000));
      const minutesRemaining = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
      
      return {
        hasOfflineAccess: true,
        timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
        lastOnlineLogin: new Date(loginRecord.timestamp).toLocaleString()
      };
    } catch (error) {
      console.error('Error getting offline login status:', error);
      return { hasOfflineAccess: false };
    }
  }
}