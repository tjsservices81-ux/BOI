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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount - check for valid session
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Always check for cached user - no cold start detection
        // Users stay logged in permanently until admin deletion
        const cachedUser = localStorage.getItem('bankingUser');
        if (cachedUser && isMounted) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
          } catch (error) {
            console.error('Failed to parse cached user, keeping data for retry:', error);
            // Don't remove localStorage data on single parse failure
            // Only clear if repeatedly failing to prevent permanent data loss
            const parseFailures = parseInt(localStorage.getItem('bankingUser_parseFailures') || '0');
            if (parseFailures >= 3) {
              localStorage.removeItem('bankingUser');
              localStorage.removeItem('bankingUser_parseFailures');
            } else {
              localStorage.setItem('bankingUser_parseFailures', (parseFailures + 1).toString());
            }
            setUser(null);
          }
        }
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for admin profile updates to refresh user data immediately
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (user && customEvent.detail) {
        const updatedUser = {
          id: user.id,
          name: customEvent.detail.name || user.name,
          email: customEvent.detail.email || user.email
        };
        
        // Update user state immediately without flickering
        setUser(updatedUser);
        localStorage.setItem('bankingUser', JSON.stringify(updatedUser));
      }
    };

    window.addEventListener('adminProfileUpdate', handleProfileUpdate);
    window.addEventListener('userProfileUpdate', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
    };
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('bankingUser', JSON.stringify(userData));
  };

  const logout = async () => {
    // Logout disabled - users can only be logged out via admin deletion
    console.warn('logout() disabled - users can only be logged out via admin deletion');
    return;
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
