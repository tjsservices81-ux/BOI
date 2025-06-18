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

  // Initialize app state with persistent login (no timeouts)
  useEffect(() => {
    const initializeApp = async () => {
      // Check if sessionStorage was cleared (indicates fresh app start)
      const wasAppActive = sessionStorage.getItem('app_was_active');
      
      if (!wasAppActive) {
        // Fresh app start - show splash but preserve user sessions
        setSplashShown(false);
        sessionStorage.setItem('app_was_active', 'true');
      } else {
        // App was backgrounded - restore state without splash animation
        try {
          // Try to restore user from localStorage - no expiration checks
          const savedUser = localStorage.getItem('bankingUser');
          if (savedUser && !user) {
            try {
              const parsedUser = JSON.parse(savedUser);
              login(parsedUser);
            } catch (error) {
              console.error('Failed to restore user:', error);
            }
          }
          // Skip splash entirely for app restoration
          setSplashShown(true);
          setIsRestoringState(false);
        } catch (error) {
          console.error('Failed to restore app state:', error);
          setSplashShown(true);
          setIsRestoringState(false);
        }
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
        // App going to background - save user to localStorage
        if (user) {
          localStorage.setItem('bankingUser', JSON.stringify(user));
        }
      }
    };

    const handleBeforeUnload = () => {
      // Clear session marker to detect force close
      sessionStorage.removeItem('app_was_active');
      // Save user to localStorage - no timeouts
      if (user) {
        localStorage.setItem('bankingUser', JSON.stringify(user));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, location]);

  // Handle splash screen timing - only for fresh app starts
  useEffect(() => {
    const wasAppActive = sessionStorage.getItem('app_was_active');
    
    if (!splashShown && isInitialized && !isRestoringState && !wasAppActive) {
      const timer = setTimeout(() => {
        setSplashTransitioning(true);
        setTimeout(() => {
          setSplashShown(true);
          setSplashTransitioning(false);
        }, 800);
      }, 1500);
      
      return () => clearTimeout(timer);
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