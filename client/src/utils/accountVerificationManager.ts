// Account Verification Manager
// Ensures only verified accounts can access protected routes
import { UserDataManager } from './userDataManager';
import { OfflineManager } from './offlineManager';

export interface VerificationStatus {
  isVerified: boolean;
  hasEssentialFields: boolean;
  verifiedOnline: boolean;
  verificationTimestamp?: number;
  reason?: string;
}

export class AccountVerificationManager {
  private static readonly ONLINE_VERIFICATION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if user account is verified and has essential fields
   */
  static checkAccountVerification(customerNumber: string): VerificationStatus {
    try {
      // Get user data from storage
      const userData = UserDataManager.getUserData(customerNumber);
      
      if (!userData) {
        return {
          isVerified: false,
          hasEssentialFields: false,
          verifiedOnline: false,
          reason: 'User data not found in storage'
        };
      }

      // Check essential fields
      const hasEssentialFields = this.validateEssentialFields(userData);
      
      if (!hasEssentialFields.valid) {
        return {
          isVerified: false,
          hasEssentialFields: false,
          verifiedOnline: false,
          reason: hasEssentialFields.reason
        };
      }

      // Check verification flag
      const isVerified = userData.verified === true || userData.accountVerified === true;
      
      if (!isVerified) {
        return {
          isVerified: false,
          hasEssentialFields: true,
          verifiedOnline: false,
          reason: 'Account not verified - please complete signup process'
        };
      }

      // Check online verification timestamp for offline scenarios
      const verificationTimestamp = userData.verificationTimestamp || userData.dateCreated;
      const verifiedOnline = this.checkOnlineVerification(verificationTimestamp);

      return {
        isVerified: true,
        hasEssentialFields: true,
        verifiedOnline: verifiedOnline.valid,
        verificationTimestamp: verificationTimestamp ? new Date(verificationTimestamp).getTime() : undefined,
        reason: verifiedOnline.valid ? 'Account verified' : verifiedOnline.reason
      };

    } catch (error) {
      console.error('AccountVerificationManager: Error checking verification:', error);
      return {
        isVerified: false,
        hasEssentialFields: false,
        verifiedOnline: false,
        reason: 'Error checking verification status'
      };
    }
  }

  /**
   * Validate essential user data fields
   */
  private static validateEssentialFields(userData: any): { valid: boolean; reason?: string } {
    // Check for essential fields
    if (!userData.email || typeof userData.email !== 'string' || !userData.email.includes('@')) {
      return { valid: false, reason: 'Valid email address required' };
    }

    if (!userData.name || typeof userData.name !== 'string' || userData.name.trim().length === 0) {
      return { valid: false, reason: 'Full name required' };
    }

    if (!userData.customerNumber || typeof userData.customerNumber !== 'string') {
      return { valid: false, reason: 'Customer number required' };
    }

    if (!userData.dateCreated && !userData.createdAt && !userData.joinDate) {
      return { valid: false, reason: 'Account creation timestamp required' };
    }

    // Check for unique ID (could be customerNumber, id, or userId)
    if (!userData.customerNumber && !userData.id && !userData.userId) {
      return { valid: false, reason: 'Unique account identifier required' };
    }

    return { valid: true };
  }

