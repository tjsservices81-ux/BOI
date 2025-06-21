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
import { OfflineAccessManager } from "@/utils/offlineAccessManager";
import { AccountVerificationManager } from "@/utils/accountVerificationManager";
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
import VerifyAccount from "@/pages/verify-account";

function ProtectedRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const authHook = useAuth();
  const user = authHook?.user || null;
  const isLoading = authHook?.isLoading || false;
  
  // Check if app is still in initialization phase
  const appSessionActive = localStorage.getItem('app_session_active');
  const splashCompleted = localStorage.getItem('splash_completed');
  
  // SECURITY FIX: Show loading state instead of null during initialization
  if (!appSessionActive || !splashCompleted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#126987]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  // Normal protection logic after initialization
  if (!user && !isLoading) {
    return fallback ? <>{fallback}</> : <Redirect to="/login" />;
  }
  
  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }
  
  return <VerifiedRoute>{children}</VerifiedRoute>;
}

function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'verified' | 'unverified' | 'error'>('checking');
  const [redirectPath, setRedirectPath] = useState<string>('/signup');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [location] = useLocation();

  useEffect(() => {
    const checkVerification = async () => {
      try {
        // Get current user
        const { UserDataManager } = await import('./utils/userDataManager');
        const currentUser = UserDataManager.getCurrentUser();
        
        if (!currentUser) {
          setVerificationStatus('unverified');
          setRedirectPath('/login');
          setVerificationMessage('Please log in to continue');
          return;
        }

        // Perform silent verification check
        const result = await AccountVerificationManager.performSilentVerificationCheck(currentUser);
        
        if (result.canProceed) {
          setVerificationStatus('verified');
        } else {
          setVerificationStatus('unverified');
          setRedirectPath(result.redirectTo || '/signup');
          setVerificationMessage(result.message || 'Account verification required');
        }
      } catch (error) {
        console.error('Verification check failed:', error);
        setVerificationStatus('error');
        setRedirectPath('/signup');
        setVerificationMessage('Unable to verify account status. Please try again.');
      }
    };

    checkVerification();
  }, [location]);

  // Show loading during verification check
  if (verificationStatus === 'checking') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#126987]">
        <div className="text-white">Verifying account...</div>
      </div>
    );
  }

  // Redirect if verification failed (but only redirect to login, not signup)
  if (verificationStatus === 'unverified' || verificationStatus === 'error') {
    return <Redirect to="/login" />;
  }

  // Render protected content for verified users
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
      // Initialize platform-specific handlers first
      PlatformDetection.setupPlatformSpecificHandlers();
      
      // Apply Android UI fixes to match iOS
      const { AndroidUIFixes } = await import('./utils/androidUIFixes');
      const { AndroidPerformanceOptimizer } = await import('./utils/androidPerformanceOptimizer');
      
      AndroidUIFixes.initialize();
      AndroidUIFixes.fixAccountCardStyling();
      AndroidUIFixes.removeAndroidRippleEffect();
      AndroidPerformanceOptimizer.initialize();
      
      // Initialize cache persistence system
      const { UserDataManager } = await import('./utils/userDataManager');
      UserDataManager.initializeCachePersistence();
      
      // Use platform detection for accurate cold/warm start determination
      const startType = PlatformDetection.getCurrentStartType();
      const isColdStart = startType === 'cold' || startType === 'uncertain';
      
      if (isColdStart) {
        // COLD START: App was fully closed/terminated - check offline access first
        console.log('Cold start detected - checking offline access fallback');
        
        // Check if network is available or if we can use offline cache
        try {
          const offlineSupport = await OfflineAccessManager.ensureOfflineSupport({
            affectedScreen: "InitialConnectionCheck",
            fallbackBehavior: "loadFromIndexedDBCache",
            conditions: {
              networkUnavailable: !navigator.onLine,
              cachedDataAvailable: true,
              lastOnlineLoginWithin: "24h"
            },
            preventRedirects: false,
            preserve: ["authSession", "localUserData", "routeState"],
            debugMode: false,
            testDevice: "Android"
          });

          if (offlineSupport.success && offlineSupport.action === 'offline_access_granted') {
            // Offline access granted - restore user from cache
            console.log('Offline access granted - restoring from cache');
            if (offlineSupport.userData && !user && !isLoading) {
              setTimeout(() => {
                if (!user) {
                  login(offlineSupport.userData);
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error('Offline access check failed:', error);
        }
        
        // Reset splash flags for fresh start
        setSplashShown(false);
        localStorage.removeItem('splash_completed');
        localStorage.removeItem('app_background_time');
        localStorage.setItem('app_session_active', 'true');
        
        // Fallback to normal state restoration if offline access not available
        try {
          const savedState = StateManager.restoreAppState(true);
          if (savedState && savedState.user && !user && !isLoading) {
            setTimeout(() => {
              if (!user) {
                login(savedState.user);
              }
            }, 100);
          }
        } catch (error) {
          console.error('Failed to restore user session:', error);
        }
        
      } else if (startType === 'warm') {
        // WARM START: App was backgrounded - restore exactly where user left off
        console.log('Warm start detected - restoring previous state');
        
        localStorage.removeItem('app_background_time');
        
        try {
          const savedState = StateManager.restoreAppState(false); // Pass isWarmStart flag
          
          if (savedState && savedState.user && !user && !isLoading) {
            // COORDINATION FIX: Prevent race condition with auth context
            setTimeout(() => {
              if (!user) { // Double-check user isn't set by auth context
                login(savedState.user);
                
                // Restore exact route for warm start
                if (savedState.currentRoute && savedState.currentRoute !== '/login' && savedState.currentRoute !== '/splash') {
                  navigate(savedState.currentRoute);
                }
              }
            }, 100);
            
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
      PlatformDetection.markColdStart();
      if (user) {
        StateManager.handleVisibilityChange(location, user);
      }
    };

    const handlePageHide = () => {
      // Page being hidden - potential app termination
      backgroundTimer = setTimeout(() => {
        PlatformDetection.markColdStart();
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



  // Theme restoration helper for app foreground events
  const restoreThemeForCurrentScreen = () => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      if (location === '/splash') {
        themeColorMeta.setAttribute('content', '#000DFF');
      } else {
        themeColorMeta.setAttribute('content', '#126987');
      }
    }
  };



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
      
      restoreThemeForCurrentScreen();
    };

    window.addEventListener('splashComplete', handleSplashComplete);
    return () => window.removeEventListener('splashComplete', handleSplashComplete);
  }, []);

  // Focus event handling for theme restoration
  useEffect(() => {
    const handleFocusRestore = () => {
      restoreThemeForCurrentScreen();
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
            <Route path="/verify-account" component={VerifyAccount} />
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
