// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserDataManager } from "@/utils/userDataManager";

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
  const [user, setUser] = useState<User | null>(() => {
    // Initialize user state from UserDataManager to prevent auth flash
    const currentUser = UserDataManager.getCurrentUser();
    if (currentUser) {
      const userProfile = UserDataManager.getUserProfile();
      if (userProfile) {
        return {
          id: parseInt(currentUser),
          name: userProfile.name,
          email: userProfile.email
        };
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = (userData: User) => {
    setUser(userData);
    // Set current user in UserDataManager instead of direct localStorage
    UserDataManager.setCurrentUser(userData.id.toString());
  };

  const logout = async () => {
    try {
      // Clear user state immediately
      setUser(null);
      // Clear current user from UserDataManager instead of direct localStorage
      UserDataManager.setCurrentUser('');
      
      // Call backend logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
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
