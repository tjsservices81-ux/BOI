import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import BottomNavigation from "@/components/BottomNavigation";

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
import TransactionHistory from "@/pages/transaction-history";
import TransactionHistorySimple from "@/pages/transaction-history-simple";
import TransactionHistoryWorking from "@/pages/transaction-history-working";
import DebugTransactions from "@/pages/debug-transactions";
import Statements from "@/pages/statements";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading, shouldShowSplash, shouldRequireAuth } = useAuth();
  const [location] = useLocation();
  
  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="w-full h-full bg-white overflow-hidden relative">
        <Splash />
      </div>
    );
  }
  
  // Show splash screen when required (cold start or app was closed)
  if (shouldShowSplash) {
    return (
      <div className="w-full h-full bg-white overflow-hidden relative">
        <Splash />
      </div>
    );
  }
  
  // If user exists but session requires auth (app was backgrounded too long)
  if (user && shouldRequireAuth) {
    return (
      <div className="w-full h-full bg-white overflow-hidden relative">
        <Login />
      </div>
    );
  }
  
  // Always show navigation for authenticated users except on specific exclusion screens
  const excludedRoutes = ['/login', '/splash'];
  const showNavigation = user && !excludedRoutes.includes(location);

  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      <Switch>
        <Route path="/splash" component={Splash} />
        <Route path="/login" component={Login} />
        <Route path="/more" component={More} />
        <Route path="/">
          {user ? <Dashboard /> : <Login />}
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
