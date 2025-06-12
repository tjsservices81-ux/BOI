import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [animationPhase, setAnimationPhase] = useState<'fade-in' | 'visible' | 'fade-out'>('fade-in');

  useEffect(() => {
    // Phase 1: Fade in logo (1 second)
    const fadeInTimer = setTimeout(() => {
      setAnimationPhase('visible');
    }, 1000);

    // Phase 2: Hold visible (6 seconds)
    const holdTimer = setTimeout(() => {
      setAnimationPhase('fade-out');
    }, 7000);

    // Phase 3: Fade out and navigate to login (1 second)
    const navigateTimer = setTimeout(() => {
      navigate('/login');
    }, 8000);

    // Cleanup timers
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(holdTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="full-height relative overflow-hidden"
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
      
      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Bank of Ireland Logo */}
        <div 
          className={`transform ${
            animationPhase === 'fade-in' 
              ? 'splash-logo-enter' 
              : animationPhase === 'visible'
                ? 'splash-logo-visible'
                : 'splash-logo-exit'
          }`}
        >
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-20 filter brightness-0 invert"
            style={{ 
              imageRendering: 'crisp-edges',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
        
        {/* Subtle animated ring around logo */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-2000 ${
            animationPhase === 'visible' ? 'opacity-30' : 'opacity-0'
          }`}
        >
          <div 
            className="w-32 h-32 border border-white rounded-full animate-pulse"
            style={{ 
              animationDuration: '3s',
              animationIterationCount: 'infinite'
            }}
          />
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