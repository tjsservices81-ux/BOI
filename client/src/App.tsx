import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PermanentAuthProvider, usePermanentAuth } from "@/lib/permanentAuthContext";
import BottomNavigation from "@/components/BottomNavigation";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { StateManager } from "@/utils/stateManager";
// Removed AppLifecycle import for simpler restart handling
import LiveChat from "@/components/LiveChat";
import { OfflineBanner } from "@/components/OfflineBanner";



import Splash from "@/pages/splash";
import Login from "@/pages/login";
import More from "@/pages/more";
import Dashboard from "@/pages/dashboard";
import Payments from "@/pages/payments";
import Apply from "@/pages/apply";
import IbanTransfer from "@/pages/iban-transfer";
import UkTransfer from "@/pages/uk-transfer";
import InternalTransfer from "@/pages/internal-transfer";
import Transactions from "@/pages/transactions";
import Cards from "@/pages/cards";
import Insights from "@/pages/insights";
import Transfer from "@/pages/transfer";
import BillPay from "@/pages/bill-pay";
import TransactionHistoryWorking from "@/pages/transaction-history-working";

import Statements from "@/pages/statements";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user, isLoading } = usePermanentAuth();
  
  // Prevent any flash by immediately redirecting if no user
  if (!user && !isLoading) {
    return fallback ? <>{fallback}</> : <Redirect to="/login" />;
  }
  
  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading, setUser } = usePermanentAuth();
  
  const locationHook = useLocation();
  const [location, navigate] = locationHook || ['/', () => {}];
  const [splashShown, setSplashShown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  // Global Live Chat state - persistent across all navigation
  const [showLiveChat, setShowLiveChat] = useState(false);

  // Listen for global live chat open events
  useEffect(() => {
    const handleOpenLiveChat = () => {
      setShowLiveChat(true);
    };

    window.addEventListener('openLiveChat', handleOpenLiveChat);
    return () => window.removeEventListener('openLiveChat', handleOpenLiveChat);
  }, []);

  // Centralized theme color management
  const updateThemeColor = (color: string) => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', color);
    }
  };

  
  // Initialize app state with persistence support
  useEffect(() => {
    const initializeApp = async () => {
      // Check if sessionStorage was cleared (indicates fresh app start)
      const wasAppActive = sessionStorage.getItem('app_was_active');
      const lastBackgroundTime = localStorage.getItem('app_background_time');
      
      if (!wasAppActive) {
        // Fresh app start - clear transient state but preserve authentication
        console.log('Fresh app start detected - resetting UI state');
        setSplashShown(false);
        StateManager.clearTransientState();
        sessionStorage.setItem('app_was_active', 'true');
        
        // Always try to restore user session
        try {
          const savedState = StateManager.restoreAppState();
          if (savedState && savedState.user && !user) {
            // Restore user session silently
            setUser(savedState.user);
          }
        } catch (error) {
          console.error('Failed to restore user session:', error);
        }
      } else if (lastBackgroundTime) {
        // App was backgrounded - always restore state regardless of time
        localStorage.removeItem('app_background_time');
        
        try {
          const savedState = StateManager.restoreAppState();
          
          if (savedState && savedState.user && !user) {
            // Restore user session silently
            setUser(savedState.user);
            
            // Restore route if different from current
            if (savedState.currentRoute !== location && savedState.currentRoute !== '/login') {
              navigate(savedState.currentRoute);
            }
            
            // Skip splash if restoring state
            setSplashShown(true);
          } else {
            // No valid saved state, show splash
            setSplashShown(false);
          }
        } catch (error) {
          console.error('Failed to restore app state:', error);
          setSplashShown(false);
        }
      } else {
        // No background time recorded - show splash but try to restore user
        setSplashShown(false);
        try {
          const savedState = StateManager.restoreAppState();
          if (savedState && savedState.user && !user) {
            setUser(savedState.user);
          }
        } catch (error) {
          console.error('Failed to restore user session:', error);
        }
      }
      
      // Clear temporary state for cold launch behavior
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('chat') || key.includes('liveChat') || key.includes('tempState') || key.includes('session_')) {
          localStorage.removeItem(key);
        }
      });
      
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#000DFF');
      }
      
      setIsRestoringState(false);
      // Mark as initialized after a tick to prevent flash
      setTimeout(() => setIsInitialized(true), 0);
    };

    initializeApp();
    
    // Handle app lifecycle events for proper restart detection
    const handleBeforeUnload = () => {
      // Clear session marker to detect app termination
      sessionStorage.removeItem('app_was_active');
    };

    const handlePageHide = () => {
      // Clear session marker when app is hidden/swiped away
      sessionStorage.removeItem('app_was_active');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background - save timestamp
        localStorage.setItem('app_background_time', Date.now().toString());
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle app state management for proper restart behavior
  const [isAppVisible, setIsAppVisible] = useState(true);
  
  useEffect(() => {
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came back to foreground - check if we need to restore state
        const wasBackgrounded = sessionStorage.getItem('app_backgrounded');
        if (wasBackgrounded) {
          // Always restore app state when returning from background
          restoreAppStateOnForeground();
        }
        setIsAppVisible(true);
        sessionStorage.removeItem('app_backgrounded');
      } else {
        // App going to background - mark as backgrounded for both iOS and Android
        setIsAppVisible(false);
        sessionStorage.setItem('app_backgrounded', Date.now().toString());
      }
    };

    const restoreThemeForCurrentScreen = () => {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) return;

      // Set correct theme color based on current location
      if (location === '/splash') {
        themeColorMeta.setAttribute('content', '#000DFF');
      } else {
        themeColorMeta.setAttribute('content', '#126987');
      }
    };

    const restoreAppStateOnForeground = () => {
      // Restore theme color
      restoreThemeForCurrentScreen();
      
      // Force navigation visibility restoration if needed
      if (user && splashShown && !['/login', '/splash'].includes(location)) {
        const navElement = document.querySelector('[data-bottom-nav]') as HTMLElement;
        if (navElement && navElement.classList.contains('hidden')) {
          navElement.classList.remove('hidden');
        }
      }
    };

    // Cross-platform app lifecycle event handlers for iOS and Android
    const handlePageHide = () => {
      setIsAppVisible(false);
      sessionStorage.setItem('app_backgrounded', Date.now().toString());
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      setIsAppVisible(true);
      if (event.persisted) {
        // Page was restored from cache - restore state
        restoreAppStateOnForeground();
      }
      sessionStorage.removeItem('app_backgrounded');
    };

    // Add cross-platform event listeners for iOS and Android
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    
    // Android-specific app lifecycle events
    window.addEventListener('focus', () => {
      setIsAppVisible(true);
      restoreAppStateOnForeground();
    });
    
    window.addEventListener('blur', () => {
      setIsAppVisible(false);
      sessionStorage.setItem('app_backgrounded', Date.now().toString());
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', () => {});
      window.removeEventListener('blur', () => {});
    };
  }, []);



  // Listen for splash completion
  useEffect(() => {
    const handleSplashComplete = () => {
      setSplashTransitioning(true);
      // Small delay to prevent flash, then complete transition
      setTimeout(() => {
        setSplashShown(true);
        setSplashTransitioning(false);
      }, 100);
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
    };

    window.addEventListener('splashComplete', handleSplashComplete);
    return () => window.removeEventListener('splashComplete', handleSplashComplete);
  }, []);

  // Restore app state when returning from background - MUST be before conditional return
  useEffect(() => {
    const handleFocusRestore = () => {
      // Restore correct theme color
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        if (location === '/splash') {
          themeColorMeta.setAttribute('content', '#000DFF');
        } else {
          themeColorMeta.setAttribute('content', '#126987');
        }
      }
    };

    window.addEventListener('focus', handleFocusRestore);
    return () => window.removeEventListener('focus', handleFocusRestore);
  }, [location]);

  // Prevent flash during initialization
  if (!isInitialized) {
    return (
      <div className="w-full h-full bg-[#000DFF]">
        {/* Empty blue screen during initialization */}
      </div>
    );
  }

  return (
    <SecurityWrapper>
      <ErrorBoundary>
        <OfflineBanner />
        <div className="w-full h-full overflow-hidden relative">
          <Switch>
            <Route path="/splash" component={Splash} />
            <Route path="/login" component={Login} />
            <Route path="/more" component={More} />
            <Route path="/">
              {/* Handle root route - always show proper sequence for cold starts */}
              {!splashShown || splashTransitioning ? (
                <Splash />
              ) : (
                <Login />
              )}
            </Route>
          <Route path="/dashboard">
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/payments">
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          </Route>
          <Route path="/apply">
            <ProtectedRoute>
              <Apply />
            </ProtectedRoute>
          </Route>
          <Route path="/iban-transfer">
            <ProtectedRoute>
              <IbanTransfer />
            </ProtectedRoute>
          </Route>
          <Route path="/uk-transfer">
            <ProtectedRoute>
              <UkTransfer />
            </ProtectedRoute>
          </Route>
          <Route path="/internal-transfer">
            <ProtectedRoute>
              <InternalTransfer />
            </ProtectedRoute>
          </Route>
          <Route path="/transfer">
            <ProtectedRoute>
              <Transfer />
            </ProtectedRoute>
          </Route>
          <Route path="/bills">
            <ProtectedRoute>
              <BillPay />
            </ProtectedRoute>
          </Route>
          <Route path="/transactions">
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          </Route>
          <Route path="/cards">
            <ProtectedRoute>
              <Cards />
            </ProtectedRoute>
          </Route>
          <Route path="/insights">
            <ProtectedRoute>
              <Insights />
            </ProtectedRoute>
          </Route>
          <Route path="/statements">
            <ProtectedRoute>
              <Statements />
            </ProtectedRoute>
          </Route>
          <Route path="/transactions/:accountId">
            <ProtectedRoute>
              <TransactionHistoryWorking />
            </ProtectedRoute>
          </Route>

          <Route path="/profile">
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        <BottomNavigation />

        {/* Global Persistent Live Chat - stays active across all navigation */}
        <LiveChat isOpen={showLiveChat} onClose={() => setShowLiveChat(false)} />

        </div>
      </ErrorBoundary>
    </SecurityWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PermanentAuthProvider>
          <Toaster />
          <AppRoutes />
        </PermanentAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
