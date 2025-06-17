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
  adminLogout: () => void; // Controlled logout through admin panel only
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount - PERSISTENT SESSION (no auto-logout)
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // NEVER auto-logout - always restore cached user session
        const cachedUser = localStorage.getItem('bankingUser');
        if (cachedUser && isMounted) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
          } catch (error) {
            console.error('Error parsing cached user:', error);
            // Don't clear on parse error - preserve session
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          // Don't clear user on error - preserve session
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

  // Regular logout - BLOCKED (only admin logout allowed)
  const logout = async () => {
    console.warn('⚠️ Regular logout blocked - use admin panel to logout');
    // Do nothing - logout only allowed through admin panel
    return;
  };

  // Admin-controlled logout - only way to actually logout
  const adminLogout = async () => {
    try {
      console.log('🔐 Admin logout initiated');
      
      // Clear user state immediately
      setUser(null);
      localStorage.removeItem('bankingUser');
      
      // Clear UserDataManager session
      const { UserDataManager } = await import('@/utils/userDataManager');
      UserDataManager.clearCurrentUser();
      
      // Call backend logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      console.log('✅ Admin logout completed');
    } catch (error) {
      console.error('Admin logout error:', error);
      // Even if backend fails, ensure local state is cleared
      setUser(null);
      localStorage.removeItem('bankingUser');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        adminLogout,
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