  /**
   * Check if verification was done online within the acceptable window
   */
  private static checkOnlineVerification(verificationTimestamp?: string | number): { valid: boolean; reason?: string } {
    if (!verificationTimestamp) {
      return { valid: false, reason: 'No verification timestamp found' };
    }

    try {
      const timestamp = typeof verificationTimestamp === 'string' 
        ? new Date(verificationTimestamp).getTime()
        : verificationTimestamp;

      if (isNaN(timestamp)) {
        return { valid: false, reason: 'Invalid verification timestamp' };
      }

      const timeSinceVerification = Date.now() - timestamp;
      
      if (timeSinceVerification > this.ONLINE_VERIFICATION_WINDOW) {
        const hoursAgo = Math.floor(timeSinceVerification / (1000 * 60 * 60));
        return { 
          valid: false, 
          reason: `Account verified ${hoursAgo}h ago - please reconnect to verify online status` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Error validating verification timestamp' };
    }
  }

  /**
   * Check verification status for offline scenarios
   */
  static async checkOfflineVerification(customerNumber: string): Promise<VerificationStatus> {
    try {
      // First check local storage verification
      const localVerification = this.checkAccountVerification(customerNumber);
      
      if (!localVerification.isVerified) {
        return localVerification;
      }

      // For offline scenarios, also check IndexedDB cached data
      const cachedUserData = await OfflineManager.getCachedUserData(customerNumber);
      
      if (cachedUserData) {
        // Validate cached data has verification info
        const cachedVerification = cachedUserData.verified === true || cachedUserData.accountVerified === true;
        const hasOnlineVerificationWindow = await OfflineManager.canLoginOffline(customerNumber);
        
        if (cachedVerification && hasOnlineVerificationWindow.allowed) {
          return {
            isVerified: true,
            hasEssentialFields: true,
            verifiedOnline: true,
            verificationTimestamp: cachedUserData.verificationTimestamp ? new Date(cachedUserData.verificationTimestamp).getTime() : undefined,
            reason: `Offline verification valid (${hasOnlineVerificationWindow.timeRemaining} remaining)`
          };
        }
      }

      return localVerification;
    } catch (error) {
      console.error('AccountVerificationManager: Error checking offline verification:', error);
      return {
        isVerified: false,
        hasEssentialFields: false,
        verifiedOnline: false,
        reason: 'Error checking offline verification'
      };
    }
  }

  /**
   * Mark account as verified after successful signup
   */
  static markAccountVerified(customerNumber: string): boolean {
    try {
      const userData = UserDataManager.getUserData(customerNumber);
      
      if (!userData) {
        console.error('AccountVerificationManager: Cannot verify - user data not found');
        return false;
      }

      // Update verification status
      const updatedData = {
        ...userData,
        verified: true,
        accountVerified: true,
        verificationTimestamp: new Date().toISOString(),
        lastVerificationCheck: new Date().toISOString()
      };

      UserDataManager.setUserData(customerNumber, updatedData);
      console.log('✅ AccountVerificationManager: Account marked as verified');
      return true;
    } catch (error) {
      console.error('❌ AccountVerificationManager: Failed to mark account as verified:', error);
      return false;
    }
  }

  /**
   * Silent background verification check
   */
  static async performSilentVerificationCheck(customerNumber: string): Promise<{
    canProceed: boolean;
    redirectTo?: string;
    message?: string;
    isOfflineValid?: boolean;
  }> {
    try {
      // Check if online
      const isOnline = navigator.onLine;
      
      let verification: VerificationStatus;
      
      if (isOnline) {
        // Online verification check
        verification = this.checkAccountVerification(customerNumber);
      } else {
        // Offline verification check
        verification = await this.checkOfflineVerification(customerNumber);
      }

      // If not verified, block access but don't redirect to signup
      if (!verification.isVerified) {
        return {
          canProceed: false,
          redirectTo: '/login',
          message: 'Account not verified. Please contact support to complete account verification.',
          isOfflineValid: false
        };
      }

      // If offline and not verified online within window
      if (!isOnline && !verification.verifiedOnline) {
        return {
          canProceed: false,
          redirectTo: '/login',
          message: 'Please connect to the internet to verify your account status.',
          isOfflineValid: false
        };
      }

      // All checks passed
      return {
        canProceed: true,
        isOfflineValid: !isOnline && verification.verifiedOnline
      };

    } catch (error) {
      console.error('AccountVerificationManager: Silent verification check failed:', error);
      return {
        canProceed: false,
        redirectTo: '/login',
        message: 'Unable to verify account status. Please try again.',
        isOfflineValid: false
      };
    }
  }

  /**
   * Get user-friendly verification status message
   */
  static getVerificationStatusMessage(verification: VerificationStatus): string {
    if (verification.isVerified && verification.verifiedOnline) {
      return 'Account verified and ready for use';
    }

    if (verification.isVerified && !verification.verifiedOnline) {
      return 'Account verified offline - connect to internet for full access';
    }

    if (!verification.hasEssentialFields) {
      return 'Account setup incomplete - please finish registration';
    }

    return verification.reason || 'Account verification required';
  }

  /**
   * Check if current session should be allowed based on verification
   */
  static shouldAllowSession(customerNumber: string, isOffline: boolean = false): {
    allowed: boolean;
    reason?: string;
    redirectTo?: string;
  } {
    const verification = this.checkAccountVerification(customerNumber);

    if (!verification.isVerified) {
      return {
        allowed: false,
        reason: verification.reason,
        redirectTo: '/login'
      };
    }

    if (isOffline && !verification.verifiedOnline) {
      return {
        allowed: false,
        reason: 'Offline access requires recent online verification',
        redirectTo: '/login'
      };
    }

    return { allowed: true };
  }
}