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
    <div className="min-h-screen relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right">
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
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center pt-12 pb-6 flex-shrink-0">
          <div className="flex items-center">
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 filter brightness-0 invert" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-5 pb-40">
          <div className="w-full max-w-sm space-y-3">
            {/* Main White Login Card */}
            <div className="bg-white rounded-xl p-6 shadow-xl">
              {/* Biometric Section */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-5 relative flex items-center justify-center">
                  <img src="/Icons_Fingerprint.svg" alt="Fingerprint" className="w-12 h-12" />
                </div>
                <p className="text-gray-700 text-base" style={{ fontFamily: 'OpenSans, sans-serif' }}>Biometric login</p>
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
            <button className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-100">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">⋯</span>
              </div>
              <span className="flex-1 text-left text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Use your PIN instead</span>
              <span className="text-gray-400 text-lg">›</span>
            </button>

            {/* Approval Option Card - separate gray card */}
            <button className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-100">
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

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#4a6b75]/95 backdrop-blur-sm rounded-t-2xl px-6 py-3 ios-safe-bottom">
          <div className="flex justify-around">
            <button className="flex flex-col items-center space-y-1 py-2">
              <img src="/branch-locator.svg" alt="ATM/Branch" className="w-4 h-4 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>ATM/Branch</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2">
              <img src="/icon_HID.svg" alt="Security" className="w-4 h-4 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2">
              <img src="/more-prelogin-icon.svg" alt="More" className="w-4 h-4 filter brightness-0 invert" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}