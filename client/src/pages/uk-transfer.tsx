import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Building2, Building, Plus, X, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { validateUKSortCode, formatSortCode, validateUKAccountNumber } from "../utils/bankValidation";
import { getAccounts, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
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
  const [formData, setFormData] = useState<UkTransferData | null>(null);
  const [transferId, setTransferId] = useState<string>('');
  const [callSid, setCallSid] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(0.85);
  const [gbpAmount, setGbpAmount] = useState<string>('0.00');
  const [processingStage, setProcessingStage] = useState<string>('Calling your phone...');

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

  // Fetch exchange rate
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      if (data && data.rates && data.rates.GBP) {
        setExchangeRate(data.rates.GBP);
      }
    } catch (error) {
      console.log('Exchange rate fetch failed, using default rate');
    }
  };

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountData = await getAccounts();
        setAccounts(accountData);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };

    loadAccounts();
    fetchExchangeRate();
  }, []);

  // Calculate GBP amount when EUR amount changes
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
    console.log('Form submitted with data:', data);
    setFormData(data);
    const ref = generateReference();
    setTransferReference(ref);
    
    await fetchExchangeRate();
    
    // Immediately initiate Twilio voice call
    setStep('calling');
    setProcessingStage('Initiating security call...');
    
    try {
      const userData = UserDataManager.getUserProfile();
      if (!userData?.phone) {
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

  const goBackToForm = () => {
    setStep('form');
  };

  const validateSortCode = (value: string) => {
    if (!validateUKSortCode(value)) {
      return 'Invalid sort code';
    }
    return true;
  };

  const validateAccountNum = (value: string) => {
    if (!validateUKAccountNumber(value)) {
      return 'Invalid account number';
    }
    return true;
  };

  const handleSortCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSortCode(e.target.value);
    form.setValue('sortCode', formatted.replace(/-/g, ''));
    
    // Bank identification logic
    const sortCode = formatted.replace(/-/g, '');
    if (sortCode.length === 6) {
      const firstTwo = sortCode.substring(0, 2);
      const bankMap: { [key: string]: string } = {
        '09': 'Santander UK',
        '20': 'Barclays',
        '30': 'Lloyds Bank',
        '40': 'HSBC',
        '60': 'NatWest',
        '16': 'Starling Bank',
        '04': 'Monzo',
        '23': 'Metro Bank'
      };
      
      setIdentifiedBank(bankMap[firstTwo] || 'Unknown Bank');
    }
  };

  if (step === 'calling') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Security Call in Progress</h2>
              <p className="text-gray-600 mt-2">{processingStage}</p>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Transfer Details</h3>
                <div className="space-y-1">
                  <p><span className="font-medium">Amount:</span> €{formData?.amount}</p>
                  <p><span className="font-medium">To:</span> {formData?.recipientName}</p>
                  <p><span className="font-medium">Account:</span> {formData?.accountNumber}</p>
                  <p><span className="font-medium">Sort Code:</span> {formData?.sortCode}</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-yellow-600" />
                  <p className="text-yellow-800 font-medium">Please answer your phone</p>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  You'll receive details about this transfer and need to press 1 to confirm or 2 to cancel.
                </p>
              </div>
            </div>
            
            <button
              onClick={goBackToForm}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel Transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Transfer Successful</h2>
              <p className="text-gray-600 mt-2">Your payment has been processed</p>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Payment Details</h3>
                <div className="space-y-1 text-green-800">
                  <p><span className="font-medium">Amount:</span> €{formData?.amount} (£{gbpAmount})</p>
                  <p><span className="font-medium">To:</span> {formData?.recipientName}</p>
                  <p><span className="font-medium">Reference:</span> {transferReference}</p>
                  <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Transfer Cancelled</h2>
              <p className="text-gray-600 mt-2">Your transfer was not processed</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-800 text-sm">
                The transfer was cancelled either by your choice or due to security timeout. 
                No money has been transferred from your account.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={goBackToForm}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-blue-600 px-4 py-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">UK Bank Transfer</h1>
          </div>
        </div>

        {/* Form */}
        <div className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* From Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Account
              </label>
              <select
                {...form.register('fromAccount')}
                className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} - €{account.balance}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.fromAccount.message}</p>
              )}
            </div>

            {/* Recipient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                {...form.register('recipientName')}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter recipient's full name"
              />
              {form.formState.errors.recipientName && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.recipientName.message}</p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                {...form.register('accountNumber', { validate: validateAccountNum })}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345678"
                maxLength={8}
              />
              {form.formState.errors.accountNumber && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.accountNumber.message}</p>
              )}
            </div>

            {/* Sort Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Code
              </label>
              <input
                type="text"
                {...form.register('sortCode', { validate: validateSortCode })}
                onChange={handleSortCodeChange}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="12-34-56"
                maxLength={8}
              />
              {identifiedBank && (
                <p className="text-green-600 text-sm mt-1 flex items-center">
                  <Building2 className="w-4 h-4 mr-1" />
                  {identifiedBank}
                </p>
              )}
              {form.formState.errors.sortCode && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.sortCode.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                {...form.register('amount')}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              {gbpAmount !== '0.00' && (
                <p className="text-blue-600 text-sm mt-1">
                  ≈ £{gbpAmount} GBP (Rate: {exchangeRate.toFixed(4)})
                </p>
              )}
              {form.formState.errors.amount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                {...form.register('reference')}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Payment reference"
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.reference.message}</p>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mt-6">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <p className="text-blue-800 font-medium">Security Confirmation Required</p>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                You'll receive a phone call to confirm this transfer before any money is sent.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors mt-6"
            >
              Initiate Transfer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}