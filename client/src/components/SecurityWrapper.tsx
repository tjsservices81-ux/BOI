import { useEffect, ReactNode } from 'react';

interface SecurityWrapperProps {
  children: ReactNode;
}

export function SecurityWrapper({ children }: SecurityWrapperProps) {
  useEffect(() => {
    // Enhanced security measures
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.contentEditable === 'true' ||
                         target.closest('input') ||
                         target.closest('textarea') ||
                         target.getAttribute('role') === 'textbox' ||
                         target.closest('[role="textbox"]');
      
      // Allow ALL normal typing and editing operations in form fields
      if (isFormField) {
        // Allow normal typing, backspace, delete, arrow keys, tab, enter, etc.
        const normalKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'];
        if (normalKeys.includes(e.key) || e.key.length === 1) {
          return true; // Allow all normal typing
        }
        
        // Allow copy/paste/select all and editing operations
        if (e.ctrlKey || e.metaKey) {
          const allowedKeys = ['a', 'c', 'v', 'x', 'z', 'y']; 
          if (allowedKeys.includes(e.key.toLowerCase())) {
            return true;
          }
        }
      }
      
      // Only block developer shortcuts outside form fields
      if (!isFormField) {
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key))) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // Prevent common shortcuts for copying, saving, viewing source
        if (e.ctrlKey || e.metaKey) {
          const blockedKeys = ['s', 'p', 'u', 'r', 'h'];
          if (blockedKeys.includes(e.key.toLowerCase())) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow text selection in input fields, textareas, and contenteditable elements
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true' ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.getAttribute('role') === 'textbox' ||
          target.closest('[role="textbox"]')) {
        return true;
      }
      // Only prevent selection outside form fields
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.contentEditable === 'true' ||
                         target.closest('input') ||
                         target.closest('textarea');
      
      // Allow normal touch interaction with form fields
      if (isFormField) {
        return true;
      }
      
      // Prevent long press on mobile that might trigger sharing (only outside form fields)
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.contentEditable === 'true' ||
                         target.closest('input') ||
                         target.closest('textarea');
      
      // Allow normal touch scrolling in form fields
      if (isFormField) {
        return true;
      }
      
      // Prevent pinch zoom (only outside form fields)
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Disable print functionality
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Override clipboard API safely (disabled to allow form field operations)
    const overrideClipboard = () => {
      // Temporarily disabled to allow copy/paste in form fields
      // Will implement selective clipboard blocking later
      return;
    };

    // Override Web Share API safely
    const overrideShare = () => {
      try {
        if ('share' in navigator) {
          const originalShare = navigator.share;
          navigator.share = () => Promise.reject(new Error('Sharing is disabled for security'));
        }
      } catch (e) {
        // Silently fail if we can't override share
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

    // Detect and prevent developer tools (disabled to prevent form interference)
    const detectDevTools = () => {
      // Temporarily disabled as it interferes with form input
      // Will implement a less aggressive detection method
      return;
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
    <div className="secure-wrapper" style={{ 
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      <style>{`
        .secure-wrapper {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        .secure-wrapper input,
        .secure-wrapper textarea,
        .secure-wrapper [contenteditable="true"] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `}</style>
      {children}
    </div>
  );
}