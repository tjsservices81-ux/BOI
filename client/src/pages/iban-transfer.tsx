import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe, Phone, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAccounts, processConfirmedTransfer, generateReference } from "../utils/transferUtils";
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
  const [step, setStep] = useState<'form' | 'calling' | 'success' | 'cancelled'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [formData, setFormData] = useState<IbanTransferData | null>(null);
  const [transferId, setTransferId] = useState<string>('');
  const [callSid, setCallSid] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<string>('Calling your phone...');
  const [identifiedCountry, setIdentifiedCountry] = useState<string>('');

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
    const loadAccounts = async () => {
      try {
        const accountData = await getAccounts();
        setAccounts(accountData);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };

    loadAccounts();
  }, []);

  const onSubmit = async (data: IbanTransferData) => {
    console.log('Form submitted with data:', data);
    setFormData(data);
    const ref = generateReference();
    setTransferReference(ref);
    
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

      const uniqueTransferId = `IBAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
          transferType: 'IBAN',
          iban: data.iban
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
            'IBAN',
            transferReference,
            1.0, // EUR to EUR rate
            {
              iban: formData.iban
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

  const formatIban = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Add spaces every 4 characters
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    
    // Identify country from first two letters
    if (cleaned.length >= 2) {
      const countryCode = cleaned.substring(0, 2);
      const countryMap: { [key: string]: string } = {
        'GB': 'United Kingdom',
        'IE': 'Ireland',
        'DE': 'Germany', 
        'FR': 'France',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'BE': 'Belgium',
        'AT': 'Austria',
        'CH': 'Switzerland',
        'SE': 'Sweden',
        'NO': 'Norway',
        'DK': 'Denmark',
        'FI': 'Finland',
        'PT': 'Portugal',
        'PL': 'Poland',
        'CZ': 'Czech Republic'
      };
      
      setIdentifiedCountry(countryMap[countryCode] || countryCode);
    }
    
    return formatted;
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIban(e.target.value);
    form.setValue('iban', formatted.replace(/\s/g, ''));
  };

  if (step === 'calling') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Security Call in Progress</h2>
              <p className="text-gray-600 mt-2">{processingStage}</p>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Transfer Details</h3>
                <div className="space-y-1">
                  <p><span className="font-medium">Amount:</span> €{formData?.amount}</p>
                  <p><span className="font-medium">To:</span> {formData?.recipientName}</p>
                  <p><span className="font-medium">IBAN:</span> {formData?.iban}</p>
                  {identifiedCountry && (
                    <p><span className="font-medium">Country:</span> {identifiedCountry}</p>
                  )}
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
              <p className="text-gray-600 mt-2">Your international payment has been processed</p>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Payment Details</h3>
                <div className="space-y-1 text-green-800">
                  <p><span className="font-medium">Amount:</span> €{formData?.amount}</p>
                  <p><span className="font-medium">To:</span> {formData?.recipientName}</p>
                  <p><span className="font-medium">IBAN:</span> {formData?.iban}</p>
                  <p><span className="font-medium">Reference:</span> {transferReference}</p>
                  <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
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
                className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
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
      <div className="bg-[#7c3aed] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/payments')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>IBAN Transfer</span>
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
            <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-xl flex items-center justify-center mr-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>IBAN Transfer</h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>International bank transfer</p>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent text-sm bg-white shadow-sm"
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
                type="text"
                {...form.register('recipientName')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                placeholder="Enter full name"
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
                type="text"
                {...form.register('iban')}
                onChange={handleIbanChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                placeholder="GB29 NWBK 6016 1331 9268 19"
                maxLength={39}
              />
              {identifiedCountry && (
                <div className="mt-2 bg-purple-50 p-2 rounded text-xs text-purple-800 flex items-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  <Globe className="w-4 h-4 mr-1" />
                  {identifiedCountry}
                </div>
              )}
              {form.formState.errors.iban && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.iban.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                {...form.register('amount')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                placeholder="0.00"
              />
              {form.formState.errors.amount && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Reference
              </label>
              <input
                type="text"
                {...form.register('reference')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                placeholder="Payment reference"
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>

            <div className="bg-purple-50 rounded-xl p-4 flex items-start space-x-3 mt-6">
              <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Voice Confirmation Required
                </p>
                <p className="text-xs text-purple-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  You'll receive a phone call to confirm this international transfer before processing.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#7c3aed] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform mt-6"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Send Transfer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}