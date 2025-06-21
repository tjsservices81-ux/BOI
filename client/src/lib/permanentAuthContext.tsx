// PERMANENT AUTHENTICATION CONTEXT
// Ensures users NEVER get logged out unless manually deleted by admin

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface PermanentAuthContextType {
  user: User | null;
  login: (user: User, sessionToken: string) => void;
  isLoading: boolean;
  sessionToken: string | null;
}

const PermanentAuthContext = createContext<PermanentAuthContextType | undefined>(undefined);

export function PermanentAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize permanent auth state on mount
  useEffect(() => {
    const initializePermanentAuth = async () => {
      try {
        // Always check for permanent session token first
        const storedToken = UserDataManager.getUserData('permanentSessionToken', null);
        const storedUser = UserDataManager.getUserData('permanentUserData', null);

        if (storedToken && storedUser) {
          // Validate permanent session with server
          const response = await fetch('/api/auth/validate-permanent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: storedToken })
          });

          if (response.ok) {
            const userData = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
            setUser(userData);
            setSessionToken(storedToken);
            console.log('🔒 PERMANENT SESSION RESTORED: User automatically logged in');
          } else {
            // Token invalid - likely user was deleted by admin
            UserDataManager.clearUserData('permanentSessionToken');
            UserDataManager.clearUserData('permanentUserData');
            console.log('🗑️ ADMIN DELETION DETECTED: Permanent session invalidated');
          }
        }
      } catch (error) {
        console.error('Error initializing permanent auth:', error);
        // Keep existing session even on error - only admin deletion should clear
      } finally {
        setIsLoading(false);
      }
    };

    initializePermanentAuth();
  }, []);

  // Login function that stores permanent session data
  const login = (userData: User, newSessionToken: string) => {
    setUser(userData);
    setSessionToken(newSessionToken);
    
    // Store permanently in localStorage - NEVER expires
    localStorage.setItem('permanentSessionToken', newSessionToken);
    localStorage.setItem('permanentUserData', JSON.stringify(userData));
    
    console.log('💾 PERMANENT SESSION SAVED: User will stay logged in forever');
  };

  // Logout functionality REMOVED - users can only be logged out via admin deletion
  // The logout function from the original auth context is not included here

  return (
    <PermanentAuthContext.Provider
      value={{
        user,
        login,
        isLoading,
        sessionToken,
      }}
    >
      {children}
    </PermanentAuthContext.Provider>
  );
}

export function usePermanentAuth() {
  const context = useContext(PermanentAuthContext);
  if (context === undefined) {
    throw new Error("usePermanentAuth must be used within a PermanentAuthProvider");
  }
  return context;
}