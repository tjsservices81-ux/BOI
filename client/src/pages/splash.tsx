import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Add splash-specific full screen class for iOS PWA
    document.body.classList.add('splash-fullscreen');
    
    // Change theme color to pure blue for splash screen
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#0000ff');
    }
    
    // Navigate to login after 3 seconds (clean timing)
    const splashTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as shown in session storage
      sessionStorage.setItem('splashShown', 'true');
      // Dispatch event to notify App.tsx that splash is complete
      window.dispatchEvent(new CustomEvent('splashComplete'));
      setTimeout(() => {
        navigate('/login');
      }, 300); // Brief fade out before navigation
    }, 3000);

    // Cleanup timer and remove splash class
    return () => {
      clearTimeout(splashTimer);
      document.body.classList.remove('splash-fullscreen');
      // Restore theme color to #126987 for other screens
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
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
      
      {/* Bank of Ireland Logo positioned in center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          {/* Bank of Ireland Logo */}
          <div className="text-center">
            <img 
              src="/boi_logo.svg" 
              alt="Bank of Ireland" 
              className="h-16 w-auto filter brightness-0 invert asset-instant"
              loading="eager"
              decoding="sync"
              style={{ 
                display: 'block',
                opacity: 1,
                visibility: 'visible',
                imageRendering: 'crisp-edges'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}