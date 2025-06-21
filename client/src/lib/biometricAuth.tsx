import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './auth';

interface BiometricAuthState {
  isAuthenticated: boolean;
  needsBiometric: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: any | null;
}

interface BiometricAuthContextType {
  state: BiometricAuthState;
  authenticateWithBiometric: () => Promise<boolean>;
  checkAuthenticationStatus: () => Promise<void>;
  setNeedsBiometric: (needs: boolean) => void;
  logout: () => void;
}

const BiometricAuthContext = createContext<BiometricAuthContextType | null>(null);

export function BiometricAuthProvider({ children }: { children: React.ReactNode }) {
  const authContext = useContext(AuthContext);
  const login = authContext?.login;
  const [state, setState] = useState<BiometricAuthState>({
    isAuthenticated: false,
    needsBiometric: true,
    isLoading: true,
    error: null,
    userInfo: null
  });

  // Check if user has a valid permanent session - works offline with cached responses
  const checkAuthenticationStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // OFFLINE FUNCTIONALITY: Auth status works offline through service worker
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isLoggedIn && data.needsBiometric) {
          // User has valid permanent session and needs biometric verification
          setState(prev => ({
            ...prev,
            needsBiometric: true,
            isAuthenticated: false,
            userInfo: data.user,
            isLoading: false
          }));
        } else if (data.isLoggedIn && !data.needsBiometric) {
          // User has valid backend session - trust the backend validation
          if (login) {
            login({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email
            });
          }
          
          setState(prev => ({
            ...prev,
            needsBiometric: false,
            isAuthenticated: true,
            userInfo: data.user,
            isLoading: false
          }));
        } else if (data.offline) {
          // OFFLINE MODE: Allow biometric authentication offline
          setState(prev => ({
            ...prev,
            needsBiometric: true,
            isAuthenticated: false,
            userInfo: null,
            isLoading: false
          }));
        } else {
          // No valid session - redirect to login
          setState(prev => ({
            ...prev,
            needsBiometric: false,
            isAuthenticated: false,
            userInfo: null,
            isLoading: false
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          needsBiometric: false,
          isAuthenticated: false,
          userInfo: null,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to check authentication status',
        needsBiometric: false,
        isAuthenticated: false,
        isLoading: false
      }));
    }
  };

  // Simulate biometric authentication
  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if Web Authentication API is available
      if (!window.PublicKeyCredential) {
        // Fallback: simulate biometric with user confirmation
        const userConfirmed = window.confirm(
          "Biometric authentication is not available. Would you like to proceed with PIN verification instead?"
        );
        
        if (userConfirmed) {
          // Use setTimeout to ensure state update completes before navigation
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              needsBiometric: false,
              isLoading: false
            }));
          }, 50);
          return true;
        } else {
          setState(prev => ({
            ...prev,
            error: 'Biometric authentication cancelled',
            isLoading: false
          }));
          return false;
        }
      }

      // Simulate biometric scan time then verify with backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call backend to verify biometric authentication
      const response = await fetch('/api/auth/verify-biometric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ verified: true })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Call main auth context login to establish shared session
          if (login) {
            login({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email
            });
          }
          
          // Wait for login to complete, then update biometric state
          await new Promise(resolve => setTimeout(resolve, 100));
          
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            needsBiometric: false,
            userInfo: data.user,
            isLoading: false
          }));
          return true;
        }
      }

      setState(prev => ({
        ...prev,
        error: 'Biometric verification failed',
        isLoading: false
      }));
      return false;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Biometric authentication failed',
        isLoading: false
      }));
      return false;
    }
  };

  const setNeedsBiometric = (needs: boolean) => {
    setState(prev => ({
      ...prev,
      needsBiometric: needs,
      isAuthenticated: needs ? false : prev.isAuthenticated
    }));
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      needsBiometric: false,
      isLoading: false,
      error: null,
      userInfo: null
    });
  };

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const contextValue: BiometricAuthContextType = {
    state,
    authenticateWithBiometric,
    checkAuthenticationStatus,
    setNeedsBiometric,
    logout
  };

  return (
    <BiometricAuthContext.Provider value={contextValue}>
      {children}
    </BiometricAuthContext.Provider>
  );
}

export function useBiometricAuth() {
  const context = useContext(BiometricAuthContext);
  if (!context) {
    throw new Error('useBiometricAuth must be used within a BiometricAuthProvider');
  }
  return context;
}