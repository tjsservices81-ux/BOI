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
    <div className="h-screen overflow-hidden relative">
      {/* Background with scenic image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/background.jpg'), linear-gradient(135deg, #4a6b75 0%, #2d5a6b 100%)`
        }}
      />
      
      {/* Blue-green overlay matching screenshot */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-80" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center pt-12 pb-6">
          <div className="flex items-center space-x-2">
            <span className="text-white text-lg font-semibold">Bank of Ireland</span>
            <div className="w-4 h-4 rounded-full border border-white/50 bg-white/20"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-5 pb-32">
          <div className="w-full max-w-sm space-y-3">
            {/* Main White Login Card */}
            <div className="bg-white rounded-xl p-6 shadow-xl">
              {/* Biometric Section */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-5 relative">
                  {/* Custom fingerprint icon matching screenshot */}
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    <defs>
                      <style>{`
                        .fp-line { fill: none; stroke: #333; stroke-width: 2; stroke-linecap: round; }
                      `}</style>
                    </defs>
                    {/* Fingerprint pattern */}
                    <circle cx="32" cy="32" r="3" fill="#333" />
                    <circle cx="32" cy="32" r="8" className="fp-line" />
                    <circle cx="32" cy="32" r="13" className="fp-line" />
                    <circle cx="32" cy="32" r="18" className="fp-line" />
                    <path d="M20 32 Q32 20 44 32" className="fp-line" />
                    <path d="M24 38 Q32 46 40 38" className="fp-line" />
                    <path d="M18 28 Q32 16 46 28" className="fp-line" />
                  </svg>
                </div>
                <p className="text-gray-700 text-base">Biometric login</p>
              </div>

              {/* Log in Button */}
              <button 
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className="w-full bg-[#4a6b75] text-white py-3.5 rounded-lg font-semibold text-base mb-4 hover:bg-[#3a5a65] disabled:opacity-50"
              >
                {isLoading ? "Logging in..." : "Log in"}
              </button>

              {/* Forgot PIN */}
              <div className="text-center mb-5">
                <button className="text-[#4a6b75] text-sm flex items-center justify-center space-x-1">
                  <span>Forgot your PIN?</span>
                  <span className="text-xs">↗</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Alternative Login */}
              <div className="text-center">
                <button className="flex items-center justify-center space-x-2 text-[#4a6b75] text-sm mx-auto">
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
              <span className="flex-1 text-left text-gray-700 text-sm font-medium">Use your PIN instead</span>
              <span className="text-gray-400 text-lg">›</span>
            </button>

            {/* Approval Option Card - separate gray card */}
            <button className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3 hover:bg-gray-100">
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
        <div className="absolute bottom-0 left-0 right-0 bg-[#4a6b75]/95 backdrop-blur-sm rounded-t-2xl px-6 py-3">
          <div className="flex justify-around">
            <button className="flex flex-col items-center space-y-1 py-2">
              <span className="text-white text-sm">📍</span>
              <span className="text-white text-xs font-medium">ATM/Branch</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2">
              <span className="text-white text-sm">🛡️</span>
              <span className="text-white text-xs font-medium">Security</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2">
              <span className="text-white text-sm">⋯</span>
              <span className="text-white text-xs font-medium">More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}