import express from 'express';

/**
 * SECURITY: Permanent Authentication Manager
 * Ensures deleted users stay permanently locked out with no re-entry mechanisms
 */
export class PermanentAuthManager {
  private static deletedUsers: Set<string> = new Set();
  private static revokedSessions: Map<string, Date> = new Map();

  /**
   * Mark a user as permanently deleted
   */
  static markUserDeleted(customerNumber: string): void {
    this.deletedUsers.add(customerNumber);
    this.revokeAllUserSessions(customerNumber);
    console.log(`🚫 User ${customerNumber} marked as permanently deleted`);
  }

  /**
   * Check if a user is permanently deleted
   */
  static isUserDeleted(customerNumber: string): boolean {
    return this.deletedUsers.has(customerNumber);
  }

  /**
   * Revoke all sessions for a specific user
   */
  static revokeAllUserSessions(customerNumber: string): void {
    const sessionKey = `user_${customerNumber}`;
    this.revokedSessions.set(sessionKey, new Date());
    console.log(`🔒 All sessions revoked for user ${customerNumber}`);
  }

  /**
   * Validate session hasn't been revoked
   */
  static isSessionValid(customerNumber: string, sessionStartTime?: Date): boolean {
    const sessionKey = `user_${customerNumber}`;
    const revokedTime = this.revokedSessions.get(sessionKey);
    
    if (!revokedTime) {
      return true; // No revocation recorded
    }
    
    if (!sessionStartTime) {
      return false; // Can't validate without session time
    }
    
    return sessionStartTime > revokedTime;
  }

  /**
   * Express middleware to block deleted users
   */
  static createAuthMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const session = req.session as any;
      
      if (session?.user?.customerNumber) {
        const customerNumber = session.user.customerNumber;
        
        // Check if user is permanently deleted
        if (this.isUserDeleted(customerNumber)) {
          console.log(`🚫 Blocked access attempt by deleted user: ${customerNumber}`);
          
          // Clear session data
          req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
            }
          });
          
          return res.status(401).json({ 
            error: 'User account no longer exists',
            isLoggedIn: false 
          });
        }
        
        // Check if session is revoked
        if (!this.isSessionValid(customerNumber, session.sessionStartTime)) {
          console.log(`🚫 Blocked revoked session for user: ${customerNumber}`);
          
          req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
            }
          });
          
          return res.status(401).json({ 
            error: 'Session has been revoked',
            isLoggedIn: false 
          });
        }
      }
      
      next();
    };
  }

  /**
   * Get list of all deleted users (for admin panel)
   */
  static getDeletedUsers(): string[] {
    return Array.from(this.deletedUsers);
  }

  /**
   * Clear all data (admin only - for testing)
   */
  static adminReset(): void {
    this.deletedUsers.clear();
    this.revokedSessions.clear();
    console.log('🧹 Admin reset: All permanent auth data cleared');
  }
}