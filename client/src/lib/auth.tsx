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

  // Check for cached user session on mount
  useEffect(() => {
    let mounted = true;
    
    // Check for cached user first
    const cachedUser = localStorage.getItem('bankingUser');
    if (cachedUser) {
      try {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        setIsLoading(false);
        return;
      } catch (error) {
        localStorage.removeItem('bankingUser');
      }
    }
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok && mounted) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('bankingUser', JSON.stringify(userData));
        } else if (mounted) {
          setUser(null);
          localStorage.removeItem('bankingUser');
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          localStorage.removeItem('bankingUser');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (!cachedUser) {
      checkAuth();
    }
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
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
