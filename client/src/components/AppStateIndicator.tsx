import { useState, useEffect } from 'react';
import { appStateManager } from '@/utils/appStateManager';

export default function AppStateIndicator() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleStateRestored = () => {
      setIsRestoring(true);
      setShowIndicator(true);
      
      // Hide indicator after animation
      setTimeout(() => {
        setIsRestoring(false);
        setTimeout(() => setShowIndicator(false), 300);
      }, 1000);
    };

    const handleAppPause = () => {
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 500);
    };

    window.addEventListener('appStateRestored', handleStateRestored);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleAppPause();
      }
    });

    return () => {
      window.removeEventListener('appStateRestored', handleStateRestored);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div 
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300"
      style={{
        opacity: showIndicator ? 1 : 0,
        transform: `translate(-50%, ${showIndicator ? '0' : '-20px'})`
      }}
    >
      <div className="bg-[#126987] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
        {isRestoring ? 'Restoring your session...' : 'Saving state...'}
      </div>
    </div>
  );
}