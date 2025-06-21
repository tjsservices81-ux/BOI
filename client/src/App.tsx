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
import { PlatformDetection } from "@/utils/platformDetection";
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
  
  // Check if app is still in initialization phase
  const appSessionActive = localStorage.getItem('app_session_active');
  const splashCompleted = localStorage.getItem('splash_completed');
  
  // Don't redirect during cold start initialization - let splash/login flow complete
  if (!appSessionActive || !splashCompleted) {
    return null;
  }
  
  // Normal protection logic after initialization
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

  
  // Initialize app state with proper cold/warm start detection
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize cache persistence system
      const { UserDataManager } = await import('./utils/userDataManager');
      UserDataManager.initializeCachePersistence();
      
      // Determine if this is a cold start (app was fully closed) or warm start (app was minimized)
      const appSessionActive = localStorage.getItem('app_session_active');
      const lastBackgroundTime = localStorage.getItem('app_background_time');
      const splashCompleted = localStorage.getItem('splash_completed');
      
      const isColdStart = !appSessionActive;
      
      if (isColdStart) {
        // COLD START: App was fully closed/terminated - always show splash sequence
        console.log('Cold start detected - showing splash sequence');
        
        // Reset all splash-related flags for fresh start
        setSplashShown(false);
        localStorage.removeItem('splash_completed');
        localStorage.removeItem('app_background_time');
        localStorage.setItem('app_session_active', 'true');
        
        // Restore user session silently in background (permanent login)
        try {
          const savedState = StateManager.restoreAppState(true); // Pass isColdStart flag
          if (savedState && savedState.user && !user) {
            login(savedState.user);
          }
        } catch (error) {
          console.error('Failed to restore user session:', error);
        }
        
      } else if (lastBackgroundTime) {
        // WARM START: App was backgrounded - restore exactly where user left off
        console.log('Warm start detected - restoring previous state');
        
        localStorage.removeItem('app_background_time');
        
        try {
          const savedState = StateManager.restoreAppState(false); // Pass isWarmStart flag
          
          if (savedState && savedState.user && !user) {
            // Restore user session
            login(savedState.user);
            
            // Restore exact route for warm start
            if (savedState.currentRoute && savedState.currentRoute !== '/login' && savedState.currentRoute !== '/splash') {
              navigate(savedState.currentRoute);
            }
            
            // Skip splash entirely for warm starts
            setSplashShown(true);
            localStorage.setItem('splash_completed', 'true');
          } else {
            // No valid saved state - fallback to cold start behavior
            setSplashShown(false);
            localStorage.removeItem('splash_completed');
          }
        } catch (error) {
          console.error('Failed to restore warm start state:', error);
          // Fallback to cold start behavior
          setSplashShown(false);
          localStorage.removeItem('splash_completed');
        }
        
      } else {
        // UNCERTAIN STATE: Default to cold start behavior for safety
        console.log('Uncertain state - defaulting to cold start behavior');
        setSplashShown(false);
        localStorage.removeItem('splash_completed');
        localStorage.setItem('app_session_active', 'true');
        
        // Try to restore user session
        try {
          const savedState = StateManager.restoreAppState(true);
          if (savedState && savedState.user && !user) {
            login(savedState.user);
          }
        } catch (error) {
          console.error('Failed to restore user session:', error);
        }
      }
      
      // Preserve all user data - only clear truly temporary items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('temp_cache_') || key.startsWith('_debug_')) {
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
  }, []);

  // Consolidated lifecycle event handling to prevent conflicts
  useEffect(() => {
    let backgroundTimer: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background - mark for warm start and save state
        localStorage.setItem('app_background_time', Date.now().toString());
        if (user) {
          StateManager.handleVisibilityChange(location, user);
        }
      } else {
        // App coming to foreground - this indicates warm start
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
      }
    };

    const handleBeforeUnload = () => {
      // App being terminated - mark for cold start on next launch
      localStorage.removeItem('app_session_active');
      if (user) {
        StateManager.handleVisibilityChange(location, user);
      }
    };

    const handlePageHide = () => {
      // Page being hidden - potential app termination
      backgroundTimer = setTimeout(() => {
        localStorage.removeItem('app_session_active');
      }, 1000); // Short delay to distinguish between backgrounding and termination
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }
      
      // If page was restored from cache, this is definitely a warm start
      if (event.persisted) {
        localStorage.setItem('app_session_active', 'true');
      }
    };

    // Register single set of event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [user, location]);



  // Handle app visibility changes for proper lifecycle management
  useEffect(() => {
    let isAppVisible = true;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAppVisible = false;
        // App is being backgrounded - just track state, don't set reload timers
        localStorage.setItem('app_backgrounded', Date.now().toString());
        localStorage.setItem('current_location', location);
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
      localStorage.setItem('page_hidden', 'true');
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // Only reload if this was a true app closure (page cache was not used)
      const forceColdStart = localStorage.getItem('force_cold_start') === 'true';
      
      if (forceColdStart) {
        // This was a real app closure - restore state without reloading
        localStorage.removeItem('force_cold_start');
        // Preserve user login state and app data - no forced reload
        restoreAppStateOnForeground();
      } else {
        // This was just backgrounding/foregrounding - restore state
        localStorage.removeItem('page_hidden'); // Changed from sessionStorage
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



  // Listen for splash completion and mark it properly
  useEffect(() => {
    const handleSplashComplete = () => {
      setSplashTransitioning(true);
      // Mark splash as completed in localStorage for proper state tracking
      localStorage.setItem('splash_completed', 'true');
      
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
              {(() => {
                // Proper cold/warm start detection for root route
                const appSessionActive = localStorage.getItem('app_session_active');
                const splashCompleted = localStorage.getItem('splash_completed');
                
                // Force splash for cold starts (no active session or incomplete splash)
                if (!appSessionActive || (!splashShown && !splashCompleted)) {
                  return <Splash />;
                }
                
                // For warm starts with user authenticated, go directly to dashboard
                if (user && splashCompleted) {
                  return <Redirect to="/dashboard" />;
                }
                
                // Default: show login after splash completion
                return <Login />;
              })()}
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
