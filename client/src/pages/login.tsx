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
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

  return (
    <div className="h-screen w-full overflow-hidden relative bg-[#4a6b75]">
      {/* iOS-style status bar simulation */}
      <div className="h-11 bg-transparent relative z-50">
        <div className="absolute top-2 left-4 text-white text-sm font-medium">6:27</div>
        <div className="absolute top-2 right-4 flex items-center space-x-1">
          <div className="w-6 h-3 border border-white/60 rounded-sm">
            <div className="w-4 h-1 bg-white/80 rounded-xs mt-0.5 ml-0.5"></div>
          </div>
        </div>
      </div>

      {/* Scenic background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234a6b75;stop-opacity:1" /><stop offset="50%" style="stop-color:%23517a85;stop-opacity:1" /><stop offset="100%" style="stop-color:%232d5a6b;stop-opacity:1" /></linearGradient></defs><rect width="800" height="600" fill="url(%23bg)"/><polygon points="0,400 800,300 800,600 0,600" fill="rgba(45,90,107,0.6)"/><polygon points="100,450 700,350 700,600 100,600" fill="rgba(81,122,133,0.4)"/></svg>')`
        }}
      />
      
      {/* Teal overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75]/80 to-[#2d5a6b]/90" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col pt-6">
        {/* Bank of Ireland Header */}
        <div className="flex items-center justify-center pb-8">
          <div className="flex items-center space-x-3">
            <span className="text-white text-lg font-semibold tracking-wide" style={{ fontFamily: 'OpenSans, sans-serif' }}>Bank of Ireland</span>
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-5 w-auto filter brightness-0 invert" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-5 pb-24">
          <div className="w-full space-y-3">
            {/* Main White Login Card */}
            <div className="bg-white rounded-xl p-6 shadow-2xl mx-1">
              {/* Biometric Section */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-5 relative">
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    <defs>
                      <style>{`
                        .fp-line { fill: none; stroke: #333; stroke-width: 2.5; stroke-linecap: round; }
                      `}</style>
                    </defs>
                    <circle cx="32" cy="32" r="4" fill="#333" />
                    <circle cx="32" cy="32" r="10" className="fp-line" />
                    <circle cx="32" cy="32" r="16" className="fp-line" />
                    <circle cx="32" cy="32" r="22" className="fp-line" />
                    <path d="M18 32 Q32 18 46 32" className="fp-line" />
                    <path d="M22 42 Q32 52 42 42" className="fp-line" />
                    <path d="M16 26 Q32 12 48 26" className="fp-line" />
                  </svg>
                </div>
                <p className="text-gray-800 text-base font-normal" style={{ fontFamily: 'OpenSans, sans-serif' }}>Biometric login</p>
              </div>

              {/* Log in Button */}
              <button 
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className="w-full bg-[#4a6b75] text-white py-3.5 rounded-lg font-semibold text-base mb-4 hover:bg-[#3a5a65] disabled:opacity-50 active:bg-[#2d5a6b] transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                {isLoading ? "Logging in..." : "Log in"}
              </button>

              {/* Forgot PIN */}
              <div className="text-center mb-5">
                <button className="text-[#4a6b75] text-sm flex items-center justify-center space-x-1 hover:text-[#3a5a65]">
                  <span style={{ fontFamily: 'OpenSans, sans-serif' }}>Forgot your PIN?</span>
                  <img src="/boi_back_arrow.svg" alt="Arrow" className="w-3 h-3 ml-1 transform rotate-45" />
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-5"></div>

              {/* Alternative Login */}
              <div className="text-center">
                <button className="flex items-center justify-center space-x-2 text-[#4a6b75] text-sm mx-auto hover:text-[#3a5a65]">
                  <img src="/Icon_mobile.svg" alt="User" className="w-4 h-4" />
                  <span style={{ fontFamily: 'OpenSans, sans-serif' }}>Log in with another ID</span>
                </button>
              </div>
            </div>

            {/* PIN Option Card */}
            <button className="w-full bg-gray-50/95 border border-gray-200/80 rounded-xl p-4 flex items-center space-x-3 hover:bg-gray-100/95 active:bg-gray-200/95 transition-colors mx-1">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">⋯⋯⋯</span>
              </div>
              <span className="flex-1 text-left text-gray-700 text-sm font-medium">Use your PIN instead</span>
              <span className="text-gray-400 text-lg">›</span>
            </button>

            {/* Approval Option Card */}
            <button className="w-full bg-gray-50/95 border border-gray-200/80 rounded-xl p-4 flex items-center space-x-3 hover:bg-gray-100/95 active:bg-gray-200/95 transition-colors mx-1">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs">🔒</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-700 text-sm font-medium">Waiting for your approval</div>
                <div className="text-gray-500 text-xs mt-0.5">Tap here to complete any unfinished actions</div>
              </div>
              <span className="text-gray-400 text-lg">›</span>
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#4a6b75]/95 backdrop-blur-md rounded-t-3xl px-6 py-4 border-t border-white/10">
          <div className="flex justify-around">
            <button className="flex flex-col items-center space-y-1.5 py-2 active:opacity-70 transition-opacity">
              <span className="text-white text-base">📍</span>
              <span className="text-white text-xs font-medium">ATM/Branch</span>
            </button>
            <button className="flex flex-col items-center space-y-1.5 py-2 active:opacity-70 transition-opacity">
              <span className="text-white text-base">🛡️</span>
              <span className="text-white text-xs font-medium">Security</span>
            </button>
            <button className="flex flex-col items-center space-y-1.5 py-2 active:opacity-70 transition-opacity">
              <span className="text-white text-base">⋯</span>
              <span className="text-white text-xs font-medium">More</span>
            </button>
          </div>
        </div>

        {/* iOS home indicator */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
      </div>
    </div>
  );
}