import { useLocation } from "wouter";
import { ChevronLeft, Bell, Mail, ScanFace } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getUserCurrency } from "../utils/currencyUtils";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";
import faceIdIconPath from "@assets/IMG_1506_1759859583184.png";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  
  // Load settings from localStorage
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [emailsEnabled, setEmailsEnabled] = useState(() => {
    const saved = localStorage.getItem('emailsEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [faceIdEnabled, setFaceIdEnabled] = useState(() => {
    const saved = localStorage.getItem('faceIdEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('emailsEnabled', JSON.stringify(emailsEnabled));
  }, [emailsEnabled]);

  useEffect(() => {
    localStorage.setItem('faceIdEnabled', JSON.stringify(faceIdEnabled));
  }, [faceIdEnabled]);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden page-slide-up relative">
      {/* Loading overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-[#126987] px-4 py-6 pt-12 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => handleNavigation('/more')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-white/20"
            disabled={isNavigating}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center justify-center">
            <img 
              src={userCurrency === 'GBP' ? ukLogoPath : "/boi_logo.svg"} 
              alt={userCurrency === 'GBP' ? "Bank of Ireland UK" : "Bank of Ireland"} 
              className={`${userCurrency === 'GBP' ? 'h-9' : 'h-8'} filter brightness-0 invert`}
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
              Settings
            </h2>
            <p className="text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Manage your preferences
            </p>
          </div>

          {/* Settings Items */}
          <div className="space-y-4 max-w-md mx-auto">
            
            {/* Notifications Toggle */}
            <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Notifications
                    </h3>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Receive push notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  data-testid="toggle-notifications"
                />
              </div>
            </div>

            {/* Email Toggle */}
            <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-md">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Emails
                    </h3>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Receive email updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailsEnabled}
                  onCheckedChange={setEmailsEnabled}
                  data-testid="toggle-emails"
                />
              </div>
            </div>

            {/* Face ID Toggle */}
            <div className="w-full bg-white border border-gray-100 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                    <img 
                      src={faceIdIconPath} 
                      alt="Face ID" 
                      className="w-7 h-7 filter brightness-0 invert"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Face ID
                    </h3>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Use Face ID for login
                    </p>
                  </div>
                </div>
                <Switch
                  checked={faceIdEnabled}
                  onCheckedChange={setFaceIdEnabled}
                  data-testid="toggle-faceid"
                />
              </div>
            </div>
            
          </div>
        </div>
      </div>

    </div>
  );
}
