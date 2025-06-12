// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  // Session management - persists when app is minimized, clears when fully closed
  const getSessionToken = () => {
    return sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken');
  };

  const setSessionToken = (token: string) => {
    // Store in both sessionStorage (cleared on tab close) and localStorage (persistent)
    sessionStorage.setItem('sessionToken', token);
    localStorage.setItem('sessionToken', token);
    localStorage.setItem('sessionCreated', Date.now().toString());
  };

  const clearSessionToken = () => {
    sessionStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionCreated');
  };

  const isSessionValid = () => {
    const sessionCreated = localStorage.getItem('sessionCreated');
    if (!sessionCreated) return false;
    
    const sessionAge = Date.now() - parseInt(sessionCreated);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    return sessionAge < maxAge;
  };

  // Check for existing session on mount
  useEffect(() => {
    const validateSession = async () => {
      const sessionToken = getSessionToken();
      
      if (sessionToken && isSessionValid()) {
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

    // Detect when app is fully closed vs minimized
    const handleBeforeUnload = () => {
      // Keep session in localStorage for persistence when minimizing
      // sessionStorage will be cleared on full close
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App came back to foreground - validate session
        const sessionToken = getSessionToken();
        if (!sessionToken || !sessionStorage.getItem('sessionToken')) {
          // Session was cleared (app was fully closed)
          setUser(null);
          clearSessionToken();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
