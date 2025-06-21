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

  // Initialize auth state on mount - check localStorage first
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // PRIMARY CHECK: Look for currentUser in localStorage
        let currentUser = localStorage.getItem('currentUser');
        
        // FALLBACK: If currentUser missing, try lastActiveUser
        if (!currentUser) {
          const fallbackUser = localStorage.getItem('lastActiveUser');
          if (fallbackUser) {
            localStorage.setItem('currentUser', fallbackUser);
            currentUser = fallbackUser;
            console.log('🔄 FALLBACK: Restored currentUser from lastActiveUser');
          }
        }
        
        if (currentUser) {
          try {
            // Check if user is permanently logged in
            const permanentlyLoggedIn = localStorage.getItem('permanentlyLoggedIn');
            const userProfile = UserDataManager.getUserProfile(currentUser);
            
            if (permanentlyLoggedIn === 'true' && userProfile && isMounted) {
              console.log('🔐 PERMANENT SESSION RESTORED: Auto-login from currentUser');
              setUser({
                id: userProfile.id || parseInt(userProfile.customerNumber) || 0,
                name: userProfile.name,
                email: userProfile.email
              });
            } else if (userProfile && isMounted) {
              // Try UserDataManager method for individual user flags
              const isPermanentlyLoggedIn = UserDataManager.getUserData(currentUser, 'permanentlyLoggedIn', false);
              
              if (isPermanentlyLoggedIn) {
                console.log('🔐 USER SESSION RESTORED: Via UserDataManager');
                setUser({
                  id: userProfile.id || parseInt(userProfile.customerNumber) || 0,
                  name: userProfile.name,
                  email: userProfile.email
                });
              }
            }
          } catch (error) {
            console.warn('Error restoring user session:', error);
            // Clear corrupted data and continue
            localStorage.removeItem('currentUser');
            localStorage.removeItem('permanentlyLoggedIn');
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
