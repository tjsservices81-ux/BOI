import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import BottomNavigation from "@/components/BottomNavigation";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import IbanTransfer from "@/pages/iban-transfer";
import UkTransfer from "@/pages/uk-transfer";
import Transfer from "@/pages/transfer";
import TransactionHistory from "@/pages/transaction-history";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  const [location] = useLocation();
  const showNavigation = user && location !== '/login';

  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          {user ? <Dashboard /> : <Redirect to="/login" />}
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
        <Route path="/transaction-history">
          <ProtectedRoute>
            <TransactionHistory />
          </ProtectedRoute>
        </Route>
      </Switch>
      {showNavigation && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
