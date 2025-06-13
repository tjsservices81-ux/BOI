import { useEffect, ReactNode } from 'react';

interface SecurityWrapperProps {
  children: ReactNode;
}

export function SecurityWrapper({ children }: SecurityWrapperProps) {
  useEffect(() => {
    // Enhanced security measures
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts for copying, saving, viewing source
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ['a', 'c', 'v', 's', 'p', 'u', 'r', 'h'];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow text selection only in input fields
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent long press on mobile that might trigger sharing
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent pinch zoom
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Disable print functionality
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Override clipboard API
    const overrideClipboard = () => {
      if (navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: () => Promise.reject(new Error('Clipboard access disabled')),
            readText: () => Promise.reject(new Error('Clipboard access disabled')),
            write: () => Promise.reject(new Error('Clipboard access disabled')),
            read: () => Promise.reject(new Error('Clipboard access disabled'))
          },
          writable: false
        });
      }
    };

    // Override Web Share API
    const overrideShare = () => {
      if ('share' in navigator) {
        Object.defineProperty(navigator, 'share', {
          value: () => Promise.reject(new Error('Sharing is disabled for security')),
          writable: false
        });
      }
    };

    // Disable image context menus specifically
    const handleImageContextMenu = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Hide URL bar on mobile devices
    const hideUrlBar = () => {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.scrollTo(0, 1);
        // Force full screen on mobile
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 500);
      }
    };

    // Detect and prevent developer tools
    const detectDevTools = () => {
      let devtools = { open: false };
      
      const detect = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
          if (!devtools.open) {
            devtools.open = true;
            // Redirect to prevent inspection
            window.location.reload();
          }
        } else {
          devtools.open = false;
        }
      };
      
      setInterval(detect, 100);
    };

    // Apply all security measures
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('beforeprint', handleBeforePrint, true);
    
    // Image-specific protection
    document.addEventListener('contextmenu', handleImageContextMenu, true);
    
    overrideClipboard();
    overrideShare();
    hideUrlBar();
    detectDevTools();

    // Prevent zoom gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('beforeprint', handleBeforePrint, true);
      document.removeEventListener('contextmenu', handleImageContextMenu, true);
    };
  }, []);

  return (
    <div className="no-select" style={{ 
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      {children}
    </div>
  );
}