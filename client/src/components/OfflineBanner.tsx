import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBanner(true);
      // Hide "back online" banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner initially if offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-white text-center text-sm font-medium transition-all duration-300 ${
        isOffline
          ? 'bg-red-600 border-b border-red-700'
          : 'bg-green-600 border-b border-green-700'
      }`}
    >
      <div className="flex items-center justify-center space-x-2">
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Using cached data where available.</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span>You're back online! Data will sync automatically.</span>
          </>
        )}
      </div>
    </div>
  );
}