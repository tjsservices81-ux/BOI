import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { autoLoginOnStart, validateTokenWithServer, hasPermanentToken, getStoredUserData } from './permanentAuth';

interface PermanentAuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: any) => void;
}

const PermanentAuthContext = createContext<PermanentAuthContextType | undefined>(undefined);

export function PermanentAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if user has permanent token
      if (hasPermanentToken()) {
        const storedUser = getStoredUserData();
        if (storedUser) {
          setUser(storedUser);
        }
        
        // Validate token with server in background
        try {
          const validatedUser = await validateTokenWithServer();
          if (validatedUser) {
            setUser(validatedUser);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  return (
    <PermanentAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        setUser,
      }}
    >
      {children}
    </PermanentAuthContext.Provider>
  );
}

export function usePermanentAuth() {
  const context = useContext(PermanentAuthContext);
  if (context === undefined) {
    throw new Error('usePermanentAuth must be used within a PermanentAuthProvider');
  }
  return context;
}