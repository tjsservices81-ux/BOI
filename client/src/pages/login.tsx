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
    <div className="mobile-viewport-fix relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right flex flex-col">
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
      <div className="relative z-10 flex flex-col min-h-full">
        {/* Header */}
        <div className="flex-shrink-0 pt-4 pb-6">
          <div className="text-center">
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 mx-auto mb-2 filter brightness-0 invert" />
            <h1 className="text-white text-xl font-light" style={{ fontFamily: 'OpenSans, sans-serif' }}>Bank of Ireland</h1>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-6 pb-24">
          <div className="space-y-6 max-w-sm mx-auto">
            {/* Main Login Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 space-y-6">
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerNumber" className="text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Customer Number</Label>
                    <Input
                      id="customerNumber"
                      type="text"
                      value={customerNumber}
                      onChange={(e) => setCustomerNumber(e.target.value)}
                      className="border-gray-300 focus:border-[#4a6b75] focus:ring-[#4a6b75]"
                      placeholder="Enter your customer number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pin" className="text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>PIN</Label>
                    <Input
                      id="pin"
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="border-gray-300 focus:border-[#4a6b75] focus:ring-[#4a6b75]"
                      placeholder="Enter your PIN"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#4a6b75] hover:bg-[#3a5862] text-white py-3 rounded-lg font-medium transition-colors"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>
                </form>

                {/* Biometric Login */}
                <div className="text-center">
                  <button
                    onClick={handleBiometricLogin}
                    className="flex items-center justify-center space-x-2 text-[#4a6b75] text-sm mx-auto hover:underline"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    <img src="/face-id-seeklogo.svg" alt="Face ID" className="w-4 h-4" />
                    <span>Use Face ID / Touch ID</span>
                  </button>
                </div>

                {/* Alternative Login */}
                <div className="text-center">
                  <button className="flex items-center justify-center space-x-2 text-[#4a6b75] text-sm mx-auto" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    <User className="w-4 h-4" />
                    <span>Log in with another ID</span>
                  </button>
                </div>
              </CardContent>
            </Card>

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

        {/* Bottom Navigation - Centered */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#4a6b75]/95 backdrop-blur-sm rounded-t-2xl px-6 py-3">
          <div className="flex justify-center">
            <div className="flex justify-between w-full max-w-xs">
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
    </div>
  );
}