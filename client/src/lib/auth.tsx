// Authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserDataManager } from "@/utils/userDataManager";

interface User {
  id: number;
  customerNumber: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const currentUserNumber = UserDataManager.getCurrentUser();
    if (currentUserNumber && UserDataManager.userExists(currentUserNumber)) {
      const userData = UserDataManager.getAllUsers()[currentUserNumber];
      setUser({
        id: 1, // Default user ID for now - will be updated when switching to full database auth
        customerNumber: currentUserNumber,
        name: userData.name,
        email: userData.email
      });
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    const currentUserNumber = UserDataManager.getCurrentUser();
    if (currentUserNumber && UserDataManager.userExists(currentUserNumber)) {
      // Record login time
      UserDataManager.recordLoginTime(currentUserNumber);
      
      const userData = UserDataManager.getAllUsers()[currentUserNumber];
      setUser({
        id: 1, // Default user ID for now - will be updated when switching to full database auth
        customerNumber: currentUserNumber,
        name: userData.name,
        email: userData.email
      });
    }
  };

  const logout = () => {
    UserDataManager.clearCurrentUser();
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
