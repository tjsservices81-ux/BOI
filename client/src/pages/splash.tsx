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
      // theme-color is deliberately NOT touched. iOS latches onto the value it
      // sees and will not change it back, so setting it to the splash blue left
      // the status bar stuck blue for the rest of the session. It stays teal in
      // index.html; the splash's blue comes from the painted band instead.
      
      // Create or update additional iOS-specific status bar configuration
      const iosStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
      if (iosStatusMeta) {
        iosStatusMeta.content = 'default';
      }
      
      // Do NOT tint body/html — iOS derives the status-bar colour from them, so
      // tinting them blue is exactly what put a blue bar at the top of the
      // splash. The splash's blue visual comes from the splash <div> and the
      // loading screen instead; the page background stays white so the status
      // bar is white on the splash too.
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
      
      // Leaving the splash: clear any inline background so body/html fall back
      // to white (the status bar stays white). No teal, no blue.
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
      document.body.classList.remove('splash-fullscreen');
      
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
      // Clear inline backgrounds so the page returns to white — never teal.
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
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