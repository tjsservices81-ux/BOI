import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function BottomNavigation() {
  const locationHook = useLocation();
  const [location, setLocation] = locationHook || ['/', () => {}];
  
  const authHook = useAuth();
  const user = authHook?.user || null;
  const [isSplashActive, setIsSplashActive] = useState(true);

  // Monitor splash screen state
  useEffect(() => {
    const checkSplashState = () => {
      const splashElement = document.querySelector('[data-splash-active]');
      const isCurrentlySplash = splashElement !== null || location === '/' || location === '/splash';
      setIsSplashActive(isCurrentlySplash);
    };

    // Check immediately
    checkSplashState();

    // Monitor DOM changes and route changes
    const observer = new MutationObserver(checkSplashState);
    observer.observe(document.body, { childList: true, subtree: true });

    // Check on route changes
    const interval = setInterval(checkSplashState, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [location]);

  // Determine if navigation should be visible
  const shouldShowNavigation = () => {
    // Never show during splash screen
    if (isSplashActive) return false;
    
    // Don't show if user is not authenticated
    if (!user) return false;
    
    // Don't show on login/splash screens
    if (['/login', '/splash'].includes(location)) return false;
    
    // Don't show on root path during initial loading
    if (location === '/') return false;
    
    // Don't show on transfer pages
    if (location.includes('/transfer') || location.includes('/iban-transfer') || location.includes('/uk-transfer')) return false;
    
    // Show on all other authenticated pages
    return true;
  };

  const navigationItems = [
    {
      id: 'accounts',
      label: 'Accounts',
      icon: '/icon-footer-accounts.svg',
      highlightIcon: '/icon-footer-accounts-highlight.svg',
      path: '/dashboard',
      isActive: location === '/' || location === '/dashboard'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: '/icon-footer-payments.svg',
      highlightIcon: '/icon-footer-payments-highlight.svg',
      path: '/payments',
      isActive: location === '/payments'
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: '/icon-footer-services.svg',
      highlightIcon: '/icon-footer-services-highlight.svg',
      path: '/cards',
      isActive: location === '/cards'
    },
    {
      id: 'apply',
      label: 'Apply',
      icon: '/icon-footer-apply.svg',
      highlightIcon: '/icon-footer-apply-highlight.svg',
      path: '/apply',
      isActive: location === '/apply'
    },
    {
      id: 'more',
      label: 'More',
      icon: '/icon-footer-more.svg',
      highlightIcon: '/icon-footer-more-highlight.svg',
      path: '/more',
      isActive: location === '/more'
    }
  ];

  // Don't render if navigation shouldn't be visible
  if (!shouldShowNavigation()) {
    return null;
  }

  return (
    <div 
      data-bottom-nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom z-50 bottom-nav-container bottom-navigation"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-around items-center h-12">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`navigation-item flex flex-col items-center space-y-1 py-2 px-3 rounded-lg touch-manipulation relative android-no-highlight ${
              item.isActive ? 'text-[#126987]' : 'text-gray-400 hover:text-[#126987]'
            }`}
            onClick={() => setLocation(item.path)}
            style={{
              WebkitTapHighlightColor: 'transparent',
              outline: 'none'
            }}
          >
            <img 
              src={item.isActive ? item.highlightIcon : item.icon} 
              alt={item.label} 
              className="w-6 h-6 asset-instant"
              loading="eager"
              decoding="sync"
              style={{ 
                imageRendering: 'crisp-edges',
                opacity: 1,
                visibility: 'visible',
                display: 'block'
              }}
            />
            <span 
              className={`text-xs font-medium asset-instant ${item.isActive ? 'text-[#126987]' : 'text-gray-600'}`}
              style={{ 
                fontFamily: 'OpenSans, sans-serif',
                opacity: 1,
                visibility: 'visible'
              }}
            >
              {item.label}
            </span>

          </button>
        ))}
      </div>
    </div>
  );
}