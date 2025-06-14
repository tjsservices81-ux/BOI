// App State Manager for handling navigation persistence and app lifecycle
export class AppStateManager {
  private static instance: AppStateManager;
  private currentPath: string = '/';
  private appState: any = {};
  private isVisible: boolean = true;
  private lastInteraction: number = Date.now();

  private constructor() {
    this.initializeLifecycleHandlers();
    this.restoreAppState();
  }

  static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  private initializeLifecycleHandlers() {
    // Handle page visibility changes (when user switches tabs/apps)
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      
      if (this.isVisible) {
        // App became visible - restore state
        this.handleAppResume();
      } else {
        // App became hidden - save state
        this.handleAppPause();
      }
    });

    // Handle page focus/blur events
    window.addEventListener('focus', () => {
      this.handleAppResume();
    });

    window.addEventListener('blur', () => {
      this.handleAppPause();
    });

    // Handle beforeunload to save state before page closes
    window.addEventListener('beforeunload', () => {
      this.saveAppState();
    });

    // Handle page load
    window.addEventListener('load', () => {
      this.restoreAppState();
    });

    // Track user interactions to determine if app is actively being used
    ['click', 'touch', 'scroll', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.lastInteraction = Date.now();
      }, { passive: true });
    });
  }

  private handleAppPause() {
    console.log('App paused - saving state');
    this.saveAppState();
    
    // Save current scroll positions
    this.saveScrollPositions();
    
    // Mark app as backgrounded
    this.setAppState('isBackgrounded', true);
    this.setAppState('backgroundTime', Date.now());
  }

  private handleAppResume() {
    console.log('App resumed - restoring state');
    this.restoreAppState();
    
    // Check if app was backgrounded for a long time
    const backgroundTime = this.getAppState('backgroundTime', 0);
    const timeDiff = Date.now() - backgroundTime;
    
    // If backgrounded for more than 30 minutes, refresh data
    if (timeDiff > 30 * 60 * 1000) {
      this.refreshAppData();
    }
    
    // Restore scroll positions after a brief delay to ensure DOM is ready
    setTimeout(() => {
      this.restoreScrollPositions();
    }, 100);
    
    this.setAppState('isBackgrounded', false);
  }

  // Navigation state management
  setCurrentPath(path: string) {
    this.currentPath = path;
    this.setAppState('currentPath', path);
    this.setAppState('lastNavigationTime', Date.now());
  }

  getCurrentPath(): string {
    return this.getAppState('currentPath', '/');
  }

  // Generic app state management
  setAppState(key: string, value: any) {
    this.appState[key] = value;
    try {
      localStorage.setItem('appState', JSON.stringify(this.appState));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }

  getAppState(key: string, defaultValue: any = null): any {
    if (this.appState[key] !== undefined) {
      return this.appState[key];
    }
    return defaultValue;
  }

  // Form state management
  saveFormState(formId: string, formData: any) {
    this.setAppState(`form_${formId}`, {
      data: formData,
      timestamp: Date.now()
    });
  }

  getFormState(formId: string): any {
    const formState = this.getAppState(`form_${formId}`, null);
    if (formState) {
      // Check if form state is not too old (1 hour)
      const timeDiff = Date.now() - formState.timestamp;
      if (timeDiff < 60 * 60 * 1000) {
        return formState.data;
      }
    }
    return null;
  }

  clearFormState(formId: string) {
    this.setAppState(`form_${formId}`, null);
  }

  // Scroll position management
  private saveScrollPositions() {
    const scrollableElements = document.querySelectorAll('[data-scroll-persist]');
    const scrollPositions: any = {};
    
    // Save main window scroll
    scrollPositions['window'] = {
      x: window.scrollX,
      y: window.scrollY
    };
    
    // Save individual element scroll positions
    scrollableElements.forEach((element, index) => {
      const id = element.getAttribute('data-scroll-persist') || `element_${index}`;
      scrollPositions[id] = {
        x: element.scrollLeft,
        y: element.scrollTop
      };
    });
    
    this.setAppState('scrollPositions', scrollPositions);
  }

  private restoreScrollPositions() {
    const scrollPositions = this.getAppState('scrollPositions', {});
    
    // Restore main window scroll
    if (scrollPositions['window']) {
      window.scrollTo(scrollPositions['window'].x, scrollPositions['window'].y);
    }
    
    // Restore individual element scroll positions
    Object.keys(scrollPositions).forEach(id => {
      if (id === 'window') return;
      
      const element = document.querySelector(`[data-scroll-persist="${id}"]`);
      if (element && scrollPositions[id]) {
        element.scrollLeft = scrollPositions[id].x;
        element.scrollTop = scrollPositions[id].y;
      }
    });
  }

  // Complete app state save/restore
  private saveAppState() {
    try {
      const stateToSave = {
        ...this.appState,
        currentPath: this.currentPath,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem('appState', JSON.stringify(stateToSave));
      
      // Also save to sessionStorage as backup
      sessionStorage.setItem('appStateBackup', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save complete app state:', error);
    }
  }

  private restoreAppState() {
    try {
      // Try localStorage first, then sessionStorage backup
      let savedState = localStorage.getItem('appState');
      if (!savedState) {
        savedState = sessionStorage.getItem('appStateBackup');
      }
      
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Check if state is not too old (24 hours)
        const timeDiff = Date.now() - (parsedState.timestamp || 0);
        if (timeDiff < 24 * 60 * 60 * 1000) {
          this.appState = parsedState;
          this.currentPath = parsedState.currentPath || '/';
          
          // Emit event to notify app components
          window.dispatchEvent(new CustomEvent('appStateRestored', {
            detail: { path: this.currentPath, state: this.appState }
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to restore app state:', error);
    }
  }

  private refreshAppData() {
    // Emit event to refresh data after long background time
    window.dispatchEvent(new CustomEvent('refreshAppData'));
  }

  // Utility methods
  isAppActive(): boolean {
    const timeSinceLastInteraction = Date.now() - this.lastInteraction;
    return this.isVisible && timeSinceLastInteraction < 5 * 60 * 1000; // 5 minutes
  }

  clearAllState() {
    this.appState = {};
    this.currentPath = '/';
    try {
      localStorage.removeItem('appState');
      sessionStorage.removeItem('appStateBackup');
    } catch (error) {
      console.warn('Failed to clear app state:', error);
    }
  }

  // Debug methods
  getDebugInfo() {
    return {
      currentPath: this.currentPath,
      isVisible: this.isVisible,
      lastInteraction: new Date(this.lastInteraction).toISOString(),
      isActive: this.isAppActive(),
      stateKeys: Object.keys(this.appState)
    };
  }
}

// Export singleton instance
export const appStateManager = AppStateManager.getInstance();