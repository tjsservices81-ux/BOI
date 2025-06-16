// App lifecycle management for state preservation
import { StateManager } from './stateManager';

export class AppLifecycle {
  private static isInitialized = false;
  private static lastActiveTime = Date.now();
  private static visibilityTimeout: NodeJS.Timeout | null = null;
  private static sessionId = Date.now().toString();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  static initialize() {
    if (this.isInitialized) return;

    // Check if this is a fresh app start
    this.checkForAppRestart();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page lifecycle events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
    
    // Handle focus/blur for more granular state management
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    // Start heartbeat to track app activity
    this.startHeartbeat();

    this.isInitialized = true;
  }

  static startHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Update activity timestamp every 10 seconds while app is active
    this.heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem('bankingAppLastActive', Date.now().toString());
      }
    }, 10000);
  }

  static stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  static checkForAppRestart() {
    const lastSessionId = localStorage.getItem('bankingAppSessionId');
    const currentTime = Date.now();
    const lastActiveTime = parseInt(localStorage.getItem('bankingAppLastActive') || '0');
    
    // Check if app was properly closed (more than 2 minutes inactive or no session)
    const timeSinceLastActive = currentTime - lastActiveTime;
    const isAppRestart = !lastSessionId || timeSinceLastActive > 120000; // 2 minutes
    
    if (isAppRestart) {
      console.log('App restart detected, clearing session state');
      // Clear all session data on app restart
      this.clearSessionState();
      
      // Always clear user session on app restart (simulate fresh app launch)
      localStorage.removeItem('bankingUser');
      
      // Mark as cold start to trigger login flow
      localStorage.setItem('force_cold_start', 'true');
      
      // Trigger immediate redirect to login
      setTimeout(() => {
        window.location.replace('/login');
      }, 50);
      
      return; // Exit early to prevent further initialization
    }
    
    // Set new session ID and activity time for continued session
    localStorage.setItem('bankingAppSessionId', this.sessionId);
    localStorage.setItem('bankingAppLastActive', currentTime.toString());
  }

  static clearSessionState() {
    // Clear temporary state but keep persistent data
    sessionStorage.clear();
    
    // Remove temporary state from localStorage
    const keysToRemove = [
      'bank_app_state',
      'bank_app_scroll_positions', 
      'bank_app_form_data',
      'bankingAppState',
      'bankingFormData',
      'bankingScrollPositions'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      // App going to background
      this.saveCurrentState();
      // Update last active time
      localStorage.setItem('bankingAppLastActive', Date.now().toString());
    } else {
      // App returning to foreground
      this.restoreStateIfNeeded();
      // Update last active time
      localStorage.setItem('bankingAppLastActive', Date.now().toString());
    }
  }

  static handleBeforeUnload() {
    this.saveCurrentState();
  }

  static handlePageHide() {
    this.saveCurrentState();
  }

  static handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      // Page was restored from cache
      this.restoreStateIfNeeded();
    }
  }

  static handleFocus() {
    this.lastActiveTime = Date.now();
    localStorage.setItem('bankingAppLastActive', this.lastActiveTime.toString());
  }

  static handleBlur() {
    // Update last active time immediately when app loses focus
    this.lastActiveTime = Date.now();
    localStorage.setItem('bankingAppLastActive', this.lastActiveTime.toString());
    
    // Delay saving state to avoid excessive saves
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }
    
    this.visibilityTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 100);
  }

  static saveCurrentState() {
    try {
      const currentUser = JSON.parse(localStorage.getItem('bankingUser') || 'null');
      const currentRoute = window.location.pathname;
      
      if (currentUser) {
        // Save scroll positions for all scroll containers
        const scrollPositions: Record<string, number> = {};
        
        document.querySelectorAll('[data-scroll-container]').forEach(element => {
          const container = element as HTMLElement;
          const route = container.dataset.scrollRoute;
          if (route) {
            scrollPositions[route] = container.scrollTop;
          }
        });

        // Save main window scroll if no specific containers
        if (Object.keys(scrollPositions).length === 0) {
          scrollPositions[currentRoute] = window.scrollY;
        }

        StateManager.saveAppState({
          currentRoute,
          user: currentUser,
          scrollPositions,
          formData: StateManager.getAllFormData(),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  static restoreStateIfNeeded() {
    try {
      const savedState = StateManager.restoreAppState();
      if (savedState && savedState.scrollPositions) {
        // Restore scroll positions after a brief delay
        setTimeout(() => {
          Object.entries(savedState.scrollPositions).forEach(([route, position]) => {
            const scrollPosition = typeof position === 'number' ? position : 0;
            const container = document.querySelector(`[data-scroll-route="${route}"]`) as HTMLElement;
            if (container && scrollPosition > 0) {
              container.scrollTo({ top: scrollPosition, behavior: 'instant' });
            } else if (route === window.location.pathname && scrollPosition > 0) {
              window.scrollTo({ top: scrollPosition, behavior: 'instant' });
            }
          });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  static cleanup() {
    if (!this.isInitialized) return;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('pagehide', this.handlePageHide.bind(this));
    window.removeEventListener('pageshow', this.handlePageShow.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));

    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }

    // Stop heartbeat
    this.stopHeartbeat();

    this.isInitialized = false;
  }
}