import React, { createContext, useContext, useState, useEffect } from 'react';

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
  const [state, setState] = useState<BiometricAuthState>({
    isAuthenticated: false,
    needsBiometric: true,
    isLoading: true,
    error: null,
    userInfo: null
  });

  // Check if user has a valid permanent session
  const checkAuthenticationStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
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
          // User is already fully authenticated
          setState(prev => ({
            ...prev,
            needsBiometric: false,
            isAuthenticated: true,
            userInfo: data.user,
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
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            needsBiometric: false,
            isLoading: false
          }));
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