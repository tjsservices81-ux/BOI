import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ArrowLeft, PiggyBank, ChevronDown, Send, Info, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@shared/schema";
import { UserDataManager } from "@/utils/userDataManager";

export default function Transfer() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

    // Generate transfer reference
    const genRef = `BOI${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 5).toUpperCase()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    setTransferReference(genRef);
    
    // Process transfer locally
    processTransfer();
  };

  const processTransfer = () => {
    // Store transaction in local storage
    const transaction = {
      id: Date.now(),
      accountId: parseInt(selectedAccountId),
      amount: `-${parseFloat(amount).toFixed(2)}`,
      description: `Transfer to ${recipient}`,
      category: 'transfer',
      type: 'debit' as const,
      paymentMethod: 'Bank Transfer',
      reference: transferReference,
      timestamp: new Date().toISOString()
    };

    // Update account balance using UserDataManager
    const accounts = UserDataManager.getUserData('bankAccounts', []);
    const accountIndex = accounts.findIndex((acc: any) => acc.id === parseInt(selectedAccountId));
    if (accountIndex !== -1) {
      const currentBalance = parseFloat(accounts[accountIndex].balance);
      const newBalance = (currentBalance - parseFloat(amount)).toFixed(2);
      accounts[accountIndex].balance = newBalance;
      UserDataManager.setUserData('bankAccounts', accounts);
    }

    // Store transaction using UserDataManager
    const transactions = UserDataManager.getUserData('bankTransactions', []);
    transactions.push(transaction);
    UserDataManager.setUserData('bankTransactions', transactions);

    // Start processing animation
    setStep('processing');
    setAnimationProgress(0);
    
    // Professional banking stages during 5-second animation
    const stages = [
      'Verifying transfer details...',
      'Authenticating transaction...',
      'Processing payment...',
      'Updating account balances...',
      'Transfer completed successfully'
    ];
    
    let currentStage = 0;
    const totalDuration = 5000; // 5 seconds
    const progressInterval = 50; // Update every 50ms
    const totalSteps = totalDuration / progressInterval;
    let currentStep = 0;
    
    const animationTimer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setAnimationProgress(progress);
      
      // Update stage every 1 second
      const stageIndex = Math.floor((currentStep / totalSteps) * stages.length);
      if (stageIndex < stages.length && stageIndex !== currentStage) {
        currentStage = stageIndex;
        setProcessingStage(stages[stageIndex]);
      }
      
      if (currentStep >= totalSteps) {
        clearInterval(animationTimer);
        setStep('success');
        setShowReference(false);
        
        // Show success screen after 500ms
        setTimeout(() => {
          setShowReference(true);
        }, 500);
      }
    }, progressInterval);

    // Dispatch events for real-time updates
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { accountId: parseInt(selectedAccountId), newBalance: (parseFloat(selectedAccount?.balance || '0') - parseFloat(amount)).toFixed(2) }
    }));
    
    window.dispatchEvent(new CustomEvent('transactionAdded', {
      detail: { accountId: parseInt(selectedAccountId), transaction }
    }));
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

        {/* Full-screen professional processing animation */}
        {!showReference ? (
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
        ) : (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              {/* Success Message */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h2>
                <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your transfer has been processed successfully
                </p>
              </div>

              {/* Transfer Details */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                  <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{recipient}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                  <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                  <span className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                </div>
                {reference && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Your Reference:</span>
                    <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{reference}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-[#126987] hover:bg-[#0f5a73] text-white font-medium py-3 px-4 transition-colors duration-200"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    setStep('form');
                    setSelectedAccountId('');
                    setRecipient('');
                    setIban('');
                    setAmount('');
                    setReference('');
                    setShowReference(false);
                  }}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 transition-colors duration-200"
                >
                  Make Another Transfer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/dashboard')} className="mr-3">
            <ArrowLeft className="text-white" />
          </button>
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Money
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* From Account */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="from-account" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              From Account
            </Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <PiggyBank className="mr-2 h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>{account.displayName}</div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>{account.accountNumber}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{parseFloat(account.balance).toFixed(2)}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* To Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="recipient" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recipient Name
              </Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="iban" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                IBAN
              </Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="IE29 AIBK 9311 5212 3456 78"
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Amount & Reference */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount (€)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="reference" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Reference (Optional)
              </Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment reference"
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-[var(--boi-green)] hover:bg-[var(--boi-dark-green)] text-white font-medium py-3 px-4 transition-colors duration-200 mb-4"
        >
          <span className="flex items-center justify-center">
            <Send className="mr-2" />
            Send Transfer
          </span>
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Transfers are processed immediately. Please ensure all details are correct before submitting.
          </AlertDescription>
        </Alert>
      </form>

      <BottomNavigation />
    </div>
  );
}