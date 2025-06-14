import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import BottomNavigation from "@/components/BottomNavigation";
import { SecurityWrapper } from "@/components/SecurityWrapper";

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
  const [splashShown, setSplashShown] = useState(() => {
    // Initialize splashShown state immediately to prevent flash
    return sessionStorage.getItem('splashShown') === 'true';
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);
  
  // Set initial theme color to pure blue immediately on mount
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#0000ff');
    }
    
    const hasShownSplash = sessionStorage.getItem('splashShown');
    if (hasShownSplash) {
      setSplashShown(true);
      // If splash was already shown, set theme to #126987
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
    }
    
    // Mark as initialized after a tick to prevent flash
    setTimeout(() => setIsInitialized(true), 0);
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
      <div className="w-full h-full overflow-hidden relative">
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
