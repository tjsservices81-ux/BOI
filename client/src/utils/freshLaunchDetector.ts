// Ultra-simple fresh launch detection
export class FreshLaunchDetector {
  private static readonly LAUNCH_FLAG = 'appRunning';
  
  static isFirstLaunch(): boolean {
    // Check if app is currently "running" in sessionStorage
    const isRunning = sessionStorage.getItem(this.LAUNCH_FLAG) === 'true';
    
    console.log('Fresh Launch Check:', { isRunning, sessionStorageLength: sessionStorage.length });
    
    if (!isRunning) {
      // Not running = fresh launch, set the flag
      sessionStorage.setItem(this.LAUNCH_FLAG, 'true');
      this.clearPreviousState();
      console.log('App detected as fresh launch - clearing state');
      return true;
    }
    
    console.log('App detected as resumed - keeping state');
    return false;
  }
  
  private static clearPreviousState() {
    // Clear specific items that should reset on fresh launch
    sessionStorage.removeItem('splashShown');
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('appStateValid');
  }
  
  static setupTerminationDetection() {
    // Set up event listeners to detect app termination
    const clearRunningFlag = () => {
      sessionStorage.removeItem(this.LAUNCH_FLAG);
      console.log('App termination detected - clearing running flag');
    };

    // Multiple event listeners to catch different termination scenarios
    window.addEventListener('beforeunload', clearRunningFlag);
    window.addEventListener('pagehide', clearRunningFlag);
    window.addEventListener('unload', clearRunningFlag);
    
    // Mobile-specific events
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearRunningFlag();
      }
    });
    
    // Focus events
    window.addEventListener('blur', clearRunningFlag);
    
    // Page freeze/resume events (newer browsers)
    document.addEventListener('freeze', clearRunningFlag);
  }

  static markAppTermination() {
    // Remove the running flag when app is terminated
    sessionStorage.removeItem(this.LAUNCH_FLAG);
  }
}