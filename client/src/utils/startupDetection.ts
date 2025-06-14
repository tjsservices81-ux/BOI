// Startup detection to determine if app was freshly launched vs resumed
export class StartupDetection {
  private static readonly APP_LAUNCH_KEY = 'appLaunchTimestamp';
  private static readonly SESSION_KEY = 'appSessionActive';
  private static readonly TERMINATION_THRESHOLD = 1000; // 1 second - more aggressive

  static isAppFreshStart(): boolean {
    const sessionActive = sessionStorage.getItem(this.SESSION_KEY);
    const lastLaunch = parseInt(localStorage.getItem(this.APP_LAUNCH_KEY) || '0');
    const now = Date.now();

    // If no session is active, it's definitely a fresh start
    if (!sessionActive) {
      return true;
    }

    // If too much time has passed since last launch, consider it terminated
    if (lastLaunch && (now - lastLaunch) > this.TERMINATION_THRESHOLD) {
      return true;
    }

    return false;
  }

  static markAppLaunch(): void {
    const now = Date.now();
    localStorage.setItem(this.APP_LAUNCH_KEY, now.toString());
    sessionStorage.setItem(this.SESSION_KEY, 'true');
  }

  static markAppTermination(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    // Keep launch timestamp for comparison
  }

  static clearAllState(): void {
    sessionStorage.clear();
    localStorage.removeItem(this.APP_LAUNCH_KEY);
    localStorage.removeItem('appHeartbeat');
    localStorage.removeItem('appBackgroundTime');
  }
}