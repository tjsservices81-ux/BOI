// Simple authentication context for the banking app
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserDataManager } from "@/utils/userDataManager";

interface User {
  id: number;
  name: string;
  email: string;
  customerNumber: string;
}

interface AuthContextType {
  user: User | null;
  login: (customerNumber: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const savedSession = localStorage.getItem('boi_auth_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (UserDataManager.userExists(sessionData.customerNumber)) {
          UserDataManager.setCurrentUser(sessionData.customerNumber);
          const userProfile = UserDataManager.getUserProfile();
          if (userProfile) {
            setUser({
              id: 1,
              name: userProfile.name,
              email: userProfile.email,
              customerNumber: userProfile.customerNumber
            });
          }
        } else {
          // Clean up invalid session
          localStorage.removeItem('boi_auth_session');
        }
      } catch (error) {
        localStorage.removeItem('boi_auth_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (customerNumber: string) => {
    if (UserDataManager.userExists(customerNumber)) {
      UserDataManager.setCurrentUser(customerNumber);
      const userProfile = UserDataManager.getUserProfile();
      if (userProfile) {
        const userData = {
          id: 1,
          name: userProfile.name,
          email: userProfile.email,
          customerNumber: userProfile.customerNumber
        };
        setUser(userData);
        
        // Save session to localStorage
        localStorage.setItem('boi_auth_session', JSON.stringify({
          customerNumber: userProfile.customerNumber,
          timestamp: Date.now()
        }));
      }
    }
  };

  const logout = () => {
    setUser(null);
    UserDataManager.clearCurrentUser();
    localStorage.removeItem('boi_auth_session');
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
