import { useLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

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
  
  if (shouldHideNavigation) {
    return null;
  }

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 z-50 smooth-interaction">
      <div className="flex justify-around items-center h-12">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`navigation-item flex flex-col items-center space-y-1 py-2 px-3 rounded-lg touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95 relative ${
              item.isActive ? 'text-[#126987]' : 'text-gray-400 hover:text-[#126987]'
            }`}
            onClick={() => setLocation(item.path)}
          >
            <img 
              src={item.isActive ? item.highlightIcon : item.icon} 
              alt={item.label} 
              className="w-6 h-6"
              loading="eager"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <span 
              className={`text-xs font-medium ${item.isActive ? 'text-[#126987]' : 'text-gray-600'}`}
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              {item.label}
            </span>
            {item.isActive && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#126987] rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}