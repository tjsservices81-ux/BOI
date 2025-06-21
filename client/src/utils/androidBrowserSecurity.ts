// Android browser security and compatibility fixes
import { PlatformDetection } from './platformDetection';

export class AndroidBrowserSecurity {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized || !PlatformDetection.isAndroid()) return;

    this.fixSecurityHeaders();
    this.fixSSLCompatibility();
    this.fixContentSecurityPolicy();
    this.fixMixedContentIssues();
    this.fixBrowserCompatibility();
    this.fixLoadingIssues();
    
    this.initialized = true;
    console.log('Android browser security fixes applied');
  }

  private static fixSecurityHeaders(): void {
    // Override browser security restrictions for PWA functionality
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', 
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: wss: ws:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:; " +
      "style-src 'self' 'unsafe-inline' https: data:; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data: https:; " +
      "connect-src 'self' https: wss: ws:; " +
      "media-src 'self' data: blob: https:; " +
      "frame-src 'self' https:;"
    );
    document.head.appendChild(meta);

    // Fix HTTPS enforcement issues
    const httpsRedirect = document.createElement('meta');
    httpsRedirect.setAttribute('http-equiv', 'Content-Security-Policy');
    httpsRedirect.setAttribute('content', 'upgrade-insecure-requests');
    document.head.appendChild(httpsRedirect);
  }

  private static fixSSLCompatibility(): void {
    // Fix SSL/TLS compatibility issues on Android browsers
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      // Force HTTPS for production
      window.location.href = window.location.href.replace('http:', 'https:');
      return;
    }

    // Add SSL verification bypass for development
    window.addEventListener('securitypolicyviolation', (e) => {
      console.warn('Security policy violation:', e.violatedDirective);
      e.preventDefault();
    });
  }

  private static fixContentSecurityPolicy(): void {
    // Remove restrictive CSP that breaks Android browsers
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP && existingCSP.getAttribute('content')?.includes('strict-dynamic')) {
      existingCSP.remove();
    }

    // Add permissive CSP for Android browsers
    const newCSP = document.createElement('meta');
    newCSP.setAttribute('http-equiv', 'Content-Security-Policy');
    newCSP.setAttribute('content', 
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "script-src * 'unsafe-inline' 'unsafe-eval'; " +
      "style-src * 'unsafe-inline'; " +
      "img-src * data: blob:; " +
      "font-src * data:; " +
      "connect-src *;"
    );
    document.head.appendChild(newCSP);
  }

  private static fixMixedContentIssues(): void {
    // Fix mixed content blocking on Android
    const mixedContentMeta = document.createElement('meta');
    mixedContentMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    mixedContentMeta.setAttribute('content', 'block-all-mixed-content');
    
    // Only add if we're on HTTPS
    if (window.location.protocol === 'https:') {
      document.head.appendChild(mixedContentMeta);
    }

    // Override fetch to handle mixed content
    const originalFetch = window.fetch;
    window.fetch = function(url: string | Request, options?: RequestInit) {
      if (typeof url === 'string' && url.startsWith('http://') && window.location.protocol === 'https:') {
        url = url.replace('http://', 'https://');
      }
      return originalFetch.call(this, url, options);
    };
  }

  private static fixBrowserCompatibility(): void {
    // Fix Android WebView compatibility issues
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidWebView = userAgent.includes('wv') || userAgent.includes('webview');
    
    if (isAndroidWebView) {
      // Enable localStorage for WebView
      try {
        if (!window.localStorage) {
          (window as any).localStorage = {
            getItem: (key: string) => (window as any)[`__localStorage_${key}`] || null,
            setItem: (key: string, value: string) => (window as any)[`__localStorage_${key}`] = value,
            removeItem: (key: string) => delete (window as any)[`__localStorage_${key}`],
            clear: () => {
              Object.keys(window as any).forEach(key => {
                if (key.startsWith('__localStorage_')) {
                  delete (window as any)[key];
                }
              });
            }
          };
        }
      } catch (e) {
        console.warn('localStorage polyfill failed:', e);
      }

      // Enable sessionStorage for WebView
      try {
        if (!window.sessionStorage) {
          (window as any).sessionStorage = {
            getItem: (key: string) => (window as any)[`__sessionStorage_${key}`] || null,
            setItem: (key: string, value: string) => (window as any)[`__sessionStorage_${key}`] = value,
            removeItem: (key: string) => delete (window as any)[`__sessionStorage_${key}`],
            clear: () => {
              Object.keys(window as any).forEach(key => {
                if (key.startsWith('__sessionStorage_')) {
                  delete (window as any)[key];
                }
              });
            }
          };
        }
      } catch (e) {
        console.warn('sessionStorage polyfill failed:', e);
      }
    }

    // Fix viewport issues on Android
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  private static fixLoadingIssues(): void {
    // Fix infinite loading issues on Android
    const style = document.createElement('style');
    style.textContent = `
      /* Android loading state fixes */
      .loading-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: #126987 !important;
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Hide broken content during load */
      body.android-loading {
        overflow: hidden !important;
      }
      
      body.android-loading > *:not(.loading-overlay) {
        visibility: hidden !important;
      }
      
      /* Android safe rendering */
      .android-safe-render {
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        will-change: auto !important;
      }
    `;
    
    document.head.appendChild(style);

    // Add loading protection
    if (document.readyState === 'loading') {
      document.body.classList.add('android-loading');
      
      const removeLoading = () => {
        setTimeout(() => {
          document.body.classList.remove('android-loading');
          document.body.classList.add('android-safe-render');
        }, 500);
      };

      if (document.readyState === 'complete') {
        removeLoading();
      } else {
        window.addEventListener('load', removeLoading);
      }
    }
  }

  static forceSecureContext(): void {
    // Force secure context for Android browsers
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      // Mock secure context for development
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: false
      });
    }
  }

  static fixNetworkSecurity(): void {
    // Fix network security configuration issues
    const networkConfig = document.createElement('meta');
    networkConfig.setAttribute('name', 'mobile-web-app-capable');
    networkConfig.setAttribute('content', 'yes');
    document.head.appendChild(networkConfig);

    const themeColor = document.createElement('meta');
    themeColor.setAttribute('name', 'theme-color');
    themeColor.setAttribute('content', '#126987');
    document.head.appendChild(themeColor);

    // Fix Android Chrome security restrictions
    const manifestLink = document.createElement('link');
    manifestLink.setAttribute('rel', 'manifest');
    manifestLink.setAttribute('href', 'data:application/manifest+json,{"name":"Bank of Ireland","short_name":"BOI","start_url":"/","display":"standalone","background_color":"#126987","theme_color":"#126987"}');
    document.head.appendChild(manifestLink);
  }
}