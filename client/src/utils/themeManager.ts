// Theme Manager - Persistent status bar and theme color management
export interface ThemeConfig {
  statusBarColor: string;
  backgroundColor: string;
  textColor: string;
  screenName: string;
}

export const SCREEN_THEMES: Record<string, ThemeConfig> = {
  splash: {
    statusBarColor: '#0000ff',
    backgroundColor: '#0000ff',
    textColor: '#ffffff',
    screenName: 'splash'
  },
  login: {
    statusBarColor: '#126987',
    backgroundColor: '#126987', 
    textColor: '#ffffff',
    screenName: 'login'
  },
  dashboard: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff', 
    screenName: 'dashboard'
  },
  profile: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'profile'
  },
  more: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'more'
  },
  apply: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'apply'
  },
  payments: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'payments'
  },
  transfer: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'transfer'
  },
  cards: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'cards'
  },
  insights: {
    statusBarColor: '#126987',
    backgroundColor: '#126987',
    textColor: '#ffffff',
    screenName: 'insights'
  }
};

class ThemeManager {
  private currentTheme: ThemeConfig | null = null;
  private themeColorMeta: HTMLMetaElement | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Get or create theme-color meta tag
    this.themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!this.themeColorMeta) {
      this.themeColorMeta = document.createElement('meta');
      this.themeColorMeta.name = 'theme-color';
      document.head.appendChild(this.themeColorMeta);
    }

    // Restore theme from storage on app resume
    this.restoreThemeFromStorage();
    
    // Listen for visibility changes to maintain theme
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // App resumed - restore the correct theme with a small delay to ensure DOM is ready
        setTimeout(() => {
          this.restoreThemeFromStorage();
        }, 50);
      }
    });

    // Also listen for pageshow event (back/forward cache)
    window.addEventListener('pageshow', () => {
      setTimeout(() => {
        this.restoreThemeFromStorage();
      }, 50);
    });

    // Listen for focus events as additional safety
    window.addEventListener('focus', () => {
      setTimeout(() => {
        this.restoreThemeFromStorage();
      }, 50);
    });

    this.isInitialized = true;
  }

  public setTheme(screenName: string, force: boolean = false) {
    const theme = SCREEN_THEMES[screenName];
    if (!theme) {
      console.warn(`Theme not found for screen: ${screenName}`);
      return;
    }

    // Don't change theme if it's the same (unless forced)
    if (!force && this.currentTheme?.screenName === screenName) {
      return;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private applyTheme(theme: ThemeConfig) {
    if (!this.themeColorMeta) return;

    // Set the meta theme-color
    this.themeColorMeta.setAttribute('content', theme.statusBarColor);
    
    // Also set additional iOS PWA specific meta tags if they exist
    const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBarMeta) {
      // Use 'default' for light backgrounds, 'black-translucent' for dark
      const isLight = this.isLightColor(theme.statusBarColor);
      appleStatusBarMeta.setAttribute('content', isLight ? 'default' : 'black-translucent');
    }
  }

  private persistTheme(theme: ThemeConfig) {
    try {
      sessionStorage.setItem('currentTheme', JSON.stringify({
        screenName: theme.screenName,
        statusBarColor: theme.statusBarColor,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to persist theme:', error);
    }
  }

  private restoreThemeFromStorage() {
    try {
      const storedTheme = sessionStorage.getItem('currentTheme');
      if (storedTheme) {
        const parsed = JSON.parse(storedTheme);
        const theme = SCREEN_THEMES[parsed.screenName];
        if (theme) {
          this.currentTheme = theme;
          this.applyTheme(theme);
        }
      }
    } catch (error) {
      console.warn('Failed to restore theme:', error);
    }
  }

  private isLightColor(color: string): boolean {
    // Simple check for light vs dark colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128;
    }
    return false;
  }

  public getCurrentTheme(): ThemeConfig | null {
    return this.currentTheme;
  }

  public forceRefreshTheme() {
    if (this.currentTheme) {
      this.applyTheme(this.currentTheme);
    }
  }

  // Method to handle splash screen completion
  public handleSplashComplete(nextScreen: string = 'login') {
    // Clear splash theme and set next screen theme
    this.setTheme(nextScreen, true);
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();

// Hook for React components
export function useTheme() {
  return {
    setTheme: (screenName: string) => themeManager.setTheme(screenName),
    getCurrentTheme: () => themeManager.getCurrentTheme(),
    forceRefresh: () => themeManager.forceRefreshTheme()
  };
}