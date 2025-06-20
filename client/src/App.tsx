import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PermanentAuthProvider } from "@/lib/permanentAuthContext";
import { BiometricAuthProvider, useBiometricAuth } from "@/lib/biometricAuth";
import BottomNavigation from "@/components/BottomNavigation";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { StateManager } from "@/utils/stateManager";
import { AppLifecycle } from "@/utils/appLifecycle";
import LiveChat from "@/components/LiveChat";

import Splash from "@/pages/splash";
import Login from "@/pages/login";
import BiometricAuth from "@/pages/BiometricAuth";
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
  const biometricAuth = useBiometricAuth();
  const user = authHook?.user || null;
  const isLoading = authHook?.isLoading || false;
  
  if (isLoading) {
    return fallback || <div>Loading...</div>;
  }
  
  // No user session at all - redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // User has session but biometric verification is required and not completed
  if (biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated) {
    return <Redirect to="/biometric" />;
  }
  
  // If user has session but biometric state is not set, force biometric check
  if (!biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated) {
    biometricAuth.setNeedsBiometric(true);
    return <Redirect to="/biometric" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const authHook = useAuth();
  const biometricAuth = useBiometricAuth();
  const locationHook = useLocation();
  const [location, navigate] = locationHook || ['/', () => {}];
  const [splashShown, setSplashShown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);

  const user = authHook?.user || null;
  const login = authHook?.login || (() => {});

  // Listen for global live chat open events
  useEffect(() => {
    const handleOpenLiveChat = () => {
      setShowLiveChat(true);
    };

    window.addEventListener('openLiveChat', handleOpenLiveChat);
    return () => window.removeEventListener('openLiveChat', handleOpenLiveChat);
  }, []);

  // Initialize app - always start with splash and check for permanent session
  useEffect(() => {
    const initializeApp = async () => {
      // Always start with splash screen on app restart
      setSplashShown(false);
      
      // Check for permanent session but always require biometric verification
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        const authStatus = await response.json();
        
        if (authStatus.isLoggedIn && authStatus.needsBiometric) {
          console.log('Permanent session found - requires biometric verification');
          // Set biometric requirement
          biometricAuth.setNeedsBiometric(true);
          if (authStatus.user) {
            login(authStatus.user);
          }
        } else {
          console.log('No permanent session found');
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error);
      }
      
      // Show splash screen for 1.5 seconds
      setTimeout(() => {
        setSplashShown(true);
        setIsInitialized(true);
      }, 1500);
    };
    
    initializeApp();
  }, []);

  // Handle app lifecycle for state persistence
  useEffect(() => {
    const appLifecycle = new AppLifecycle();
    
    // Save state when app goes to background
    const handleVisibilityChange = () => {
      if (document.hidden) {
        StateManager.saveAppState({
          user,
          currentRoute: location,
          timestamp: Date.now()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, location]);

  // Route to splash if not initialized
  if (!isInitialized || !splashShown) {
    return <Splash />;
  }

  // Route to biometric auth if needed
  if (biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated && user) {
    return <BiometricAuth />;
  }

  // Handle navigation and bottom bar visibility
  const hideBottomBar = ['/login', '/splash', '/biometric'].includes(location);

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/biometric" component={BiometricAuth} />
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        
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
        
        <Route path="/more">
          <ProtectedRoute>
            <More />
          </ProtectedRoute>
        </Route>
        
        <Route path="/transfer">
          <ProtectedRoute>
            <Transfer />
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
        
        <Route path="/bill-pay">
          <ProtectedRoute>
            <BillPay />
          </ProtectedRoute>
        </Route>
        
        <Route path="/transaction-history-working">
          <ProtectedRoute>
            <TransactionHistoryWorking />
          </ProtectedRoute>
        </Route>
        
        <Route path="/statements">
          <ProtectedRoute>
            <Statements />
          </ProtectedRoute>
        </Route>
        
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        
        <Route component={NotFound} />
      </Switch>

      {!hideBottomBar && <BottomNavigation />}
      
      {showLiveChat && (
        <LiveChat 
          onClose={() => setShowLiveChat(false)}
          isOpen={showLiveChat}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <PermanentAuthProvider>
              <BiometricAuthProvider>
                <SecurityWrapper>
                  <AppRoutes />
                  <Toaster />
                </SecurityWrapper>
              </BiometricAuthProvider>
            </PermanentAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}