// iOS-style App Lifecycle Management for Banking App
// Handles app state transitions, session persistence, and authentication flow

import { UserDataManager } from "@/utils/userDataManager";

export interface AppState {
  isAppActive: boolean;
  wasMinimized: boolean;
  lastActiveTime: number;
  sessionValid: boolean;
  shouldShowSplash: boolean;
  backgroundTime: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private state: AppState;
  private listeners: ((state: AppState) => void)[] = [];
  private backgroundTimer: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: () => void;
  private beforeUnloadHandler: (e: BeforeUnloadEvent) => void;

  private constructor() {
    this.state = this.getInitialState();
    this.setupEventListeners();
    this.visibilityChangeHandler = this.handleVisibilityChange.bind(this);
    this.beforeUnloadHandler = this.handleBeforeUnload.bind(this);
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private getInitialState(): AppState {
    const stored = localStorage.getItem('appState');
    const lastClosed = localStorage.getItem('appLastClosed');
    const currentTime = Date.now();
    
    // If app was explicitly closed (swipe up), show splash
    const wasExplicitlyClosed = lastClosed && (currentTime - parseInt(lastClosed)) > 0;
    
    // If more than 5 minutes in background, require re-auth
    const backgroundThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (stored && !wasExplicitlyClosed) {
      const parsedState = JSON.parse(stored);
      const timeSinceBackground = currentTime - parsedState.backgroundTime;
      
      // If recently backgrounded (< 5 minutes), preserve session
      if (timeSinceBackground < backgroundThreshold && parsedState.sessionValid) {
        return {
          ...parsedState,
          isAppActive: true,
          shouldShowSplash: false,
          sessionValid: true
        };
      }
    }

    // Default state for cold start or expired session
    return {
      isAppActive: true,
      wasMinimized: false,
      lastActiveTime: currentTime,
      sessionValid: false,
      shouldShowSplash: true,
      backgroundTime: 0
    };
  }

  private setupEventListeners(): void {
    // Handle page visibility changes (minimize/restore)
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    
    // Handle page unload (app closure)
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    
    // Handle focus/blur for additional app state tracking
    window.addEventListener('focus', () => this.handleAppForeground());
    window.addEventListener('blur', () => this.handleAppBackground());
    
    // PWA-specific events for iOS
    window.addEventListener('pagehide', () => this.handleAppPause());
    window.addEventListener('pageshow', (e) => this.handleAppResume(e.persisted));
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.handleAppBackground();
    } else {
      this.handleAppForeground();
    }
  }

  private handleBeforeUnload(e: BeforeUnloadEvent): void {
    // Mark app as explicitly closed
    localStorage.setItem('appLastClosed', Date.now().toString());
    this.saveState();
  }

  private handleAppBackground(): void {
    const currentTime = Date.now();
    this.updateState({
      isAppActive: false,
      wasMinimized: true,
      backgroundTime: currentTime
    });
    
    this.saveState();
    this.notifyListeners();
  }

  private handleAppForeground(): void {
    const currentTime = Date.now();
    const timeSinceBackground = currentTime - this.state.backgroundTime;
    const backgroundThreshold = 5 * 60 * 1000; // 5 minutes
    
    // If app was in background for more than 5 minutes, require re-auth
    const sessionExpired = timeSinceBackground > backgroundThreshold && this.state.backgroundTime > 0;
    
    this.updateState({
      isAppActive: true,
      lastActiveTime: currentTime,
      sessionValid: !sessionExpired && this.state.sessionValid,
      shouldShowSplash: sessionExpired && this.state.sessionValid
    });
    
    this.notifyListeners();
  }

  private handleAppPause(): void {
    this.handleAppBackground();
  }

  private handleAppResume(persisted: boolean): void {
    if (!persisted) {
      // App was refreshed/reloaded, treat as cold start
      this.updateState({
        shouldShowSplash: true,
        sessionValid: false
      });
    }
    this.handleAppForeground();
  }

  private updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
  }

  private saveState(): void {
    localStorage.setItem('appState', JSON.stringify(this.state));
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Public API
  public getState(): AppState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public login(): void {
    const currentUser = UserDataManager.getCurrentUser();
    if (currentUser) {
      UserDataManager.recordLoginTime(currentUser);
    }
    
    this.updateState({
      sessionValid: true,
      shouldShowSplash: false,
      lastActiveTime: Date.now()
    });
    
    this.saveState();
    this.notifyListeners();
  }

  public logout(): void {
    UserDataManager.clearCurrentUser();
    localStorage.removeItem('appState');
    localStorage.removeItem('appLastClosed');
    
    this.updateState({
      sessionValid: false,
      shouldShowSplash: true,
      wasMinimized: false,
      backgroundTime: 0
    });
    
    this.notifyListeners();
  }

  public shouldShowSplashScreen(): boolean {
    return this.state.shouldShowSplash;
  }

  public shouldRequireAuth(): boolean {
    return !this.state.sessionValid;
  }

  public markSplashComplete(): void {
    this.updateState({
      shouldShowSplash: false
    });
    this.saveState();
    this.notifyListeners();
  }

  public cleanup(): void {
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    window.removeEventListener('focus', () => this.handleAppForeground());
    window.removeEventListener('blur', () => this.handleAppBackground());
    window.removeEventListener('pagehide', () => this.handleAppPause());
    window.removeEventListener('pageshow', (e) => this.handleAppResume(e.persisted));
    
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();