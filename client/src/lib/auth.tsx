// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SessionManager } from "@/utils/sessionManager";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (customerNumber: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session management using SessionManager
  const getSessionToken = () => SessionManager.getSession();
  const setSessionToken = (token: string) => SessionManager.setSession(token);
  const clearSessionToken = () => SessionManager.clearSession();

  // Check for existing session on mount
  useEffect(() => {
    const validateSession = async () => {
      const sessionToken = getSessionToken();
      
      if (sessionToken) {
        try {
          const response = await fetch('/api/auth/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            clearSessionToken();
          }
        } catch (error) {
          clearSessionToken();
        }
      } else {
        clearSessionToken();
      }
      
      setIsLoading(false);
    };

    validateSession();

    // Setup PWA lifecycle management
    SessionManager.setupLifecycleListeners();

    // Additional auth-specific lifecycle handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lifecycle = SessionManager.checkAppLifecycle();
        if (lifecycle === 'closed') {
          // App was fully closed - clear user state
          setUser(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (customerNumber: string, pin: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNumber, pin })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionToken(data.sessionToken);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    clearSessionToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
