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

  // Initialize app - always check backend session first
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 App initializing - checking backend session');
      
      try {
        // Always check backend session status first
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        const authStatus = await response.json();
        
        if (authStatus.isLoggedIn) {
          console.log('✅ Valid backend session found');
          
          if (authStatus.user) {
            login(authStatus.user);
          }
          
          // Set biometric requirement if needed
          if (authStatus.needsBiometric) {
            console.log('🔐 Biometric verification required');
            biometricAuth.setNeedsBiometric(true);
          }
          
          // Skip splash screen and restore to last screen
          setSplashShown(true);
          setIsInitialized(true);
          
          // Restore saved route and state
          const savedState = StateManager.restoreAppState();
          if (savedState && savedState.currentRoute && savedState.currentRoute !== '/') {
            console.log(`🔄 Restoring to saved route: ${savedState.currentRoute}`);
            // Add restore parameter to skip loading animations
            const restoreUrl = savedState.currentRoute.includes('?') 
              ? `${savedState.currentRoute}&restore=true`
              : `${savedState.currentRoute}?restore=true`;
            navigate(restoreUrl);
            
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
              }, 200);
            }
          } else {
            // Navigate to dashboard with restore parameter
            navigate('/dashboard?restore=true');
          }
          
          return;
        }
        
        // No valid session - show login
        console.log('❌ No valid backend session - showing login');
        
        // Clear any cached user data
        const cachedUser = localStorage.getItem('bankingUser');
        if (cachedUser) {
          console.log('🧹 Clearing cached user data');
          localStorage.removeItem('bankingUser');
        }
        
        // Show splash screen then login
        setSplashShown(false);
        setTimeout(() => {
          setSplashShown(true);
          setIsInitialized(true);
        }, 1500);
        
      } catch (error) {
        console.error('❌ Failed to check authentication status:', error);
        // On error, assume no session and show login
        setSplashShown(false);
        setTimeout(() => {
          setSplashShown(true);
          setIsInitialized(true);
        }, 1500);
      }
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

  // Handle app lifecycle for state persistence
  useEffect(() => {
    // Save state when app goes to background for state restoration
    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        // Collect current scroll positions
        const scrollPositions: Record<string, number> = {};
        
        // Save scroll positions from all scroll containers
        document.querySelectorAll('[data-scroll-container]').forEach(element => {
          const container = element as HTMLElement;
          const route = container.dataset.scrollRoute;
          if (route) {
            scrollPositions[route] = container.scrollTop;
          }
        });

        // Save main window scroll if no specific containers
        if (Object.keys(scrollPositions).length === 0) {
          scrollPositions[location] = window.scrollY;
        }

        // Save state for potential restoration (UI state only)
        StateManager.saveAppState({
          user,
          currentRoute: location,
          timestamp: Date.now(),
          scrollPositions,
          formData: StateManager.getAllFormData()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, location]);

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