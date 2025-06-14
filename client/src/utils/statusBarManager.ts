/**
 * Status Bar Color Manager
 * Handles theme-color meta tag updates for mobile PWA status bars
 */

const COLORS = {
  splash: '#0000ff',
  banking: '#126987'
} as const;

class StatusBarManager {
  private currentColor: string = COLORS.banking;
  private metaElement: HTMLMetaElement | null = null;

  constructor() {
    this.initializeMetaElement();
    this.setupEventListeners();
  }

  private initializeMetaElement() {
    this.metaElement = document.querySelector('meta[name="theme-color"]');
    if (!this.metaElement) {
      // Create meta element if it doesn't exist
      this.metaElement = document.createElement('meta');
      this.metaElement.name = 'theme-color';
      document.head.appendChild(this.metaElement);
    }
  }

  private setupEventListeners() {
    // Handle app resume from background
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.restoreCorrectColor();
        // Additional delayed check for stubborn cases
        setTimeout(() => this.restoreCorrectColor(), 300);
      }
    });

    // Handle window focus (additional safety net)
    window.addEventListener('focus', () => {
      this.restoreCorrectColor();
      setTimeout(() => this.restoreCorrectColor(), 200);
    });

    // Handle page show (for iOS back/forward cache)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.restoreCorrectColor();
        setTimeout(() => this.restoreCorrectColor(), 100);
      }
    });

    // Handle iOS-specific events
    window.addEventListener('pagehide', () => {
      // Store current state before hiding
      sessionStorage.setItem('lastStatusBarColor', this.currentColor);
    });

    // Periodic check for color integrity (every 5 seconds when visible)
    setInterval(() => {
      if (!document.hidden && this.metaElement) {
        const currentContent = this.metaElement.getAttribute('content');
        const splashShown = sessionStorage.getItem('splashShown') === 'true';
        const expectedColor = splashShown ? COLORS.banking : COLORS.splash;
        
        if (currentContent !== expectedColor) {
          console.log(`Status bar color drift detected: ${currentContent} -> ${expectedColor}`);
          this.setColor(expectedColor);
        }
      }
    }, 5000);
  }

  private restoreCorrectColor() {
    const splashShown = sessionStorage.getItem('splashShown') === 'true';
    if (splashShown) {
      // Force banking color after splash has been shown
      this.setColor(COLORS.banking);
      console.log('Status bar color restored to banking blue');
    }
  }

  public setColor(color: string) {
    this.currentColor = color;
    if (this.metaElement) {
      this.metaElement.setAttribute('content', color);
    }
  }

  public setSplashColor() {
    this.setColor(COLORS.splash);
  }

  public setBankingColor() {
    this.setColor(COLORS.banking);
  }

  public getCurrentColor(): string {
    return this.currentColor;
  }

  // Force update - useful when app resumes
  public forceUpdate() {
    const splashShown = sessionStorage.getItem('splashShown') === 'true';
    const targetColor = splashShown ? COLORS.banking : COLORS.splash;
    this.setColor(targetColor);
  }
}

// Create singleton instance
export const statusBarManager = new StatusBarManager();

// Make it globally accessible for fallback scenarios
(window as any).statusBarManager = statusBarManager;