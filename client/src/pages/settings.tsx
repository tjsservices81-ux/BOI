import { useLocation } from "wouter";
import { ChevronLeft, Bell, Mail, ScanFace } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getUserCurrency } from "../utils/currencyUtils";
import { UserDataManager } from "../utils/userDataManager";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";
import faceIdIconPath from "@assets/IMG_1506_1759859583184.png";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  const [isRegisteringFaceId, setIsRegisteringFaceId] = useState(false);
  
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

  const [recipientEmailEnabled, setRecipientEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('recipientEmailEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [ibanEmailEnabled, setIbanEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('ibanEmailEnabled');
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

  useEffect(() => {
    localStorage.setItem('recipientEmailEnabled', JSON.stringify(recipientEmailEnabled));
  }, [recipientEmailEnabled]);

  useEffect(() => {
    localStorage.setItem('ibanEmailEnabled', JSON.stringify(ibanEmailEnabled));
  }, [ibanEmailEnabled]);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      setLocation(path);
    }, 150);
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

  const handleFaceIdToggle = async (enabled: boolean) => {
    if (!enabled) {
      // Disabling Face ID - just clear the stored credential
      localStorage.removeItem('faceIdCredentialId');
      setFaceIdEnabled(false);
      return;
    }

    // Enabling Face ID - register passkey
    const currentUser = UserDataManager.getCurrentUser();
    if (!currentUser) {
      console.error('Please log in first to enable Face ID');
      return;
    }

    setIsRegisteringFaceId(true);

    try {
      // Check if Web Authentication API is available
      if (!window.PublicKeyCredential) {
        // Fallback for browsers without WebAuthn
        localStorage.setItem('faceIdCredentialId', 'fallback-' + currentUser);
        setFaceIdEnabled(true);
        setIsRegisteringFaceId(false);
        return;
      }

      // Register passkey using WebAuthn
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Bank of Ireland",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: "BOI Customer Login",
          displayName: "BOI Customer Login",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" as const },
          { alg: -257, type: "public-key" as const }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const,
          userVerification: "required" as const,
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (credential && credential.id) {
        // Store credential ID (base64 encoded) for future authentication
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        const credentialIdBase64 = btoa(rawIdArray.map(byte => String.fromCharCode(byte)).join(''));
        localStorage.setItem('faceIdCredentialId', credentialIdBase64);
        setFaceIdEnabled(true);
      }
    } catch (error) {
      console.error('Face ID registration error:', error);
    } finally {
      setIsRegisteringFaceId(false);
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
        <div className="h-full overflow-y-auto pb-32">
          
          {/* Content Header */}
          <div className="text-center pt-6 pb-4 px-6">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Settings
            </h2>
          </div>

          {/* Settings Sections */}
          <div className="px-6 space-y-8">
            
            {/* Security Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Security
              </h3>
              <div className="bg-gray-50 rounded-2xl p-1">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                        {isRegisteringFaceId ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <img 
                            src={faceIdIconPath} 
                            alt="Face ID" 
                            className="w-6 h-6 filter brightness-0 invert"
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Face ID
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {isRegisteringFaceId ? 'Registering passkey...' : 'Use biometric login'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={faceIdEnabled}
                      onCheckedChange={handleFaceIdToggle}
                      disabled={isRegisteringFaceId}
                      data-testid="toggle-faceid"
                    />
                  </div>
                </div>
              </div>
            </div>

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
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
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

                {/* Email Notifications */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Email Updates
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Statements and confirmations
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

                {/* Recipient Email on UK Transfer */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Recipient Email (UK)
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Send copy to recipient
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={recipientEmailEnabled}
                      onCheckedChange={setRecipientEmailEnabled}
                      data-testid="toggle-recipient-email"
                    />
                  </div>
                </div>

                {/* IBAN Email */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          IBAN Recipient Email
                        </h4>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Send copy to IBAN recipient
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={ibanEmailEnabled}
                      onCheckedChange={setIbanEmailEnabled}
                      data-testid="toggle-iban-email"
                    />
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
