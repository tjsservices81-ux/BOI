import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Building2, Building, Plus, X } from "lucide-react";
import barclaysIcon from "@assets/IMG_1985_1751646296833.png";
import lloydsIcon from "@assets/IMG_1986_1751646563662.png";
import tsbIcon from "@assets/IMG_1987_1751646758072.png";
import nationwideIcon from "@assets/IMG_1988_1751647270547.png";
import natwestIcon from "@assets/IMG_1991_1751647281263.jpeg";
import hsbcIcon from "@assets/IMG_1992_1751647291682.webp";
import bankOfScotlandIcon from "@assets/IMG_1993_1751647303161.png";
import monzoIcon from "@assets/IMG_1995_1751647342658.png";
import starlingIcon from "@assets/IMG_1996_1751647366865.png";
import halifaxIcon from "@assets/IMG_1997_1751647408940.png";
import santanderIcon from "@assets/IMG_1998_1751647765469.jpeg";
import metroBankIcon from "@assets/IMG_1999_1751647836371.png";
import rbsIcon from "@assets/IMG_2001_1751648200916.png";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateUKSortCode, formatSortCode, validateUKAccountNumber } from "../utils/bankValidation";
import { getAccounts, processTransfer, processSecureTransfer, checkTransferConfirmation, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, getCurrencySymbol, type Currency } from "../utils/currencyUtils";
import { updateUserLocation } from "../utils/locationTracker";

// Known sort codes for bank identification
const knownSortCodes: Record<string, string> = {
  "20": "Barclays",
  "30": "Lloyds Bank",
  "39": "Lloyds Bank",
  "77": "Lloyds Bank",
  "11": "Halifax",
  "40": "HSBC",
  "60": "NatWest",
  "50": "NatWest (older)",
  "01-10-01": "NatWest",
  "50-00-00": "NatWest", 
  "53-61-07": "NatWest",
  "55-70-13": "NatWest",
  "60-60-04": "NatWest",
  "60-08-46": "NatWest",
  "60-30-30": "NatWest",
  "09": "Santander",
  "07": "Nationwide",
  "87": "TSB Bank",
  "30-13-42": "TSB Bank",
  "30-13-50": "TSB Bank", 
  "30-13-52": "TSB Bank",
  "30-13-53": "TSB Bank",
  "77-68-36": "TSB Bank",
  "83": "Royal Bank of Scotland",
  "80": "Bank of Scotland",
  "80-20-00": "Bank of Scotland",
  "80-22-60": "Bank of Scotland",
  "80-20-45": "Bank of Scotland",
  "80-46-35": "Bank of Scotland",
  "04-00-03": "Monzo",
  "04-00-04": "Monzo",
  "04-00-75": "Revolut (via Modulr)",
  "04-12-06": "Pockit (via PPS)",
  "04-06-05": "Tide",
  "60-83-71": "Starling Bank",
  "08-71-99": "Cashplus",
  "23-14-70": "Wise",
  "23-05-80": "Metro Bank"
};

const ukTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  accountNumber: z.string().regex(/^[0-9]{8}$/, "Account number must be 8 digits"),
  sortCode: z.string().regex(/^[0-9]{6}$/, "Sort code must be 6 digits"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account"),
  recipientEmail: z.string().email("Invalid email").optional().or(z.literal(''))
});

type UkTransferData = z.infer<typeof ukTransferSchema>;

// Function to get bank icon
const getBankIcon = (bankName: string): string | undefined => {
  if (bankName === 'Barclays') {
    return barclaysIcon;
  }
  if (bankName === 'Lloyds Bank') {
    return lloydsIcon;
  }
  if (bankName === 'TSB Bank') {
    return tsbIcon;
  }
  if (bankName === 'Nationwide') {
    return nationwideIcon;
  }
  if (bankName === 'NatWest') {
    return natwestIcon;
  }
  if (bankName === 'HSBC') {
    return hsbcIcon;
  }
  if (bankName === 'Bank of Scotland') {
    return bankOfScotlandIcon;
  }
  if (bankName === 'Monzo') {
    return monzoIcon;
  }
  if (bankName === 'Starling Bank') {
    return starlingIcon;
  }
  if (bankName === 'Halifax') {
    return halifaxIcon;
  }
  if (bankName === 'Santander') {
    return santanderIcon;
  }
  if (bankName === 'Metro Bank') {
    return metroBankIcon;
  }
  if (bankName === 'Royal Bank of Scotland') {
    return rbsIcon;
  }
  return undefined;
};

