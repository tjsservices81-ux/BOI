import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { sessionManager } from "@/lib/sessionManager";
import { UserDataManager } from "@/utils/userDataManager";

export default function Splash() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { user, login } = useAuth();

  const loadingSteps = [
    "Verifying device…",
    "Checking for updates…", 
    "Loading security settings…",
    "Establishing secure connection…",
    "Preparing login screen…"
  ];

  useEffect(() => {
    const sessionState = sessionManager.getState();
    
    // If user exists and session is valid, skip splash and go directly to dashboard
    if (user && sessionState.sessionValid && !sessionState.shouldShowSplash) {
      navigate('/dashboard');
      return;
    }

    // Step progression timing: each step lasts 1.6 seconds
    const stepTimers: NodeJS.Timeout[] = [];
    
    // Progress through each loading step
    loadingSteps.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, index * 1600); // 1.6 seconds per step
      stepTimers.push(timer);
    });

    // Navigate to appropriate screen after all steps complete (8 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      sessionManager.markSplashComplete();
      
      setTimeout(() => {
        // Check if we have a valid user session to restore
        const currentUser = UserDataManager.getCurrentUser();
        if (currentUser && UserDataManager.userExists(currentUser) && !sessionState.shouldShowSplash) {
          // Auto-login and go to dashboard
          login();
          navigate('/dashboard');
        } else {
          // Go to login screen
          navigate('/login');
        }
      }, 300); // Brief fade out before navigation
    }, loadingSteps.length * 1600);

    stepTimers.push(finalTimer);

    // Cleanup all timers
    return () => {
      stepTimers.forEach(timer => clearTimeout(timer));
    };
  }, [navigate, user, login]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`full-height relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Professional subtle gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(18, 105, 135, 0.03) 0%, rgba(18, 105, 135, 0.08) 100%)',
        }}
      />
      
      {/* Prevent any interactions */}
      <div 
        className="absolute inset-0 z-50"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Main content centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        {/* Professional logo container with subtle shadow */}
        <div className="mb-20 relative">
          <div className="absolute inset-0 bg-[#126987] opacity-5 blur-xl rounded-full scale-150"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <img 
              src="/boi_logo.svg" 
              alt="Bank of Ireland" 
              className="h-16 w-auto"
              style={{ 
                imageRendering: 'crisp-edges',
                userSelect: 'none',
                pointerEvents: 'none',
                filter: 'brightness(0) saturate(100%) invert(25%) sepia(85%) saturate(1011%) hue-rotate(168deg) brightness(93%) contrast(88%)'
              }}
              draggable={false}
            />
          </div>
        </div>
        
        {/* Loading Messages with professional styling */}
        <div className="text-center h-20 flex items-center justify-center mb-4">
          {loadingSteps.map((message, index) => (
            <div
              key={index}
              className={`absolute transition-all duration-700 ease-out ${
                index === currentStep 
                  ? 'opacity-100 transform translate-y-0 scale-100' 
                  : index < currentStep
                    ? 'opacity-0 transform -translate-y-3 scale-95'
                    : 'opacity-0 transform translate-y-3 scale-95'
              }`}
            >
              <p 
                className="text-[#126987] text-lg font-semibold tracking-wide"
                style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              >
                {message}
              </p>
            </div>
          ))}
        </div>
        
        {/* Professional progress bar */}
        <div className="w-64 bg-gray-200 rounded-full h-1.5 mb-6 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-[#126987] to-[#0f5a6b] h-1.5 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ 
              width: `${((currentStep + 1) / loadingSteps.length) * 100}%`,
              boxShadow: '0 0 8px rgba(18, 105, 135, 0.4)'
            }}
          />
        </div>
        
        {/* Minimalist step indicators */}
        <div className="flex space-x-3">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                index <= currentStep 
                  ? 'bg-[#126987] scale-125 shadow-sm' 
                  : 'bg-gray-300 scale-100'
              }`}
              style={{
                boxShadow: index <= currentStep ? '0 0 4px rgba(18, 105, 135, 0.6)' : 'none'
              }}
            />
          ))}
        </div>
        
        {/* Professional footer */}
        <div className="absolute bottom-12 text-center">
          <p 
            className="text-gray-500 text-sm font-medium tracking-wide"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Bank of Ireland Digital Banking
          </p>
          <div className="mt-2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[#126987] to-transparent mx-auto opacity-30"></div>
        </div>
      </div>
    </div>
  );
}