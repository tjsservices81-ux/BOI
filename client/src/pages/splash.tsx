import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { statusBarManager } from "@/utils/statusBarManager";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Add splash-specific full screen class for iOS PWA
    document.body.classList.add('splash-fullscreen');
    
    // Set splash theme color
    statusBarManager.setSplashColor();
    
    // Navigate to login after splash duration (8 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as shown in session storage
      sessionStorage.setItem('splashShown', 'true');
      // Dispatch event to notify App.tsx that splash is complete
      window.dispatchEvent(new CustomEvent('splashComplete'));
      setTimeout(() => {
        navigate('/login');
      }, 300); // Brief fade out before navigation
    }, 8000); // 8 seconds total

    // Cleanup timer and remove splash class
    return () => {
      clearTimeout(finalTimer);
      document.body.classList.remove('splash-fullscreen');
    };
  }, [navigate]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`full-height relative overflow-hidden transition-all duration-500 asset-instant ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundImage: `url('/IMG_0633_1749764752035.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        userSelect: 'none',
        pointerEvents: 'none',
        opacity: 1,
        visibility: 'visible'
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
      <div className="absolute" style={{ bottom: '30%', left: '50%', transform: 'translateX(-50%)' }}>
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