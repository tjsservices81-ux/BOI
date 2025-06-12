// Smooth loading component to eliminate glitches
import { useEffect, useState } from "react";

interface SmoothLoaderProps {
  children: React.ReactNode;
  className?: string;
}

export default function SmoothLoader({ children, className = "" }: SmoothLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Ensure all critical assets are loaded before rendering
    const criticalAssets = [
      '/boi_logo.svg',
      '/icon_HID.svg',
      '/Icons_Fingerprint.svg',
      '/branch-locator.svg',
      '/more-prelogin-icon.svg'
    ];

    const preloadPromises = criticalAssets.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Don't block on errors
        img.src = src;
      });
    });

    Promise.all(preloadPromises).then(() => {
      // Use requestAnimationFrame for smooth rendering
      requestAnimationFrame(() => {
        setIsLoaded(true);
      });
    });
  }, []);

  if (!isLoaded) {
    return (
      <div className={`loading-placeholder ${className}`}>
        <div className="opacity-0">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`content-ready ${className}`}>
      {children}
    </div>
  );
}