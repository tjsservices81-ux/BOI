// Simple termination detection that reliably resets on app swipe-up
export class SimpleTerminationDetector {
  private static readonly TERMINATION_FLAG = 'appWasTerminated';
  private static readonly LAST_ALIVE = 'lastAliveTimestamp';
  private static interval: NodeJS.Timeout | null = null;

  static initialize() {
    // Start heartbeat
    this.startHeartbeat();
    
    // Mark app as terminated when it goes away
    window.addEventListener('beforeunload', () => this.markTerminated());
    window.addEventListener('pagehide', () => this.markTerminated());
    
    // More aggressive detection for mobile
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.markTerminated();
      }
    });
  }

  static wasTerminated(): boolean {
    const flag = localStorage.getItem(this.TERMINATION_FLAG);
    if (flag === 'true') {
      // Clear the flag immediately
      localStorage.removeItem(this.TERMINATION_FLAG);
      this.clearAppState();
      return true;
    }
    return false;
  }

  private static startHeartbeat() {
    // Update timestamp every second
    this.interval = setInterval(() => {
      localStorage.setItem(this.LAST_ALIVE, Date.now().toString());
    }, 1000);
  }

  private static markTerminated() {
    localStorage.setItem(this.TERMINATION_FLAG, 'true');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private static clearAppState() {
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear specific localStorage items but keep termination flag for next check
    localStorage.removeItem(this.LAST_ALIVE);
  }
}