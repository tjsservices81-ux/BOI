import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { University, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen flex flex-col justify-center p-6 bg-gray-50">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex justify-center">
          <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-16 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--boi-gray)] mb-2" style={{ fontFamily: 'BlueMagic, OpenSans, sans-serif' }}>Bank of Ireland</h1>
        <p className="text-[var(--boi-light-gray)]">Secure Mobile Banking</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customerNumber" className="text-sm font-medium text-[var(--boi-gray)] mb-2">
                Customer Number
              </Label>
              <Input
                id="customerNumber"
                type="text"
                placeholder="Enter customer number"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>

            <div>
              <Label htmlFor="pin" className="text-sm font-medium text-[var(--boi-gray)] mb-2">
                Digital PIN
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Demo login: Customer Number: 12345678, PIN: 1234
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[var(--boi-green)] hover:bg-[var(--boi-dark-green)] text-white font-medium py-3 px-4 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                "Sign In Securely"
              )}
            </Button>

            <div className="text-center">
              <Button variant="ghost" className="text-[var(--boi-green)] hover:text-[var(--boi-dark-green)] text-sm font-medium">
                Forgot your PIN?
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-[var(--boi-light-gray)]">
        <p>Your security is our priority. This app uses bank-level encryption.</p>
      </div>
    </div>
  );
}
