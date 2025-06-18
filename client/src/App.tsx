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
  
  if (!user && !isLoading) {
    return fallback ? <>{fallback}</> : <Redirect to="/login" />;
  }
  
  if (isLoading) {
    return null;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const authHook = useAuth();
  const user = authHook?.user || null;
  const isLoading = authHook?.isLoading || false;
  
  const locationHook = useLocation();
  const [location, navigate] = locationHook || ['/', () => {}];
  const [splashShown, setSplashShown] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);
  const [splashCompleted, setSplashCompleted] = useState(false);
  
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

  // Theme management for current route
  useEffect(() => {
    const updateThemeForRoute = () => {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) return;

      // Set correct theme color based on current location
      if (location === '/splash') {
        themeColorMeta.setAttribute('content', '#000DFF');
      } else {
        themeColorMeta.setAttribute('content', '#126987');
      }
    };

    updateThemeForRoute();
  }, [location]);

  // Listen for splash completion
  useEffect(() => {
    const handleSplashComplete = () => {
      setSplashTransitioning(true);
      setTimeout(() => {
        setSplashShown(true);
        setSplashTransitioning(false);
        setSplashCompleted(true);
      }, 100);
      updateThemeColor('#126987');
    };

    window.addEventListener('splashComplete', handleSplashComplete);
    return () => window.removeEventListener('splashComplete', handleSplashComplete);
  }, []);

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
                console.log('🔍 ROOT ROUTE RENDER:', {
                  splashCompleted,
                  isLoading,
                  user: !!user,
                  userId: user?.id,
                  timestamp: Date.now()
                });
                
                if (!splashCompleted) {
                  console.log('✅ Showing Splash (splash not completed)');
                  return <Splash />;
                }
                if (isLoading) {
                  console.log('✅ Showing Splash (auth loading)');
                  return <Splash />;
                }
                if (user) {
                  console.log('🚨 DASHBOARD RENDER FROM ROOT ROUTE!', { userId: user.id });
                  return <Dashboard />;
                }
                console.log('✅ Showing Login (no user)');
                return <Login />;
              })()}
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute>
                {(() => {
                  console.log('🚨 DASHBOARD RENDER FROM /dashboard ROUTE!');
                  return <Dashboard />;
                })()}
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