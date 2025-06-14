// Simple termination detection that reliably resets on app swipe-up
export class SimpleTerminationDetector {
  private static readonly SESSION_TOKEN = 'appSessionToken';
  private static readonly LAST_ALIVE = 'lastAliveTimestamp';
  private static readonly TERMINATION_THRESHOLD = 3000; // 3 seconds
  private static interval: NodeJS.Timeout | null = null;
  private static currentSessionToken: string = '';

  static initialize() {
    // Generate new session token
    this.currentSessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if this is a fresh session
    const savedToken = sessionStorage.getItem(this.SESSION_TOKEN);
    const wasTerminated = !savedToken; // No session storage = app was terminated
    
    // Store current session token
    sessionStorage.setItem(this.SESSION_TOKEN, this.currentSessionToken);
    
    // Start heartbeat
    this.startHeartbeat();
    
    return wasTerminated;
  }

  static wasTerminated(): boolean {
    // Check if session storage exists
    const sessionToken = sessionStorage.getItem(this.SESSION_TOKEN);
    const lastAlive = parseInt(localStorage.getItem(this.LAST_ALIVE) || '0');
    const now = Date.now();
    
    // If no session token OR last alive is too old, app was terminated
    const wasTerminated = !sessionToken || (lastAlive > 0 && (now - lastAlive) > this.TERMINATION_THRESHOLD);
    
    if (wasTerminated) {
      this.clearAppState();
      return true;
    }
    
    return false;
  }

  private static startHeartbeat() {
    // Update timestamp every second while app is active
    this.interval = setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem(this.LAST_ALIVE, Date.now().toString());
      }
    }, 1000);
    
    // Set initial timestamp
    localStorage.setItem(this.LAST_ALIVE, Date.now().toString());
  }

  private static clearAppState() {
    // Clear all session storage except what we need
    const splashShown = sessionStorage.getItem('splashShown');
    const appState = sessionStorage.getItem('appState');
    const appStateValid = sessionStorage.getItem('appStateValid');
    
    sessionStorage.clear();
    
    // Don't restore these - force fresh start
    localStorage.removeItem(this.LAST_ALIVE);
  }

  static cleanup() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}