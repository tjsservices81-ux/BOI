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
      localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }

  // Restore complete app state with cold/warm start distinction
  static restoreAppState(isColdStart = false): any {
    try {
      const saved = localStorage.getItem(this.STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        
        if (isColdStart) {
          // Cold start: Only restore user auth, reset navigation to default
          return {
            user: state.user,
            currentRoute: '/dashboard', // Default route after splash/login sequence
            scrollPositions: {},
            formData: {},
            timestamp: state.timestamp
          };
        } else {
          // Warm start: Restore complete state including exact navigation position
          return state;
        }
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
      const saved = localStorage.getItem(this.FORM_DATA_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to get all form data:', error);
      return {};
    }
  }

  // Clear expired state - PROTECTED (never auto-clear user data)
  static clearExpiredState() {
    try {
      const state = this.restoreAppState();
      // Never auto-clear state - only clear on explicit admin action
      if (!state) {
        console.log('App state missing but preserved for user data integrity');
        // Don't remove localStorage - preserve all user data
      }
    } catch (error) {
      console.error('Failed to check expired state:', error);
    }
  }

  // Clear all app state
  static clearAppState() {
    try {
      localStorage.removeItem(this.STATE_KEY);
      localStorage.removeItem(this.SCROLL_POSITIONS_KEY);
      localStorage.removeItem(this.FORM_DATA_KEY);
    } catch (error) {
      console.error('Failed to clear app state:', error);
    }
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