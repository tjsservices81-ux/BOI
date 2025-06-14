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
  
  static markAppTermination() {
    // Remove the running flag when app is terminated
    sessionStorage.removeItem(this.LAUNCH_FLAG);
  }
}