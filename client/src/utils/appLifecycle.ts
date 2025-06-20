// App lifecycle management for state preservation
import { StateManager } from './stateManager';

export class AppLifecycle {
  private static isInitialized = false;
  private static lastActiveTime = Date.now();
  private static visibilityTimeout: NodeJS.Timeout | null = null;
  private static isAppTerminated = false;
  private static backgroundTime = 0;

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
    // Use sessionStorage to detect true app restart vs resume
    const wasActiveSession = sessionStorage.getItem('app_active_session');
    
    if (!wasActiveSession) {
      // This is a fresh app start (no active session marker)
      this.isAppTerminated = true;
      console.log('Fresh app start detected - resetting transient state');
      
      // Clear only transient app state, preserve authentication
      StateManager.clearTransientState();
      
      // Mark session as active
      sessionStorage.setItem('app_active_session', Date.now().toString());
      return;
    }
    
    // This is a resume from background, preserve all state
    this.isAppTerminated = false;
    console.log('App resumed from background - preserving state');
  }

  static handleVisibilityChange() {
    if (document.hidden) {
      // App going to background - save state and timestamp
      this.backgroundTime = Date.now();
      localStorage.setItem('app_background_time', this.backgroundTime.toString());
      this.saveCurrentState();
    } else {
      // App returning to foreground - always restore state
      // Users stay logged in permanently unless admin deletes account
      if (!this.isAppTerminated) {
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
    this.lastActiveTime = Date.now();
    this.saveCurrentState();
  }

  static saveCurrentState() {
    try {
      const currentState = {
        route: window.location.pathname,
        timestamp: Date.now(),
        scrollPosition: window.scrollY
      };
      localStorage.setItem('app_session_state', JSON.stringify(currentState));
    } catch (error) {
      console.error('Failed to save current state:', error);
    }
  }

  static restoreStateIfNeeded() {
    try {
      const savedState = localStorage.getItem('app_session_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        // Restore scroll position if on same route
        if (state.route === window.location.pathname && state.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, state.scrollPosition);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  static getAppTerminationStatus() {
    return this.isAppTerminated;
  }

  static cleanup() {
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
      this.visibilityTimeout = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('pagehide', this.handlePageHide.bind(this));
    window.removeEventListener('pageshow', this.handlePageShow.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
    
    this.isInitialized = false;
  }
}