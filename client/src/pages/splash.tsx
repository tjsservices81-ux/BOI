import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Navigate to login after 5-6 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        navigate('/login');
      }, 300); // Brief fade out before navigation
    }, 5500); // 5.5 seconds total

    return () => clearTimeout(timer);
  }, [navigate]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`h-screen w-screen fixed inset-0 overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: '#3333ff', // Bright royal blue matching the screenshot
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Main content centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Bank of Ireland logo */}
        <div className="mb-8">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-20 w-auto filter brightness-0 invert"
            style={{ 
              imageRendering: 'crisp-edges',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
        
        {/* Loading spinner */}
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
        </div>
      </div>

      {/* Curved white bottom shape matching screenshot */}
      <div className="absolute bottom-0 left-0 right-0 h-64">
        <svg 
          viewBox="0 0 375 250" 
          className="w-full h-full"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          <path 
            d="M 0 80 Q 187.5 0 375 80 L 375 250 L 0 250 Z" 
            fill="white"
          />
        </svg>
      </div>
    </div>
  );
}