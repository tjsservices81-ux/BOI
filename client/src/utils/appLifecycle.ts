// App lifecycle management for state preservation
import { StateManager } from './stateManager';

export class AppLifecycle {
  private static isInitialized = false;
  private static lastActiveTime = Date.now();
  private static visibilityTimeout: NodeJS.Timeout | null = null;
  private static isAppTerminated = false;
  private static backgroundTime = 0;
  private static wasMinimized = false;
  // Session timeout removed - users stay logged in permanently unless admin deletes account

  static initialize() {
    if (this.isInitialized) return;

    // Check if this is a fresh app start vs. restoration
    AppLifecycle.checkAppTermination();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle page lifecycle events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
    
    // Handle focus/blur for more granular state management
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    this.isInitialized = true;
  }

  static checkAppTermination() {
    // Check for reliable indicators of app termination vs minimization
    const appActiveMarker = sessionStorage.getItem('app_active_session');
    const wasMinimizedFlag = sessionStorage.getItem('app_was_minimized');
    // Use global localStorage for app lifecycle (not user-specific)
    const sessionData = localStorage.getItem('app_session_state');
    
    // If no session data exists, this is a fresh start
    if (!sessionData) {
      this.isAppTerminated = true;
      this.wasMinimized = false;
      return;
    }
    
    // If app was explicitly marked as minimized and session still exists, treat as minimize
    if (wasMinimizedFlag === 'true' && appActiveMarker) {
      this.isAppTerminated = false;
      this.wasMinimized = true;
      console.log('🔄 App resuming from minimize - restoring state');
      return;
    }
    
    // If no active session marker, app was fully closed/terminated
    if (!appActiveMarker) {
      this.isAppTerminated = true;
      this.wasMinimized = false;
      console.log('🚀 Fresh app start - checking session');
      // Clear the minimized flag since this is a fresh start
      sessionStorage.removeItem('app_was_minimized');
      return;
    }
    
    // Default to minimized state if session marker exists
    this.isAppTerminated = false;
    this.wasMinimized = true;
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      // App going to background - mark as minimized and save state
      this.backgroundTime = Date.now();
      this.wasMinimized = true;
      // Use global localStorage for app lifecycle (not user-specific)
      localStorage.setItem('app_background_time', this.backgroundTime.toString());
      sessionStorage.setItem('app_was_minimized', 'true');
      sessionStorage.setItem('app_active_session', 'true');
      this.saveCurrentState();
    } else {
      // App returning to foreground - restore state if minimized
      if (this.wasMinimized && !this.isAppTerminated) {
        this.restoreStateIfNeeded();
      }
    }
  }

  static handleBeforeUnload() {
    // Clear session marker to detect force close
    sessionStorage.removeItem('app_active_session');
    sessionStorage.removeItem('app_was_minimized');
    this.saveCurrentState();
  }

  static handlePageHide() {
    // Only clear if not minimized - pagehide fires on both minimize and close
    if (!this.wasMinimized) {
      sessionStorage.removeItem('app_active_session');
      sessionStorage.removeItem('app_was_minimized');
    }
    this.saveCurrentState();
  }

  static handlePageShow(event: PageTransitionEvent) {
    // Set session marker to indicate active session
    sessionStorage.setItem('app_active_session', 'true');
    
    if (event.persisted && !this.isAppTerminated) {
      // Page was restored from cache and not terminated
      this.restoreStateIfNeeded();
    }
  }

  static handleFocus() {
    this.lastActiveTime = Date.now();
    sessionStorage.setItem('app_active_session', 'true');
  }

  static handleBlur() {
    // Delay saving state to avoid excessive saves
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }
    
    this.visibilityTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 100);
  }

  static clearAppState() {
    // Only clear temporary session data, preserve user login
    localStorage.removeItem('app_session_state');
    localStorage.removeItem('app_background_time');
    sessionStorage.removeItem('app_active_session');
    sessionStorage.removeItem('app_was_minimized');
    this.wasMinimized = false;
    this.isAppTerminated = true;
    // Don't call StateManager.clearAppState() - preserve user login
  }

  static getAppTerminationState() {
    return {
      isAppTerminated: this.isAppTerminated,
      wasMinimized: this.wasMinimized
    };
  }

  static isResumingFromMinimize() {
    return this.wasMinimized && !this.isAppTerminated;
  }

  static isFreshStart() {
    return this.isAppTerminated && !this.wasMinimized;
  }

  static saveCurrentState() {
    try {
      // Get current user through UserDataManager for consistency
      const currentUser = localStorage.getItem('currentUser');
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

    this.isInitialized = false;
  }
}