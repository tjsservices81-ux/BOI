import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import boiIcon from "@assets/IMG_0602_1749695996315.png";

export default function Splash() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const loadingSteps = [
    "Initializing secure environment…",
    "Verifying device credentials…", 
    "Loading encrypted protocols…",
    "Establishing banking connection…",
    "Finalizing authentication system…"
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
        className="absolute inset-0 z-20"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Main content centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 px-8">
        {/* Bank of Ireland Branding */}
        <div className="text-center mb-12">
          <img 
            src={boiIcon} 
            alt="Bank of Ireland" 
            className="h-20 w-20 mx-auto mb-6 splash-logo-visible"
            style={{ 
              imageRendering: 'crisp-edges',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
            }}
            draggable={false}
          />
          
          {/* Bank Name */}
          <h1 
            className="text-white text-2xl font-bold tracking-wide mb-2"
            style={{ 
              fontFamily: 'OpenSans, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px'
            }}
          >
            Bank of Ireland
          </h1>
          
          {/* Tagline */}
          <p 
            className="text-white/90 text-sm font-medium"
            style={{ 
              fontFamily: 'OpenSans, sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
          >
            Mobile Banking
          </p>
        </div>
        
        {/* Loading Messages */}
        <div className="text-center h-20 flex items-center justify-center relative mb-8 w-full max-w-sm">
          {loadingSteps.map((message, index) => (
            <div
              key={index}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${
                index === currentStep 
                  ? 'opacity-100 transform translate-y-0 scale-100' 
                  : index < currentStep
                    ? 'opacity-0 transform -translate-y-3 scale-95'
                    : 'opacity-0 transform translate-y-3 scale-95'
              }`}
            >
              <p 
                className="text-white/95 text-base font-medium text-center px-4"
                style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  lineHeight: '1.4'
                }}
              >
                {message}
              </p>
            </div>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-xs mb-6">
          <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ 
                width: `${((currentStep + 1) / loadingSteps.length) * 100}%`,
                boxShadow: '0 0 8px rgba(255,255,255,0.5)'
              }}
            />
          </div>
        </div>
        
        {/* Loading indicator dots */}
        <div className="flex space-x-3">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index <= currentStep 
                  ? 'bg-white opacity-100 scale-110' 
                  : 'bg-white/40 opacity-60 scale-100'
              }`}
              style={{
                boxShadow: index <= currentStep ? '0 0 6px rgba(255,255,255,0.6)' : 'none'
              }}
            />
          ))}
        </div>
        
        {/* Security Notice */}
        <div className="absolute bottom-12 text-center px-8">
          <p 
            className="text-white/70 text-xs font-medium"
            style={{ 
              fontFamily: 'OpenSans, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            Secured by 256-bit encryption
          </p>
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