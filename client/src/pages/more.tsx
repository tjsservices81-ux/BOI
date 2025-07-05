import { useLocation } from "wouter";
import { ChevronLeft, User, HelpCircle, Info, Settings, Shield, Building2, MessageCircle, FileText } from "lucide-react";
import { useState } from "react";

export default function More() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  const handleLiveChatClick = () => {
    setIsLoadingChat(true);
    // Simulate loading time for a realistic experience
    setTimeout(() => {
      setIsLoadingChat(false);
      // Dispatch global event to open persistent live chat
      window.dispatchEvent(new CustomEvent('openLiveChat'));
    }, 1200); // 1.2 seconds loading
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden page-slide-up relative">
      {/* Loading overlay for smooth transitions */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-[#126987] px-4 py-6 pt-12 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => handleNavigation('/dashboard')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-white/20"
            disabled={isNavigating}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center justify-center">
            <img 
              src="/boi_logo.svg" 
              alt="Bank of Ireland" 
              className="h-8 filter brightness-0 invert"
            />
          </div>
          
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-t-3xl mt-6 flex-1 overflow-hidden shadow-2xl">
        <div className="h-full overflow-y-auto p-6 pb-32">
          
          {/* Content Header */}
          <div className="text-center mb-8 pt-2">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              More Options
            </h2>
            <p className="text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Account settings and support
            </p>
          </div>

          {/* Menu Items */}
          <div className="space-y-4 max-w-md mx-auto">
            
            {/* Profile */}
            <button 
              className="w-full bg-white border border-gray-100 rounded-2xl p-5 flex items-center space-x-4 hover:bg-gray-50 shadow-lg transition-all duration-200 active:scale-98 stagger-item" 
              style={{ animationDelay: '0.1s' }}
              onClick={() => handleNavigation('/profile')}
              disabled={isNavigating}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-2xl flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Profile
                </h3>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  View and edit your profile details
                </p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </button>



            {/* Live Chat */}
            <button 
              onClick={handleLiveChatClick}
              className="w-full bg-white border border-gray-100 rounded-2xl p-5 flex items-center space-x-4 hover:bg-gray-50 shadow-lg transition-all duration-200 active:scale-98 stagger-item" 
              style={{ animationDelay: '0.2s' }}
              disabled={isNavigating || isLoadingChat}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                {isLoadingChat ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MessageCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {isLoadingChat ? 'Connecting...' : 'Live Chat'}
                </h3>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {isLoadingChat ? 'Please wait while we set up your chat session' : 'Chat with our support team'}
                </p>
              </div>
              {!isLoadingChat && <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />}
            </button>

            {/* Statements - TEMPORARILY ENABLED FOR TESTING */}
            <button 
              className="w-full bg-white border border-gray-100 rounded-2xl p-5 flex items-center space-x-4 hover:bg-gray-50 shadow-lg transition-all duration-200 active:scale-98 stagger-item" 
              style={{ animationDelay: '0.3s' }}
              onClick={() => handleNavigation('/statements')}
              disabled={isNavigating}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Statements
                </h3>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Download your account statements
                </p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </button>

            {/* Settings */}
            <button 
              className="w-full bg-white border border-gray-100 rounded-2xl p-5 flex items-center space-x-4 hover:bg-gray-50 shadow-lg transition-all duration-200 active:scale-98 stagger-item" 
              style={{ animationDelay: '0.4s' }}
              disabled={isNavigating}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-md">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Settings
                </h3>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Notifications and preferences
                </p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </button>
            
          </div>
        </div>
      </div>

    </div>
  );
}