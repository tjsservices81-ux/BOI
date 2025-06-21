// Comprehensive error handling and recovery system
export class AppErrorHandler {
  private static isInitialized = false;
  
  static initialize() {
    if (this.isInitialized) return;
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.warn('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent default error display
    });
    
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.warn('JavaScript error:', event.error);
      event.preventDefault(); // Prevent default error display
    });
    
    // Handle network errors
    window.addEventListener('offline', () => {
      console.log('Network: offline mode detected');
    });
    
    window.addEventListener('online', () => {
      console.log('Network: back online');
    });
    
    this.isInitialized = true;
  }
  
  static handleAsyncError(error: any, context: string) {
    console.warn(`${context} error:`, error);
    // Continue execution without throwing
  }
  
  static safeExecute<T>(fn: () => T, fallback: T, context?: string): T {
    try {
      return fn();
    } catch (error) {
      if (context) {
        console.warn(`${context} failed:`, error);
      }
      return fallback;
    }
  }
  
  static async safeAsyncExecute<T>(
    fn: () => Promise<T>, 
    fallback: T, 
    context?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (context) {
        console.warn(`${context} failed:`, error);
      }
      return fallback;
    }
  }
}