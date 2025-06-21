// Platform-specific detection and lifecycle handling for proper cold/warm start behavior
export class PlatformDetection {
  private static initialized = false;
  
  static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  static isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  }
  
  static isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }
  
  static isMobile(): boolean {
    return this.isIOS() || this.isAndroid();
  }
  
  static setupPlatformSpecificHandlers(): void {
    if (this.initialized) return;
    
    console.log(`Platform detected: ${this.getPlateform()}, PWA: ${this.isPWA()}`);
    
    if (this.isIOS()) {
      this.setupIOSHandlers();
    } else if (this.isAndroid()) {
      this.setupAndroidHandlers();
      // Apply Android UI fixes immediately
      this.applyAndroidUIFixes();
    }
    
    // Universal mobile handlers
    if (this.isMobile()) {
      this.setupMobileHandlers();
    }
    
    this.initialized = true;
  }
  
  private static applyAndroidUIFixes(): void {
    // Apply immediate Android fixes without importing the module
    const style = document.createElement('style');
    style.id = 'android-ui-fixes';
    style.textContent = `
      /* Immediate Android tap highlight removal */
      * {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
        tap-highlight-color: rgba(0, 0, 0, 0) !important;
      }
      
      /* Android button fixes */
      button:focus, button:active {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Android performance optimization */
      .transform-gpu {
        transform: translate3d(0, 0, 0);
        will-change: transform;
      }
    `;
    
    if (!document.getElementById('android-ui-fixes')) {
      document.head.appendChild(style);
    }
  }
  
  private static getPlateform(): string {
    if (this.isIOS()) return 'iOS';
    if (this.isAndroid()) return 'Android';
    return 'Web';
  }
  
  private static setupIOSHandlers(): void {
    // iOS PWA specific handling
    if (this.isPWA()) {
      // Handle iOS PWA lifecycle events
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          // iOS restored from cache - this is a warm start
          console.log('iOS warm start detected (page restored from cache)');
          localStorage.setItem('app_session_active', 'true');
        } else {
          // Fresh page load - check if this is cold start
          const wasTerminated = !localStorage.getItem('app_session_active');
          if (wasTerminated) {
            console.log('iOS cold start detected (fresh page load)');
            localStorage.removeItem('splash_completed');
          }
        }
      });
      
      // iOS PWA background detection
      window.addEventListener('pagehide', (event) => {
        if (event.persisted) {
          // Page will be cached - likely backgrounding, not termination
          console.log('iOS backgrounding detected (page cached)');
          localStorage.setItem('app_background_time', Date.now().toString());
        } else {
          // Page not cached - likely termination
          console.log('iOS termination detected (page not cached)');
          localStorage.removeItem('app_session_active');
        }
      });
    }
    
    // iOS Safari specific
    window.addEventListener('beforeunload', () => {
      // iOS Safari - mark potential termination
      setTimeout(() => {
        localStorage.removeItem('app_session_active');
      }, 100);
    });
  }
  
  private static setupAndroidHandlers(): void {
    // Android specific event handling
    document.addEventListener('resume', () => {
      // Android app resumed from background - warm start
      console.log('Android warm start detected (app resumed)');
      localStorage.setItem('app_session_active', 'true');
    });
    
    document.addEventListener('pause', () => {
      // Android app paused - potential termination or backgrounding
      console.log('Android app paused (backgrounding or termination)');
      localStorage.setItem('app_background_time', Date.now().toString());
      
      // Short delay to determine if this becomes termination
      setTimeout(() => {
        if (document.hidden) {
          localStorage.removeItem('app_session_active');
        }
      }, 2000);
    });
    
    // Android WebView specific
    if (navigator.userAgent.includes('wv')) {
      window.addEventListener('focus', () => {
        console.log('Android WebView focus - warm start');
        localStorage.setItem('app_session_active', 'true');
      });
      
      window.addEventListener('blur', () => {
        console.log('Android WebView blur - potential termination');
        setTimeout(() => {
          localStorage.removeItem('app_session_active');
        }, 1000);
      });
    }
  }
  
  private static setupMobileHandlers(): void {
    // Universal mobile handlers for both iOS and Android
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      // Orientation change usually means app is active
      localStorage.setItem('app_session_active', 'true');
    });
    
    // Handle app state transitions
    document.addEventListener('webkitvisibilitychange', () => {
      if ((document as any).webkitHidden) {
        console.log('Mobile app hidden (webkit)');
        localStorage.setItem('app_background_time', Date.now().toString());
      } else {
        console.log('Mobile app visible (webkit)');
        localStorage.setItem('app_session_active', 'true');
      }
    });
    
    // Handle touch events to detect user interaction
    let lastTouchTime = 0;
    document.addEventListener('touchstart', () => {
      lastTouchTime = Date.now();
      localStorage.setItem('app_session_active', 'true');
    }, { passive: true });
    
    // Mobile-specific memory pressure handling
    window.addEventListener('deviceMemory' in navigator ? 'memorywarning' : 'beforeunload', () => {
      // Save state before potential termination
      localStorage.setItem('app_background_time', Date.now().toString());
    });
  }
  
  static getCurrentStartType(): 'cold' | 'warm' | 'uncertain' {
    const appSessionActive = localStorage.getItem('app_session_active');
    const lastBackgroundTime = localStorage.getItem('app_background_time');
    
    if (!appSessionActive) {
      return 'cold';
    } else if (lastBackgroundTime) {
      return 'warm';
    } else {
      return 'uncertain';
    }
  }
  
  static markColdStart(): void {
    localStorage.removeItem('app_session_active');
    localStorage.removeItem('splash_completed');
    localStorage.removeItem('app_background_time');
    console.log('Marked for cold start on next launch');
  }
  
  static markWarmStart(): void {
    localStorage.setItem('app_session_active', 'true');
    localStorage.setItem('app_background_time', Date.now().toString());
    console.log('Marked for warm start on next launch');
  }
}