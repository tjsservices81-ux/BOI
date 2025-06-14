import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onBiometricScan: () => void;
  onSignUp: () => void;
  isLoading: boolean;
}

export default function LoginForm({ onBiometricScan, onSignUp, isLoading }: LoginFormProps) {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [showPinLogin, setShowPinLogin] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerNumber || !pin) {
      toast({
        title: "Error",
        description: "Please enter both customer number and PIN",
        variant: "destructive",
      });
      return;
    }

    try {
      await login({ customerNumber, pin });
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!showPinLogin) {
    return (
      <div className="space-y-4">
        <Button
          onClick={onBiometricScan}
          className="w-full h-14 bg-[#126987] hover:bg-[#0f5a75] text-white rounded-xl font-semibold text-lg"
          disabled={isLoading}
        >
          Login with Biometrics
        </Button>

        <Button
          onClick={() => setShowPinLogin(true)}
          variant="outline"
          className="w-full h-14 border-[#126987] text-[#126987] hover:bg-[#126987]/10 rounded-xl font-semibold text-lg"
          disabled={isLoading}
        >
          Login with PIN
        </Button>

        <Button
          onClick={onSignUp}
          variant="ghost"
          className="w-full h-12 text-[#126987] hover:bg-[#126987]/10 rounded-xl font-medium"
          disabled={isLoading}
        >
          New Customer? Sign Up
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerNumber">Customer Number</Label>
            <Input
              id="customerNumber"
              type="text"
              value={customerNumber}
              onChange={(e) => setCustomerNumber(e.target.value)}
              placeholder="Enter your customer number"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              maxLength={6}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#126987] hover:bg-[#0f5a75] text-white rounded-xl font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <Button
            type="button"
            onClick={() => setShowPinLogin(false)}
            variant="ghost"
            className="w-full text-[#126987] hover:bg-[#126987]/10"
            disabled={isLoading}
          >
            Back to Biometric Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}