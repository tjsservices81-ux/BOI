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

  // Initialize auth state on mount - preserve session across refreshes
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check for cached user first - maintain session persistence
        const cachedUser = localStorage.getItem('bankingUser');
        if (cachedUser && isMounted) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
            
            // Verify session with server to ensure it's still valid
            const response = await fetch('/api/auth/user', {
              credentials: 'include'
            });
            
            if (response.ok) {
              const serverUser = await response.json();
              // Update user data if server has newer info
              if (serverUser) {
                setUser(serverUser);
                localStorage.setItem('bankingUser', JSON.stringify(serverUser));
              }
            } else {
              // Server session invalid - only clear if 401 unauthorized
              if (response.status === 401) {
                localStorage.removeItem('bankingUser');
                setUser(null);
              }
              // For other errors (500, network), keep cached user
            }
          } catch (error) {
            // Network/parsing error - keep cached user, don't logout
            console.warn('Auth initialization error, maintaining cached session:', error);
          }
        } else {
          // No cached user - check server session anyway
          try {
            const response = await fetch('/api/auth/user', {
              credentials: 'include'
            });
            
            if (response.ok) {
              const serverUser = await response.json();
              if (serverUser && isMounted) {
                setUser(serverUser);
                localStorage.setItem('bankingUser', JSON.stringify(serverUser));
              }
            }
          } catch (error) {
            // Network error during server check - no action needed
            console.warn('Server auth check failed:', error);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
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
    // DISABLED: Only admin panel can terminate sessions or delete accounts
    console.log('🚫 SECURITY VIOLATION: Frontend logout attempt blocked');
    console.log('🔒 SECURITY RULE: Only admin panel can terminate sessions');
    console.log('📋 Call Stack:', new Error().stack);
    
    // Return without clearing any user data or localStorage
    // Sessions and user data persist until admin intervention
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
