// Global loading state manager to prevent stuck animations
class LoadingStateManager {
  private static loadingStates: Map<string, boolean> = new Map();
  private static timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a loading state with automatic timeout
   */
  static setLoading(key: string, isLoading: boolean, maxDuration: number = 5000) {
    this.loadingStates.set(key, isLoading);
    
    if (isLoading) {
      // Clear existing timeout
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Set automatic timeout to prevent stuck states
      const timeoutId = setTimeout(() => {
        this.loadingStates.set(key, false);
        this.timeouts.delete(key);
        // Dispatch event to notify components
        window.dispatchEvent(new CustomEvent('loadingStateChanged', { 
          detail: { key, isLoading: false } 
        }));
      }, maxDuration);
      
      this.timeouts.set(key, timeoutId);
    } else {
      // Clear timeout when manually set to false
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.timeouts.delete(key);
      }
    }
    
    // Dispatch change event
    window.dispatchEvent(new CustomEvent('loadingStateChanged', { 
      detail: { key, isLoading } 
    }));
  }

  /**
   * Get current loading state
   */
  static getLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  /**
   * Clear all loading states (used on page navigation)
   */
  static clearAll() {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    // Clear all loading states
    this.loadingStates.clear();
    
    // Dispatch global clear event
    window.dispatchEvent(new CustomEvent('allLoadingStatesCleared'));
  }

  /**
   * Reset specific component loading states
   */
  static resetComponent(componentName: string) {
    const keysToReset = Array.from(this.loadingStates.keys())
      .filter(key => key.startsWith(componentName));
    
    keysToReset.forEach(key => {
      this.setLoading(key, false);
    });
  }
}

export default LoadingStateManager;