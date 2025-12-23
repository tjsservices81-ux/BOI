import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, CreditCard, User, Mail, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAccounts, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, getCurrencySymbol, type Currency } from "../utils/currencyUtils";

const emailTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  recipientEmail: z.string().email("Valid email is required"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account")
});

type EmailTransferData = z.infer<typeof emailTransferSchema>;

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  type: string;
}

export default function EmailTransfer() {
  const [, navigate] = useLocation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'cancelled'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Verifying transfer details...');
  const [formData, setFormData] = useState<EmailTransferData | null>(null);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  const [isAccountDeleted, setIsAccountDeleted] = useState<boolean>(false);

  const form = useForm<EmailTransferData>({
    resolver: zodResolver(emailTransferSchema),
    defaultValues: {
      recipientName: '',
      recipientEmail: '',
      amount: '',
      reference: '',
      fromAccount: ''
    }
  });

  useEffect(() => {
    const checkAccountStatus = async () => {
      const customerNumber = UserDataManager.getCurrentUser();
      if (!customerNumber) return;
      
      try {
        const response = await fetch(`/api/customers/${customerNumber}/exists`, {
          credentials: 'include'
        });
        
        if (response.status === 404 || response.status === 410) {
          setIsAccountDeleted(true);
        }
      } catch (error) {
        console.error('Failed to check account status:', error);
      }
    };
    
    checkAccountStatus();
  }, []);

  useEffect(() => {
    const loadAccounts = () => {
      UserDataManager.clearCache('bankAccounts');
      const userAccounts = UserDataManager.getUserData('bankAccounts', []) || [];
      setAccounts(userAccounts);
      
      if (userAccounts.length > 0 && !form.getValues('fromAccount')) {
        form.setValue('fromAccount', userAccounts[0].id.toString());
      }
    };
    
    loadAccounts();
    setUserCurrency(getUserCurrency());
    
    const handleAccountsUpdate = (event: CustomEvent) => {
      const { accounts: updatedAccounts } = event.detail || {};
      if (updatedAccounts) {
        setAccounts(updatedAccounts);
      }
    };

    window.addEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
    window.addEventListener('balanceUpdate', handleAccountsUpdate as EventListener);
    
    const selectedFromAccountData = sessionStorage.getItem('selectedFromAccount');
    if (selectedFromAccountData) {
      form.setValue('fromAccount', selectedFromAccountData);
      sessionStorage.removeItem('selectedFromAccount');
    }
    
    return () => {
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('balanceUpdate', handleAccountsUpdate as EventListener);
    };
  }, []);

  const onSubmit = (data: EmailTransferData) => {
    if (isAccountDeleted) {
      alert('Account Deleted');
      return;
    }
    setFormData(data);
    setStep('confirm');
  };

  const executeTransfer = async () => {
    if (!formData) return;
    
    const selectedAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
    const transferAmount = parseFloat(formData.amount);
    
    if (!selectedAccount || parseFloat(selectedAccount.balance) < transferAmount) {
      setStep('cancelled');
      return;
    }
    
    const ref = generateReference();
    setTransferReference(ref);
    
    setStep('success');
    setShowReference(false);
    setAnimationProgress(0);
    
    const stages = [
      'Verifying transfer details...',
      'Authenticating transaction...',
      'Processing payment...',
      'Sending confirmation...',
      'Finalizing transfer...'
    ];
    
    let stageIndex = 0;
    
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        const newProgress = prev + 2;
        
        const newStageIndex = Math.floor(newProgress / 20);
        if (newStageIndex !== stageIndex && newStageIndex < stages.length) {
          stageIndex = newStageIndex;
          setProcessingStage(stages[newStageIndex]);
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          
          (async () => {
            try {
              const transferSuccess = await processConfirmedTransfer(
                `EMAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                formData.fromAccount,
                parseFloat(formData.amount),
                formData.recipientName,
                'EMAIL',
                formData.reference || ref,
                undefined,
                { email: formData.recipientEmail },
                formData.recipientEmail
              );
              
              if (transferSuccess) {
                const payee = {
                  name: formData.recipientName,
                  accountInfo: formData.recipientEmail,
                  transferType: 'Email Transfer',
                  reference: formData.reference || '',
                  timestamp: new Date().toISOString()
                };
                UserDataManager.addRecentPayee(payee);
                
                window.dispatchEvent(new CustomEvent('transactionUpdate'));
                window.dispatchEvent(new CustomEvent('balanceUpdate'));
                
                setShowReference(true);
              }
            } catch (error) {
              console.error('Email Transfer processing failed:', error);
            }
          })();
          
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  if (step === 'success') {
    return (
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ backgroundColor: '#f9fafb' }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-white" data-testid="button-back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Email Transfer
          </h1>
          <div className="w-6"></div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            {showReference && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                
                <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h1>
                
                <p className="text-gray-600 mb-4 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your email transfer has been processed successfully
                </p>
              </>
            )}

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
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '2rem',
                paddingTop: '25vh'
              }}>
                <div className="text-center max-w-sm w-full">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Processing Transfer
                    </h1>
                    <p className="text-base text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {processingStage}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="w-full bg-white rounded-full h-4 overflow-hidden shadow-inner border border-gray-200">
                      <div 
                        className="bg-gradient-to-r from-[#126987] via-[#5a7b85] to-[#126987] h-4 rounded-full transition-all duration-300 ease-out shadow-sm relative"
                        style={{ width: `${animationProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-[#126987] mt-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {animationProgress}%
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 text-sm">Sending</span>
                      <span className="font-bold text-lg text-gray-900">{getCurrencySymbol(userCurrency)}{formData?.amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">To</span>
                      <span className="font-medium text-gray-900">{formData?.recipientName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                    <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {getCurrencySymbol(userCurrency)}{formData?.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Recipient:</span>
                    <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {formData?.recipientName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Email:</span>
                    <span className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {formData?.recipientEmail}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                    <span className="font-mono text-sm text-[#126987]" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {transferReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Status:</span>
                    <span className="text-green-600 font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Complete
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      <strong>Email Transfer:</strong> Recipient will receive payment notification at their email address.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    data-testid="button-back-dashboard"
                  >
                    Back to Dashboard
                  </button>
                  <button 
                    onClick={() => {
                      setStep('form');
                      form.reset();
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    data-testid="button-new-transfer"
                  >
                    New Transfer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'cancelled') {
    return (
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ backgroundColor: '#f9fafb' }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-white" data-testid="button-back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Email Transfer
          </h1>
          <div className="w-6"></div>
        </div>
        
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Failed
            </h1>
            
            <p className="text-gray-600 mb-6 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Insufficient funds in your account to complete this transfer.
            </p>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </button>
              <button 
                onClick={() => setStep('form')}
                className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="button-try-again"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    const selectedAccount = accounts.find(acc => acc.id.toString() === formData?.fromAccount);
    
    return (
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ backgroundColor: '#f9fafb' }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('form')} className="text-white" data-testid="button-back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Confirm Transfer
          </h1>
          <div className="w-6"></div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Review Transfer Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>From Account</span>
                <span className="font-medium text-gray-900 text-right" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {selectedAccount?.displayName}<br/>
                  <span className="text-sm text-gray-500">{selectedAccount?.accountNumber}</span>
                </span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Recipient Name</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formData?.recipientName}
                </span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Recipient Email</span>
                <span className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formData?.recipientEmail}
                </span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount</span>
                <span className="font-bold text-xl text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {getCurrencySymbol(userCurrency)}{formData?.amount}
                </span>
              </div>
              
              <div className="flex justify-between py-3">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formData?.reference}
                </span>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <button 
                onClick={executeTransfer}
                className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="button-confirm-transfer"
              >
                Confirm Transfer
              </button>
              
              <button 
                onClick={() => setStep('form')}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold active:scale-98 transition-transform"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="button-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ backgroundColor: '#f9fafb' }}>
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/payments')} className="text-white" data-testid="button-back">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-semibold text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Email Transfer
        </h1>
        <div className="w-6"></div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                <CreditCard className="w-4 h-4 inline mr-2" />
                From Account
              </label>
              <select
                {...form.register('fromAccount')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="select-from-account"
              >
                <option value="">Select account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} {account.accountNumber} - {formatCurrency(account.balance, userCurrency)}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.fromAccount.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                <User className="w-4 h-4 inline mr-2" />
                Recipient Name
              </label>
              <input
                {...form.register('recipientName')}
                type="text"
                placeholder="Enter recipient's full name"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="input-recipient-name"
              />
              {form.formState.errors.recipientName && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.recipientName.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                <Mail className="w-4 h-4 inline mr-2" />
                Recipient Email
              </label>
              <input
                {...form.register('recipientEmail')}
                type="email"
                placeholder="recipient@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="input-recipient-email"
              />
              {form.formState.errors.recipientEmail && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.recipientEmail.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount ({userCurrency})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  {getCurrencySymbol(userCurrency)}
                </span>
                <input
                  {...form.register('amount')}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  data-testid="input-amount"
                />
              </div>
              {form.formState.errors.amount && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Payment Reference
              </label>
              <input
                {...form.register('reference')}
                type="text"
                placeholder="e.g., Invoice #123"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                data-testid="input-reference"
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform shadow-lg"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
            data-testid="button-continue"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
