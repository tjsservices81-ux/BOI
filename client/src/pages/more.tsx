import { useLocation } from "wouter";
import { ChevronLeft, User } from "lucide-react";
import { useState } from "react";

export default function More() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  return (
    <div className="h-screen relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right overflow-hidden page-fade-in" style={{ maxHeight: '100vh' }}>
      {/* Loading overlay for smooth transitions */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Background with scenic image */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/background.jpg'), linear-gradient(135deg, #126987 0%, #2d5a6b 100%)`
        }}
      />
      
      {/* Blue-green overlay matching screenshot */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#126987] to-[#2d5a6b] opacity-80" />
      
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pt-12 pb-6 px-5 flex-shrink-0">
          <button 
            onClick={() => handleNavigation('/')}
            className="flex items-center text-white transition-opacity duration-150 hover:opacity-80"
            disabled={isNavigating}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 filter brightness-0 invert" />
          </div>
          <div className="w-6"></div> {/* Spacer for alignment */}
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 160px)', overscrollBehavior: 'contain' }}>
          <div className="px-5 pt-8 pb-32">
            <div className="w-full max-w-sm mx-auto space-y-3">
              
              {/* Login with another ID */}
              <button className="w-full bg-white rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-50 shadow-sm transition-colors duration-150 stagger-item" style={{ animationDelay: '0.1s' }}>
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Log in with another ID</span>
                <span className="text-gray-400 text-lg">›</span>
              </button>

              {/* Help & Support */}
              <button className="w-full bg-white rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-50 shadow-sm transition-colors duration-150 stagger-item" style={{ animationDelay: '0.2s' }}>
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">?</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Help & Support</span>
                <span className="text-gray-400 text-lg">›</span>
              </button>

              {/* App Information */}
              <button className="w-full bg-white rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-50 shadow-sm transition-colors duration-150 stagger-item" style={{ animationDelay: '0.3s' }}>
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">i</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>App Information</span>
                <span className="text-gray-400 text-lg">›</span>
              </button>

              {/* Settings */}
              <button className="w-full bg-white rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-50 shadow-sm transition-colors duration-150 stagger-item" style={{ animationDelay: '0.4s' }}>
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">⚙</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Settings</span>
                <span className="text-gray-400 text-lg">›</span>
              </button>
              
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#126987]/95 backdrop-blur-sm rounded-t-2xl px-4 py-4 ios-safe-bottom">
          <div className="flex justify-center items-center space-x-12 max-w-sm mx-auto">
            <button 
              className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80"
              onClick={() => handleNavigation('/login')}
              disabled={isNavigating}
            >
              <img src="/branch-locator.svg" alt="ATM/Branch" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>ATM/Branch</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80"
              onClick={() => handleNavigation('/login')}
              disabled={isNavigating}
            >
              <img src="/icon_HID.svg" alt="Security" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2">
              <img src="/more-prelogin-icon.svg" alt="More" className="w-5 h-5 filter brightness-0 invert opacity-100" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
              <div className="w-12 h-0.5 bg-white rounded-full mt-1"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}