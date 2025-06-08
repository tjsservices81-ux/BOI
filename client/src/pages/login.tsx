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

  return (
    <div className="h-screen overflow-hidden flex flex-col relative" style={{ 
      background: 'linear-gradient(135deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
    }}>
      {/* Header with Bank of Ireland logo */}
      <div className="text-white pt-12 pb-8">
        <div className="flex items-center justify-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 w-auto filter brightness-0 invert" />
        </div>
      </div>

      {/* Main content card exactly matching screenshot */}
      <div className="flex-1 flex items-start justify-center px-6 pt-4">
        <Card className="w-full max-w-sm bg-white rounded-xl shadow-lg">
          <CardContent className="p-0">
            {/* Biometric Login Section - exact layout */}
            <div className="text-center pt-8 pb-6 px-6">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <img src="/Icons_Fingerprint.svg" alt="Fingerprint" className="w-12 h-12 opacity-60" />
              </div>
              <h2 className="text-lg font-normal text-gray-700 mb-6">Biometric login</h2>
              
              <Button 
                className="w-full text-white font-medium py-3 rounded-lg mb-4" 
                style={{ backgroundColor: 'var(--boi-teal)' }}
                onClick={() => {
                  setCustomerNumber("12345678");
                  setPin("1234");
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }}
              >
                Log in
              </Button>

              <div className="text-center mb-6">
                <Button variant="link" className="text-sm p-0 font-normal" style={{ color: 'var(--boi-teal)' }}>
                  Forgot your PIN? →
                </Button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <Button 
                  variant="ghost" 
                  className="w-full py-3 hover:bg-gray-50 text-left justify-start font-normal"
                  style={{ color: 'var(--boi-teal)' }}
                >
                  <User className="w-4 h-4 mr-3" />
                  Log in with another ID
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section with options - matching screenshot */}
      <div className="px-6 pb-8">
        <div className="space-y-3">
          <div className="flex items-center p-4 bg-white/90 rounded-xl backdrop-blur-sm">
            <div className="w-8 h-8 mr-4 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-sm">💳</span>
            </div>
            <span className="text-gray-800 font-medium flex-1">Use your PIN instead</span>
            <span className="text-gray-400">›</span>
          </div>
          
          <div className="flex items-center p-4 bg-white/90 rounded-xl backdrop-blur-sm">
            <div className="w-8 h-8 mr-4 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-sm">⏱</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-800 font-medium">Waiting for your approval</div>
              <div className="text-sm text-gray-500">Tap here to complete any unfinished actions</div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </div>
      </div>

      {/* Bottom navigation - matching screenshot */}
      <div className="bg-gray-700/80 backdrop-blur-sm">
        <div className="flex items-center justify-around py-3 px-4">
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1">
              <span className="text-white text-lg">📍</span>
            </div>
            <span className="text-white text-xs">ATM/Branch</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1">
              <span className="text-white text-lg">🛡</span>
            </div>
            <span className="text-white text-xs">Security</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1">
              <span className="text-white text-lg">⋯</span>
            </div>
            <span className="text-white text-xs">More</span>
          </div>
        </div>
      </div>

      {/* Background scenic overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 pointer-events-none">
        <img src="/background.jpg" alt="" className="w-full h-full object-cover object-top" />
      </div>

      {/* Hidden demo form for testing */}
      <form onSubmit={handleSubmit} className="hidden">
        <Input
          value={customerNumber}
          onChange={(e) => setCustomerNumber(e.target.value)}
        />
        <Input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <Button type="submit" disabled={isLoading}>
          Login
        </Button>
      </form>
    </div>
  );
}