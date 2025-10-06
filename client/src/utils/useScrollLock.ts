import { useEffect } from 'react';

export function useAppScrollLock(locked: boolean) {
  useEffect(() => {
    const el = document.querySelector('.app-shell') || 
               document.getElementById('app') || 
               document.getElementById('root');
    if (!el) return;

    if (locked) {
      el.classList.add('locked');
      // prevent accidental document scroll position jumps
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
    } else {
      el.classList.remove('locked');
      document.documentElement.style.scrollBehavior = '';
    }

    return () => {
      el?.classList.remove('locked');
      document.documentElement.style.scrollBehavior = '';
    };
  }, [locked]);
}
