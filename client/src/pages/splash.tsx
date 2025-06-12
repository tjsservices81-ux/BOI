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
      className={`full-height relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundImage: `url('/IMG_0633_1749764599916.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
      
      {/* Animated loading spinner positioned where it appears in the screenshot */}
      <div className="absolute" style={{ bottom: '35%', left: '50%', transform: 'translateX(-50%)' }}>
        <div 
          className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
          style={{
            animation: 'spin 1s linear infinite',
            opacity: 0.9
          }}
        />
      </div>
    </div>
  );
}