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
    document.body.classList.add('splash-fullscreen');
    
    // Set status bar to match splash blue background
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#0000ff');
    }
    
    // Add status bar styling for splash screen
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', 'black-translucent');
    } else {
      const newStatusBarMeta = document.createElement('meta');
      newStatusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      newStatusBarMeta.setAttribute('content', 'black-translucent');
      document.head.appendChild(newStatusBarMeta);
    }
    
    // Set viewport for full screen experience
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewportMeta?.getAttribute('content') || '';
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    }
    
    // Navigate to login after splash duration (8 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as shown in session storage
      sessionStorage.setItem('splashShown', 'true');
      // Clear the cold start flag to allow normal auth flow
      sessionStorage.removeItem('app_cold_start');
      // Dispatch event to notify App.tsx that splash is complete
      window.dispatchEvent(new CustomEvent('splashComplete'));
      setTimeout(() => {
        // Always navigate to login after splash for cold starts
        navigate('/login');
      }, 300); // Brief fade out before navigation
    }, 8000); // 8 seconds total

    // Cleanup timer and remove splash class
    return () => {
      clearTimeout(finalTimer);
      document.body.classList.remove('splash-fullscreen');
      
      // Restore theme color to #126987 for other screens
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
      
      // Restore normal status bar styling
      const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (statusBarMeta) {
        statusBarMeta.setAttribute('content', 'default');
      }
      
      // Restore normal viewport
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
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
      className={`splash-container relative overflow-hidden transition-all duration-500 asset-instant ${
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
      {/* Status bar overlay to blend with splash background */}
      <div 
        className="absolute top-0 left-0 right-0 z-40"
        style={{
          height: 'env(safe-area-inset-top, 44px)',
          background: '#0000ff',
          pointerEvents: 'none'
        }}
      />
      
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