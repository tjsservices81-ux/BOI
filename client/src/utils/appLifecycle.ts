// App lifecycle management for state preservation - NO AUTOMATIC LOGOUTS
import { StateManager } from './stateManager';

export class AppLifecycle {
  private static isInitialized = false;
  private static lastActiveTime = Date.now();
  private static visibilityTimeout: NodeJS.Timeout | null = null;
  private static isAppTerminated = false;
  private static backgroundTime = 0;

  static initialize() {
    if (this.isInitialized) return;

    // Handle page lifecycle events for state preservation only
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    this.isInitialized = true;
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      // App going to background - preserve all state without any session checks
      this.backgroundTime = Date.now();
      localStorage.setItem('app_background_time', this.backgroundTime.toString());
      this.saveCurrentState();
    } else {
      // App returning to foreground - always restore state, no session validation
      this.restoreStateIfNeeded();
    }
  }

  static handleBeforeUnload() {
    // Clear session marker to detect force close
    sessionStorage.removeItem('app_active_session');
    this.saveCurrentState();
  }

  static handlePageHide() {
    sessionStorage.removeItem('app_active_session');
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
    // Save state immediately without timeout to preserve session
    this.saveCurrentState();
  }

  static clearAppState() {
    // DISABLED: Never clear app state automatically - only admin can delete accounts
    console.log('App state clearing disabled - only admin can delete accounts');
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

    this.isInitialized = false;
  }
}