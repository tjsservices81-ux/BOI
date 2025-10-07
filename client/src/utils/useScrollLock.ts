import { useEffect } from 'react';

export function useAppScrollLock(locked: boolean) {
  useEffect(() => {
    const el = document.querySelector('.app-shell') || 
               document.getElementById('app') || 
               document.getElementById('root');
    if (!el) return;

    if (locked) {
      // Add locked class with forced reflow to ensure CSS applies
      el.classList.add('locked');
      // Force browser to recalculate styles
      void (el as HTMLElement).offsetHeight;
      
      // Also lock html and body as backup
      document.documentElement.classList.add('scroll-locked');
      document.body.classList.add('scroll-locked');
      
      // Prevent any scroll events
      const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      window.addEventListener('scroll', preventScroll, { passive: false, capture: true });
      window.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      
      // Store cleanup function
      (el as any)._scrollLockCleanup = () => {
        window.removeEventListener('scroll', preventScroll, { capture: true });
        window.removeEventListener('touchmove', preventScroll, { capture: true });
      };
    } else {
      el.classList.remove('locked');
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
      
      // Clean up event listeners
      if ((el as any)._scrollLockCleanup) {
        (el as any)._scrollLockCleanup();
        delete (el as any)._scrollLockCleanup;
      }
    }

    return () => {
      el?.classList.remove('locked');
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
      document.documentElement.style.scrollBehavior = '';
      
      // Clean up event listeners on unmount
      if ((el as any)._scrollLockCleanup) {
        (el as any)._scrollLockCleanup();
        delete (el as any)._scrollLockCleanup;
      }
    };
  }, [locked]);
}
