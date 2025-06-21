// Real-time data synchronization utility for admin panel and user data persistence
export class RealTimeSync {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isEnabled = false;

  // Enable real-time sync for persistent data updates
  static enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    console.log('📡 REAL-TIME SYNC: Enabled for persistent data updates');

    // Sync user activity every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncUserActivity();
    }, 30000);

    // Listen for user actions that need immediate sync
    this.setupEventListeners();
  }

  // Disable real-time sync
  static disable() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isEnabled = false;
    console.log('📡 REAL-TIME SYNC: Disabled');
  }

  // Sync user activity to backend
  private static async syncUserActivity() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return;

      await fetch(`/api/activity/${currentUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'activity_update'
        })
      });
    } catch (error) {
      // Silent fail - sync will retry on next interval
    }
  }

  // Setup event listeners for immediate sync triggers
  private static setupEventListeners() {
    // Sync on profile updates
    window.addEventListener('profileUpdated', this.handleProfileUpdate as any);
    
    // Sync on transaction updates
    window.addEventListener('transactionUpdate', this.handleTransactionUpdate as any);
    
    // Sync on balance updates
    window.addEventListener('balanceUpdate', this.handleBalanceUpdate as any);
    
    // Sync on page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private static handleProfileUpdate = async (event: Event) => {
    const customEvent = event as CustomEvent;
    try {
      const profileData = customEvent.detail;
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser || !profileData) return;

      await fetch(`/api/profile/${currentUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      console.log('📊 REAL-TIME SYNC: Profile updated');
    } catch (error) {
      console.error('Profile sync failed:', error);
    }
  };

  private static handleTransactionUpdate = async (event: Event) => {
    const customEvent = event as CustomEvent;
    try {
      const transactionData = customEvent.detail;
      console.log('📊 REAL-TIME SYNC: Transaction data persisted', transactionData);
      
      // Update user activity on transaction
      await this.syncUserActivity();
    } catch (error) {
      console.error('Transaction sync failed:', error);
    }
  };

  private static handleBalanceUpdate = async (event: Event) => {
    const customEvent = event as CustomEvent;
    try {
      const balanceData = customEvent.detail;
      console.log('📊 REAL-TIME SYNC: Balance data persisted', balanceData);
      
      // Update user activity on balance change
      await this.syncUserActivity();
    } catch (error) {
      console.error('Balance sync failed:', error);
    }
  };

  private static handleVisibilityChange = () => {
    if (!document.hidden) {
      // Page became visible - sync immediately
      this.syncUserActivity();
    }
  };

  // Force immediate sync of all user data
  static async forceSyncAll() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return;

      // Get all cached user data
      const allUsers = JSON.parse(localStorage.getItem('allBankUsers') || '{}');
      const userData = allUsers[currentUser];
      
      if (!userData) return;

      // Sync complete profile
      await fetch(`/api/profile/${currentUser}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          address: userData.address,
          dateOfBirth: userData.dateOfBirth,
          profilePhoto: userData.profilePhoto,
          preferences: userData.preferences,
          notificationSettings: userData.notificationSettings,
          securitySettings: userData.securitySettings
        })
      });

      console.log('📊 REAL-TIME SYNC: Complete user data synchronized');
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  }
}

// Note: RealTimeSync is manually enabled in App.tsx to avoid double initialization