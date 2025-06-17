import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import BottomNavigation from "@/components/BottomNavigation";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { StateManager } from "@/utils/stateManager";
import { AppLifecycle } from "@/utils/appLifecycle";
import LiveChat from "@/components/LiveChat";



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
  const authHook = useAuth();
  const user = authHook?.user || null;
  const isLoading = authHook?.isLoading || false;
  
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
  const authHook = useAuth();
  const user = authHook?.user || null;
  const isLoading = authHook?.isLoading || false;
  const login = authHook?.login || (() => {});
  
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
        // Fresh app start - show splash and clear state
        setSplashShown(false);
        StateManager.clearAppState();
        localStorage.removeItem('app_background_time');
        sessionStorage.setItem('app_was_active', 'true');
      } else if (lastBackgroundTime) {
        // App was backgrounded - check if too much time passed
        const backgroundDuration = Date.now() - parseInt(lastBackgroundTime);
        const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        
        if (backgroundDuration > SESSION_TIMEOUT) {
          // Too long in background - treat as fresh start
          setSplashShown(false);
          StateManager.clearAppState();
          localStorage.removeItem('app_background_time');
        } else {
          // Quick return from background - restore state
          try {
            const savedState = StateManager.restoreAppState();
            
            if (savedState && savedState.user && !user) {
              // Restore user session silently
              login(savedState.user);
              
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
            setSplashShown(false);
          }
        }
        localStorage.removeItem('app_background_time');
      } else {
        // No background time recorded - show splash
        setSplashShown(false);
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
    
    // Handle app lifecycle events directly
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background - save state and timestamp
        localStorage.setItem('app_background_time', Date.now().toString());
        if (user) {
          StateManager.handleVisibilityChange(location, user);
        }
      }
    };

    const handleBeforeUnload = () => {
      // Clear session marker to detect force close
      sessionStorage.removeItem('app_was_active');
      if (user) {
        StateManager.handleVisibilityChange(location, user);
      }
    };

    const handlePageHide = () => {
      sessionStorage.removeItem('app_was_active');
      if (user) {
        StateManager.handleVisibilityChange(location, user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);



  // Handle app visibility changes for proper lifecycle management
  useEffect(() => {
    let isAppVisible = true;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAppVisible = false;
        // App is being backgrounded - just track state, don't set reload timers
        sessionStorage.setItem('app_backgrounded', Date.now().toString());
        sessionStorage.setItem('current_location', location);
      } else {
        // App is being foregrounded - restore state without any reloading
        if (!isAppVisible) {
          // Always restore app state when returning from background
          restoreAppStateOnForeground();
        }
        isAppVisible = true;
        sessionStorage.removeItem('app_backgrounded');
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

    const handlePageHide = () => {
      // Only mark for cold restart if this is actually an app closure
      // PageHide can trigger for various reasons, so we're more conservative
      sessionStorage.setItem('page_hidden', 'true');
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // Only reload if this was a true app closure (page cache was not used)
      const forceColdStart = localStorage.getItem('force_cold_start') === 'true';
      
      if (forceColdStart) {
        // This was a real app closure - force full reload for cold launch
        localStorage.removeItem('force_cold_start');
        sessionStorage.clear();
        window.location.reload();
      } else {
        // This was just backgrounding/foregrounding - restore state
        sessionStorage.removeItem('page_hidden');
        restoreAppStateOnForeground();
      }
    };

    const handleBeforeUnload = () => {
      // Only mark for cold restart on actual app closure
      // beforeUnload can trigger for many reasons, so we're conservative
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('force_cold_start', 'true');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
        <AuthProvider>
          <Toaster />
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
