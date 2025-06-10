import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ customerNumber, pin });
      navigate("/");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid customer number or PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBiometricScan = async () => {
    setIsScanning(true);
    
    // Simulate biometric scanning delay
    setTimeout(async () => {
      try {
        await login({ customerNumber: "12345678", pin: "1234" });
        navigate("/");
      } catch (error) {
        toast({
          title: "Login Failed",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsScanning(false);
      }
    }, 2000);
  };

  const handleBiometricLogin = async () => {
    try {
      await login({ customerNumber: "12345678", pin: "1234" });
      navigate("/");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerNumber || !pin) {
      toast({
        title: "Missing Information",
        description: "Please enter both customer number and PIN",
        variant: "destructive",
      });
      return;
    }
    try {
      await login({ customerNumber, pin });
      navigate("/");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid customer number or PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right">
      {/* Loading overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Background with scenic image */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/background.jpg'), linear-gradient(135deg, #4a6b75 0%, #2d5a6b 100%)`
        }}
      />
      
      {/* Blue-green overlay matching screenshot */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-80" />
      
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center pt-12 pb-6 flex-shrink-0">
          <div className="flex items-center">
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 filter brightness-0 invert" />
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-5 pt-8 pb-32">
            <div className="w-full max-w-sm mx-auto space-y-3">
              {/* Main White Login Card */}
              <div className="bg-white rounded-xl p-6 shadow-xl">
                {/* Biometric Section */}
                <div className="text-center mb-8">
                  <div 
                    className={`w-20 h-20 mx-auto mb-5 relative flex items-center justify-center rounded-full border-2 transition-all duration-300 cursor-pointer group ${
                      isScanning 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300' 
                        : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:border-blue-300'
                    }`}
                    onClick={handleBiometricScan}
                  >
                    {/* Animated scanning rings */}
                    {isScanning ? (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping"></div>
                        <div className="absolute inset-1 rounded-full border-2 border-green-500 animate-ping animation-delay-75"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-green-600 animate-ping animation-delay-150"></div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-pulse opacity-30"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-blue-400 animate-pulse opacity-50 animation-delay-150"></div>
                      </>
                    )}
                    
                    {/* Fingerprint icon */}
                    <div className="relative z-10 w-10 h-10 flex items-center justify-center">
                      <svg 
                        className={`w-8 h-8 transition-colors duration-200 ${
                          isScanning 
                            ? 'text-green-600' 
                            : 'text-blue-600 group-hover:text-blue-700'
                        }`}
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.24-1.16-2.65-1.14-4.13-.02-1.48.45-2.89 1.14-4.13.67-1.21 1.14-1.77 2.01-2.64.18-.18.48-.18.66 0 .18.18.18.48 0 .66-.76.76-1.17 1.25-1.73 2.3-.59 1.11-1.01 2.37-.99 3.81-.02 1.44.4 2.7.99 3.81.56 1.05.97 1.54 1.73 2.3.18.18.18.48 0 .66-.09.1-.22.15-.35.15zm11.48-4.02c-.1-.11-.25-.18-.41-.18-.15.01-.29.08-.38.2-.08.11-.13.25-.13.4v.17c-.25 1.58-.83 2.77-1.61 3.7-.87 1.02-1.96 1.57-3.36 1.57-1.4 0-2.49-.55-3.36-1.57-.78-.93-1.36-2.12-1.61-3.7v-.17c0-.15-.05-.29-.13-.4-.09-.12-.23-.19-.38-.2-.16 0-.31.07-.41.18-.11.1-.18.25-.18.41v.2c.27 1.8.93 3.18 1.85 4.26 1.05 1.21 2.35 1.86 4.22 1.86 1.87 0 3.17-.65 4.22-1.86.92-1.08 1.58-2.46 1.85-4.26v-.2c0-.16-.07-.31-.18-.41z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-700 text-base" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {isScanning ? 'Scanning fingerprint...' : 'Touch for biometric login'}
                  </p>
                </div>

                {/* Log in Button */}
                <button 
                  onClick={handleBiometricLogin}
                  disabled={isLoading}
                  className="w-full bg-[#4a6b75] text-white py-3.5 rounded-lg font-semibold text-base mb-4 hover:bg-[#3a5a65] disabled:opacity-50"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </button>

                {/* Forgot PIN */}
                <div className="text-center mb-5">
                  <button className="text-[#4a6b75] text-sm flex items-center justify-center space-x-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    <span>Forgot your PIN?</span>
                    <span className="text-xs">↗</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Alternative Login */}
                <div className="text-center">
                  <button className="flex items-center justify-center space-x-2 text-[#4a6b75] text-sm mx-auto" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    <User className="w-4 h-4" />
                    <span>Log in with another ID</span>
                  </button>
                </div>
              </div>

              {/* PIN Option Card - separate gray card */}
              <button 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-100 transition-colors duration-150"
                onClick={() => {
                  console.log("PIN button clicked, current showPinLogin:", showPinLogin);
                  setShowPinLogin(!showPinLogin);
                }}
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">⋯</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Use your PIN instead</span>
                <span className="text-gray-400 text-lg">›</span>
              </button>

              {/* PIN Login Form - shows when showPinLogin is true */}
              {showPinLogin ? (
                <div className="bg-white rounded-xl p-6 shadow-xl border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Log in with PIN
                  </h3>
                  <form onSubmit={handlePinLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Customer Number
                      </Label>
                      <Input
                        id="customerNumber"
                        type="text"
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="Enter your customer number"
                        className="mt-1"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pin" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        PIN
                      </Label>
                      <Input
                        id="pin"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter your PIN"
                        className="mt-1"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#4a6b75] text-white hover:bg-[#3a5a65]"
                      disabled={isLoading}
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      {isLoading ? "Logging in..." : "Log in with PIN"}
                    </Button>
                    
                    <button
                      type="button"
                      onClick={() => setShowPinLogin(false)}
                      className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors duration-150"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              ) : null}

              {/* Approval Option Card - separate gray card */}
              <button className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-100 transition-colors duration-150">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <img src="/lock.svg" alt="Lock" className="w-3 h-3" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Waiting for your approval</div>
                  <div className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>Tap here to complete any unfinished actions</div>
                </div>
                <span className="text-gray-400 text-lg">›</span>
              </button>


            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#4a6b75]/95 backdrop-blur-sm rounded-t-2xl px-4 py-4 ios-safe-bottom">
          <div className="flex justify-center items-center space-x-12 max-w-sm mx-auto">
            <button className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80">
              <img src="/branch-locator.svg" alt="ATM/Branch" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>ATM/Branch</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80">
              <img src="/icon_HID.svg" alt="Security" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80"
              onClick={() => handleNavigation("/more")}
              disabled={isNavigating || isLoading}
            >
              <img src="/more-prelogin-icon.svg" alt="More" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}