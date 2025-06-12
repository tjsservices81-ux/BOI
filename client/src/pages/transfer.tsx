import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, PiggyBank, ChevronDown, Send, Info, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Account, TransferRequest } from "@shared/schema";

export default function Transfer() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [recipient, setRecipient] = useState("");
  const [iban, setIban] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Verifying transfer details...');
  const [transferReference, setTransferReference] = useState<string>('');

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.id],
    enabled: !!user,
  });

  const transferMutation = useMutation({
    mutationFn: async (transferData: TransferRequest) => {
      const response = await apiRequest("POST", "/api/transfer", transferData);
      return response.json();
    },
    onSuccess: (data) => {
      // Generate transfer reference
      const ref = `BOI${Math.random().toString(36).substr(2, 9).toUpperCase()}${Date.now().toString().slice(-6)}`;
      setTransferReference(ref);
      
      // Start animation sequence
      setStep('processing');
      setShowReference(false);
      setAnimationProgress(0);
      
      // Professional banking stages during 5-second animation
      const stages = [
        'Verifying transfer details...',
        'Authenticating transaction...',
        'Processing payment...',
        'Updating account balances...',
        'Transfer completed successfully'
      ];
      
      let stageIndex = 0;
      
      const interval = setInterval(() => {
        setAnimationProgress(prev => {
          const newProgress = prev + 2; // 2% every 100ms = 5 seconds
          
          // Update stage message every 20% (1 second)
          const newStageIndex = Math.floor(newProgress / 20);
          if (newStageIndex !== stageIndex && newStageIndex < stages.length) {
            stageIndex = newStageIndex;
            setProcessingStage(stages[newStageIndex]);
          }
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setShowReference(true);
            setStep('success');
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            return 100;
          }
          return newProgress;
        });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "An error occurred while processing your transfer.",
        variant: "destructive",
      });
    },
  });

  const selectedAccount = accounts.find(acc => acc.id.toString() === selectedAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !recipient || !iban || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      fromAccountId: parseInt(selectedAccountId),
      toAccount: recipient,
      iban,
      amount,
      reference: reference || undefined,
    });
  };

  // Processing animation screen
  if (step === 'processing') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-center space-y-8 px-8 max-w-md w-full">
          {/* Bank of Ireland Professional Logo Area */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          
          {/* Professional Transfer Processing Header */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Processing Transfer
            </h1>
            <p className="text-lg text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {processingStage}
            </p>
          </div>

          {/* Professional Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#126987] to-[#1e7a96] rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${animationProgress}%` }}
            ></div>
          </div>

          {/* Progress Percentage */}
          <div className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            {Math.round(animationProgress)}% Complete
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span style={{ fontFamily: 'OpenSans, sans-serif' }}>Secured by 256-bit encryption</span>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Complete
          </span>
        </div>

        {showReference && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              {/* Success Message */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h1>
                <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your transfer has been completed successfully
                </p>
              </div>

              {/* Transfer Details */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                  <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                  <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                  <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button 
                  onClick={() => navigate('/')}
                  className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Back to Dashboard
                </button>
                <button 
                  onClick={() => {
                    setStep('form');
                    setSelectedAccountId('');
                    setRecipient('');
                    setIban('');
                    setAmount('');
                    setReference('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  New Transfer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="text-[var(--boi-gray)]" />
          </Button>
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Transfer Money</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* From Account */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">From Account</h3>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account">
                  {selectedAccount && (
                    <div className="flex items-center">
                      <PiggyBank className="text-[var(--boi-green)] mr-3" />
                      <div>
                        <p className="font-medium text-[var(--boi-gray)]">{selectedAccount.displayName}</p>
                        <p className="text-sm text-[var(--boi-light-gray)]">
                          Available: €{parseFloat(selectedAccount.balance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center">
                      <PiggyBank className="text-[var(--boi-green)] mr-3" />
                      <div>
                        <p className="font-medium">{account.displayName}</p>
                        <p className="text-sm text-gray-500">€{parseFloat(account.balance).toFixed(2)}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* To */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">To</h3>
            <div>
              <Label htmlFor="recipient">Recipient Name</Label>
              <Input
                id="recipient"
                type="text"
                placeholder="Recipient name or account"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                type="text"
                placeholder="IE29 AIBK 9311 5212 3456 78"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Amount */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Amount</h3>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--boi-gray)] font-medium">€</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg font-medium focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
            <div>
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                type="text"
                placeholder="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-[var(--boi-green)] hover:bg-[var(--boi-dark-green)] text-white font-medium py-3 px-4 transition-colors duration-200 mb-4"
          disabled={transferMutation.isPending}
        >
          {transferMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            <span className="flex items-center justify-center">
              <Send className="mr-2" />
              Send Transfer
            </span>
          )}
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Security Notice</p>
            <p className="text-sm">Transfers are processed securely with 256-bit encryption. Large transfers may require additional verification.</p>
          </AlertDescription>
        </Alert>
      </form>

      <BottomNavigation />
    </div>
  );
}
