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



import Splash from "@/pages/splash";
import Login from "@/pages/login";
import More from "@/pages/more";
import Dashboard from "@/pages/dashboard";
import Payments from "@/pages/payments";
import Apply from "@/pages/apply";
import IbanTransfer from "@/pages/iban-transfer";
import UkTransfer from "@/pages/uk-transfer";
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
  const { user, isLoading } = useAuth();
  
  // Don't redirect while loading to prevent form interruptions
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#126987]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return fallback ? <>{fallback}</> : <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [splashShown, setSplashShown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);

  
  // Initialize app state and theme - always start fresh
  useEffect(() => {
    // Clear temporary state for cold launch behavior
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('chat') || key.includes('liveChat') || key.includes('tempState') || key.includes('session_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Check if this is a forced cold start
    const forceColdStart = localStorage.getItem('force_cold_start') === 'true';
    
    if (forceColdStart) {
      // This is a cold restart after app was closed
      localStorage.removeItem('force_cold_start');
      localStorage.removeItem('bankingUser');
      sessionStorage.clear();
    }
    
    // Mark this as a cold start for auth provider
    sessionStorage.setItem('app_cold_start', 'true');
    
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#0000ff');
    }
    
    // Always start with splash screen for cold launch
    setSplashShown(false);
    
    // Mark as initialized after a tick to prevent flash
    setTimeout(() => setIsInitialized(true), 0);
  }, []);

  // Handle app visibility changes for proper lifecycle management
  useEffect(() => {
    let isAppVisible = true;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAppVisible = false;
        // App is being backgrounded - store current state
        sessionStorage.setItem('app_backgrounded', Date.now().toString());
        sessionStorage.setItem('current_location', location);
      } else {
        // App is being foregrounded - restore proper state
        const backgroundTime = sessionStorage.getItem('app_backgrounded');
        if (backgroundTime && !isAppVisible) {
          const timeAway = Date.now() - parseInt(backgroundTime);
          // Only reload for very long absence (30+ seconds) to prevent accidental reloads
          if (timeAway > 30000) {
            window.location.reload();
          } else {
            // Restore complete app state when returning from background
            restoreAppStateOnForeground();
          }
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
        themeColorMeta.setAttribute('content', '#0000ff');
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
      // App is being swiped away or closed - mark for cold restart
      localStorage.setItem('force_cold_start', 'true');
      sessionStorage.setItem('app_closed', 'true');
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // App is being restored - check if we need cold restart
      const forceColdStart = localStorage.getItem('force_cold_start') === 'true';
      
      if (event.persisted || sessionStorage.getItem('app_closed') || forceColdStart) {
        // Clear the flag and force full reload for cold launch
        localStorage.removeItem('force_cold_start');
        sessionStorage.removeItem('app_closed');
        window.location.reload();
      }
    };

    const handleBeforeUnload = () => {
      // Mark app as being closed and force cold restart
      localStorage.setItem('force_cold_start', 'true');
      sessionStorage.setItem('app_closed', 'true');
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
          themeColorMeta.setAttribute('content', '#0000ff');
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
      <div className="w-full h-full bg-[#0000ff]">
        {/* Empty blue screen during initialization */}
      </div>
    );
  }

  const showNavigation = user && splashShown && !['/login', '/splash'].includes(location);

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
              ) : !user ? (
                <Login />
              ) : (
                <Redirect to="/dashboard" />
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
        {showNavigation && <BottomNavigation />}

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
