import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Prevent navigation flash by ensuring user is authenticated
  useEffect(() => {
    if (user) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user]);

  // Handle app focus restoration to ensure navigation stays visible
  useEffect(() => {
    const handleAppFocus = () => {
      // Force navigation visibility if user is authenticated and not on excluded screens
      if (user && !['/login', '/splash'].includes(location)) {
        setIsVisible(true);
      }
    };

    const handleAppBlur = () => {
      // Store navigation state when app loses focus
      if (user && isVisible) {
        sessionStorage.setItem('nav_was_visible', 'true');
      }
    };

    window.addEventListener('focus', handleAppFocus);
    window.addEventListener('blur', handleAppBlur);
    
    return () => {
      window.removeEventListener('focus', handleAppFocus);
      window.removeEventListener('blur', handleAppBlur);
    };
  }, [user, location, isVisible]);

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

  // Hide navigation on transfer pages when keyboard is active
  const shouldHideNavigation = location.includes('/transfer') || location.includes('/iban-transfer') || location.includes('/uk-transfer');
  
  // Ensure navigation is always restored when returning to main pages
  useEffect(() => {
    if (!shouldHideNavigation && user && !['/login', '/splash'].includes(location)) {
      setIsVisible(true);
    }
  }, [location, shouldHideNavigation, user]);
  
  if (shouldHideNavigation || !isVisible) {
    return null;
  }

  return (
    <div 
      data-bottom-nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom z-50 bottom-nav-container bottom-navigation ${isVisible ? '' : 'hidden'}`}
    >
      <div className="flex justify-around items-center h-12">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`navigation-item flex flex-col items-center space-y-1 py-2 px-3 rounded-lg touch-manipulation relative ${
              item.isActive ? 'text-[#126987]' : 'text-gray-400 hover:text-[#126987]'
            }`}
            onClick={() => setLocation(item.path)}
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
            {item.isActive && (
              <div className="absolute -bottom-2 left-1/2 w-12 h-1 bg-[#126987] rounded-full asset-instant" style={{ marginLeft: '-24px' }}></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}