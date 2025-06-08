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

  const handleDemoLogin = () => {
    setCustomerNumber("12345678");
    setPin("1234");
    const event = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(event);
  };

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ 
      background: 'linear-gradient(180deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
    }}>
      {/* Status bar area */}
      <div className="h-12"></div>
      
      {/* Header */}
      <div className="text-center py-6">
        <img 
          src="/boi_logo.svg" 
          alt="Bank of Ireland" 
          className="h-8 w-auto mx-auto filter brightness-0 invert" 
        />
      </div>

      {/* Main login card */}
      <div className="flex justify-center px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-10 text-center">
            {/* Fingerprint icon */}
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <img 
                  src="/Icons_Fingerprint.svg" 
                  alt="Fingerprint" 
                  className="w-16 h-16 opacity-70" 
                />
              </div>
              <h2 className="text-xl font-normal text-gray-700">Biometric login</h2>
            </div>

            {/* Log in button */}
            <Button 
              onClick={handleDemoLogin}
              className="w-full py-4 mb-6 text-white font-medium text-lg rounded-lg shadow-sm"
              style={{ backgroundColor: 'var(--boi-teal)' }}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>

            {/* Forgot PIN link */}
            <div className="mb-8">
              <Button 
                variant="link" 
                className="text-base p-0 h-auto font-normal"
                style={{ color: 'var(--boi-teal)' }}
              >
                Forgot your PIN? →
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-6">
              <Button 
                variant="ghost" 
                className="w-full py-4 text-left justify-start font-normal text-base hover:bg-gray-50"
                style={{ color: 'var(--boi-teal)' }}
              >
                <User className="w-5 h-5 mr-3" />
                Log in with another ID
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom options */}
      <div className="absolute bottom-20 left-0 right-0 px-6">
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-white/95 rounded-2xl backdrop-blur-sm shadow-lg">
            <div className="w-10 h-10 mr-4 rounded-xl bg-gray-100 flex items-center justify-center">
              <span className="text-lg">🔑</span>
            </div>
            <span className="text-gray-800 font-medium flex-1 text-lg">Use your PIN instead</span>
            <span className="text-gray-400 text-xl">›</span>
          </div>
          
          <div className="flex items-center p-4 bg-white/95 rounded-2xl backdrop-blur-sm shadow-lg">
            <div className="w-10 h-10 mr-4 rounded-xl bg-gray-100 flex items-center justify-center">
              <span className="text-lg">⏳</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-800 font-medium text-lg">Waiting for your approval</div>
              <div className="text-sm text-gray-500 mt-1">Tap here to complete any unfinished actions</div>
            </div>
            <span className="text-gray-400 text-xl">›</span>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-around py-4 px-6">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xl">📍</span>
            </div>
            <span className="text-white text-xs font-medium">ATM/Branch</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xl">🛡️</span>
            </div>
            <span className="text-white text-xs font-medium">Security</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-xl">⋯</span>
            </div>
            <span className="text-white text-xs font-medium">More</span>
          </div>
        </div>
      </div>

      {/* Background image overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-40 opacity-20 pointer-events-none">
        <img 
          src="/background.jpg" 
          alt="" 
          className="w-full h-full object-cover object-top" 
        />
      </div>

      {/* Hidden form inputs for functionality */}
      <div className="hidden">
        <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} />
        <Input value={pin} onChange={(e) => setPin(e.target.value)} />
      </div>
    </div>
  );
}