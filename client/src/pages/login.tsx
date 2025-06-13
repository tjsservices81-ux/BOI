import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerNumber.trim() || !pin.trim()) {
      toast({
        title: "Error",
        description: "Please enter both customer number and PIN",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate authentication
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const user = {
        id: 1,
        name: "John Doe",
        email: "john@example.com"
      };
      
      login(user);
      navigate("/dashboard");
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#126987] to-[#2d5a6b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Bank of Ireland Logo */}
        <div className="text-center mb-8">
          <img 
            src="/boi_logo.svg" 
            alt="Bank of Ireland" 
            className="h-12 mx-auto filter brightness-0 invert mb-4"
          />
          <h1 className="text-2xl font-bold text-white">
            Welcome to BOI Mobile
          </h1>
          <p className="text-white/80 mt-2">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700">
                Customer Number
              </Label>
              <Input
                id="customerNumber"
                type="text"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="mt-1"
                placeholder="Enter your customer number"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
                PIN
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1"
                placeholder="Enter your PIN"
                disabled={isLoading}
                maxLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#126987] hover:bg-[#0f5a73] text-white py-3 mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Secure banking powered by Bank of Ireland
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}