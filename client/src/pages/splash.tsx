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
    // Splash gets the blue status bar. Every other screen is strictly teal —
    // this variable is cleared again on the way out (see cleanup below).
    document.documentElement.style.setProperty('--status-bar-color', '#000DFF');
    
    // Comprehensive theme color update for splash screen
    const updateThemeColor = () => {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (themeColorMeta) {
        themeColorMeta.content = '#000DFF';
      }
      
      // Create or update additional iOS-specific status bar configuration
      const iosStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
      if (iosStatusMeta) {
        iosStatusMeta.content = 'default';
      }
      
      // Force PWA status bar color update
      if ('setAppBadge' in navigator) {
        // PWA-specific color updates
        document.body.style.backgroundColor = '#000DFF';
        setTimeout(() => {
          document.body.style.backgroundColor = '';
        }, 100);
      }
    };
    
    // Update immediately and with delays for iOS PWA
    updateThemeColor();
    setTimeout(updateThemeColor, 50);
    setTimeout(updateThemeColor, 200);
    setTimeout(updateThemeColor, 1000);
    
    // Navigate to login after splash duration (8 seconds total)
    const finalTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as completed in localStorage for proper state tracking
      localStorage.setItem('splash_completed', 'true');
      
      // Back to teal BEFORE navigating so the blue never carries past the splash.
      // index.html paints body/html blue at load for the splash visual — those
      // inline styles must be cleared here or the blue would persist app-wide.
      document.documentElement.style.setProperty('--status-bar-color', '#126987');
      document.body.style.backgroundColor = '#126987';
      document.documentElement.style.backgroundColor = '#126987';
      document.body.classList.remove('splash-fullscreen');
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#126987');
      }
      
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
      document.documentElement.style.setProperty('--status-bar-color', '#126987');
      document.body.style.backgroundColor = '#126987';
      document.documentElement.style.backgroundColor = '#126987';
      // Restore theme-color for main app
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#126987');
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