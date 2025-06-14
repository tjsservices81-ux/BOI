/**
 * Centralized Navigation Manager
 * Handles standardized page transitions and animations across the app
 */

type NavigationAnimation = 'slide-right' | 'slide-left' | 'slide-up' | 'fade';

class NavigationManager {
  private isNavigating: boolean = false;
  private navigationCallbacks: Set<(isNavigating: boolean) => void> = new Set();

  // Register callback for navigation state changes
  onNavigationChange(callback: (isNavigating: boolean) => void) {
    this.navigationCallbacks.add(callback);
    return () => this.navigationCallbacks.delete(callback);
  }

  // Standardized navigation with animations
  navigateWithAnimation(
    setLocation: (path: string) => void,
    path: string,
    animation: NavigationAnimation = 'slide-right'
  ) {
    if (this.isNavigating) return; // Prevent duplicate navigation

    this.isNavigating = true;
    this.notifyNavigationChange();

    // Add exit animation class
    document.body.classList.add('page-transitioning', `transition-${animation}`);

    // Navigate after animation delay
    setTimeout(() => {
      setLocation(path);
      this.isNavigating = false;
      this.notifyNavigationChange();
      document.body.classList.remove('page-transitioning', `transition-${animation}`);
    }, 150);
  }

  // Simple navigation without animation
  navigate(setLocation: (path: string) => void, path: string) {
    if (this.isNavigating) return;
    setLocation(path);
  }

  private notifyNavigationChange() {
    this.navigationCallbacks.forEach(callback => callback(this.isNavigating));
  }

  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}

// Export singleton instance
export const navigationManager = new NavigationManager();