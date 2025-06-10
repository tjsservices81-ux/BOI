import { useLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navigationItems = [
    {
      id: 'accounts',
      label: 'Accounts',
      icon: '/icon-footer-accounts.svg',
      highlightIcon: '/icon-footer-accounts-highlight.svg',
      path: '/',
      isActive: location === '/'
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom z-50">
      <div className="flex justify-around items-center h-12">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`flex flex-col items-center space-y-1 py-2 active:scale-95 transition-transform relative ${
              item.isActive ? 'text-[#4a6b75]' : 'text-gray-400 hover:text-[#4a6b75]'
            }`}
            onClick={() => setLocation(item.path)}
          >
            <img 
              src={item.isActive ? item.highlightIcon : item.icon} 
              alt={item.label} 
              className="w-6 h-6" 
            />
            <span 
              className={`text-xs font-medium ${item.isActive ? 'text-[#4a6b75]' : 'text-gray-600'}`}
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              {item.label}
            </span>
            {item.isActive && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#4a6b75] rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}