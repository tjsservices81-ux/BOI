// PWA Session Management - handles persistence when minimized vs full close
export class SessionManager {
  private static readonly SESSION_KEY = 'sessionToken';
  private static readonly SESSION_TEMP_KEY = 'sessionToken_temp';
  private static readonly SESSION_CREATED_KEY = 'sessionCreated';
  private static readonly MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Store session with both persistent and temporary storage
  static setSession(token: string): void {
    // localStorage persists across app minimization
    localStorage.setItem(this.SESSION_KEY, token);
    localStorage.setItem(this.SESSION_CREATED_KEY, Date.now().toString());
    
    // sessionStorage is cleared when app is fully closed/swiped up
    sessionStorage.setItem(this.SESSION_TEMP_KEY, token);
    
    // Mark session as active in this instance
    sessionStorage.setItem('sessionActive', 'true');
  }

  // Get session token with validation
  static getSession(): string | null {
    const persistentToken = localStorage.getItem(this.SESSION_KEY);
    const tempToken = sessionStorage.getItem(this.SESSION_TEMP_KEY);
    
    // If no temporary token, app was fully closed
    if (!tempToken && persistentToken) {
      this.clearSession();
      return null;
    }
    
    // Validate session age
    if (!this.isSessionValid()) {
      this.clearSession();
      return null;
    }
    
    return persistentToken;
  }

  // Check if session is still valid by age
  static isSessionValid(): boolean {
    const sessionCreated = localStorage.getItem(this.SESSION_CREATED_KEY);
    if (!sessionCreated) return false;
    
    const sessionAge = Date.now() - parseInt(sessionCreated);
    return sessionAge < this.MAX_SESSION_AGE;
  }

  // Clear all session data
  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_CREATED_KEY);
    sessionStorage.removeItem(this.SESSION_TEMP_KEY);
    sessionStorage.removeItem('sessionActive');
  }

  // Check if app was minimized vs fully closed
  static checkAppLifecycle(): 'minimized' | 'closed' | 'fresh' {
    const persistentToken = localStorage.getItem(this.SESSION_KEY);
    const tempToken = sessionStorage.getItem(this.SESSION_TEMP_KEY);
    const wasActive = sessionStorage.getItem('sessionActive');
    
    if (!persistentToken) {
      return 'fresh'; // No previous session
    }
    
    if (persistentToken && !tempToken) {
      return 'closed'; // App was fully closed/swiped up
    }
    
    if (persistentToken && tempToken && wasActive) {
      return 'minimized'; // App was just minimized
    }
    
    return 'fresh';
  }

  // Setup PWA lifecycle listeners
  static setupLifecycleListeners(): void {
    // Handle app coming back to foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const lifecycle = this.checkAppLifecycle();
        
        if (lifecycle === 'closed') {
          // App was fully closed - clear session
          this.clearSession();
          window.location.reload();
        } else if (lifecycle === 'minimized') {
          // App was minimized - restore temporary session marker
          const persistentToken = localStorage.getItem(this.SESSION_KEY);
          if (persistentToken) {
            sessionStorage.setItem(this.SESSION_TEMP_KEY, persistentToken);
            sessionStorage.setItem('sessionActive', 'true');
          }
        }
      }
    });

    // Handle page unload/close
    window.addEventListener('beforeunload', () => {
      // Keep persistent storage, clear temporary markers
      sessionStorage.removeItem('sessionActive');
    });

    // Handle PWA install prompt
    window.addEventListener('appinstalled', () => {
      console.log('Banking app installed as PWA');
    });
  }
}