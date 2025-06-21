import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function LoadingAnimation() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Animation duration: 2 seconds
    const timer = setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Bank of Ireland Logo */}
        <div className="mb-8">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-16 mx-auto opacity-90"
          />
        </div>

        {/* Success Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-500 flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Ripple effect */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-green-500 opacity-30 animate-ping"></div>
        </div>

        {/* Success Message */}
        <div className="text-white text-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          <h2 className="text-2xl font-bold mb-2">Authentication Successful</h2>
          <p className="text-blue-200 text-lg">Accessing your account...</p>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center mt-6 space-x-1">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}