// Function to identify bank from sort code
const identifyBankFromSortCode = (sortCode: string): string => {
  if (!sortCode) return '';
  
  // Format sort code to remove dashes and spaces
  const cleanSortCode = sortCode.replace(/[-\s]/g, '');
  
  // Check exact matches first (for specific sort codes like Monzo, Revolut)
  const formattedSortCode = cleanSortCode.length === 6 
    ? `${cleanSortCode.slice(0, 2)}-${cleanSortCode.slice(2, 4)}-${cleanSortCode.slice(4, 6)}`
    : cleanSortCode;
  
  if (formattedSortCode in knownSortCodes) {
    return knownSortCodes[formattedSortCode];
  }
  
  // Check for partial matches (first 2 digits, then first 5 characters for patterns like "04-00")
  const firstTwo = cleanSortCode.slice(0, 2);
  if (firstTwo in knownSortCodes) {
    return knownSortCodes[firstTwo];
  }
  
  // Check for 5-character patterns like "04-00", "04-12"
  if (cleanSortCode.length >= 4) {
    const firstFour = `${cleanSortCode.slice(0, 2)}-${cleanSortCode.slice(2, 4)}`;
    if (firstFour in knownSortCodes) {
      return knownSortCodes[firstFour];
    }
  }
  
  return '';
};

