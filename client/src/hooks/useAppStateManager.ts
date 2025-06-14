import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLifecycleManager } from "@/utils/appLifecycle";

interface AppState {
  currentRoute: string;
  scrollPositions: Record<string, number>;
  formData: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

interface PageScrollPosition {
  route: string;
  scrollY: number;
}

export function useAppStateManager() {
  const [location, setLocation] = useLocation();
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [hasBeenBackgrounded, setHasBeenBackgrounded] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});
  const formDataRef = useRef<Record<string, any>>({});
  const sessionId = useRef<string>('');
  const lifecycleManager = useRef<AppLifecycleManager>();
  
  // Initialize lifecycle manager and session ID
  useEffect(() => {
    lifecycleManager.current = AppLifecycleManager.getInstance();
    if (!sessionId.current) {
      sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Save current scroll position for a route
  const saveScrollPosition = useCallback((route: string, scrollY: number) => {
    scrollPositions.current[route] = scrollY;
    saveAppState();
  }, []);

  // Get saved scroll position for a route
  const getScrollPosition = useCallback((route: string): number => {
    return scrollPositions.current[route] || 0;
  }, []);

  // Save form data
  const saveFormData = useCallback((formId: string, data: any) => {
    formDataRef.current[formId] = data;
    saveAppState();
  }, []);

  // Get saved form data
  const getFormData = useCallback((formId: string) => {
    return formDataRef.current[formId];
  }, []);

  // Save complete app state to sessionStorage
  const saveAppState = useCallback(() => {
    try {
      const state: AppState = {
        currentRoute: location,
        scrollPositions: { ...scrollPositions.current },
        formData: { ...formDataRef.current },
        timestamp: Date.now(),
        sessionId: sessionId.current
      };
      
      sessionStorage.setItem('appState', JSON.stringify(state));
      sessionStorage.setItem('appStateValid', 'true');
      
      console.log('App paused - saving state');
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }, [location]);

  // Restore app state from sessionStorage
  const restoreAppState = useCallback((): AppState | null => {
    try {
      const savedState = sessionStorage.getItem('appState');
      const isValid = sessionStorage.getItem('appStateValid') === 'true';
      
      if (!savedState || !isValid) {
        return null;
      }

      const state: AppState = JSON.parse(savedState);
      
      // Check if state is recent (within 1 hour)
      const isRecent = (Date.now() - state.timestamp) < (60 * 60 * 1000);
      
      if (!isRecent) {
        // Clear old state
        sessionStorage.removeItem('appState');
        sessionStorage.removeItem('appStateValid');
        return null;
      }

      // Restore internal state
      scrollPositions.current = state.scrollPositions || {};
      formDataRef.current = state.formData || {};
      sessionId.current = state.sessionId || sessionId.current;
      
      console.log('App resumed - restoring state');
      return state;
    } catch (error) {
      console.error('Failed to restore app state:', error);
      return null;
    }
  }, []);

  // Clear app state (when app is fully terminated)
  const clearAppState = useCallback(() => {
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('appStateValid');
    sessionStorage.removeItem('splashShown');
    scrollPositions.current = {};
    formDataRef.current = {};
  }, []);

  // Handle visibility change events
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsAppVisible(isVisible);

      if (!isVisible) {
        // App is being backgrounded
        setHasBeenBackgrounded(true);
        saveAppState();
      } else if (hasBeenBackgrounded) {
        // App is being foregrounded - check if it was terminated
        const wasTerminated = lifecycleManager.current?.checkIfTerminated();
        
        if (wasTerminated) {
          // App was terminated, clear state and start fresh
          clearAppState();
          setHasBeenBackgrounded(false);
        } else {
          // App was just backgrounded, restore state
          const restoredState = restoreAppState();
          
          if (restoredState && restoredState.currentRoute && restoredState.currentRoute !== location) {
            // Restore to the exact route where user left off
            setLocation(restoredState.currentRoute);
          }
        }
      }
    };

    const handlePageHide = () => {
      // App is being terminated or switched away
      saveAppState();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from back/forward cache
        const restoredState = restoreAppState();
        if (restoredState) {
          setLocation(restoredState.currentRoute);
        }
      }
    };

    const handleBeforeUnload = () => {
      // App is being closed/refreshed
      saveAppState();
    };

    // For mobile apps: handle app state changes
    const handleAppStateChange = (event: Event) => {
      // @ts-ignore - React Native specific
      if (typeof event.type === 'string') {
        if (event.type === 'blur' || event.type === 'pause') {
          saveAppState();
        } else if (event.type === 'focus' || event.type === 'resume') {
          const restoredState = restoreAppState();
          if (restoredState && restoredState.currentRoute !== location) {
            setLocation(restoredState.currentRoute);
          }
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Mobile app events
    window.addEventListener('blur', handleAppStateChange);
    window.addEventListener('focus', handleAppStateChange);
    document.addEventListener('pause', handleAppStateChange);
    document.addEventListener('resume', handleAppStateChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleAppStateChange);
      window.removeEventListener('focus', handleAppStateChange);
      document.removeEventListener('pause', handleAppStateChange);
      document.removeEventListener('resume', handleAppStateChange);
    };
  }, [hasBeenBackgrounded, location, saveAppState, restoreAppState, setLocation]);

  // Auto-save state when route changes
  useEffect(() => {
    saveAppState();
  }, [location, saveAppState]);

  // Check for and restore state on initial load
  useEffect(() => {
    const restoredState = restoreAppState();
    if (restoredState && restoredState.currentRoute && restoredState.currentRoute !== location) {
      // Only restore if we're not already on the correct route
      setLocation(restoredState.currentRoute);
    }
  }, []); // Only run on initial mount

  return {
    isAppVisible,
    hasBeenBackgrounded,
    saveScrollPosition,
    getScrollPosition,
    saveFormData,
    getFormData,
    saveAppState,
    restoreAppState,
    clearAppState,
    sessionId: sessionId.current
  };
}