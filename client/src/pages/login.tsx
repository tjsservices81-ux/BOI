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
      {/* Header - minimal top padding for status bar */}
      <div className="text-white pt-8 pb-4">
        <div className="flex items-center justify-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 w-auto filter brightness-0 invert" />
        </div>
      </div>

      {/* Main content - centered card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white rounded-lg shadow-lg max-h-[70vh]">
          <CardContent className="p-6 overflow-y-auto max-h-full">
            {/* Biometric Login Section */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <img src="/Icons_Fingerprint.svg" alt="Fingerprint" className="w-16 h-16" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Biometric login</h2>
            </div>

            <Button 
              className="w-full text-white font-medium py-3 mb-4 rounded-lg" 
              style={{ backgroundColor: 'var(--boi-teal)' }}
            >
              Log in
            </Button>

            <div className="text-center mb-4">
              <Button variant="link" className="text-sm p-0" style={{ color: 'var(--boi-teal)' }}>
                Forgot your PIN? →
              </Button>
            </div>

            <div className="border-t pt-4 mb-4">
              <Button 
                variant="ghost" 
                className="w-full py-2 mb-3 hover:bg-gray-50 text-left justify-start"
                style={{ color: 'var(--boi-teal)' }}
              >
                <User className="w-4 h-4 mr-3" />
                Log in with another ID
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 mr-3 rounded flex items-center justify-center bg-gray-200">
                  <span className="text-xs">🔐</span>
                </div>
                <span className="text-gray-700">Use your PIN instead</span>
                <span className="ml-auto text-gray-400">›</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 mr-3 rounded flex items-center justify-center bg-gray-200">
                  <span className="text-xs">⏳</span>
                </div>
                <div className="flex-1">
                  <div className="text-gray-700">Waiting for your approval</div>
                  <div className="text-xs text-gray-500">Tap here to complete any unfinished actions</div>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            </div>

            {/* Demo login form for testing */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t pt-4">
              <div className="text-xs text-gray-500 text-center mb-3">Demo Login (for testing)</div>
              <div>
                <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700">
                  Customer Number
                </Label>
                <Input
                  id="customerNumber"
                  type="text"
                  placeholder="12345678"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
                  Digital PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full text-white font-medium py-2 rounded-lg"
                style={{ backgroundColor: 'var(--boi-teal)' }}
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Demo Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bottom area for scenic background */}
      <div className="h-24 relative">
        <div className="absolute inset-0 opacity-20">
          <img src="/background.jpg" alt="" className="w-full h-full object-cover object-top" />
        </div>
      </div>
    </div>
  );
}