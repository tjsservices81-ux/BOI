import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Wifi, WifiOff } from "lucide-react";
import { AccountVerificationManager } from "@/utils/accountVerificationManager";
import { UserDataManager } from "@/utils/userDataManager";

export default function VerifyAccount() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [canRetry, setCanRetry] = useState(true);

  useEffect(() => {
    checkConnectionAndVerification();
  }, []);

  const checkConnectionAndVerification = async () => {
    setIsLoading(true);
    try {
      // Check connection
      const isOnline = navigator.onLine;
      setConnectionStatus(isOnline ? 'online' : 'offline');

      // Get current user
      const currentUser = UserDataManager.getCurrentUser();
      if (!currentUser) {
        setVerificationMessage('No active user session found. Please log in again.');
        setCanRetry(false);
        return;
      }

      // Check verification status
      const verification = AccountVerificationManager.checkAccountVerification(currentUser);
      
      if (verification.isVerified && verification.verifiedOnline) {
        setVerificationMessage('Account verified successfully!');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      if (isOnline) {
        setVerificationMessage('Please connect to the internet to verify your account status.');
      } else {
        setVerificationMessage(verification.reason || 'Account verification required.');
      }

    } catch (error) {
      console.error('Verification check failed:', error);
      setVerificationMessage('Unable to check verification status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryVerification = async () => {
    setIsLoading(true);
    try {
      const currentUser = UserDataManager.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const result = await AccountVerificationManager.performSilentVerificationCheck(currentUser);
      
      if (result.canProceed) {
        setVerificationMessage('Account verified successfully!');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setVerificationMessage(result.message || 'Verification failed. Please complete signup.');
        if (result.redirectTo === '/signup') {
          setTimeout(() => navigate('/signup'), 2000);
        }
      }
    } catch (error) {
      setVerificationMessage('Verification check failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = () => {
    navigate('/signup');
  };

  const handleBackToLogin = () => {
    // Clear current session and return to login
    UserDataManager.clearCurrentUser();
    navigate('/login');
  };

  return (
    <div className="full-height relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right bg-gradient-to-br from-[#126987] to-[#2d5a6b]">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center h-full">
        <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img 
                src="/boi_logo.svg" 
                alt="Bank of Ireland" 
                className="h-8 filter brightness-0"
                loading="eager"
                decoding="sync"
              />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800">
              Account Verification
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {connectionStatus === 'checking' ? (
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
              ) : connectionStatus === 'online' ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-gray-600">
                {connectionStatus === 'checking' ? 'Checking connection...' :
                 connectionStatus === 'online' ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Verification Status */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {verificationMessage.includes('successfully') ? (
                  <CheckCircle className="w-12 h-12 text-green-500" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-orange-500" />
                )}
              </div>
              
              <p className="text-gray-700 text-sm leading-relaxed">
                {verificationMessage || 'Checking account verification status...'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && !verificationMessage.includes('successfully') && (
                <>
                  <Button
                    onClick={handleRetryVerification}
                    disabled={isLoading}
                    className="w-full bg-[#126987] hover:bg-[#2d5a6b] text-white"
                  >
                    {isLoading ? 'Checking...' : 'Check Again'}
                  </Button>
                  
                  <Button
                    onClick={handleCompleteSignup}
                    variant="outline"
                    className="w-full border-[#126987] text-[#126987] hover:bg-[#126987] hover:text-white"
                  >
                    Complete Signup
                  </Button>
                </>
              )}
              
              <Button
                onClick={handleBackToLogin}
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-800"
              >
                Back to Login
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-gray-500 border-t pt-4">
              <p>Having trouble verifying your account?</p>
              <p>Please ensure you have completed the signup process and have an internet connection.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}