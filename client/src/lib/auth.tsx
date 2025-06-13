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
  const [isLoading, setIsLoading] = useState(true);
  
  // Defer auth check until after splash screen
  useEffect(() => {
    const checkAuth = () => {
      const hasShownSplash = sessionStorage.getItem('splashShown');
      if (hasShownSplash) {
        // Only restore user after splash has been shown
        const cachedUser = localStorage.getItem('bankingUser');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (error) {
            localStorage.removeItem('bankingUser');
          }
        }
        setIsLoading(false);
      } else {
        // Wait for splash to complete
        const handleSplashComplete = () => {
          const cachedUser = localStorage.getItem('bankingUser');
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch (error) {
              localStorage.removeItem('bankingUser');
            }
          }
          setIsLoading(false);
          window.removeEventListener('splashComplete', handleSplashComplete);
        };
        
        window.addEventListener('splashComplete', handleSplashComplete);
        setIsLoading(false); // Allow splash to show
      }
    };

    checkAuth();
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
