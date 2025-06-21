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

  // Check if user is already verified
  useEffect(() => {
    const isVerified = localStorage.getItem('boi-otc-verified');
    if (isVerified === 'true') {
      onVerified();
      return;
    }

    // Generate new OTC for each login attempt
    generateNewOTCForLoginAttempt();
  }, []);

  // Generate new OTC every time someone tries to log in
  const generateNewOTCForLoginAttempt = async () => {
    try {
      const response = await fetch('/api/admin/generate-otc-for-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          reason: 'login_attempt',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Send new OTC to admin via email automatically
        console.log('%c🔐 NEW LOGIN ATTEMPT - OTC GENERATED', 'color: #ff6b6b; font-weight: bold; font-size: 14px');
        console.log('%cNew OTC:', 'color: #4ecdc4; font-weight: bold', data.otc);
        console.log('%cValid until:', 'color: #45b7d1; font-weight: bold', new Date(data.expiresAt).toLocaleString());
        console.log('%cEmail sent to admin:', 'color: #ffa500; font-weight: bold', data.emailSent ? 'Yes' : 'No');
      }
    } catch (error) {
      console.log('Failed to generate new OTC for login attempt:', error);
    }
  };

  // Future webhook method (placeholder for admin)
  const sendOTCWebhook = async (otcCode: string, expiresAt: string) => {
    // Replace this URL with your webhook endpoint
    const webhookUrl = 'https://your-webhook-endpoint.com/otc-delivery';
    
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otc: otcCode,
          expiresAt,
          timestamp: new Date().toISOString(),
          app: 'BOI Mobile Banking'
        })
      });
    } catch (error) {
      console.log('Webhook delivery failed, falling back to console:', error);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="w-full max-w-md px-6">
        <Card className="border-0 shadow-2xl bg-white/95 dark:bg-black/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Sorry, WHERE isn't available right now.
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please enter your one-time access code to continue
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter access code"
                    value={otc}
                    onChange={(e) => setOtc(e.target.value.toUpperCase())}
                    className="pl-10 text-center font-mono text-lg tracking-wider"
                    maxLength={8}
                    disabled={isSubmitting || isLocked}
                    autoFocus
                  />
                </div>
                
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                )}
                
                {attempts > 0 && attempts < 5 && !error.includes('Invalid') && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
                    {attempts} failed attempt{attempts !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#126987] hover:bg-[#0e5a75] text-white"
                disabled={isSubmitting || isLocked || !otc.trim()}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </div>
                ) : isLocked ? (
                  'Access Locked'
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
            

          </CardContent>
        </Card>
      </div>
    </div>
  );
}