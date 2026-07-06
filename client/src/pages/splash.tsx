import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Ensure complete state clearing during splash
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('chat') || key.includes('liveChat') || key.includes('tempState') || key.includes('session_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Add splash-specific full screen class for iOS PWA
    // Note: this intentionally does NOT touch the global `theme-color` or
    // `apple-mobile-web-app-status-bar-style` meta tags. Under iOS's
    // translucent/glass status bar, changing those here and forgetting to
    // reset every one of them on every exit path leaves the real status bar
    // stuck on the splash color/style after the splash screen is gone -
    // the splash's own background is fully opaque and covers the safe area,
    // so the real status bar never actually needs to change color for this.
    document.body.classList.add('splash-fullscreen');
    document.documentElement.style.setProperty('--status-bar-color', '#000DFF');

    // Navigate to login after splash duration (5 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as completed in localStorage for proper state tracking
      localStorage.setItem('splash_completed', 'true');

      // Dispatch event to notify App.tsx that splash is complete
      window.dispatchEvent(new CustomEvent('splashComplete'));
      setTimeout(() => {
        // Always navigate to login after splash for cold starts
        navigate('/login');
      }, 400); // Slightly longer fade for smoother color shift
    }, 5000); // 5 seconds total

    // Cleanup timer and remove splash class
    return () => {
      clearTimeout(finalTimer);
      document.body.classList.remove('splash-fullscreen');
      document.documentElement.style.removeProperty('--status-bar-color');
    };
  }, [navigate]);

  // Prevent any user interaction during splash
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      data-splash-active
      className={`full-height relative overflow-hidden transition-all duration-500 asset-instant splash-container ${
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
        visibility: 'visible',
        backgroundColor: '#000DFF'
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