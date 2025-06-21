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
import { UserDataManager } from "@/utils/userDataManager";
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
  
  // User authenticated and biometric complete - allow access
  if (user && biometricAuth.state.isAuthenticated) {
    return <>{children}</>;
  }
  
  // User has session but biometric verification is required
  if (user && biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated) {
    return <Redirect to="/biometric" />;
  }
  
  // User has session but biometric state is not initialized - allow access
  if (user && !biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated) {
    return <>{children}</>;
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

  // Listen for successful login events and ensure navigation to dashboard
  useEffect(() => {
    const handleUserLoggedIn = (event: CustomEvent) => {
      console.log('🎯 Global login event received:', event.detail);
      // Allow time for biometric context to update, then navigate
      setTimeout(() => {
        if (location !== '/dashboard') {
          console.log('🎯 Forcing navigation to dashboard after login');
          navigate('/dashboard');
        }
      }, 500);
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
    return () => window.removeEventListener('userLoggedIn', handleUserLoggedIn as EventListener);
  }, [location, navigate]);

  // Initialize app lifecycle and determine app state
  useEffect(() => {
    AppLifecycle.initialize();
    
    const initializeApp = async () => {
      const { isAppTerminated, wasMinimized } = AppLifecycle.getAppTerminationState();
      
      // Case 1: App is resuming from minimize - restore exactly where user left off
      if (AppLifecycle.isResumingFromMinimize()) {
        console.log('🔄 App resuming from minimize - restoring state');
        
        // Skip splash screen completely and restore immediately
        setSplashShown(true);
        setIsInitialized(true);
        
        // Check if user was logged in before minimize
        const savedState = StateManager.restoreAppState();
        if (savedState && savedState.user) {
          login(savedState.user);
          
          // Restore exact route and scroll position
          if (savedState.currentRoute && savedState.currentRoute !== '/') {
            navigate(savedState.currentRoute);
            
            // Restore scroll positions
            if (savedState.scrollPositions) {
              setTimeout(() => {
                Object.entries(savedState.scrollPositions).forEach(([route, position]) => {
                  const scrollPosition = typeof position === 'number' ? position : 0;
                  const container = document.querySelector(`[data-scroll-route="${route}"]`) as HTMLElement;
                  if (container && scrollPosition > 0) {
                    container.scrollTo({ top: scrollPosition, behavior: 'instant' });
                  } else if (route === window.location.pathname && scrollPosition > 0) {
                    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
                  }
                });
              }, 50);
            }
          }
        }
        return;
      }
      
      // Case 2: App was fully closed - show splash then check backend session
      if (AppLifecycle.isFreshStart()) {
        console.log('🚀 Fresh app start - checking session');
        
        // Always show splash screen for fresh starts
        setSplashShown(false);
        
        setTimeout(async () => {
          try {
            // Check backend session after splash
            const response = await fetch('/api/auth/status', {
              credentials: 'include'
            });
            const authStatus = await response.json();
            
            if (authStatus.isLoggedIn) {
              console.log('✅ Valid backend session found');
              
              if (authStatus.user) {
                login(authStatus.user);
              }
              
              if (authStatus.needsBiometric) {
                console.log('Session requires biometric verification');
                biometricAuth.setNeedsBiometric(true);
              } else {
                // Navigate to dashboard if no biometric needed
                navigate('/dashboard');
              }
            } else {
              console.log('❌ No valid backend session - showing login');
              
              // Clear stale authentication data through UserDataManager
              try {
                UserDataManager.clearUserData('currentUser');
                console.log('Clearing stale user data from UserDataManager');
              } catch (error) {
                // Handle case where no user is currently set
                localStorage.removeItem('currentUser');
              }
              
              // Clear saved state since session is invalid
              StateManager.clearAppState();
            }
          } catch (error) {
            console.error('Failed to check authentication status:', error);
            try {
              UserDataManager.clearUserData('currentUser');
            } catch (clearError) {
              localStorage.removeItem('currentUser');
            }
          }
          
          setSplashShown(true);
          setIsInitialized(true);
        }, 1500);
        
        return;
      }
      
      // Fallback: treat as fresh start
      setSplashShown(false);
      setTimeout(() => {
        setSplashShown(true);
        setIsInitialized(true);
      }, 1500);
    };
    
    initializeApp();
  }, []);

  // Global authentication state handler - ensures proper dashboard navigation
  useEffect(() => {
    if (isInitialized && splashShown && user && biometricAuth.state.isAuthenticated && location !== '/dashboard') {
      console.log('🚀 Global auth check: Redirecting authenticated user to dashboard');
      navigate('/dashboard');
    }
  }, [user, biometricAuth.state.isAuthenticated, isInitialized, splashShown, location, navigate]);

  // App lifecycle is already initialized and handled by AppLifecycle class
  // No additional visibility handling needed here

  // Route to splash if not initialized
  if (!isInitialized || !splashShown) {
    return <Splash />;
  }

  // Route to biometric auth if needed
  if (user && biometricAuth.state.needsBiometric && !biometricAuth.state.isAuthenticated) {
    return <BiometricAuth />;
  }

  // Handle navigation and bottom bar visibility
  const hideBottomBar = ['/login', '/splash', '/biometric'].includes(location);

  return (
    <div className="mobile-app-container">
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
        
        <Route path="/transactions/:accountId">
          <ProtectedRoute>
            <TransactionHistoryWorking />
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
    </div>
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