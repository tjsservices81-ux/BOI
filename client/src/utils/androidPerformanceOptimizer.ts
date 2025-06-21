// Android performance optimizer to eliminate lag and improve responsiveness
import { PlatformDetection } from './platformDetection';

export class AndroidPerformanceOptimizer {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized || !PlatformDetection.isAndroid()) return;

    this.optimizeScrolling();
    this.optimizeAnimations();
    this.optimizeTouchResponsiveness();
    this.eliminateInputLag();
    
    this.initialized = true;
    console.log('Android performance optimizations applied');
  }

  private static optimizeScrolling(): void {
    // Eliminate Android scroll lag
    const style = document.createElement('style');
    style.textContent = `
      /* Android scroll performance optimization */
      * {
        -webkit-overflow-scrolling: touch !important;
        scroll-behavior: auto !important; /* Remove smooth scrolling lag */
      }
      
      .ios-scroll {
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        will-change: scroll-position !important;
      }
      
      /* Eliminate scroll bounce lag */
      body, html {
        overscroll-behavior: none !important;
        -webkit-overflow-scrolling: touch !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  private static optimizeAnimations(): void {
    // Optimize Android animations for 60fps
    const style = document.createElement('style');
    style.textContent = `
      /* Android animation optimization */
      .transform-gpu,
      .card-interactive,
      .navigation-item,
      button,
      a,
      [role="button"] {
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        -webkit-backface-visibility: hidden !important;
        backface-visibility: hidden !important;
        will-change: transform !important;
      }
      
      /* Fast transitions for Android */
      .transition-all,
      .transition-transform {
        transition-duration: 0.1s !important;
        transition-timing-function: ease-out !important;
      }
      
      /* Eliminate animation jank */
      * {
        -webkit-perspective: 1000 !important;
        perspective: 1000 !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  private static optimizeTouchResponsiveness(): void {
    // Eliminate Android touch delays
    const style = document.createElement('style');
    style.textContent = `
      /* Android touch optimization */
      button, a, [role="button"], .card-interactive {
        touch-action: manipulation !important;
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
      }
      
      /* Instant touch feedback */
      button:active,
      a:active,
      [role="button"]:active,
      .card-interactive:active {
        transform: scale(0.98) translateZ(0) !important;
        transition: transform 0.05s ease-out !important;
      }
      
      /* Remove 300ms tap delay */
      * {
        -ms-touch-action: manipulation !important;
        touch-action: manipulation !important;
      }
    `;
    
    document.head.appendChild(style);

    // Add global touch event optimization
    document.addEventListener('touchstart', () => {}, { passive: true });
  }

  private static eliminateInputLag(): void {
    // Optimize input field responsiveness
    const style = document.createElement('style');
    style.textContent = `
      /* Android input optimization */
      input, textarea, select {
        -webkit-appearance: none !important;
        appearance: none !important;
        transition: none !important;
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        will-change: contents !important;
      }
      
      /* Instant input focus */
      input:focus, textarea:focus, select:focus {
        transition: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Prevent keyboard lag */
      .page-container {
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  static optimizeElement(element: HTMLElement): void {
    if (!PlatformDetection.isAndroid()) return;

    // Apply performance optimizations to specific elements
    element.style.setProperty('-webkit-transform', 'translateZ(0)');
    element.style.setProperty('transform', 'translateZ(0)');
    element.style.setProperty('will-change', 'transform');
    element.style.setProperty('touch-action', 'manipulation');
    
    // Add optimized touch handlers
    let touchStartTime = 0;
    
    element.addEventListener('touchstart', () => {
      touchStartTime = performance.now();
      element.style.transform = 'scale(0.98) translateZ(0)';
    }, { passive: true });

    element.addEventListener('touchend', () => {
      const touchDuration = performance.now() - touchStartTime;
      
      // Immediate feedback for quick taps
      if (touchDuration < 150) {
        element.style.transform = '';
      } else {
        // Delayed reset for longer presses
        setTimeout(() => {
          element.style.transform = '';
        }, 50);
      }
    }, { passive: true });
  }
}