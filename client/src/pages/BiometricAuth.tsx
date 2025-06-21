import React, { useState, useEffect } from 'react';
import { useBiometricAuth } from '@/lib/biometricAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BiometricAuth() {
  const { state, authenticateWithBiometric, checkAuthenticationStatus } = useBiometricAuth();
  const [, setLocation] = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (state.isAuthenticated) {
      // Add small delay to allow animation to complete before redirect
      setTimeout(() => {
        setLocation('/dashboard');
      }, 100);
    } else if (!state.needsBiometric && !state.isLoading) {
      setLocation('/login');
    }
  }, [state.isAuthenticated, state.needsBiometric, state.isLoading, setLocation]);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometric();
      // Let useEffect handle navigation after state updates
    } catch (error) {
      console.error('Biometric authentication error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state.needsBiometric) {
    return null; // Let useEffect handle navigation
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Secure Access Required
          </CardTitle>
          <CardDescription className="text-gray-600">
            Welcome back, {state.userInfo?.name || 'User'}. Please verify your identity to access your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
              <Fingerprint className="h-10 w-10 text-blue-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Biometric Authentication</h3>
              <p className="text-sm text-gray-600">
                Use your fingerprint, face ID, or PIN to continue
              </p>
            </div>
          </div>

          <Button
            onClick={handleBiometricAuth}
            disabled={isAuthenticating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
          >
            {isAuthenticating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Authenticating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Authenticate
              </div>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation('/login')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Use different account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}