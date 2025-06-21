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
    let initializationTimer: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        // Always check for cached user - no cold start detection
        // Users stay logged in permanently until admin deletion
        try {
          const cachedUser = localStorage.getItem('bankingUser');
          if (cachedUser && isMounted) {
            try {
              const parsedUser = JSON.parse(cachedUser);
              setUser(parsedUser);
              // Reset parse failure counter on success
              localStorage.removeItem('bankingUser_parseFailures');
            } catch (parseError) {
              console.error('JSON parse failed, user data preserved for recovery:', parseError);
              // Keep user data safe - never delete on parse errors
              // Show recoverable error state instead of wiping account
              setUser(null); // Temporary state, data preserved
            }
          }
        } catch (storageError) {
          console.error('localStorage access failed, maintaining current state:', storageError);
          // Don't change user state on storage access errors
        }
        
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error, preserving existing state:', error);
        if (isMounted) {
          // Don't wipe user state on initialization errors
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Start initialization immediately
    initializeAuth();
    
    // Fallback timeout to prevent infinite loading
    initializationTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('Auth initialization timeout reached, forcing completion');
        setIsLoading(false);
        setIsInitialized(true);
      }
    }, 3000);
    
    return () => {
      isMounted = false;
      if (initializationTimer) {
        clearTimeout(initializationTimer);
      }
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
    // Reset parse failure counter on successful login
    localStorage.removeItem('bankingUser_parseFailures');
  };

  const logout = async () => {
    // Logout disabled - users can only be logged out via admin deletion
    console.warn('logout() disabled - users can only be logged out via admin deletion');
    
    // Clear offline login permissions on logout attempt
    try {
      const { SecureAuthManager } = await import('../utils/secureAuthManager');
      SecureAuthManager.clearOfflineLoginPermissions();
    } catch (error) {
      console.error('Failed to clear offline permissions:', error);
    }
    
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
