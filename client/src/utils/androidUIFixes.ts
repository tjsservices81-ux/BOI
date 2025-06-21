// Android-specific UI fixes to match iOS appearance and behavior
import { PlatformDetection } from './platformDetection';

export class AndroidUIFixes {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized || !PlatformDetection.isAndroid()) return;

    this.removeAndroidTapHighlights();
    this.fixAndroidScrolling();
    this.optimizeAndroidPerformance();
    this.fixAndroidFontRendering();
    
    this.initialized = true;
    console.log('Android UI fixes applied to match iOS');
  }

  private static removeAndroidTapHighlights(): void {
    // Create global style sheet for Android tap highlight removal
    const style = document.createElement('style');
    style.textContent = `
      /* Android tap highlight removal - comprehensive */
      * {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
        tap-highlight-color: rgba(0, 0, 0, 0) !important;
      }
      
      /* Android WebView specific fixes */
      button, a, [role="button"], [onclick] {
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
        user-select: none !important;
        touch-action: manipulation !important;
      }
      
      /* Remove Android focus rings */
      *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Android input field fixes */
      input, textarea, select {
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
      }
      
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  private static fixAndroidScrolling(): void {
    // Fix Android scroll behavior to match iOS smoothness
    const style = document.createElement('style');
    style.textContent = `
      /* Android scroll optimization */
      * {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      /* Android momentum scrolling */
      .ios-scroll {
        -webkit-overflow-scrolling: touch !important;
        overflow-scrolling: touch !important;
      }
      
      /* Prevent Android scroll bounce */
      body {
        overscroll-behavior: none;
        overflow-x: hidden;
      }
    `;
    
    document.head.appendChild(style);
  }

  private static optimizeAndroidPerformance(): void {
    // Enable hardware acceleration for smoother animations
    const style = document.createElement('style');
    style.textContent = `
      /* Android hardware acceleration */
      .transform-gpu,
      .card-interactive,
      .navigation-item,
      .page-container {
        transform: translate3d(0, 0, 0);
        -webkit-transform: translate3d(0, 0, 0);
        will-change: transform, opacity;
      }
      
      /* Android transition optimization */
      .android-optimized {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        -webkit-perspective: 1000;
        perspective: 1000;
      }
    `;
    
    document.head.appendChild(style);

    // Add optimized class to interactive elements
    document.addEventListener('DOMContentLoaded', () => {
      const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
      interactiveElements.forEach(el => {
        el.classList.add('android-optimized');
      });
    });
  }

  private static fixAndroidFontRendering(): void {
    // Ensure consistent font rendering between Android and iOS
    const style = document.createElement('style');
    style.textContent = `
      /* Android font rendering fixes */
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      
      /* Android text size adjustment */
      html {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      
      /* Match iOS font weights */
      .boi-regular-font {
        font-family: 'OpenSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-weight: 400 !important;
      }
      
      .boi-semibold-font {
        font-family: 'OpenSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-weight: 600 !important;
      }
      
      .boi-bold-font {
        font-family: 'OpenSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        font-weight: 700 !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  static applyToElement(element: HTMLElement): void {
    if (!PlatformDetection.isAndroid()) return;

    // Apply Android-specific fixes to individual elements
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.outline = 'none';
    element.style.userSelect = 'none';
    element.style.touchAction = 'manipulation';
    
    // Add event listeners to prevent default Android behaviors
    element.addEventListener('touchstart', (e) => {
      // Prevent Android long-press context menu
      e.preventDefault();
    }, { passive: false });

    element.addEventListener('contextmenu', (e) => {
      // Disable context menu on Android
      e.preventDefault();
    });
  }

  static fixAccountCardStyling(): void {
    if (!PlatformDetection.isAndroid()) return;

    // Specific fixes for account cards to match iOS exactly
    const style = document.createElement('style');
    style.textContent = `
      /* Android account card fixes to match iOS */
      .card-interactive {
        -webkit-tap-highlight-color: transparent !important;
        border-radius: 0 !important; /* Match iOS - no rounded corners */
        box-shadow: none !important; /* Match iOS shadow style */
        background-color: white !important;
        border-bottom: 1px solid #f3f4f6 !important;
      }
      
      .card-interactive:active {
        background-color: #f9fafb !important; /* Match iOS press state */
        transform: scale(0.98) !important;
        transition: all 0.1s ease !important;
      }
      
      /* Android account text fixes */
      .card-interactive .boi-regular-font {
        font-weight: 400 !important;
        letter-spacing: 0 !important;
      }
      
      .card-interactive .boi-semibold-font {
        font-weight: 600 !important;
        letter-spacing: -0.01em !important;
      }
      
      /* Android chevron icon fixes */
      .card-interactive .lucide {
        opacity: 1 !important;
        color: #9ca3af !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  static removeAndroidRippleEffect(): void {
    if (!PlatformDetection.isAndroid()) return;

    // Remove material design ripple effects
    const style = document.createElement('style');
    style.textContent = `
      /* Remove Android Material Design ripples */
      * {
        -webkit-user-drag: none;
        -webkit-user-modify: none;
        -webkit-highlight: none;
      }
      
      button, a, [role="button"] {
        background-image: none !important;
        background-attachment: initial !important;
        background-size: initial !important;
        background-origin: initial !important;
        background-clip: initial !important;
        background-position: initial !important;
        background-repeat: initial !important;
      }
      
      /* Disable Android material ripple */
      .android-no-ripple {
        -webkit-tap-highlight-color: transparent !important;
        -android-tap-highlight-color: transparent !important;
        background-image: none !important;
      }
    `;
    
    document.head.appendChild(style);
  }
}