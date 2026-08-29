import { useLocation } from "wouter";
import { ChevronLeft, Bell, Mail, Shield, ChevronRight, MapPin, FileText, Download, Globe, Clock, HelpCircle, Phone, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getUserCurrency } from "../utils/currencyUtils";
import { APP_VERSION } from "@/version";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  
  // Load settings from localStorage
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Email is turned off across the app while it's being fixed. Force the flag
  // off so no confirmation/statement emails are attempted, regardless of any
  // previously saved preference.
  useEffect(() => {
    localStorage.setItem('emailsEnabled', JSON.stringify(false));
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
  };

  // Status line shown under the "Turn on notifications" button.
  const [notifStatus, setNotifStatus] = useState('');

  // Tell the server this user's notification preference, matching the existing
  // set-notifications-flag flow.
  const syncNotifFlag = (on: boolean) => {
    try {
      const userId = localStorage.getItem('currentUser');
      if (userId) {
        fetch('/api/set-notifications-flag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, notifications_enabled: on }),
        }).catch(() => {});
      }
    } catch { /* best effort */ }
  };

  // The button the customer taps. Brings up the phone's own Allow / Don't Allow
  // prompt when it can, and explains clearly what to do in every other case
  // (already on, blocked, unsupported).
  const promptNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus("This device doesn't support notifications.");
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
      setNotifStatus('Notifications are already on.');
      setNotificationsEnabled(true);
      syncNotifFlag(true);
      return;
    }
    if (perm === 'denied') {
      // The browser will NOT show the prompt again once blocked — the only way
      // back is the phone's Settings.
      setNotifStatus('Notifications are blocked. Turn them on in your phone Settings → this app → Notifications, then reopen the app.');
      return;
    }
    // 'default' → this actually brings up the phone's Allow / Don't Allow prompt.
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setNotifStatus('Notifications turned on.');
        setNotificationsEnabled(true);
        syncNotifFlag(true);
      } else {
        setNotifStatus("You chose Don't Allow. You can turn them on later in your phone Settings.");
      }
    } catch {
      setNotifStatus("Couldn't open the prompt. Make sure the app is added to your Home Screen and opened from there.");
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      // Turning notifications off
      setNotificationsEnabled(false);
      return;
    }

    // Turning notifications on - check permission first
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'granted') {
        // Already granted, just enable
        setNotificationsEnabled(true);
      } else if (currentPermission === 'default') {
        // Never asked before, request permission
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setNotificationsEnabled(true);
          } else {
            // User denied permission - don't enable
            console.log('Notification permission denied');
          }
        } catch (error) {
          console.error('Notification permission error:', error);
        }
      } else if (currentPermission === 'denied') {
        // Previously denied
        console.log('Notifications are blocked');
      }
    } else {
      // Notifications not supported
      console.log('Notifications are not supported in this browser');
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden relative">
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
      <div className="bg-white rounded-t-3xl mt-6 flex-1 overflow-hidden shadow-2xl page-slide-up">
        <div className="h-full overflow-y-auto pb-56">
          
          {/* Content Header */}
          <div className="text-center pt-6 pb-4 px-6">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Settings
            </h2>
          </div>

          {/* Email maintenance note */}
          <div className="px-6 mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3" data-testid="note-email-maintenance">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Emails are temporarily unavailable
                </p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  We're working on email confirmations and statements — this will be fixed soon. Everything else works as normal.
                </p>
              </div>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="px-6 space-y-8">
            
            {/* Notifications Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Notifications
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1 space-y-1">
                {/* Push Notifications */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Push Notifications
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Account alerts and updates
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={handleNotificationToggle}
                      data-testid="toggle-notifications"
                    />
                  </div>
                </div>

                {/* Turn on notifications — brings up the phone's Allow / Don't Allow prompt */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <button
                    onClick={promptNotifications}
                    className="w-full flex items-center justify-center space-x-2 bg-[#126987] hover:bg-[#0d4e63] text-white rounded-xl py-3 active:scale-98 transition-all duration-150"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    data-testid="button-enable-notifications"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="font-semibold">Turn on notifications</span>
                  </button>
                  {notifStatus && (
                    <p className="text-xs text-gray-600 mt-3 text-center leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {notifStatus}
                    </p>
                  )}
                </div>

                {/* Email Notifications — disabled while email is being fixed */}
                <div className="bg-white rounded-xl p-4 shadow-sm opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Email Updates
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Temporarily unavailable — coming soon
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={false}
                      disabled
                      data-testid="toggle-emails"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Permissions */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Privacy & Permissions
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1 space-y-1">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Biometric Data
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Face ID and fingerprint
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-biometric-info">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Location Services
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          For ATM finder and security
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-location-info">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Statements & Documents */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Statements & Documents
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1 space-y-1">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Statement Frequency
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Monthly statements
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-statement-frequency">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Document Delivery
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Email or post
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-document-delivery">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* App Preferences */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                App Preferences
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1 space-y-1">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Language
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          English (UK)
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-language">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Auto-Lock
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          After 5 minutes
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-auto-lock">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="pb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Help & Support
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1 space-y-1">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Help Centre
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          FAQs and guides
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-help-centre">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Contact Us
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          24/7 customer support
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-contact-us">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#126987] to-[#0d4e63] rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          About
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {APP_VERSION}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400" data-testid="button-about">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
