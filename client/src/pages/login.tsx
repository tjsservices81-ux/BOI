import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="h-screen w-full overflow-hidden bg-white relative" style={{ 
      background: 'linear-gradient(180deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
    }}>
      {/* Top section with logo */}
      <div className="pt-16 pb-8 text-center">
        <img 
          src="/boi_logo.svg" 
          alt="Bank of Ireland" 
          className="h-6 w-auto mx-auto filter brightness-0 invert" 
        />
      </div>

      {/* Main content area */}
      <div className="px-8 pb-6">
        {/* Login card */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-8 text-center">
            {/* Fingerprint */}
            <div className="mb-6">
              <img 
                src="/Icons_Fingerprint.svg" 
                alt="Fingerprint" 
                className="w-12 h-12 mx-auto mb-4 opacity-80" 
              />
              <h2 className="text-lg text-gray-800 font-normal">Biometric login</h2>
            </div>

            {/* Main login button */}
            <Button 
              onClick={handleDemoLogin}
              className="w-full py-3 mb-4 text-white font-medium rounded-md"
              style={{ backgroundColor: 'var(--boi-teal)' }}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>

            {/* Forgot PIN */}
            <div className="mb-6">
              <Button 
                variant="link" 
                className="text-sm p-0 h-auto"
                style={{ color: 'var(--boi-teal)' }}
              >
                Forgot your PIN? →
              </Button>
            </div>

            {/* Login with another ID */}
            <div className="border-t pt-4">
              <Button 
                variant="ghost" 
                className="w-full py-3 text-left justify-start hover:bg-gray-50"
                style={{ color: 'var(--boi-teal)' }}
              >
                <User className="w-4 h-4 mr-3" />
                Log in with another ID
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom options */}
        <div className="space-y-3">
          <div className="flex items-center p-4 bg-white/95 rounded-lg">
            <div className="w-8 h-8 mr-3 rounded bg-gray-100 flex items-center justify-center">
              <span className="text-sm">🔐</span>
            </div>
            <span className="text-gray-800 flex-1">Use your PIN instead</span>
            <span className="text-gray-400">›</span>
          </div>
          
          <div className="flex items-center p-4 bg-white/95 rounded-lg">
            <div className="w-8 h-8 mr-3 rounded bg-gray-100 flex items-center justify-center">
              <span className="text-sm">⏳</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-800 font-medium">Waiting for your approval</div>
              <div className="text-xs text-gray-500">Tap here to complete any unfinished actions</div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/30">
        <div className="flex justify-around py-3">
          <div className="text-center">
            <div className="text-white text-lg mb-1">📍</div>
            <span className="text-white text-xs">ATM/Branch</span>
          </div>
          <div className="text-center">
            <div className="text-white text-lg mb-1">🛡️</div>
            <span className="text-white text-xs">Security</span>
          </div>
          <div className="text-center">
            <div className="text-white text-lg mb-1">⋯</div>
            <span className="text-white text-xs">More</span>
          </div>
        </div>
      </div>

      {/* Background image */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 pointer-events-none">
        <img 
          src="/background.jpg" 
          alt="" 
          className="w-full h-full object-cover object-center" 
        />
      </div>

      {/* Hidden inputs */}
      <div className="hidden">
        <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} />
        <Input value={pin} onChange={(e) => setPin(e.target.value)} />
      </div>
    </div>
  );
}