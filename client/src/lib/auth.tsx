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
              // DISABLED: Never clear user session automatically - only admin can delete accounts
              // Keep cached user session active regardless of server response
              console.log('Server session check failed - maintaining cached user session');
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

  // Listen for admin actions and forced logout events
  useEffect(() => {
    // Handle admin deletion events - immediate logout and biometric lockout
    const handleUserDeletion = (event: MessageEvent) => {
      if (event.data?.type === 'FORCE_LOGOUT' && event.data?.reason === 'ACCOUNT_DELETED') {
        const deletedCustomerNumber = event.data.customerNumber;
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser === deletedCustomerNumber) {
          console.log('🚨 Account deleted by admin - forcing immediate logout');
          
          // Clear all user data immediately
          setUser(null);
          localStorage.removeItem('bankingUser');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('lastActiveUser');
          
          // Clear all user-specific data
          const allKeys = Object.keys(localStorage);
          for (const key of allKeys) {
            if (key.includes(deletedCustomerNumber)) {
              localStorage.removeItem(key);
            }
          }
          
          // Force navigation to login
          window.location.href = '/login';
        }
      }
    };

    // Listen for cross-tab deletion events
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data?.type === 'USER_DELETED') {
        const deletedCustomerNumber = event.data.customerNumber;
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser === deletedCustomerNumber) {
          console.log('🚨 Account deleted in another tab - forcing logout');
          handleUserDeletion({
            data: {
              type: 'FORCE_LOGOUT',
              customerNumber: deletedCustomerNumber,
              reason: 'ACCOUNT_DELETED'
            }
          } as MessageEvent);
        }
      }
    };

    // Set up listeners
    window.addEventListener('message', handleUserDeletion);
    
    const broadcastChannel = new BroadcastChannel('bankingApp');
    broadcastChannel.addEventListener('message', handleBroadcastMessage);

    // Listen for admin profile updates to refresh user data immediately
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
      window.removeEventListener('message', handleUserDeletion);
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      broadcastChannel.close();
      window.removeEventListener('adminProfileUpdate', handleProfileUpdate);
      window.removeEventListener('userProfileUpdate', handleProfileUpdate);
    };
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('bankingUser', JSON.stringify(userData));
  };

  const logout = async () => {
    // Frontend logout only navigates to login screen - does NOT clear any data
    // User data and sessions persist for immediate re-authentication
    // Only admin panel can actually delete accounts and clear sessions
    console.log('Frontend logout: navigating to login screen without clearing data');
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
