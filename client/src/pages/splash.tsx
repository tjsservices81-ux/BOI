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
      className={`full-height relative overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(135deg, #126987 0%, #0f5a6b 100%)',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Prevent any interactions */}
      <div 
        className="absolute inset-0 z-50"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Main content centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Bank of Ireland Logo */}
        <div className="mb-16">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-20 filter brightness-0 invert splash-logo-visible"
            style={{ 
              imageRendering: 'crisp-edges',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
        
        {/* Loading Messages */}
        <div className="text-center h-16 flex items-center justify-center">
          {loadingSteps.map((message, index) => (
            <div
              key={index}
              className={`absolute transition-all duration-500 ease-in-out ${
                index === currentStep 
                  ? 'opacity-100 transform translate-y-0' 
                  : index < currentStep
                    ? 'opacity-0 transform -translate-y-2'
                    : 'opacity-0 transform translate-y-2'
              }`}
            >
              <p 
                className="text-white text-lg font-medium"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                {message}
              </p>
            </div>
          ))}
        </div>
        
        {/* Loading indicator dots */}
        <div className="mt-8 flex space-x-2">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentStep 
                  ? 'bg-white opacity-100' 
                  : 'bg-white opacity-30'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Subtle background pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('/background.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
    </div>
  );
}