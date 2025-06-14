import { useState, useEffect, useRef } from "react";
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
import { useAppStateManager } from "@/hooks/useAppStateManager";
import { useScrollManager } from "@/hooks/useScrollManager";
import { setupAppTerminationDetection, isAppFreshStart } from "@/utils/directTerminationDetector";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
    return <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  const appStateManager = useAppStateManager();
  const scrollManager = useScrollManager({
    saveScrollPosition: appStateManager.saveScrollPosition,
    getScrollPosition: appStateManager.getScrollPosition
  });
  
  const [splashShown, setSplashShown] = useState(() => {
    // Set up termination detection first
    setupAppTerminationDetection();
    
    // Check if this is a fresh app start
    const isFreshStart = isAppFreshStart();
    
    if (isFreshStart) {
      // Fresh start - show splash screen
      return false;
    }
    
    // App was resumed - check if splash was already shown
    return sessionStorage.getItem('splashShown') === 'true';
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
  // Set initial theme color and handle app state restoration
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#0000ff');
    }
    
    // Normal theme handling
    const hasShownSplash = sessionStorage.getItem('splashShown') === 'true';
    if (hasShownSplash) {
      setSplashShown(true);
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
    }
    
    setTimeout(() => setIsInitialized(true), 0);
  }, [appStateManager]);

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

  // Set up scroll container when main container is ready
  useEffect(() => {
    if (mainContainerRef.current) {
      scrollManager.setScrollContainer(mainContainerRef.current);
    }
  }, [scrollManager]);

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
        <div 
          ref={mainContainerRef}
          className="w-full h-full overflow-hidden relative"
        >
          <Switch>
            <Route path="/splash" component={Splash} />
            <Route path="/login" component={Login} />
            <Route path="/more" component={More} />
            <Route path="/">
              {/* Handle root route properly based on splash and auth state */}
              {!splashShown || splashTransitioning ? (
                <Splash />
              ) : (!user || isLoading) ? (
                <Login />
              ) : (
                <Dashboard />
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
