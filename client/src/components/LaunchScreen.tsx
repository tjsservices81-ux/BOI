import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';

interface LaunchScreenProps {
  onVerified: () => void;
}

export function LaunchScreen({ onVerified }: LaunchScreenProps) {
  const [otc, setOtc] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [currentCode, setCurrentCode] = useState('Loading...');
  const [codeExpiry, setCodeExpiry] = useState('');

  // Check if user is already verified
  useEffect(() => {
    const isVerified = localStorage.getItem('boi-otc-verified');
    if (isVerified === 'true') {
      onVerified();
      return;
    }

    // Load current OTC code to display
    loadCurrentCode();
  }, []);

  // Load and display current OTC code
  const loadCurrentCode = async () => {
    try {
      const response = await fetch('/api/admin/current-otc', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentCode(data.otc);
        setCodeExpiry(new Date(data.expiresAt).toLocaleString());
      }
    } catch (error) {
      setCurrentCode('Error loading code');
    }
  };

  // Generate new OTC code
  const generateNewCode = async () => {
    try {
      const response = await fetch('/api/admin/generate-otc-for-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          reason: 'manual_generation',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentCode(data.otc);
        setCodeExpiry(new Date(data.expiresAt).toLocaleString());
      }
    } catch (error) {
      console.log('Failed to generate new code:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError('Too many failed attempts. Please wait before trying again.');
      return;
    }

    if (!otc.trim()) {
      setError('Please enter the one-time code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/verify-otc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otc: otc.trim() })
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        // Store verification in localStorage
        localStorage.setItem('boi-otc-verified', 'true');
        localStorage.setItem('boi-otc-verified-at', new Date().toISOString());
        
        // Trigger success animation and proceed
        setTimeout(onVerified, 500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          setIsLocked(true);
          setError('Too many failed attempts. Access temporarily locked.');
          
          // Auto-unlock after 15 minutes
          setTimeout(() => {
            setIsLocked(false);
            setAttempts(0);
            setError('');
          }, 15 * 60 * 1000);
        } else {
          setError(`Invalid code. ${5 - newAttempts} attempts remaining.`);
        }
        
        setOtc('');
      }
    } catch (error) {
      setError('Connection error. Please check your internet connection.');
      console.error('OTC verification error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WHERE Access Portal</h1>
            <p className="text-gray-600 mt-2">Current access code displayed below</p>
          </div>
        </div>

        {/* Current Code Display */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-[#126987] to-[#0e5a75] text-white">
          <CardContent className="text-center py-8">
            <h2 className="text-lg font-semibold mb-4">Current Access Code</h2>
            <div className="text-4xl font-mono font-bold tracking-wider mb-2">
              {currentCode}
            </div>
            <p className="text-sm opacity-80 mb-4">Valid until: {codeExpiry}</p>
            <Button 
              onClick={generateNewCode}
              className="bg-white text-[#126987] hover:bg-gray-100"
            >
              Generate New Code
            </Button>
          </CardContent>
        </Card>

        {/* Visitor Code Entry */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600">Visitor Access</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="otc" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Code Provided
                </label>
                <Input
                  id="otc"
                  type="text"
                  value={otc}
                  onChange={(e) => setOtc(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className="text-center text-lg tracking-wider font-mono"
                  maxLength={8}
                  disabled={isSubmitting || isLocked}
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#126987] hover:bg-[#0e5a75] text-white"
                disabled={isSubmitting || isLocked}
              >
                {isSubmitting ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="text-center bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            Share the current access code with visitors to grant them access
          </p>
        </div>
      </div>
    </div>
  );
}