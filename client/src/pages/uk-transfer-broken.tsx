import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Building2, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateUKSortCode, formatSortCode, validateUKAccountNumber } from "../utils/bankValidation";
import { getAccounts, processTransfer, generateReference } from "../utils/transferUtils";

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
  const [exchangeRate, setExchangeRate] = useState<number>(0.85); // EUR to GBP rate
  const [gbpAmount, setGbpAmount] = useState<string>('0.00');

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
        setExchangeRate(0.85);
        return;
      }
      
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`);
      const data = await response.json();
      
      if (data.result === 'success' && data.conversion_rates?.GBP) {
        const rate = data.conversion_rates.GBP;
        setExchangeRate(rate);
        console.log('Live exchange rate fetched:', rate);
      } else {
        setExchangeRate(0.85);
      }
    } catch (error) {
      console.log('Exchange rate fetch failed, using default');
      setExchangeRate(0.85);
    }
  };

  useEffect(() => {
    const loadedAccounts = getAccounts();
    setAccounts(loadedAccounts);
    fetchExchangeRate();
  }, []);

  // Calculate GBP equivalent when amount changes
  useEffect(() => {
    const amount = form.watch('amount');
    if (amount && !isNaN(parseFloat(amount))) {
      const gbp = (parseFloat(amount) * exchangeRate).toFixed(2);
      setGbpAmount(gbp);
    } else {
      setGbpAmount('0.00');
    }
  }, [form.watch('amount'), exchangeRate]);

  const onSubmit = async (data: UkTransferData) => {
    setFormData(data);
    
    // Fetch exchange rate when moving to confirmation
    await fetchExchangeRate();
    
    setStep('confirm');
  };

  const executeTransfer = async () => {
    if (!formData) return;
    
    // Generate unique reference only when transfer starts
    const ref = generateReference();
    setTransferReference(ref);
    
    // Fetch current exchange rate and calculate GBP amount
    await fetchExchangeRate();
    
    const success = processTransfer(
      formData.fromAccount,
      parseFloat(formData.amount),
      formData.recipientName,
      'UK',
      ref,
      exchangeRate
    );
    
    if (!success) {
      console.error('Transfer failed');
      return;
    }

    // Immediately go to success screen and start animation
    setStep('success');
    setShowReference(false);
    setAnimationProgress(0);
    setProcessingStage('Verifying transfer details...');
    
    // Start animation sequence
    setTimeout(() => {
      // Professional banking stages during 5-second animation
      const stages = [
        'Verifying transfer details...',
        'Authenticating transaction...',
        'Connecting to UK banking network...',
        'Securing transfer protocol...',
        'Finalizing payment...'
      ];
      
      let currentProgress = 0;
      let stageIndex = 0;
      
      const interval = setInterval(() => {
        currentProgress += 2; // 2% every 100ms = 5 seconds total
        
        // Update stage message every 20% (1 second)
        const newStageIndex = Math.floor(currentProgress / 20);
        if (newStageIndex !== stageIndex && newStageIndex < stages.length) {
          stageIndex = newStageIndex;
          setProcessingStage(stages[newStageIndex]);
        }
        
        setAnimationProgress(currentProgress);
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowReference(true);
          }, 500);
        }
      }, 100);
    }, 100);
  };

  if (step === 'success') {
    return (
      <div>
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
          <div>
            <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
              <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Transfer Complete
              </span>
            </div>

            <div className="px-4 py-4">
              <div className="text-center max-w-sm mx-auto">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                
                <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Successful
                </h1>
                
                <p className="text-gray-600 mb-4 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your UK bank transfer has been processed successfully
                </p>

                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left animate-fade-in">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{parseFloat(formData?.amount || '0').toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Keep this for your records
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>GBP Equivalent:</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          £{(parseFloat(formData?.amount || '0') * exchangeRate).toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Rate: €1 = £{exchangeRate.toFixed(4)} • Live rate
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.recipientName}</span>
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
                  </div>
                </div>

                <div className="flex space-x-3 mt-4">
                  <button 
                    onClick={() => navigate('/')}
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
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const identifyBank = (sortCode: string) => {
    const banks: { [key: string]: string } = {
      '04': 'Lloyds Bank',
      '20': 'Barclays',
      '30': 'Lloyds Bank',
      '40': 'HSBC',
      '60': 'National Westminster Bank',
      '77': 'Lloyds Bank',
      '83': 'HSBC',
      '09': 'Abbey National'
    };
    
    const prefix = sortCode.substring(0, 2);
    return banks[prefix] || 'UK Bank';
  };

  const handleSortCodeChange = (value: string) => {
    const formatted = formatSortCode(value);
    form.setValue('sortCode', formatted.replace(/-/g, ''));
    
    if (formatted.length === 8) { // XX-XX-XX format
      const bank = identifyBank(formatted.replace(/-/g, ''));
      setIdentifiedBank(bank);
    } else {
      setIdentifiedBank('');
    }
  };

  if (step === 'confirm') {
    return (
      <div className="ios-scroll" style={{ minHeight: '100vh', backgroundColor: '#f9fafb', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => setStep('form')}
            className="flex items-center text-white"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Back</span>
          </button>
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Confirm Transfer
          </span>
          <div></div>
        </div>

        <div className="px-4 py-6 pb-20">
          <div className="bg-white rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>From:</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {accounts.find(acc => acc.id.toString() === formData?.fromAccount)?.displayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                <span className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formData?.recipientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  €{parseFloat(formData?.amount || '0').toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>GBP Equivalent:</span>
                <div className="text-right">
                  <span className="font-semibold text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    £{(parseFloat(formData?.amount || '0') * exchangeRate).toFixed(2)}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Rate: €1 = £{exchangeRate.toFixed(4)} • Live rate
                  </p>
                </div>
              </div>
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
    <div className="ios-scroll" style={{ minHeight: '100vh', backgroundColor: '#f9fafb', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate('/payments')}
          className="flex items-center text-white"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Back</span>
        </button>
        <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          UK Transfer
        </span>
        <div></div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 py-6 pb-20">
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center mb-4">
            <Building className="h-5 w-5 text-[#126987] mr-2" />
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              UK Bank Details
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recipient Name
              </label>
              <input
                {...form.register('recipientName')}
                type="text"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                placeholder="Enter recipient's full name"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.recipientName && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.recipientName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                UK Sort Code
              </label>
              <input
                onChange={(e) => handleSortCodeChange(e.target.value)}
                type="text"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                placeholder="XX-XX-XX"
                maxLength={8}
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {identifiedBank && (
                <p className="text-green-600 text-sm mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  ✓ {identifiedBank}
                </p>
              )}
              {form.formState.errors.sortCode && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.sortCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Account Number
              </label>
              <input
                {...form.register('accountNumber')}
                type="text"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                placeholder="8-digit account number"
                maxLength={8}
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.accountNumber && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.accountNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-[#126987] mr-2" />
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Amount
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                From Account
              </label>
              <select
                {...form.register('fromAccount')}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} - €{parseFloat(account.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.fromAccount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount (EUR)
              </label>
              <input
                {...form.register('amount')}
                type="number"
                step="0.01"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                placeholder="0.00"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {gbpAmount !== '0.00' && (
                <p className="text-green-600 text-sm mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  ≈ £{gbpAmount} GBP (Rate: €1 = £{exchangeRate.toFixed(4)})
                </p>
              )}
              {form.formState.errors.amount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Reference
              </label>
              <input
                {...form.register('reference')}
                type="text"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                placeholder="Payment reference"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.reference.message}</p>
              )}
            </div>
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
  );
}