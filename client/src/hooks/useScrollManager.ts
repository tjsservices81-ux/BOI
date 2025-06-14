import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

interface ScrollManagerOptions {
  saveScrollPosition: (route: string, scrollY: number) => void;
  getScrollPosition: (route: string) => number;
}

export function useScrollManager({ saveScrollPosition, getScrollPosition }: ScrollManagerOptions) {
  const [location] = useLocation();
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isRestoringScroll = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Save scroll position with debouncing
  const handleScroll = useCallback(() => {
    if (isRestoringScroll.current) return;
    
    const container = scrollContainerRef.current || document.documentElement;
    const scrollY = container.scrollTop;
    
    // Debounce scroll saving
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveScrollPosition(location, scrollY);
    }, 150);
  }, [location, saveScrollPosition]);

  // Restore scroll position for current route
  const restoreScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current || document.documentElement;
    const savedScrollY = getScrollPosition(location);
    
    if (savedScrollY > 0) {
      isRestoringScroll.current = true;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        container.scrollTo({
          top: savedScrollY,
          behavior: 'auto' // Instant restore
        });
        
        // Reset the flag after a brief delay
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      });
    }
  }, [location, getScrollPosition]);

  // Set up scroll container reference
  const setScrollContainer = useCallback((element: HTMLElement | null) => {
    // Remove old listener
    if (scrollContainerRef.current) {
      scrollContainerRef.current.removeEventListener('scroll', handleScroll);
    }
    
    scrollContainerRef.current = element;
    
    // Add new listener
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      // Fallback to window/document
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
  }, [handleScroll]);

  // Restore scroll position when route changes
  useEffect(() => {
    // Small delay to ensure the new page content is rendered
    const timeoutId = setTimeout(restoreScrollPosition, 50);
    return () => clearTimeout(timeoutId);
  }, [location, restoreScrollPosition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return {
    setScrollContainer,
    restoreScrollPosition,
    handleScroll
  };
}