import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Building2, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateUKSortCode, formatSortCode, validateUKAccountNumber } from "../utils/bankValidation";
import { getAccounts, processTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";

const ukTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  accountNumber: z.string().regex(/^[0-9]{8}$/, "Account number must be 8 digits"),
  sortCode: z.string().regex(/^[0-9]{6}$/, "Sort code must be 6 digits"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account")
});

type UkTransferData = z.infer<typeof ukTransferSchema>;

export default function UkTransfer() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [identifiedBank, setIdentifiedBank] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Verifying transfer details...');
  const [formData, setFormData] = useState<UkTransferData | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0.85);
  const [gbpAmount, setGbpAmount] = useState<string>('0.00');
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Animation helper function
  const getAnimationClass = () => {
    if (isTransitioning) {
      return slideDirection === 'out' ? 'transfer-slide-out-left' : 'transfer-slide-in-right';
    }
    return slideDirection === 'in' ? 'transfer-slide-in-right' : '';
  };

  const form = useForm<UkTransferData>({
    resolver: zodResolver(ukTransferSchema),
    defaultValues: {
      recipientName: '',
      accountNumber: '',
      sortCode: '',
      amount: '',
      reference: '',
      fromAccount: ''
    }
  });

  const [accounts, setAccounts] = useState<any[]>([]);

  // Fetch real-time exchange rate
  const fetchExchangeRate = async () => {
    try {
      const apiKey = import.meta.env.VITE_EXCHANGERATE_API_KEY;
      if (!apiKey) {
        console.log('No API key provided, using default rate');
        return;
      }
      
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`);
      const data = await response.json();
      
      if (data.result === 'success') {
        const rate = data.conversion_rates.GBP;
        setExchangeRate(rate);
        
        const currentAmount = formData?.amount || form.getValues('amount');
        if (currentAmount) {
          const converted = (parseFloat(currentAmount) * rate).toFixed(2);
          setGbpAmount(converted);
        }
      }
    } catch (error) {
      console.log('Exchange rate fetch failed, using default rate');
    }
  };

  useEffect(() => {
    const loadAccounts = () => {
      // Ensure there's a current user
      let currentUser = UserDataManager.getCurrentUser();
      if (!currentUser) {
        currentUser = '12345678';
        UserDataManager.setCurrentUser(currentUser);
        
        if (!UserDataManager.userExists(currentUser)) {
          UserDataManager.registerUser({
            customerNumber: currentUser,
            name: 'Demo User',
            email: 'demo@boi.ie',
            phone: '+353 1 234 5678',
            joinDate: new Date().toISOString().split('T')[0],
            dateCreated: new Date().toISOString()
          });
        }
      }
      
      // Load or initialize accounts with proper default data
      let userAccounts = UserDataManager.getUserData('bankAccounts', null);
      if (!userAccounts || userAccounts.length === 0) {
        const defaultAccounts = [
          { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "2432.67", accountType: "current" },
          { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "-156.23", accountType: "credit" },
          { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "1876.45", accountType: "savings" },
        ];
        UserDataManager.setUserData('bankAccounts', defaultAccounts);
        userAccounts = defaultAccounts;
      }
      
      setAccounts(userAccounts);
    };
    
    loadAccounts();
    
    // Check for selected payee from Recent Payees
    const selectedPayeeData = sessionStorage.getItem('selectedPayee');
    if (selectedPayeeData) {
      try {
        const payee = JSON.parse(selectedPayeeData);
        if (payee.transferType === 'UK Transfer' && payee.accountInfo) {
          const [sortCode, accountNumber] = payee.accountInfo.split(' ');
          
          form.setValue('recipientName', payee.name);
          form.setValue('sortCode', sortCode.replace(/-/g, ''));
          form.setValue('accountNumber', accountNumber);
          
          sessionStorage.removeItem('selectedPayee');
        }
      } catch (error) {
        console.error('Error parsing selected payee data:', error);
        sessionStorage.removeItem('selectedPayee');
      }
    }
  }, []);

  const onSubmit = async (data: UkTransferData) => {
    setFormData(data);
    
    // Animate transition to confirm step
    setIsTransitioning(true);
    setSlideDirection('out');
    
    // Fetch exchange rate during transition
    await fetchExchangeRate();
    
    setTimeout(() => {
      setStep('confirm');
      setSlideDirection('in');
      setIsTransitioning(false);
    }, 300);
  };

  const executeTransfer = async () => {
    if (!formData) return;
    
    const ref = generateReference();
    setTransferReference(ref);
    
    await fetchExchangeRate();
    
    const success = processTransfer(
      formData.fromAccount,
      parseFloat(formData.amount),
      formData.recipientName,
      'UK',
      ref,
      exchangeRate,
      {
        accountNumber: formData.accountNumber,
        sortCode: formData.sortCode
      }
    );
    
    if (!success) {
      console.error('Transfer failed');
      return;
    }

    // Animate transition to success step
    setIsTransitioning(true);
    setSlideDirection('out');
    
    setTimeout(() => {
      setStep('success');
      setSlideDirection('in');
      setIsTransitioning(false);
      setShowReference(false);
      setAnimationProgress(0);
    }, 300);
    
    // Professional banking stages during 5-second animation
    const stages = [
      'Verifying transfer details...',
      'Authenticating transaction...',
      'Connecting to UK banking network...',
      'Securing transfer protocol...',
      'Finalizing payment...'
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
          setShowReference(true);
          
          const payee = {
            name: formData.recipientName,
            accountInfo: `${formatSortCode(formData.sortCode)} ${formData.accountNumber}`,
            transferType: 'UK Transfer',
            timestamp: new Date().toISOString()
          };
          UserDataManager.addRecentPayee(payee);
          
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  if (step === 'success') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f9fafb'
      }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Complete
          </span>
        </div>

        <div className="px-4 py-4">
          <div className="text-center max-w-sm mx-auto">
            {!showReference ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-xl">
                <div className="space-y-8">
                  <div className="relative">
                    <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Processing Transfer
                    </h1>
                    <p className="text-lg text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {processingStage}
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="w-full bg-white rounded-full h-4 overflow-hidden shadow-inner border border-gray-200">
                      <div 
                        className="bg-gradient-to-r from-[#126987] via-[#5a7b85] to-[#126987] h-4 rounded-full transition-all duration-300 ease-out shadow-sm relative"
                        style={{ width: `${animationProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-xl font-semibold text-[#126987]" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {Math.round(animationProgress)}% Complete
                    </p>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Secure Connection Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Your transfer is being processed through Bank of Ireland's secure payment network with 256-bit encryption
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h1>
                
                <p className="text-gray-600 mb-8" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your UK bank transfer has been completed successfully.
                </p>
                
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left animate-fade-in">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{formData?.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Recipient:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.recipientName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
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

  if (step === 'confirm') {
    const formData = form.getValues();
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);

    return (
      <div className={`transfer-screen ${getAnimationClass()}`} style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f9fafb'
      }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => {
            setIsTransitioning(true);
            setSlideDirection('out');
            setTimeout(() => {
              setStep('form');
              setSlideDirection('in');
              setIsTransitioning(false);
            }, 300);
          }} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Confirm Transfer</span>
          </button>
        </div>

        <div className="px-4 py-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>From:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {selectedAccount?.displayName} {selectedAccount?.accountNumber}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData.recipientName}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <div className="text-right">
                  <span className="font-semibold text-gray-900 block" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{formData.amount}</span>
                  <p className="text-sm text-green-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    ≈ £{(parseFloat(formData.amount) * exchangeRate).toFixed(2)} GBP
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData.reference}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Transfer Reference:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                UK Bank Transfer
              </p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                This transfer will be processed within 1-2 business days due to international banking regulations.
              </p>
            </div>
          </div>

          <button
            onClick={executeTransfer}
            className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-container page-fade-in transfer-screen-container ${getAnimationClass()}`} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f9fafb'
    }}>
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/payments')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>UK Bank Transfer</span>
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        padding: '1rem'
      }}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#126987] to-[#5a7b85] rounded-xl flex items-center justify-center mr-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>UK Bank Transfer</h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Instant transfer via Faster Payments</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                <CreditCard className="w-4 h-4 inline mr-2" />
                From Account
              </label>
              <select
                {...form.register('fromAccount')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Select account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} {account.accountNumber} - €{account.balance}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.fromAccount.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                <Building className="w-4 h-4 inline mr-2" />
                Recipient Details
              </label>
              <div className="space-y-3">
                <input
                  {...form.register('recipientName')}
                  placeholder="Recipient name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
                {form.formState.errors.recipientName && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{form.formState.errors.recipientName.message}</p>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      {...form.register('sortCode')}
                      placeholder="Sort Code"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                      onChange={(e) => {
                        const formatted = formatSortCode(e.target.value);
                        e.target.value = formatted;
                        
                        const cleanCode = e.target.value.replace(/\D/g, '');
                        form.setValue('sortCode', cleanCode);
                        
                        if (cleanCode.length === 6) {
                          const bank = validateUKSortCode(cleanCode);
                          setIdentifiedBank(bank || '');
                        } else {
                          setIdentifiedBank('');
                        }
                      }}
                    />
                    {form.formState.errors.sortCode && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{form.formState.errors.sortCode.message}</p>
                    )}
                    {identifiedBank && (
                      <p className="text-green-600 text-xs mt-1 font-medium">
                        Bank: {identifiedBank}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <input
                      {...form.register('accountNumber')}
                      placeholder="Account Number"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    />
                    {form.formState.errors.accountNumber && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{form.formState.errors.accountNumber.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Transfer Details
              </label>
              <div className="space-y-3">
                <input
                  {...form.register('amount')}
                  placeholder="Amount (EUR)"
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
                {form.formState.errors.amount && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{form.formState.errors.amount.message}</p>
                )}
                
                <input
                  {...form.register('reference')}
                  placeholder="Payment reference"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
                {form.formState.errors.reference && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{form.formState.errors.reference.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}