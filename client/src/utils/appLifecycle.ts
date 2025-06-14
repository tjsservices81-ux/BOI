// App lifecycle management for detecting termination vs backgrounding
export class AppLifecycleManager {
  private static instance: AppLifecycleManager;
  private isAppTerminated = false;
  private backgroundTime: number | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly TERMINATION_THRESHOLD = 30000; // 30 seconds
  
  static getInstance(): AppLifecycleManager {
    if (!AppLifecycleManager.instance) {
      AppLifecycleManager.instance = new AppLifecycleManager();
    }
    return AppLifecycleManager.instance;
  }

  private constructor() {
    this.setupLifecycleDetection();
  }

  private setupLifecycleDetection() {
    // Heartbeat mechanism to detect app termination
    this.startHeartbeat();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppBackground();
      } else {
        this.handleAppForeground();
      }
    });

    // Handle page unload events
    window.addEventListener('beforeunload', () => {
      this.handleAppTermination();
    });

    window.addEventListener('pagehide', (event) => {
      if (!event.persisted) {
        // App is being terminated, not just cached
        this.handleAppTermination();
      }
    });

    // Handle focus/blur for additional reliability
    window.addEventListener('blur', () => {
      this.backgroundTime = Date.now();
    });

    window.addEventListener('focus', () => {
      this.handleAppForeground();
    });
  }

  private startHeartbeat() {
    // Store periodic heartbeat timestamps
    this.heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem('appHeartbeat', Date.now().toString());
      }
    }, 5000); // Every 5 seconds
  }

  private handleAppBackground() {
    this.backgroundTime = Date.now();
    localStorage.setItem('appBackgroundTime', this.backgroundTime.toString());
  }

  private handleAppForeground() {
    const now = Date.now();
    const lastHeartbeat = parseInt(localStorage.getItem('appHeartbeat') || '0');
    const backgroundTime = parseInt(localStorage.getItem('appBackgroundTime') || '0');

    // Check if app was likely terminated
    if (backgroundTime && (now - backgroundTime) > this.TERMINATION_THRESHOLD) {
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      // If heartbeat stopped for too long, app was likely terminated
      if (timeSinceHeartbeat > this.TERMINATION_THRESHOLD) {
        this.handleAppTermination();
        return true; // Indicates app was terminated
      }
    }

    this.backgroundTime = null;
    return false; // App was just backgrounded
  }

  private handleAppTermination() {
    this.isAppTerminated = true;
    
    // Clear all app state when terminated
    sessionStorage.removeItem('appState');
    sessionStorage.removeItem('appStateValid');
    sessionStorage.removeItem('splashShown');
    localStorage.removeItem('appHeartbeat');
    localStorage.removeItem('appBackgroundTime');
    
    // Dispatch termination event
    window.dispatchEvent(new CustomEvent('appTerminated'));
  }

  checkIfTerminated(): boolean {
    return this.isAppTerminated;
  }

  reset() {
    this.isAppTerminated = false;
    this.backgroundTime = null;
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}