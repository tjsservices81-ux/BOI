import { useEffect } from 'react';

export function useAppScrollLock(locked: boolean) {
  useEffect(() => {
    const el = document.querySelector('.app-shell') || 
               document.getElementById('app') || 
               document.getElementById('root');
    if (!el) return;

    if (locked) {
      el.classList.add('locked');
    } else {
      el.classList.remove('locked');
    }

    return () => {
      el?.classList.remove('locked');
      document.documentElement.style.scrollBehavior = '';
    };
  }, [locked]);
}
