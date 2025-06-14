import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Building2, Building, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateUKSortCode, formatSortCode, validateUKAccountNumber } from "../utils/bankValidation";
import { getAccounts, processTransfer, processSecureTransfer, checkTransferConfirmation, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
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
  const [step, setStep] = useState<'form' | 'calling' | 'success' | 'cancelled'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [identifiedBank, setIdentifiedBank] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Initiating security call...');
  const [formData, setFormData] = useState<UkTransferData | null>(null);
  const [transferId, setTransferId] = useState<string>('');
  const [callSid, setCallSid] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(0.85); // EUR to GBP rate
  const [gbpAmount, setGbpAmount] = useState<string>('0.00');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

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

  // Fetch real-time exchange rate using authenticated API
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
        
        // Update GBP amount with fresh rate
        const currentAmount = formData?.amount || form.getValues('amount');
        if (currentAmount) {
          const converted = (parseFloat(currentAmount) * rate).toFixed(2);
          setGbpAmount(converted);
        }
      }
    } catch (error) {
      console.log('Exchange rate fetch failed, using default rate');
      // Keep default rate of 0.85
    }
  };

  useEffect(() => {
    const loadAccounts = () => {
      // Use UserDataManager to get consistent account data
      const userAccounts = UserDataManager.getUserData('bankAccounts', []);
      setAccounts(userAccounts);
    };
    
    loadAccounts();
    
    // Check for selected payee from Recent Payees
    const selectedPayeeData = sessionStorage.getItem('selectedPayee');
    if (selectedPayeeData) {
      try {
        const payee = JSON.parse(selectedPayeeData);
        
        if (payee.transferType === 'UK Transfer' && payee.accountInfo) {
          // Parse sort code and account number from accountInfo
          // Format: "12-34-56 12345678"
          const parts = payee.accountInfo.trim().split(' ');
          
          if (parts.length >= 2) {
            const sortCodeFormatted = parts[0]; // "12-34-56"
            const sortCodeClean = sortCodeFormatted.replace(/-/g, ''); // "123456"
            const accountNumber = parts[1]; // "12345678"
            
            // Pre-fill form with payee data
            form.setValue('recipientName', payee.name);
            form.setValue('sortCode', sortCodeClean);
            form.setValue('accountNumber', accountNumber);
            
            // Force update the form fields after a brief delay
            setTimeout(() => {
              // Update sort code input field display
              const sortCodeInput = document.querySelector('input[placeholder="12-34-56"]') as HTMLInputElement;
              if (sortCodeInput) {
                sortCodeInput.value = sortCodeFormatted;
              }
              
              // Update account number input field
              const accountInput = document.querySelector('input[placeholder="12345678"]') as HTMLInputElement;
              if (accountInput) {
                accountInput.value = accountNumber;
              }
              
              // Update recipient name input field
              const nameInput = document.querySelector('input[placeholder="Recipient full name"]') as HTMLInputElement;
              if (nameInput) {
                nameInput.value = payee.name;
              }
            }, 200);
          }
          
          // Clear the session storage after using
          sessionStorage.removeItem('selectedPayee');
        }
      } catch (error) {
        console.error('Error parsing selected payee data:', error);
        sessionStorage.removeItem('selectedPayee');
      }
    }
  }, []); // Only run once on mount

  const onSubmit = async (data: UkTransferData) => {
    console.log('Form submitted with data:', data);
    setFormData(data);
    const ref = generateReference();
    setTransferReference(ref);
    
    // Fetch exchange rate
    await fetchExchangeRate();
    
    // Immediately initiate Twilio voice call
    setStep('calling');
    setProcessingStage('Initiating security call...');
    
    try {
      const userData = UserDataManager.getCurrentUser();
      if (!userData || !userData.phone) {
        alert('Phone number not found. Please update your profile.');
        setStep('form');
        return;
      }

      const uniqueTransferId = `UK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setTransferId(uniqueTransferId);

      // Initiate voice call immediately
      const response = await fetch('/api/security/initiate-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: data.amount,
          recipientName: data.recipientName,
          userPhoneNumber: userData.phone,
          transferId: uniqueTransferId,
          transferType: 'UK',
          accountNumber: data.accountNumber,
          sortCode: data.sortCode
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCallSid(result.callSid);
        setProcessingStage('Calling your phone for security confirmation...');
        
        // Start polling for confirmation
        pollForConfirmation(uniqueTransferId);
      } else {
        alert('Failed to initiate security call: ' + (result.error || 'Unknown error'));
        setStep('form');
      }
    } catch (error) {
      console.error('Failed to initiate transfer:', error);
      alert('Failed to initiate transfer. Please try again.');
      setStep('form');
    }
  };

  const pollForConfirmation = async (transferId: string) => {
    const maxAttempts = 120; // 2 minutes
    let attempts = 0;
    
    const checkStatus = async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/security/status/${transferId}`);
        const status = await response.json();
        
        if (status.confirmed === true) {
          // Transfer confirmed - process it
          setProcessingStage('Transfer confirmed! Processing payment...');
          
          if (!formData) return;
          
          const transferSuccess = processConfirmedTransfer(
            transferId,
            formData.fromAccount,
            parseFloat(formData.amount),
            formData.recipientName,
            'UK',
            transferReference,
            exchangeRate,
            {
              accountNumber: formData.accountNumber,
              sortCode: formData.sortCode
            }
          );
          
          if (transferSuccess) {
            // Dispatch events to update all components
            window.dispatchEvent(new CustomEvent('transactionUpdate'));
            window.dispatchEvent(new CustomEvent('balanceUpdate'));
            
            setStep('success');
          } else {
            alert('Transfer processing failed after confirmation');
            setStep('form');
          }
          return;
        }
        
        if (status.confirmed === false) {
          // Transfer cancelled
          setStep('cancelled');
          return;
        }
        
        // Still pending - continue polling
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000); // Check every second
        } else {
          // Timeout
          setStep('cancelled');
        }
      } catch (error) {
        console.error('Error checking transfer status:', error);
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000);
        } else {
          setStep('cancelled');
        }
      }
    };
    
    checkStatus();
  };

  if (step === 'calling') {
    return (
      <div>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Security Verification
          </span>
        </div>

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
            <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Security Verification
              </h1>
              <p className="text-lg text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {processingStage}
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Voice Call In Progress
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Please answer the call from +35314044000 and press 1 to confirm your transfer or 2 to cancel
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'cancelled') {
    return (
      <div>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Cancelled
          </span>
        </div>

        <div className="px-4 py-4">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Cancelled
            </h1>
            
            <p className="text-gray-600 mb-6 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Your UK bank transfer has been cancelled
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
                onClick={() => {
                  setStep('form');
                  form.reset();
                }}
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
                  Your UK bank transfer has been processed successfully
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
                  
                  {/* Professional Progress Indicator */}
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
                  
                  {/* Professional Security Notice */}
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
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left animate-fade-in">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{form.getValues('amount')}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>GBP Equivalent:</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          £{(parseFloat(form.getValues('amount')) * exchangeRate).toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Rate: €1 = £{exchangeRate.toFixed(4)} • Live rate
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{form.getValues('recipientName')}</span>
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
                        <strong>International Transfer:</strong> UK transfers from Bank of Ireland typically take 1-2 business days to reach the recipient due to cross-border banking regulations.
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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Sort Code
                </label>

                <input
                  type="text"
                  placeholder="12-34-56"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/\D/g, '');
                    const formattedValue = formatSortCode(cleanValue);
                    
                    // Update the display value with formatting
                    e.target.value = formattedValue;
                    
                    // Set the clean value (no hyphens) for form validation
                    form.setValue('sortCode', cleanValue, { shouldValidate: true });
                    
                    // Clear any existing validation errors if the length is correct
                    if (cleanValue.length === 6) {
                      form.clearErrors('sortCode');
                    }
                    
                    // Identify bank when sort code is complete (6 digits)
                    if (cleanValue.length >= 6) {
                      const bank = validateUKSortCode(cleanValue);
                      setIdentifiedBank(bank || '');
                    } else {
                      setIdentifiedBank('');
                    }
                  }}
                  onKeyDown={(e) => {
                    // Allow backspace and delete to work properly
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      const input = e.target as HTMLInputElement;
                      const value = input.value;
                      const cleanValue = value.replace(/\D/g, '');
                      
                      // If backspacing, remove the last digit
                      if (e.key === 'Backspace' && cleanValue.length > 0) {
                        const newCleanValue = cleanValue.slice(0, -1);
                        const newFormattedValue = formatSortCode(newCleanValue);
                        
                        setTimeout(() => {
                          input.value = newFormattedValue;
                          form.setValue('sortCode', newCleanValue, { shouldValidate: true });
                          
                          if (newCleanValue.length >= 6) {
                            const bank = validateUKSortCode(newCleanValue);
                            setIdentifiedBank(bank || '');
                          } else {
                            setIdentifiedBank('');
                          }
                        }, 0);
                      }
                    }
                  }}
                />
                {identifiedBank && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md flex items-center">
                    <Building className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-xs text-green-700 font-medium">{identifiedBank}</span>
                  </div>
                )}
                {form.formState.errors.sortCode && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.sortCode.message}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Account Number
                </label>
                <input
                  {...form.register('accountNumber')}
                  type="text"
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
                {form.formState.errors.accountNumber && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.accountNumber.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount (EUR)
              </label>
              <input
                type="text"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                onChange={(e) => {
                  const value = e.target.value;
                  form.setValue('amount', value);
                }}
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
                type="text"
                placeholder="Payment description"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                onChange={(e) => {
                  const value = e.target.value;
                  form.setValue('reference', value);
                }}
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#126987] to-[#5a7b85] text-white py-4 rounded-lg font-bold transition-all duration-150 ease-out active:scale-98 text-sm shadow-md"
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