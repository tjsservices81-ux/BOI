import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAccounts, processTransfer, processSecureTransfer, checkTransferConfirmation, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, type Currency } from "../utils/currencyUtils";

const ibanTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  iban: z.string().min(1, "IBAN is required"),
  bicCode: z.string().min(1, "BIC code is required"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account")
});

type IbanTransferData = z.infer<typeof ibanTransferSchema>;


export default function IbanTransfer() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  const [step, setStep] = useState<'form' | 'confirm' | 'security' | 'success' | 'cancelled'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Verifying transfer details...');
  const [formData, setFormData] = useState<IbanTransferData | null>(null);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');

  const form = useForm<IbanTransferData>({
    resolver: zodResolver(ibanTransferSchema),
    defaultValues: {
      recipientName: '',
      iban: '',
      bicCode: '',
      amount: '',
      reference: '',
      fromAccount: ''
    }
  });

  const [accounts, setAccounts] = useState<any[]>([]);


  useEffect(() => {
    const loadAccounts = () => {
      UserDataManager.clearCache('bankAccounts');
      const userAccounts = UserDataManager.getUserData('bankAccounts', []);
      setAccounts(userAccounts);
      
      // Set default account selection if not already set
      if (userAccounts.length > 0 && !form.getValues('fromAccount')) {
        form.setValue('fromAccount', userAccounts[0].id.toString());
      }
    };
    
    loadAccounts();
    
    // Load user's currency preference
    setUserCurrency(getUserCurrency());
    
    // Listen for account updates from admin panel
    const handleAccountsUpdate = (event: CustomEvent) => {
      const { accounts: updatedAccounts } = event.detail || {};
      if (updatedAccounts) {
        setAccounts(updatedAccounts);
      }
    };

    window.addEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
    window.addEventListener('balanceUpdate', handleAccountsUpdate as EventListener);
    window.addEventListener('adminProfileUpdate', handleAccountsUpdate as EventListener);
    
    // Check for selected payee from Recent Payees
    const selectedPayeeData = sessionStorage.getItem('selectedPayee');
    if (selectedPayeeData) {
      try {
        const payee = JSON.parse(selectedPayeeData);
        if (payee.transferType === 'SEPA Transfer' && payee.accountInfo) {
          // Pre-fill form with payee data
          form.setValue('recipientName', payee.name);
          form.setValue('iban', payee.accountInfo);
          
          // Pre-fill BIC code if available
          if (payee.bicCode) {
            form.setValue('bicCode', payee.bicCode);
          }
          
          // Pre-fill reference if available
          if (payee.reference) {
            form.setValue('reference', payee.reference);
          }
          
          // Force update the form fields after a brief delay
          setTimeout(() => {
            // Update IBAN input field
            const ibanInput = document.querySelector('input[placeholder="IE29 AIBK 9311 5212 3456 78"]') as HTMLInputElement;
            if (ibanInput) {
              ibanInput.value = payee.accountInfo;
            }
            
            // Update BIC code input field
            const bicInput = document.querySelector('input[placeholder="BOFIIE2D"]') as HTMLInputElement;
            if (bicInput && payee.bicCode) {
              bicInput.value = payee.bicCode;
            }
            
            // Update recipient name input field
            const nameInput = document.querySelector('input[placeholder="Recipient full name"]') as HTMLInputElement;
            if (nameInput) {
              nameInput.value = payee.name;
            }
            
            // Update reference input field
            const referenceInput = document.querySelector('input[placeholder="Payment reference (optional)"]') as HTMLInputElement;
            if (referenceInput && payee.reference) {
              referenceInput.value = payee.reference;
            }
          }, 200);
          
          // Clear the session storage after using
          sessionStorage.removeItem('selectedPayee');
        }
      } catch (error) {
        console.error('Error parsing selected payee data:', error);
        sessionStorage.removeItem('selectedPayee');
      }
    }
    
    return () => {
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('balanceUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleAccountsUpdate as EventListener);
    };
  }, [form]);

  const onSubmit = (data: IbanTransferData) => {
    setFormData(data);
    setStep('confirm');
  };

  const executeTransfer = async () => {
    if (!formData) return;
    
    // Check if user has sufficient funds before processing
    const selectedAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
    const transferAmount = parseFloat(formData.amount);
    
    if (!selectedAccount || selectedAccount.balance < transferAmount) {
      // Show insufficient funds error immediately
      setStep('cancelled');
      return;
    }
    
    // Generate unique reference number
    const ref = generateReference();
    setTransferReference(ref);
    
    // Start processing animation
    setStep('success');
    setShowReference(false);
    setAnimationProgress(0);
    
    // Force animation to start immediately on all platforms
    setTimeout(() => {
      const animationElement = document.querySelector('.android-spinner-animation');
      if (animationElement) {
        (animationElement as HTMLElement).style.animationPlayState = 'running';
      }
    }, 100);
    
    // Professional banking stages during 5-second animation
    const stages = [
      'Verifying transfer details...',
      'Authenticating transaction...',
      'Connecting to SWIFT network...',
      'Securing transfer protocol...',
      'Finalizing payment...'
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
          
          // Process the transfer using the user's payment reference
          const transferSuccess = processConfirmedTransfer(
            `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            formData.fromAccount,
            parseFloat(formData.amount),
            formData.recipientName,
            'IBAN',
            formData.reference, // Use the user's input reference
            undefined, // No exchange rate for IBAN transfers
            {
              iban: formData.iban,
              bicCode: formData.bicCode
            }
          );
          
          if (transferSuccess) {
            // Add successful payee to recent payees
            const payee = {
              name: formData.recipientName,
              accountInfo: formData.iban,
              bicCode: formData.bicCode,
              transferType: 'SEPA Transfer',
              reference: formData.reference || '',
              timestamp: new Date().toISOString()
            };
            UserDataManager.addRecentPayee(payee);
            
            // Dispatch events to update all components
            window.dispatchEvent(new CustomEvent('transactionUpdate'));
            window.dispatchEvent(new CustomEvent('balanceUpdate'));
            
            setShowReference(true);
          }
          
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
        backgroundColor: '#f9fafb',
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'auto'
      }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Complete
          </span>
        </div>

        <div className="px-4 py-4" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="text-center max-w-sm mx-auto">
            {showReference && (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                
                <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h1>
                
                <p className="text-gray-600 mb-4 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your SEPA transfer has been processed successfully
                </p>
              </>
            )}

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
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '2rem',
                paddingTop: '25vh',
                touchAction: 'none',
                overscrollBehavior: 'none',
                WebkitOverflowScrolling: 'auto'
              }}>
                <div className="text-center max-w-sm w-full">
                  {/* Bank of Ireland Professional Logo Area */}
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  
                  {/* Professional Transfer Processing Header */}
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Processing Transfer
                    </h1>
                    <p className="text-base text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {processingStage}
                    </p>
                  </div>
                  
                  {/* Professional Progress Indicator */}
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
                      {Math.round(animationProgress)}% Complete
                    </p>
                  </div>
                  
                  {/* Secure Connection Active Status */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Secure Connection Active
                        </p>
                        <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Your transfer is being processed through Bank of Ireland's secure payment network with 256-bit encryption
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formatCurrency(formData?.amount || '0', userCurrency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.recipientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>IBAN:</span>
                      <span className="font-medium text-gray-700 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.iban}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>BIC Code:</span>
                      <span className="font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.bicCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Status:</span>
                      <span className="font-semibold text-green-600 flex items-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <Check className="w-4 h-4 mr-1" />
                        Complete
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Processing Time:</span>
                      <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        24 hours
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>SEPA Transfer:</strong> Transfers within the SEPA zone typically take 24 hours to complete.
                      </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-red-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>Important:</strong> This payment cannot be cancelled once sent.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show buttons only after reference is revealed */}
                <div className="flex space-x-3 mt-4">
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

  if (step === 'cancelled') {
    return (
      <div className="page-container page-fade-in" style={{ 
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
          <button onClick={() => setStep('form')} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Transfer Failed</span>
          </button>
        </div>

        <div className="px-4 py-6 flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Not enough balance to complete this transfer.
            </h1>
            
            <p className="text-gray-600 mb-6 text-sm leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Please check your account balance and try again.
            </p>

            <div className="flex space-x-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Back to Dashboard
              </button>
              <button 
                onClick={() => setStep('form')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm' && formData) {
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);

    return (
      <div className="page-container page-slide-in-right" style={{ 
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
          <button onClick={() => setStep('form')} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Confirm Transfer</span>
          </button>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: animationProgress > 0 ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '1rem'
        }}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>From:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedAccount?.displayName || 'Current Account'}
                  </p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedAccount?.accountNumber || 'Account ending in ****'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.recipientName}</p>
                  <p className="text-sm text-gray-500 break-all" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.iban}</p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <span className="font-semibold text-[#126987] text-xl" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formatCurrency(formData?.amount || '0', userCurrency)}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.reference}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                SEPA Transfer
              </p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                SEPA Transfer: Transfers within the SEPA zone typically take 24 hours to complete.
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
    <div className="page-container page-slide-in-right" style={{ 
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
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>SEPA Transfer</span>
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
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>SEPA Transfer</h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Send money within the SEPA zone</p>
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
                    {account.displayName} {account.accountNumber} - {formatCurrency(account.balance, userCurrency)}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.fromAccount.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recipient Name
              </label>
              <input
                {...form.register('recipientName')}
                type="text"
                placeholder="Enter recipient's full name"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.recipientName && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.recipientName.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                IBAN
              </label>
              <input
                {...form.register('iban')}
                type="text"
                placeholder="GB29 NWBK 6016 1331 9268 19"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                onChange={(e) => {
                  // Format IBAN with spaces for better readability
                  const value = e.target.value.replace(/\s/g, '').toUpperCase();
                  const formatted = value.replace(/(.{4})/g, '$1 ').trim();
                  e.target.value = formatted;
                  form.setValue('iban', value);
                }}
              />
              {form.formState.errors.iban && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.iban.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                BIC Code
              </label>
              <input
                {...form.register('bicCode')}
                type="text"
                placeholder="NWBKGB2L"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                onChange={(e) => {
                  // Format BIC code to uppercase
                  const value = e.target.value.replace(/\s/g, '').toUpperCase();
                  e.target.value = value;
                  form.setValue('bicCode', value);
                }}
              />
              {form.formState.errors.bicCode && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.bicCode.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount ({userCurrency})
              </label>
              <input
                {...form.register('amount')}
                type="text"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
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
                placeholder="Payment description"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Continue to Review
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}