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
import DebugTransactions from "@/pages/debug-transactions";
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
  const { user } = useAuth();
  const [location] = useLocation();
  const [splashShown, setSplashShown] = useState(() => {
    // Initialize splash state immediately to prevent flash
    return Boolean(sessionStorage.getItem('splashShown'));
  });
  
  // Set initial theme color to pure blue immediately on mount
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      if (splashShown) {
        themeColorMeta.setAttribute('content', '#126987');
      } else {
        themeColorMeta.setAttribute('content', '#0000ff');
      }
    }
  }, [splashShown]);

  // Listen for splash completion
  useEffect(() => {
    const handleSplashComplete = () => {
      setSplashShown(true);
      sessionStorage.setItem('splashShown', 'true');
    };

    window.addEventListener('splashComplete', handleSplashComplete);
    return () => window.removeEventListener('splashComplete', handleSplashComplete);
  }, []);

  const showNavigation = user && !['/login', '/splash'].includes(location);

  return (
    <SecurityWrapper>
      <div className="w-full h-full overflow-hidden relative">
        <Switch>
          <Route path="/splash">
            <Splash />
          </Route>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/more">
            <More />
          </Route>
          <Route path="/">
            {!splashShown ? (
              <Splash />
            ) : !user ? (
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
          <Route path="/debug-transactions">
            <ProtectedRoute>
              <DebugTransactions />
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
