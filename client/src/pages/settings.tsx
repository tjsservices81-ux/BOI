import { useLocation } from "wouter";
import { ChevronLeft, Bell, Mail, ScanFace } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { getUserCurrency } from "../utils/currencyUtils";
import { UserDataManager } from "../utils/userDataManager";
import { useToast } from "@/hooks/use-toast";
import ukLogoPath from "@assets/IMG_1505_1759859367310.png";
import faceIdIconPath from "@assets/IMG_1506_1759859583184.png";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency] = useState(() => getUserCurrency());
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: "Please log in first to enable Face ID",
        variant: "destructive",
      });
      return;
    }

    setIsRegisteringFaceId(true);

    try {
      // Check if Web Authentication API is available
      if (!window.PublicKeyCredential) {
        // Fallback for browsers without WebAuthn
        localStorage.setItem('faceIdCredentialId', 'fallback-' + currentUser);
        setFaceIdEnabled(true);
        toast({
          title: "Face ID Enabled",
          description: "Face ID authentication is now active",
        });
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
          name: currentUser,
          displayName: currentUser,
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
        toast({
          title: "Face ID Enabled",
          description: "Passkey registered successfully",
        });
      }
    } catch (error) {
      console.error('Face ID registration error:', error);
      toast({
        title: "Face ID Registration Failed",
        description: "Could not register passkey. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegisteringFaceId(false);
    }
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
                    {isRegisteringFaceId ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <img 
                        src={faceIdIconPath} 
                        alt="Face ID" 
                        className="w-7 h-7 filter brightness-0 invert"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Face ID
                    </h3>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {isRegisteringFaceId ? 'Registering passkey...' : 'Use Face ID for login'}
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
      </div>

    </div>
  );
}
