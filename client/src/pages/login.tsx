import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { University, Eye, EyeOff, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
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
    <div className="min-h-screen bg-gray-100 relative">
      {/* Header with gradient */}
      <div className="boi-header text-white p-4">
        <div className="flex items-center justify-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 w-auto filter brightness-0 invert" />
        </div>
      </div>

      {/* Main content matching real app */}
      <div className="px-4 py-8">
        <Card className="mx-auto max-w-sm">
          <CardContent className="p-6">
            {/* Biometric Login Section */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <img src="/Icons_Fingerprint.svg" alt="Fingerprint" className="w-12 h-12" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Biometric login</h2>
            </div>

            <Button className="w-full text-white font-medium py-3 mb-4" style={{ backgroundColor: 'var(--boi-teal)' }}>
              Log in
            </Button>

            <div className="text-center mb-4">
              <Button variant="link" className="text-sm" style={{ color: 'var(--boi-teal)' }}>
                Forgot your PIN? 
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button 
                variant="ghost" 
                className="w-full text-teal-600 hover:bg-teal-50 py-2 mb-2"
                onClick={() => {/* Show PIN login */}}
              >
                <span className="w-4 h-4 mr-2 flex items-center justify-center">👤</span>
                Log in with another ID
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 mr-3 rounded flex items-center justify-center">
                  <img src="/pass-font.svg" alt="PIN" className="w-4 h-4" />
                </div>
                <span className="text-gray-700">Use your PIN instead</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 mr-3 rounded flex items-center justify-center">
                  <img src="/response_icon.svg" alt="Approval" className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-gray-700">Waiting for your approval</div>
                  <div className="text-xs text-gray-500">Tap here to complete any unfinished actions</div>
                </div>
              </div>
            </div>

            {/* Demo login form (hidden by default) */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  className="focus:ring-2 focus:ring-teal-600 focus:border-transparent"
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
                  className="focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  required
                />
                <div className="mt-1 text-xs text-gray-500">
                  Demo: Customer Number: 12345678, PIN: 1234
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-white font-medium py-3"
                style={{ backgroundColor: 'var(--boi-teal)' }}
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md text-white" style={{ backgroundColor: 'var(--boi-teal)' }}>
        <div className="flex items-center justify-around py-3">
          <div className="flex flex-col items-center">
            <img src="/branch-locator.svg" alt="ATM/Branch" className="w-6 h-6 mb-1 filter brightness-0 invert" />
            <span className="text-xs">ATM/Branch</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/lock.svg" alt="Security" className="w-6 h-6 mb-1 filter brightness-0 invert" />
            <span className="text-xs">Security</span>
          </div>
          <div className="flex flex-col items-center">
            <img src="/more-prelogin-icon.svg" alt="More" className="w-6 h-6 mb-1 filter brightness-0 invert" />
            <span className="text-xs">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
