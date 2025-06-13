// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check auth after splash completes
  useEffect(() => {
    const handleSplashComplete = () => {
      const cachedUser = localStorage.getItem('bankingUser');
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch (error) {
          localStorage.removeItem('bankingUser');
        }
      }
    };

    // Check if splash was already shown
    const hasShownSplash = sessionStorage.getItem('splashShown');
    if (hasShownSplash) {
      handleSplashComplete();
    } else {
      window.addEventListener('splashComplete', handleSplashComplete);
    }

    return () => {
      window.removeEventListener('splashComplete', handleSplashComplete);
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('bankingUser', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem('bankingUser');
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
