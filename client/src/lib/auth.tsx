// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserDataManager } from '../utils/userDataManager';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount - check for valid session
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // PERMANENT LOGIN: Check for permanent user session - users stay logged in forever
        const cachedUser = UserDataManager.getCurrentUser();
        const userProfile = UserDataManager.getUserProfile();
        const isPermanentlyLoggedIn = UserDataManager.getUserData('permanentlyLoggedIn', false);
        
        if (cachedUser && userProfile && isPermanentlyLoggedIn && isMounted) {
          // User has permanent session - they stay logged in forever unless admin deletes
          console.log('🔐 PERMANENT SESSION: User stays logged in forever unless admin deletes');
          setUser({
            id: userProfile.id || parseInt(userProfile.customerNumber) || 0,
            name: userProfile.name,
            email: userProfile.email
          });
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
        UserDataManager.setUserData('currentUser', JSON.stringify(updatedUser));
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
    console.log('🔐 AuthContext login() called with:', userData);
    setUser(userData);
    // Set current user identifier for UserDataManager
    const userIdentifier = (userData as any).customerNumber || userData.id.toString();
    UserDataManager.setCurrentUser(userIdentifier);
    console.log('✅ User session saved to localStorage');
    
    // Emit global login event for navigation handlers
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
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
