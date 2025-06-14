// Simple and reliable app termination detection
export class AppTerminationDetector {
  private static readonly FRESH_LAUNCH_KEY = 'isFreshLaunch';
  private static readonly LAST_ACTIVE_KEY = 'lastActiveTime';
  private static readonly HEARTBEAT_INTERVAL = 1000; // 1 second
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  static initialize() {
    // Clear fresh launch flag immediately on initialization
    sessionStorage.removeItem(this.FRESH_LAUNCH_KEY);
    
    // Start heartbeat to track app activity
    this.startHeartbeat();
    
    // Set up termination detection listeners
    this.setupTerminationListeners();
  }

  static isFreshLaunch(): boolean {
    // Check if this is a fresh app launch
    const isFresh = localStorage.getItem(this.FRESH_LAUNCH_KEY) === 'true';
    
    if (isFresh) {
      // Clear the flag immediately after checking
      localStorage.removeItem(this.FRESH_LAUNCH_KEY);
      this.clearAllAppState();
      return true;
    }
    
    return false;
  }

  static markAppTermination() {
    // Mark that the app was terminated
    localStorage.setItem(this.FRESH_LAUNCH_KEY, 'true');
    this.clearAllAppState();
  }

  private static startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      localStorage.setItem(this.LAST_ACTIVE_KEY, Date.now().toString());
    }, this.HEARTBEAT_INTERVAL);
  }

  private static setupTerminationListeners() {
    // Handle page hide (app being closed/backgrounded)
    window.addEventListener('pagehide', () => {
      this.markAppTermination();
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
      this.markAppTermination();
    });

    // Handle visibility change for mobile apps
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App going to background - potential termination
        this.markAppTermination();
      }
    });

    // Handle focus loss
    window.addEventListener('blur', () => {
      this.markAppTermination();
    });
  }

  private static clearAllAppState() {
    // Clear all app state when terminated
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('appStateValid');
    sessionStorage.removeItem('splashShown');
    sessionStorage.removeItem('appSessionActive');
  }

  static cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}