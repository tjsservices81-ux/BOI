/**
 * Android Transfer UI Fixes
 * Ensures transfer buttons are visible and processing screens work correctly on Android devices
 */

export class AndroidTransferFixes {
  private static isAndroid = /Android/i.test(navigator.userAgent);

  /**
   * Apply Android-specific fixes for transfer screens
   */
  static applyTransferFixes() {
    if (!this.isAndroid) return;

    // Fix confirm transfer buttons
    this.fixConfirmButtons();
    
    // Fix processing screens
    this.fixProcessingScreens();
    
    // Force reflow to prevent Android WebView glitches
    this.forceReflow();
  }

  /**
   * Fix confirm transfer button visibility and touch targets
   */
  private static fixConfirmButtons() {
    const selectors = [
      '#confirmTransferBtn',
      '[data-testid="confirm-transfer"]',
      'button[type="submit"]',
      '.confirm-transfer-button'
    ];

    selectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach((element) => {
        const button = element as HTMLElement;
        if (button && button.textContent?.toLowerCase().includes('confirm')) {
          button.style.display = 'block';
          button.style.position = 'relative';
          button.style.zIndex = '999';
          button.style.minHeight = '56px';
          button.style.visibility = 'visible';
          button.style.opacity = '1';
          button.style.transform = 'translateY(0)';
          button.style.touchAction = 'manipulation';
          button.style.userSelect = 'none';
          (button.style as any).webkitUserSelect = 'none';
          (button.style as any).webkitTouchCallout = 'none';
          (button.style as any).webkitTapHighlightColor = 'transparent';
        }
      });
    });
  }

  /**
   * Fix processing screen visibility and animations
   */
  private static fixProcessingScreens() {
    const selectors = [
      '#transferProgressScreen',
      '[data-testid="processing-screen"]',
      '.processing-overlay',
      '.transfer-processing'
    ];

    selectors.forEach(selector => {
      const screens = document.querySelectorAll(selector);
      screens.forEach((element) => {
        const screen = element as HTMLElement;
        if (screen) {
          screen.style.visibility = 'visible';
          screen.style.opacity = '1';
          screen.style.transform = 'translateY(0)';
          screen.style.zIndex = '9999';
          screen.style.position = 'fixed';
          screen.style.top = '0';
          screen.style.left = '0';
          screen.style.right = '0';
          screen.style.bottom = '0';
          (screen.style as any).webkitBackfaceVisibility = 'hidden';
          screen.style.backfaceVisibility = 'hidden';
        }
      });
    });
  }

  /**
   * Force reflow to prevent Android WebView rendering issues
   */
  private static forceReflow() {
    // Trigger reflow with minimal scroll
    window.scrollTo(0, 1);
    window.scrollTo(0, 0);
    
    // Force repaint by triggering layout recalculation
    document.body.style.transform = 'translateZ(0)';
    setTimeout(() => {
      document.body.style.transform = '';
    }, 10);
  }

  /**
   * Initialize Android fixes with observer for dynamic content
   */
  static initialize() {
    if (!this.isAndroid) return;

    // Apply fixes immediately
    this.applyTransferFixes();

    // Set up observer for dynamically added content
    const observer = new MutationObserver(() => {
      this.applyTransferFixes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Apply fixes on route changes
    let currentPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== currentPath) {
        currentPath = location.pathname;
        setTimeout(() => this.applyTransferFixes(), 100);
      }
    }, 100);

    // Apply fixes on window events
    window.addEventListener('resize', () => this.applyTransferFixes());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.applyTransferFixes(), 300);
    });
  }
}