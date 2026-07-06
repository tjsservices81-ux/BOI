import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Whenever the splash is actually shown, the next screen MUST be the
    // login screen - never an auto-redirect to the dashboard. Accounts stay
    // logged in locally, so without this flag the "/" route would see
    // user + splash_completed the instant the splash finishes and bounce to
    // the dashboard for a moment before our delayed navigate('/login') runs.
    // The flag is cleared by the login page on a successful login.
    localStorage.setItem('cold_start_active', 'true');

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

    // Take over from the static boot loader in index.html. It shows the
    // exact same artwork, so removing it the moment this component is on
    // screen is a seamless swap - the user perceives one single splash.
    (window as any).__reactTookOver = true;
    const bootLoader = document.getElementById('loading-screen');
    if (bootLoader) bootLoader.remove();

    // One splash total: shorten this screen's duration by however long the
    // boot loader was already visible, so boot loader + React splash always
    // add up to roughly 5 seconds instead of stacking two full splashes.
    const bootStart = (window as any).__bootStartTime as number | undefined;
    const elapsed = bootStart ? Date.now() - bootStart : 0;
    const remaining = Math.min(5000, Math.max(1500, 5000 - elapsed));

    // Navigate to login after the remaining splash duration
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
    }, remaining);

    // Cleanup timer and remove splash class. Also hand the page background
    // to the app teal here: splash blue must never outlive the splash, and
    // on iOS the status bar takes its color from the page background.
    return () => {
      clearTimeout(finalTimer);
      document.body.classList.remove('splash-fullscreen');
      document.body.style.backgroundColor = '#126987';
      document.documentElement.style.backgroundColor = '#126987';
      document.body.removeAttribute('data-initial-bg');
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