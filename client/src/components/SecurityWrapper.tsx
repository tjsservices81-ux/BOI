import { useEffect, ReactNode } from 'react';

interface SecurityWrapperProps {
  children: ReactNode;
}

export function SecurityWrapper({ children }: SecurityWrapperProps) {
  useEffect(() => {
    // Basic security without interfering with forms
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Allow all interactions in form elements
      if (target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }
      
      // Block developer tools shortcuts only outside forms
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key))) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow text selection in form elements
      if (target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }
      e.preventDefault();
    };

    // Override share API safely
    try {
      if ('share' in navigator) {
        Object.defineProperty(navigator, 'share', {
          value: () => Promise.reject(new Error('Sharing disabled')),
          writable: false
        });
      }
    } catch (e) {
      // Silently handle if we can't override
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  return (
    <div className="w-full h-full" style={{ 
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      <style>{`
        input, textarea, [contenteditable="true"] {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
      `}</style>
      {children}
    </div>
  );
}