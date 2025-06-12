// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { sessionManager } from "./sessionManager";
import { UserDataManager } from "@/utils/userDataManager";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData?: User) => void;
  logout: () => void;
  isLoading: boolean;
  shouldShowSplash: boolean;
  shouldRequireAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowSplash, setShouldShowSplash] = useState(true);
  const [shouldRequireAuth, setShouldRequireAuth] = useState(true);

  // Initialize session management and check existing auth state
  useEffect(() => {
    const sessionState = sessionManager.getState();
    
    // Subscribe to session state changes
    const unsubscribe = sessionManager.subscribe((state) => {
      setShouldShowSplash(state.shouldShowSplash);
      setShouldRequireAuth(!state.sessionValid);
      
      // If session is invalid, clear user
      if (!state.sessionValid) {
        setUser(null);
      }
    });

    // Check for existing valid session
    const checkExistingSession = () => {
      const currentUser = UserDataManager.getCurrentUser();
      
      if (currentUser && UserDataManager.userExists(currentUser) && sessionState.sessionValid) {
        // Restore user session from stored data
        const userProfile = UserDataManager.getUserProfile();
        if (userProfile) {
          setUser({
            id: parseInt(currentUser.replace(/\D/g, '')) || 1,
            name: userProfile.name,
            email: userProfile.email
          });
        }
      }
      
      setShouldShowSplash(sessionState.shouldShowSplash);
      setShouldRequireAuth(!sessionState.sessionValid);
      setIsLoading(false);
    };

    checkExistingSession();

    return () => {
      unsubscribe();
    };
  }, []);

  const login = (userData?: User) => {
    const currentUser = UserDataManager.getCurrentUser();
    
    if (userData) {
      setUser(userData);
    } else if (currentUser) {
      // Auto-login with stored user data
      const userProfile = UserDataManager.getUserProfile();
      if (userProfile) {
        setUser({
          id: parseInt(currentUser.replace(/\D/g, '')) || 1,
          name: userProfile.name,
          email: userProfile.email
        });
      }
    }
    
    // Update session manager
    sessionManager.login();
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
    sessionManager.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        shouldShowSplash,
        shouldRequireAuth,
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
