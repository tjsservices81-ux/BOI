import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Navigate to login after 5.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        navigate('/login');
      }, 300);
    }, 5500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className={`h-screen w-screen fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: '#0037ff', // Exact color from screenshot
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* Centered logo and spinner */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Bank of Ireland logo - centered exactly like screenshot */}
        <div className="flex flex-col items-center">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-16 w-auto filter brightness-0 invert"
            style={{ 
              imageRendering: 'crisp-edges',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
          
          {/* Loading spinner positioned 50-60px below logo */}
          <div 
            className="mt-14"
            style={{ marginTop: '56px' }}
          >
            <div 
              className="animate-spin rounded-full border-2"
              style={{
                width: '24px',
                height: '24px',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderTopColor: 'rgba(255, 255, 255, 0.8)',
                animationDuration: '1s'
              }}
            />
          </div>
        </div>
      </div>

      {/* Curved white bottom shape - exact match to screenshot */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '30vh' }}>
        <svg 
          viewBox="0 0 414 300" 
          className="w-full h-full"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {/* Perfect curve matching the screenshot's arc pattern */}
          <path 
            d="M 0 100 
               C 70 50, 130 70, 207 90
               C 284 110, 344 50, 414 100
               L 414 300 
               L 0 300 Z" 
            fill="white"
            style={{ fillRule: 'evenodd' }}
          />
        </svg>
      </div>
    </div>
  );
}