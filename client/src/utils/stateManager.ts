// Comprehensive state persistence manager for app state preservation
export class StateManager {
  private static readonly STATE_KEY = 'bank_app_state';
  private static readonly SCROLL_POSITIONS_KEY = 'bank_app_scroll_positions';
  private static readonly FORM_DATA_KEY = 'bank_app_form_data';
  
  // Save complete app state
  static saveAppState(state: {
    currentRoute: string;
    user: any;
    scrollPositions: Record<string, number>;
    formData: Record<string, any>;
    timestamp: number;
  }) {
    try {
      // Use global localStorage for state management (not user-specific)
      localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  // Restore complete app state
  static restoreAppState(): any {
    try {
      // Use global localStorage for state management (not user-specific)
      const saved = localStorage.getItem(this.STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Always restore state regardless of time - users stay logged in permanently
        return state;
      }
    } catch (error) {
      console.error('Failed to restore app state:', error);
    }
    return null;
  }

  // Save scroll position for specific route
  static saveScrollPosition(route: string, position: number) {
    try {
      const positions = this.getScrollPositions();
      positions[route] = position;
      // Use global localStorage for scroll positions (app-wide state)
      localStorage.setItem(this.SCROLL_POSITIONS_KEY, JSON.stringify(positions));
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }

  // Get scroll position for route
  static getScrollPosition(route: string): number {
    try {
      const positions = this.getScrollPositions();
      return positions[route] || 0;
    } catch (error) {
      console.error('Failed to get scroll position:', error);
      return 0;
    }
  }

  // Get all scroll positions
  static getScrollPositions(): Record<string, number> {
    try {
      // Use global localStorage for scroll positions (app-wide state)
      const saved = localStorage.getItem(this.SCROLL_POSITIONS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to get scroll positions:', error);
      return {};
    }
  }

  // Save form data
  static saveFormData(formId: string, data: any) {
    try {
      const formData = this.getAllFormData();
      formData[formId] = data;
      // Use global localStorage for form data (app-wide state)
      localStorage.setItem(this.FORM_DATA_KEY, JSON.stringify(formData));
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }

  // Get form data
  static getFormData(formId: string): any {
    try {
      const formData = this.getAllFormData();
      return formData[formId] || null;
    } catch (error) {
      console.error('Failed to get form data:', error);
      return null;
    }
  }

  // Get all form data
  static getAllFormData(): Record<string, any> {
    try {
      // Use global localStorage for form data (app-wide state)
      const saved = localStorage.getItem(this.FORM_DATA_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to get all form data:', error);
      return {};
    }
  }

  // Clear expired state - DISABLED: Users stay logged in permanently
  static clearExpiredState() {
    // State clearing disabled - users never get logged out automatically
    // Only admin deletion should clear state
    return;
  }

  // Clear all app state
  static clearAppState() {
    // App state clearing disabled - users stay logged in permanently
    console.warn('clearAppState() disabled - users can only be logged out via admin deletion');
    return;
  }

  // Handle page visibility change
  static handleVisibilityChange(currentRoute: string, user: any) {
    if (document.visibilityState === 'hidden') {
      // App going to background - save current state
      const scrollPositions = this.getScrollPositions();
      
      // Save current scroll position
      const scrollableElements = document.querySelectorAll('[data-scroll-container]');
      scrollableElements.forEach(element => {
        const container = element as HTMLElement;
        if (container.dataset.scrollRoute) {
          scrollPositions[container.dataset.scrollRoute] = container.scrollTop;
        }
      });

      // Save main window scroll if no specific containers
      if (scrollableElements.length === 0) {
        scrollPositions[currentRoute] = window.scrollY;
      }

      this.saveAppState({
        currentRoute,
        user,
        scrollPositions,
        formData: this.getAllFormData(),
        timestamp: Date.now()
      });
    }
  }

  // Restore scroll position after component mount
  static restoreScrollPosition(route: string, elementSelector?: string) {
    setTimeout(() => {
      const position = this.getScrollPosition(route);
      if (position > 0) {
        if (elementSelector) {
          const element = document.querySelector(elementSelector) as HTMLElement;
          if (element) {
            element.scrollTop = position;
          }
        } else {
          window.scrollTo(0, position);
        }
      }
    }, 100);
  }
}