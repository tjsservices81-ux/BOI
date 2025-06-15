import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe } from "lucide-react";
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
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account")
});

type IbanTransferData = z.infer<typeof ibanTransferSchema>;

export default function IbanTransfer() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'form' | 'confirm' | 'security' | 'success'>('form');
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
      amount: '',
      reference: '',
      fromAccount: ''
    }
  });

  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    const loadAccounts = () => {
      const userAccounts = UserDataManager.getUserData('bankAccounts', []);
      setAccounts(userAccounts);
    };
    
    loadAccounts();
    
    // Check for selected payee from Recent Payees
    const selectedPayeeData = sessionStorage.getItem('selectedPayee');
    if (selectedPayeeData) {
      try {
        const payee = JSON.parse(selectedPayeeData);
        if (payee.transferType === 'IBAN Transfer' && payee.accountInfo) {
          // Pre-fill form with payee data
          form.setValue('recipientName', payee.name);
          form.setValue('iban', payee.accountInfo);
          
          // Clear the session storage after using
          sessionStorage.removeItem('selectedPayee');
        }
      } catch (error) {
        console.error('Error parsing selected payee data:', error);
        sessionStorage.removeItem('selectedPayee');
      }
    }
    
    return () => {};
  }, [form]);

  const onSubmit = (data: IbanTransferData) => {
    setFormData(data);
    setStep('confirm');
  };

  const executeTransfer = async () => {
    if (!formData) return;
    
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
          
          // Process the transfer
          const transferSuccess = processConfirmedTransfer(
            `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            formData.fromAccount,
            parseFloat(formData.amount),
            formData.recipientName,
            'IBAN',
            transferReference,
            undefined, // No exchange rate for IBAN transfers
            {
              iban: formData.iban
            }
          );
          
          if (transferSuccess) {
            // Add successful payee to recent payees
            const payee = {
              name: formData.recipientName,
              accountInfo: formData.iban,
              transferType: 'IBAN Transfer',
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
                  Your international transfer has been processed successfully
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
                      Your international transfer is being processed through Bank of Ireland's secure SWIFT network with end-to-end encryption
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

  if (step === 'confirm' && formData) {
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);

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
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{selectedAccount?.displayName}</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>{selectedAccount?.accountNumber}</p>
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
                International Transfer
              </p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                This transfer will be processed through SWIFT network and may take 1-3 business days.
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
    <div className="page-container page-fade-in" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#126987'
    }}>
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/payments')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>International Transfer</span>
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mr-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>International Transfer</h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>SEPA and international payments</p>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white shadow-sm"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white shadow-sm"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white shadow-sm"
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
                Amount (EUR)
              </label>
              <input
                {...form.register('amount')}
                type="text"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white shadow-sm"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-bold transition-all duration-150 ease-out active:scale-98 text-sm shadow-md"
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