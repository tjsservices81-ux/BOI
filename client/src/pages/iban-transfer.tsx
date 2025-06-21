import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAccounts, processTransfer, processSecureTransfer, checkTransferConfirmation, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";

const ibanTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  iban: z.string().min(15, "Valid IBAN required").refine((val) => {
    // Remove spaces and convert to uppercase for validation
    const cleanIban = val.replace(/\s/g, '').toUpperCase();
    // Basic IBAN format: 2 letters (country) + 2 digits (check) + up to 30 alphanumeric characters
    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(cleanIban) && cleanIban.length >= 15 && cleanIban.length <= 34;
  }, "Invalid IBAN format"),
  bicCode: z.string().min(8, "Valid BIC code required").refine((val) => {
    // BIC format: 8 or 11 characters (letters and numbers)
    const cleanBic = val.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
  }, "Invalid BIC format"),
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
          
          // Process the transfer using the generated reference
          const transferSuccess = processConfirmedTransfer(
            `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            formData.fromAccount,
            parseFloat(formData.amount),
            formData.recipientName,
            'IBAN',
            ref, // Use the generated reference directly
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
      <div>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Complete
          </span>
        </div>

        <div className="px-4 py-4">
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

            {/* iOS-style Processing Transfer Screen */}
            {!showReference ? (
              <div className="ios-processing-screen" style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: '#f5f5f7',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'OpenSans, sans-serif'
              }}>
                <div className="ios-processing-content" style={{
                  textAlign: 'center',
                  padding: '2rem',
                  maxWidth: '400px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.5rem',
                  minHeight: '60vh'
                }}>
                  
                  {/* Circular Spinner - iOS Style */}
                  <div className="ios-spinner-container" style={{
                    width: '90px',
                    height: '90px',
                    backgroundColor: '#126987',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(18, 105, 135, 0.3)',
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      border: '5px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '5px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  </div>
                  
                  {/* Title and Stage */}
                  <div className="ios-text-section" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}>
                    <h1 style={{ 
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: '#1d1d1f',
                      margin: '0',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em'
                    }}>
                      Processing Transfer
                    </h1>
                    <p style={{ 
                      fontSize: '1rem',
                      color: '#86868b',
                      margin: '0',
                      fontWeight: '400',
                      lineHeight: '1.4'
                    }}>
                      {processingStage}
                    </p>
                  </div>
                  
                  {/* Progress Bar - iOS Style */}
                  <div className="ios-progress-section" style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <div className="ios-progress-track" style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e5e7',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div className="ios-progress-fill" style={{ 
                        width: `${animationProgress}%`,
                        height: '8px',
                        backgroundColor: '#126987',
                        borderRadius: '4px',
                        transition: 'width 300ms ease-out',
                        position: 'relative'
                      }}></div>
                    </div>
                    <p style={{ 
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#126987',
                      margin: '0',
                      lineHeight: '1.2'
                    }}>
                      {Math.round(animationProgress)}% Complete
                    </p>
                  </div>
                  
                  {/* Security Notice - iOS Style */}
                  <div className="ios-security-notice" style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    width: '100%',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.04)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#34c759',
                        borderRadius: '50%',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}></div>
                      <span style={{ 
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1d1d1f',
                        lineHeight: '1.3'
                      }}>
                        Secure Connection Active
                      </span>
                    </div>
                    <p style={{ 
                      fontSize: '0.8125rem',
                      color: '#86868b',
                      lineHeight: '1.4',
                      margin: '0',
                      textAlign: 'center'
                    }}>
                      Your SEPA transfer is being processed through Bank of Ireland's secure SWIFT network with end-to-end encryption
                    </p>
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
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{formData?.amount}</span>
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
                        1-3 days
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>SEPA Transfer:</strong> International transfers typically take 1-3 business days to reach the recipient depending on the destination country.
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
          overflowY: 'auto', 
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
                <span className="font-semibold text-[#126987] text-xl" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{formData?.amount}</span>
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
                Transfers within the SEPA zone typically take 1-2 business days depending on the recipient's country and bank.
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
                Amount (EUR)
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