export default function UkTransfer() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'cancelled'>('form');
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
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  const [displaySortCode, setDisplaySortCode] = useState<string>('');
  
  const [recipientEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('recipientEmailEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

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
            
            // Pre-fill reference if available
            if (payee.reference) {
              form.setValue('reference', payee.reference);
            }
            
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
              
              // Update reference input field
              const referenceInput = document.querySelector('input[placeholder="Payment reference (optional)"]') as HTMLInputElement;
              if (referenceInput && payee.reference) {
                referenceInput.value = payee.reference;
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
    
    return () => {
      window.removeEventListener('accountsUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('balanceUpdate', handleAccountsUpdate as EventListener);
      window.removeEventListener('adminProfileUpdate', handleAccountsUpdate as EventListener);
    };
  }, []); // Only run once on mount

  const onSubmit = async (data: UkTransferData) => {
    console.log('Form submitted with data:', data);
    setFormData(data);
    const ref = generateReference();
    setTransferReference(ref);
    
    // Fetch exchange rate
    await fetchExchangeRate();
    
    // Move to confirmation step
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
      'Connecting to UK banking network...',
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
          
          // Process the transfer asynchronously
          setTimeout(async () => {
            try {
              const transferSuccess = await processConfirmedTransfer(
                `UK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                formData.fromAccount,
                parseFloat(formData.amount),
                formData.recipientName,
                'UK',
                transferReference,
                exchangeRate,
                {
                  accountNumber: formData.accountNumber,
                  sortCode: formData.sortCode
                },
                formData.recipientEmail
              );
              
              if (transferSuccess) {
                // Add successful payee to recent payees
                const payee = {
                  name: formData.recipientName,
                  accountInfo: `${formatSortCode(formData.sortCode)} ${formData.accountNumber}`,
                  transferType: 'UK Transfer',
                  reference: formData.reference || '',
                  timestamp: new Date().toISOString()
                };
                UserDataManager.addRecentPayee(payee);
                
                // Update location after successful transfer
                updateUserLocation();
                
                // Dispatch events to update all components
                window.dispatchEvent(new CustomEvent('transactionUpdate'));
                window.dispatchEvent(new CustomEvent('balanceUpdate'));
                
                setShowReference(true);
              }
            } catch (error) {
              console.error('Transfer processing failed:', error);
            }
          }, 0);
          
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };





  if (step === 'confirm' && formData) {
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);

    return (
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ 
        backgroundColor: '#f9fafb'
      }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => {
            if (formData) {
              form.setValue('recipientName', formData.recipientName);
              form.setValue('accountNumber', formData.accountNumber);
              form.setValue('sortCode', formData.sortCode);
              form.setValue('amount', formData.amount);
              form.setValue('reference', formData.reference);
              form.setValue('fromAccount', formData.fromAccount);
              setDisplaySortCode(formatSortCode(formData.sortCode));
            }
            setStep('form');
          }} className="flex items-center text-white">
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
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData?.sortCode ? formatSortCode(formData.sortCode) : ''} {formData?.accountNumber}</p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <div className="text-right">
                  <span className="font-semibold text-[#126987] text-xl" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formatCurrency(parseFloat(formData?.amount || '0'), userCurrency)}</span>
                  {userCurrency === 'EUR' && (
                    <p className="text-sm text-green-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      ≈ £{formData?.amount ? (parseFloat(formData.amount) * exchangeRate).toFixed(2) : '0.00'} GBP
                    </p>
                  )}
                </div>
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
                UK Bank Transfer
              </p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {userCurrency === 'EUR' 
                  ? 'This international transfer will be processed within 24 hours.'
                  : 'This transfer will be processed within 24 hours.'}
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
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '2rem',
                paddingTop: '25vh'
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
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left animate-fade-in">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formatCurrency(form.getValues('amount') || '0', userCurrency)}</span>
                    </div>
                    {userCurrency === 'EUR' && (
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
                    )}
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
                        {userCurrency === 'EUR' 
                          ? <><strong>International Transfer:</strong> UK transfers from Bank of Ireland typically take 24 hours to reach the recipient.</>
                          : <>UK transfers from Bank of Ireland typically take 24 hours to reach the recipient.</>}
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
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ 
        backgroundColor: '#f9fafb'
      }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => {
            if (formData) {
              form.setValue('recipientName', formData.recipientName);
              form.setValue('accountNumber', formData.accountNumber);
              form.setValue('sortCode', formData.sortCode);
              form.setValue('amount', formData.amount);
              form.setValue('reference', formData.reference);
              form.setValue('fromAccount', formData.fromAccount);
              setDisplaySortCode(formatSortCode(formData.sortCode));
            }
            setStep('form');
          }} className="flex items-center text-white">
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
                onClick={() => {
                  if (formData) {
                    form.setValue('recipientName', formData.recipientName);
                    form.setValue('accountNumber', formData.accountNumber);
                    form.setValue('sortCode', formData.sortCode);
                    form.setValue('amount', formData.amount);
                    form.setValue('reference', formData.reference);
                    form.setValue('fromAccount', formData.fromAccount);
                    setDisplaySortCode(formatSortCode(formData.sortCode));
                  }
                  setStep('form');
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

  return (
    <div className="h-screen overflow-hidden flex flex-col page-slide-in-right" style={{ 
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

            <div className="grid grid-cols-2 gap-4 android-form-grid">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  Sort Code
                </label>

                <input
                  type="text"
                  placeholder="12-34-56"
                  maxLength={8}
                  value={displaySortCode}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleanValue = value.replace(/\D/g, '');
                    const formattedValue = formatSortCode(cleanValue);
                    
                    // Update the display value with formatting
                    setDisplaySortCode(formattedValue);
                    
                    // Set the clean value (no hyphens) for form validation
                    form.setValue('sortCode', cleanValue, { shouldValidate: true });
                    
                    // Clear any existing validation errors if the length is correct
                    if (cleanValue.length === 6) {
                      form.clearErrors('sortCode');
                    }
                    
                    // Identify bank only when sort code is complete (6 digits)
                    if (cleanValue.length === 6) {
                      // Try predefined list first
                      const bank = identifyBankFromSortCode(cleanValue);
                      if (bank) {
                        setIdentifiedBank(bank);
                      } else {
                        // Fall back to existing EISCD validation for complete sort codes
                        const fallbackBank = validateUKSortCode(cleanValue);
                        setIdentifiedBank(fallbackBank || '');
                      }
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
                        
                        // Update immediately without delay
                        setDisplaySortCode(newFormattedValue);
                        form.setValue('sortCode', newCleanValue, { shouldValidate: true });
                        
                        if (newCleanValue.length === 6) {
                          // Try predefined list first
                          const bank = identifyBankFromSortCode(newCleanValue);
                          if (bank) {
                            setIdentifiedBank(bank);
                          } else {
                            // Fall back to existing EISCD validation for complete sort codes
                            const fallbackBank = validateUKSortCode(newCleanValue);
                            setIdentifiedBank(fallbackBank || '');
                          }
                        } else {
                          setIdentifiedBank('');
                        }
                      }
                    }
                  }}
                />
                {identifiedBank && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md flex items-center">
                    {getBankIcon(identifiedBank) ? (
                      <img 
                        src={getBankIcon(identifiedBank)!} 
                        alt={`${identifiedBank} logo`}
                        className={`mr-2 object-contain ${
                          identifiedBank === 'TSB Bank' ? 'w-8 h-5' : 
                          identifiedBank === 'Halifax' ? 'w-8 h-6' : 
                          identifiedBank === 'Nationwide' ? 'w-5 h-5' : 
                          identifiedBank === 'Monzo' ? 'w-5 h-5' : 
                          identifiedBank === 'Starling Bank' ? 'w-5 h-5' : 
                          'w-4 h-4'
                        }`}
                      />
                    ) : (
                      <Building className="w-4 h-4 text-green-600 mr-2" />
                    )}
                    <span className="text-xs text-green-700 font-medium">{identifiedBank}</span>
                  </div>
                )}
                {form.formState.errors.sortCode && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.sortCode.message}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
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
                Amount ({userCurrency})
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

            {recipientEmailEnabled && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Recipient Email
                </label>
                <input
                  {...form.register('recipientEmail')}
                  type="email"
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
                {form.formState.errors.recipientEmail && (
                  <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.recipientEmail.message}</p>
                )}
              </div>
            )}

            <div className="android-button-container">
              <button
                type="submit"
                className="continue-button w-full bg-gradient-to-r from-[#126987] to-[#5a7b85] text-white py-4 px-6 rounded-lg font-bold transition-all duration-150 ease-out active:scale-98 text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#126987] focus:ring-offset-2"
                style={{ 
                  fontFamily: 'OpenSans, sans-serif',
                  minHeight: '48px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box'
                }}
              >
                Continue to Review
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}