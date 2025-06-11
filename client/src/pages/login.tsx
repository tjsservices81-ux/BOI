import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { User, ExternalLink, HelpCircle, Phone, Settings, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoginAnimating, setIsLoginAnimating] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginStage, setLoginStage] = useState('');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Preload assets immediately
  useEffect(() => {
    const preloadAssets = () => {
      const logoImg = new Image();
      logoImg.onload = () => setAssetsLoaded(true);
      logoImg.onerror = () => setAssetsLoaded(true); // Even if fails, show elements
      logoImg.src = '/boi_logo.svg';
      
      // Also preload background image
      const bgImg = new Image();
      bgImg.src = '/background.jpg';
      
      // Set a fallback timeout to ensure elements appear
      setTimeout(() => setAssetsLoaded(true), 100);
    };
    
    preloadAssets();
  }, []);

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

  const handleBiometricHoldStart = () => {
    if (biometricVerified) return;
    
    setIsScanning(true);
    setHoldProgress(0);
    
    const timer = setInterval(() => {
      setHoldProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(timer);
          setBiometricVerified(true);
          setIsScanning(false);
          setHoldProgress(0);
          return 100;
        }
        return newProgress;
      });
    }, 60);
    
    setHoldTimer(timer);
  };

  const handleBiometricHoldEnd = () => {
    if (holdTimer) {
      clearInterval(holdTimer);
      setHoldTimer(null);
    }
    if (!biometricVerified) {
      setIsScanning(false);
      setHoldProgress(0);
    }
  };

  const handleLoginButton = async () => {
    if (!biometricVerified && !pinVerified) {
      toast({
        title: "Authentication Required",
        description: "Please verify with biometric or PIN first",
        variant: "destructive",
      });
      return;
    }

    setIsLoginAnimating(true);
    setLoginProgress(0);

    try {
      // Stage 1: Authenticating (2 seconds)
      setLoginStage('Authenticating...');
      const progressInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 25) return prev + 1.25;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stage 2: Verifying credentials (1.5 seconds)
      setLoginStage('Verifying credentials...');
      setLoginProgress(25);
      const verifyInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 50) return prev + 1.67;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 3: Securing connection (1.5 seconds)
      setLoginStage('Securing connection...');
      setLoginProgress(50);
      const secureInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 75) return prev + 1.67;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 4: Loading dashboard (1.5 seconds)
      setLoginStage('Loading dashboard...');
      setLoginProgress(75);
      const finalInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 95) return prev + 1.33;
          return prev;
        });
      }, 100);

      clearInterval(progressInterval);
      clearInterval(verifyInterval);
      clearInterval(secureInterval);

      await login({ customerNumber: "12345678", pin: "1234" });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Final completion (0.5 seconds)
      setLoginStage('Welcome to Bank of Ireland');
      setLoginProgress(95);
      const completeInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 100) return prev + 1;
          return prev;
        });
      }, 100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoginProgress(100);
      clearInterval(finalInterval);
      clearInterval(completeInterval);

      await new Promise(resolve => setTimeout(resolve, 300));
      navigate("/");
    } catch (error) {
      setIsLoginAnimating(false);
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePinVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerNumber || !pin) {
      toast({
        title: "Missing Information",
        description: "Please enter both customer number and PIN",
        variant: "destructive",
      });
      return;
    }
    
    // Simulate PIN verification
    setPinVerified(true);
  };

  return (
    <div className="full-height relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right bg-[#4a6b75]">
      {/* Loading overlay */}
      {(isNavigating || isLoginAnimating) && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] z-50 flex flex-col items-center justify-center">
          {/* Background overlay pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url('/background.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          <div className="relative z-10">
            {/* Bank of Ireland Logo with authentic styling - preloaded */}
            <div className="mb-8 flex flex-col items-center">
              <img 
                src="/boi_logo.svg" 
                alt="Bank of Ireland" 
                className="h-10 filter brightness-0 invert mb-2"
                style={{ 
                  display: 'block',
                  opacity: assetsLoaded ? 1 : 0,
                  transition: 'opacity 0.1s ease-in'
                }}
              />
              <div className="w-16 h-1 bg-white opacity-30 rounded-full"></div>
            </div>
          
          {/* Login Animation */}
          {isLoginAnimating ? (
            <div className="text-center space-y-6">
              {/* Animated Security Icon */}
              <div className="relative">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img 
                    src="/icon_HID.svg" 
                    alt="Security" 
                    className="w-10 h-10 filter brightness-0 invert animate-pulse" 
                  />
                </div>
                
                {/* Pulsing rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border border-white border-opacity-30 rounded-full animate-ping"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 border border-white border-opacity-20 rounded-full animate-pulse"></div>
                </div>
                
                {/* Rotating outer ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-white border-opacity-10 border-t-white border-t-opacity-40 rounded-full animate-spin"></div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-64 mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {loginStage}
                  </span>
                  <span className="text-white text-sm opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {Math.round(loginProgress)}%
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
                  <div 
                    className="bg-white h-1 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${loginProgress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Security Message with BOI styling */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <img src="/cert.svg" alt="Certified" className="w-4 h-4 filter brightness-0 invert opacity-75" />
                  <p className="text-white text-xs opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Bank-grade security
                  </p>
                </div>
                <p className="text-white text-xs opacity-60 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your connection is secured with 256-bit encryption
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          </div>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden ios-scroll">
          <div className="px-5 pt-8 pb-32">
            <div className="w-full max-w-xs mx-auto space-y-3">
              {/* Main White Login Card */}
              <div className="bg-white ios-card p-4">
                {/* Biometric Section */}
                <div className="text-center mb-6">
                  <div 
                    className={`w-16 h-16 mx-auto mb-4 relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer group ${
                      biometricVerified 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100'
                        : isScanning 
                          ? 'bg-gradient-to-br from-blue-50 to-blue-100' 
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100'
                    }`}
                    onMouseDown={handleBiometricHoldStart}
                    onMouseUp={handleBiometricHoldEnd}
                    onMouseLeave={handleBiometricHoldEnd}
                    onTouchStart={handleBiometricHoldStart}
                    onTouchEnd={handleBiometricHoldEnd}
                  >
                    {/* Progress ring for holding */}
                    {isScanning && (
                      <div className="absolute inset-0 rounded-full">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-gray-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="text-blue-500 transition-all duration-100"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - holdProgress / 100)}`}
                          />
                        </svg>
                      </div>
                    )}
                    
                    {/* Animated scanning rings */}
                    {isScanning ? (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-blue-300 animate-pulse"></div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-200 opacity-40 group-hover:border-blue-300 group-hover:opacity-60 transition-all duration-300"></div>
                        <div className="absolute inset-2 rounded-full border border-blue-300 opacity-30 group-hover:opacity-50 animate-pulse transition-all duration-300"></div>
                      </>
                    )}
                    
                    {/* Original Fingerprint icon with effects */}
                    <div className="relative z-10 w-10 h-10 flex items-center justify-center">
                      <img 
                        src="/Icons_Fingerprint.svg" 
                        alt="Fingerprint" 
                        className={`w-8 h-8 transition-all duration-300 ${
                          biometricVerified ? 'scale-110' : isScanning ? 'scale-105' : 'scale-100'
                        }`}
                        style={{
                          filter: biometricVerified 
                            ? 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)'
                            : isScanning
                              ? 'brightness(0) saturate(100%) invert(47%) sepia(96%) saturate(1234%) hue-rotate(204deg) brightness(97%) contrast(97%)'
                              : 'brightness(0) saturate(100%) invert(29%) sepia(16%) saturate(456%) hue-rotate(174deg) brightness(96%) contrast(88%)'
                        }}
                      />
                      
                      {/* Scanning line effect */}
                      {isScanning && (
                        <div className="absolute inset-0 overflow-hidden rounded-full">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400 animate-pulse"></div>
                          <div className="absolute top-2 left-0 right-0 h-0.5 bg-green-300 animate-pulse animation-delay-100"></div>
                          <div className="absolute top-4 left-0 right-0 h-0.5 bg-green-200 animate-pulse animation-delay-200"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Glow effect when scanning */}
                    {isScanning && (
                      <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-pulse"></div>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {biometricVerified ? 'Fingerprint verified' : isScanning ? 'Hold to scan fingerprint...' : 'Hold for biometric login'}
                  </p>
                </div>

                {/* Log in Button */}
                <button 
                  onClick={handleLoginButton}
                  disabled={isLoading}
                  className={`w-full py-2.5 ios-button font-semibold text-sm mb-3 transition-all duration-200 ${
                    biometricVerified || pinVerified 
                      ? 'bg-[#4a6b75] text-white hover:bg-[#3a5a65] active:scale-95' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </button>

                {/* Forgot PIN */}
                <div className="text-center mb-3">
                  <button className="text-[#4a6b75] text-xs flex items-center justify-center space-x-1 active:scale-95 transition-transform" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <span>Forgot your PIN?</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3"></div>

                {/* Alternative Login */}
                <div className="text-center">
                  <button className="flex items-center justify-center space-x-2 text-[#4a6b75] text-xs mx-auto active:scale-95 transition-transform" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <User className="w-3 h-3" />
                    <span>Log in with another ID</span>
                  </button>
                </div>
              </div>

              {/* PIN Option Card - separate gray card */}
              <button 
                className="w-full bg-gray-50 border border-gray-200 ios-card p-3 flex items-center space-x-3 hover:bg-gray-100 active:scale-98 transition-all duration-150"
                onClick={() => {
                  console.log("PIN button clicked, current showPinLogin:", showPinLogin);
                  setShowPinLogin(!showPinLogin);
                }}
              >
                <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">⋯</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-xs font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Use your PIN instead</span>
                <span className="text-gray-400 text-sm">›</span>
              </button>

              {/* PIN Login Form - shows when showPinLogin is true */}
              {showPinLogin ? (
                <div className="bg-white ios-card p-4 border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Log in with PIN
                  </h3>
                  <form onSubmit={handlePinVerification} className="space-y-4">
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
                        className="mt-1 ios-input"
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
                        className="mt-1 ios-input"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full text-white hover:bg-[#3a5a65] ${
                        pinVerified ? 'bg-green-600' : 'bg-[#4a6b75]'
                      }`}
                      disabled={isLoading || pinVerified}
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      {pinVerified ? "PIN Verified ✓" : "Verify PIN"}
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
              onClick={() => setShowMoreMenu(true)}
              disabled={isNavigating || isLoading}
            >
              <img src="/more-prelogin-icon.svg" alt="More" className="w-5 h-5 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
            </button>
          </div>
        </div>
      </div>

      {/* More Menu Modal */}
      {showMoreMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-4 mb-0 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                More Options
              </h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Help & Support</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Get assistance with login</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Contact Us</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Phone support & branches</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Accessibility</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Login accessibility options</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security Info</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Learn about secure banking</p>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setShowMoreMenu(false)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}