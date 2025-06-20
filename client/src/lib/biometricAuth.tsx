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
        if (data.isLoggedIn) {
          // User has valid permanent session but needs biometric verification
          setState(prev => ({
            ...prev,
            needsBiometric: true,
            isAuthenticated: false,
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

      // For now, simulate successful biometric authentication
      // In a real app, this would use WebAuthn or device biometric APIs
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate biometric scan time
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        needsBiometric: false,
        isLoading: false
      }));
      
      return true;
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