import { useEffect, useState } from 'react';
import { Route, Switch, Redirect, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// Removed AppLifecycle dependency for simplified authentication

// Pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Payments from '@/pages/payments';
import Apply from '@/pages/apply';
import IbanTransfer from '@/pages/iban-transfer';
import UkTransfer from '@/pages/uk-transfer';
import InternalTransfer from '@/pages/internal-transfer';
import Transactions from '@/pages/transactions';
import Cards from '@/pages/cards';
import Insights from '@/pages/insights';
import Transfer from '@/pages/transfer';
import BillPay from '@/pages/bill-pay';
import Statements from '@/pages/statements';
import Profile from '@/pages/profile';
import TransactionHistoryWorking from '@/pages/transaction-history-working';
import More from '@/pages/more';
import NotFound from '@/pages/not-found';
import Splash from '@/pages/splash';

// Components
import BottomNavigation from '@/components/BottomNavigation';
import LiveChat from '@/components/LiveChat';

function ProtectedRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!user) {
    return fallback || <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, login } = useAuth();
  const [location, navigate] = useLocation();
  const [splashShown, setSplashShown] = useState(false);
  const [splashTransitioning, setSplashTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRestoringState, setIsRestoringState] = useState(true);
  const [showLiveChat, setShowLiveChat] = useState(false);

  const updateThemeColor = (color: string) => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', color);
    }
  };

  // Initialize app state - always show splash screen on startup
  useEffect(() => {
    const initializeApp = async () => {
      // Always show splash screen for every app startup
      setSplashShown(false);
      sessionStorage.setItem('app_was_active', 'true');
      
      // Clear any previous background/close timestamps
      localStorage.removeItem('app_background_time');
      localStorage.removeItem('app_close_time');
      
      // Try to restore user from localStorage during splash - no expiration checks
      try {
        const savedUser = localStorage.getItem('bankingUser');
        if (savedUser && !user) {
          try {
            const parsedUser = JSON.parse(savedUser);
            login(parsedUser);
          } catch (error) {
            console.error('Failed to restore user:', error);
          }
        }
      } catch (error) {
        console.error('Failed to restore app state:', error);
      }
      
      // Clear only temporary state, preserve user sessions
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('chat') || key.includes('liveChat') || key.includes('tempState')) {
          localStorage.removeItem(key);
        }
      });
      
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#000DFF');
      }
      
      setIsRestoringState(false);
      setTimeout(() => setIsInitialized(true), 0);
    };

    initializeApp();
    
    // Handle app lifecycle events - preserve user sessions permanently
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background - save state and timestamp for force close detection
        localStorage.setItem('app_background_time', Date.now().toString());
        if (user) {
          localStorage.setItem('bankingUser', JSON.stringify(user));
        }
      }
    };

    const handleBeforeUnload = () => {
      // Mark app as closing - helps detect force close vs normal background
      localStorage.setItem('app_close_time', Date.now().toString());
      sessionStorage.removeItem('app_was_active');
      // Save user to localStorage - no timeouts
      if (user) {
        localStorage.setItem('bankingUser', JSON.stringify(user));
      }
    };

    const handlePageHide = () => {
      // Page being hidden - potential force close
      localStorage.setItem('app_close_time', Date.now().toString());
      sessionStorage.removeItem('app_was_active');
      if (user) {
        localStorage.setItem('bankingUser', JSON.stringify(user));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user, location]);

  // Handle splash screen timing - only for genuine fresh app starts
  useEffect(() => {
    const wasAppActive = sessionStorage.getItem('app_was_active');
    
    // Only show splash animation on very first app launch
    if (!splashShown && isInitialized && !isRestoringState && !wasAppActive) {
      const timer = setTimeout(() => {
        setSplashTransitioning(true);
        setTimeout(() => {
          setSplashShown(true);
          setSplashTransitioning(false);
        }, 800);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else if (wasAppActive && !splashShown) {
      // For app restoration, skip splash immediately
      setSplashShown(true);
      setSplashTransitioning(false);
    }
  }, [splashShown, isInitialized, isRestoringState]);

  // Handle route-based theme colors
  useEffect(() => {
    let color = '#000DFF';
    
    if (location === '/dashboard') {
      color = '#126987';
    } else if (location === '/more') {
      color = '#f5f5f5';
    }
    
    updateThemeColor(color);
  }, [location]);

  // Save user session persistently - no timeouts
  useEffect(() => {
    if (user && isInitialized) {
      localStorage.setItem('bankingUser', JSON.stringify(user));
    }
  }, [user, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  if (!splashShown && !splashTransitioning) {
    return <Splash transitioning={false} />;
  }
  
  if (splashTransitioning) {
    return <Splash transitioning={true} />;
  }

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/more" component={More} />
        
        <ProtectedRoute>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/payments" component={Payments} />
          <Route path="/apply" component={Apply} />
          <Route path="/iban-transfer" component={IbanTransfer} />
          <Route path="/uk-transfer" component={UkTransfer} />
          <Route path="/internal-transfer" component={InternalTransfer} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/cards" component={Cards} />
          <Route path="/insights" component={Insights} />
          <Route path="/transfer" component={Transfer} />
          <Route path="/bill-pay" component={BillPay} />
          <Route path="/statements" component={Statements} />
          <Route path="/profile" component={Profile} />
          <Route path="/transaction-history" component={TransactionHistoryWorking} />
          
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
        </ProtectedRoute>
        
        <Route component={NotFound} />
      </Switch>
      
      {/* Global Live Chat - accessible from all pages */}
      {showLiveChat && (
        <LiveChat isOpen={showLiveChat} onClose={() => setShowLiveChat(false)} />
      )}
      
      {/* Bottom Navigation - only show for protected routes */}
      <ProtectedRoute>
        <BottomNavigation />
      </ProtectedRoute>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SecurityWrapper>
              <AppRoutes />
              <Toaster />
            </SecurityWrapper>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}