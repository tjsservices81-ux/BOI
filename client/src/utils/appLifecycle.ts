// App lifecycle management for state preservation
import { StateManager } from './stateManager';

export class AppLifecycle {
  private static isInitialized = false;
  private static lastActiveTime = Date.now();
  private static visibilityTimeout: NodeJS.Timeout | null = null;
  private static isAppTerminated = false;
  private static backgroundTime = 0;
  private static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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
    const sessionData = localStorage.getItem('app_session_state');
    const lastBackgroundTime = localStorage.getItem('app_background_time');
    
    if (!sessionData || !lastBackgroundTime) {
      // No previous session or background time - fresh start
      this.isAppTerminated = true;
      this.clearAppState();
      return;
    }
    
    const backgroundDuration = Date.now() - parseInt(lastBackgroundTime);
    
    // If backgrounded for more than session timeout, treat as terminated
    if (backgroundDuration > this.SESSION_TIMEOUT) {
      this.isAppTerminated = true;
      this.clearAppState();
      return;
    }
    
    // Check if page was unloaded/refreshed (indicates force close or refresh)
    if (!sessionStorage.getItem('app_active_session')) {
      this.isAppTerminated = true;
      this.clearAppState();
      return;
    }
    
    this.isAppTerminated = false;
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      // App going to background - save state and timestamp
      this.backgroundTime = Date.now();
      localStorage.setItem('app_background_time', this.backgroundTime.toString());
      this.saveCurrentState();
    } else {
      // App returning to foreground
      const backgroundDuration = Date.now() - this.backgroundTime;
      
      // If backgrounded for too long, treat as fresh start
      if (backgroundDuration > this.SESSION_TIMEOUT) {
        this.isAppTerminated = true;
        this.clearAppState();
        window.location.reload();
      } else if (!this.isAppTerminated) {
        this.restoreStateIfNeeded();
      }
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
    // Delay saving state to avoid excessive saves
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }
    
    this.visibilityTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 100);
  }

  static clearAppState() {
    localStorage.removeItem('app_session_state');
    localStorage.removeItem('app_background_time');
    sessionStorage.removeItem('app_active_session');
    StateManager.clearAppState();
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