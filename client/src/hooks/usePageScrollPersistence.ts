import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAppStateManager } from "./useAppStateManager";

export function usePageScrollPersistence(pageId?: string) {
  const [location] = useLocation();
  const { saveScrollPosition, getScrollPosition } = useAppStateManager();
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  const currentPageId = pageId || location;

  // Save scroll position with debouncing
  const handleScroll = () => {
    if (isRestoringRef.current) return;
    
    const element = scrollElementRef.current || document.documentElement;
    const scrollY = element.scrollTop;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save operation
    saveTimeoutRef.current = setTimeout(() => {
      saveScrollPosition(currentPageId, scrollY);
    }, 100);
  };

  // Restore scroll position
  const restoreScroll = () => {
    const element = scrollElementRef.current || document.documentElement;
    const savedPosition = getScrollPosition(currentPageId);
    
    if (savedPosition > 0) {
      isRestoringRef.current = true;
      
      // Use requestAnimationFrame for smooth restoration
      requestAnimationFrame(() => {
        element.scrollTo({
          top: savedPosition,
          behavior: 'auto' // Instant restoration
        });
        
        // Reset restoration flag after completion
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 50);
      });
    }
  };

  // Set scroll container reference
  const setScrollContainer = (element: HTMLElement | null) => {
    // Remove old event listener
    if (scrollElementRef.current) {
      scrollElementRef.current.removeEventListener('scroll', handleScroll);
    }
    
    scrollElementRef.current = element;
    
    // Add new event listener
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      // Default to window scroll
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Restore scroll position when container is set
    setTimeout(restoreScroll, 10);
  };

  // Auto-restore scroll when page changes
  useEffect(() => {
    const timeoutId = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timeoutId);
  }, [currentPageId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      if (scrollElementRef.current) {
        scrollElementRef.current.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return {
    setScrollContainer,
    restoreScroll,
    scrollElementRef
  };
}