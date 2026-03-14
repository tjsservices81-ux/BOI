import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ChevronLeft, ArrowUpDown, Check, AlertCircle, X } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { generateReference, syncBalanceToServer } from "../utils/transferUtils";
import { getUserCurrency, formatCurrency, type Currency } from "../utils/currencyUtils";
import { sendTransferNotification } from "../utils/notifications";

const internalTransferSchema = z.object({
  fromAccount: z.string().min(1, "Please select a source account"),
  toAccount: z.string().min(1, "Please select a destination account"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Please enter a valid amount")
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 50000;
    }, "Maximum transfer amount is 50,000"),
  reference: z.string().max(140, "Reference cannot exceed 140 characters").optional()
});

type InternalTransferData = z.infer<typeof internalTransferSchema>;

export default function InternalTransfer() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'cancelled'>('form');
  const [transferReference, setTransferReference] = useState<string>('');
  const [formData, setFormData] = useState<InternalTransferData | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedFromAccount, setSelectedFromAccount] = useState<any>(null);
  const [selectedToAccount, setSelectedToAccount] = useState<any>(null);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');

  const form = useForm<InternalTransferData>({
    resolver: zodResolver(internalTransferSchema),
    defaultValues: {
      fromAccount: '',
      toAccount: '',
      amount: '',
      reference: ''
    }
  });

  useEffect(() => {
    const userAccounts = UserDataManager.getUserData('bankAccounts', []) || [];
    setAccounts(userAccounts);
    setUserCurrency(getUserCurrency());
  }, []);

  useEffect(() => {
    const fromAccountId = form.watch('fromAccount');
    const toAccountId = form.watch('toAccount');
    
    if (fromAccountId) {
      const account = accounts.find(acc => acc.id === fromAccountId);
      setSelectedFromAccount(account);
    }
    
    if (toAccountId) {
      const account = accounts.find(acc => acc.id === toAccountId);
      setSelectedToAccount(account);
    }
  }, [form.watch('fromAccount'), form.watch('toAccount'), accounts]);

  const onSubmit = (data: InternalTransferData) => {
    // Validate that from and to accounts are different
    if (data.fromAccount === data.toAccount) {
      form.setError('toAccount', { 
        type: 'manual', 
        message: 'Cannot transfer to the same account' 
      });
      return;
    }

    // Check if source account has sufficient balance
    const sourceAccountCheck = accounts.find(acc => acc.id.toString() === data.fromAccount);
    const transferAmount = parseFloat(data.amount);
    
    if (sourceAccountCheck) {
      const currentBalance = typeof sourceAccountCheck.balance === 'string' ? parseFloat(sourceAccountCheck.balance) : sourceAccountCheck.balance;
      if (currentBalance < transferAmount) {
        setStep('cancelled');
        return;
      }
    }

    // Set selected accounts based on form data
    const sourceAccount = accounts.find(acc => acc.id.toString() === data.fromAccount);
    const destinationAccount = accounts.find(acc => acc.id.toString() === data.toAccount);
    
    setSelectedFromAccount(sourceAccount);
    setSelectedToAccount(destinationAccount);
    setFormData(data);
    setStep('confirm');
  };

  const confirmTransfer = () => {
    console.log('confirmTransfer called', { 
      formData, 
      step,
      accounts: accounts.length 
    });
    
    if (!formData) {
      console.log('Missing formData');
      alert('Missing form data');
      return;
    }
    
    // Find accounts from form data
    const fromAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
    const toAccount = accounts.find(acc => acc.id.toString() === formData.toAccount);
    
    if (!fromAccount) {
      console.log('Could not find source account with ID:', formData.fromAccount);
      alert('Could not find source account');
      return;
    }
    
    if (!toAccount) {
      console.log('Could not find destination account with ID:', formData.toAccount);
      alert('Could not find destination account');
      return;
    }

    const reference = generateReference();
    setTransferReference(reference);

    const transferAmount = parseFloat(formData.amount);
    const timestamp = new Date().toISOString();

    // Create debit transaction for source account
    const debitTransaction = {
      id: Date.now(),
      accountId: fromAccount.id,
      amount: `-${transferAmount.toFixed(2)}`,
      description: `Internal Transfer to ${toAccount.displayName}`,
      timestamp,
      category: 'transfer',
      type: 'debit',
      paymentMethod: 'Internal Transfer',
      reference,
      recipientName: toAccount.displayName,
      recipientAccount: toAccount.accountNumber,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id
    };

    // Create credit transaction for destination account
    const creditTransaction = {
      id: Date.now() + 1,
      accountId: toAccount.id,
      amount: `+${transferAmount.toFixed(2)}`,
      description: `Internal Transfer from ${fromAccount.displayName}`,
      timestamp,
      category: 'transfer',
      type: 'credit',
      paymentMethod: 'Internal Transfer',
      reference,
      recipientName: fromAccount.displayName,
      recipientAccount: fromAccount.accountNumber,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id
    };

    // Update account balances
    const currentAccounts = UserDataManager.getUserData('bankAccounts', []) || [];
    const updatedAccounts = currentAccounts.map((acc: any) => {
      if (acc.id.toString() === fromAccount.id.toString()) {
        const currentBalance = typeof acc.balance === 'string' ? parseFloat(acc.balance) : acc.balance;
        return { ...acc, balance: (currentBalance - transferAmount).toFixed(2) };
      }
      if (acc.id.toString() === toAccount.id.toString()) {
        const currentBalance = typeof acc.balance === 'string' ? parseFloat(acc.balance) : acc.balance;
        return { ...acc, balance: (currentBalance + transferAmount).toFixed(2) };
      }
      return acc;
    });
    UserDataManager.setUserData('bankAccounts', updatedAccounts);

    // Add transactions
    const currentTransactions = UserDataManager.getUserData('bankTransactions', []) || [];
    const updatedTransactions = [...currentTransactions, debitTransaction, creditTransaction];
    UserDataManager.setUserData('bankTransactions', updatedTransactions);

    // Dispatch update events with updated data
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { accounts: updatedAccounts }
    }));
    window.dispatchEvent(new CustomEvent('accountsUpdate', {
      detail: { accounts: updatedAccounts, source: 'internal-transfer' }
    }));
    
    // Update balances in database (background)
    const fromNewBalance = (parseFloat(fromAccount.balance) - transferAmount).toFixed(2);
    const toNewBalance = (parseFloat(toAccount.balance) + transferAmount).toFixed(2);
    
    // Sync balances to server (with offline queue if needed)
    syncBalanceToServer(String(fromAccount.id), fromNewBalance);
    syncBalanceToServer(String(toAccount.id), toNewBalance);

    // ✅ INTERNAL TRANSFER COMPLETED SUCCESSFULLY - NOW SEND EMAIL CONFIRMATION
    console.log('🔵 INTERNAL TRANSFER COMPLETED - Starting email confirmation process');
    try {
      // Try multiple sources for user data
      let userProfile = UserDataManager.getUserData('userProfile', null);
      
      // If userProfile is null, try getting from auth system
      if (!userProfile) {
        const bankingUser = localStorage.getItem('bankingUser');
        if (bankingUser) {
          try {
            userProfile = JSON.parse(bankingUser);
            console.log('User profile found in auth system:', userProfile ? 'YES' : 'NO');
          } catch (e) {
            console.log('Failed to parse banking user data');
          }
        }
      }
      
      // If still no profile, try UserDataManager's getUserProfile method
      if (!userProfile) {
        userProfile = UserDataManager.getUserProfile();
      }
      
      console.log('User profile found:', userProfile ? 'YES' : 'NO');
      console.log('User email:', userProfile?.email);
      
      if (userProfile && userProfile.email) {
        const timestamp = new Date().toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Dublin'
        });
        
        const currency = userProfile.currency === 'GBP' ? '£' : '€';
        
        const emailRequest = {
          userEmail: userProfile.email,
          senderName: userProfile.name,
          recipientName: toAccount.displayName,
          amount: transferAmount.toFixed(2),
          currency: currency,
          transactionReference: reference,
          accountInfo: `${fromAccount.displayName} (${fromAccount.accountNumber})`,
          transferData: {
            ...debitTransaction,
            paymentMethod: 'Internal Transfer',
            fromAccountName: fromAccount.displayName,
            toAccountName: toAccount.displayName
          }
        };

        // Send email confirmation after successful internal transfer
        console.log('🔵 Making internal transfer email API request to:', '/api/send-transfer-email');
        console.log('🔵 Internal transfer email request payload:', emailRequest);
        
        fetch('/api/send-transfer-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(emailRequest)
        }).then(response => {
          console.log('🔵 Internal transfer email API response status:', response.status);
          if (response.ok) {
            console.log('✅ Internal transfer confirmation email sent successfully to:', userProfile.email);
            return response.json();
          } else {
            console.error('❌ Failed to send internal transfer confirmation email. Status:', response.status);
            return response.text().then(text => {
              console.error('Error response:', text);
            });
          }
        }).catch(error => {
          console.error('🔴 Internal transfer email confirmation request failed:', error);
        });
      } else {
        console.warn('⚠️ No user email found - internal transfer confirmation email not sent');
      }
    } catch (emailError) {
      console.error('❌ Error sending internal transfer confirmation email:', emailError);
    }

    // Send push notification for completed transfer (5-second delay)
    sendTransferNotification(toAccount.displayName, transferAmount.toFixed(2));

    setStep('success');
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (step === 'success') {
    return (
      <div className="h-screen flex flex-col bg-white page-slide-in-right">
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/payments')} className="flex items-center text-white">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>Transfer Complete</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Successful
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {formatCurrency(parseFloat(formData?.amount || '0'), userCurrency)} has been transferred from {selectedFromAccount?.displayName} to {selectedToAccount?.displayName}
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Reference Number
              </p>
              <p className="font-mono text-sm font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {transferReference}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#126987] text-white py-4 rounded-2xl font-semibold active:scale-98 transition-transform android-no-highlight"
              style={{ 
                fontFamily: 'OpenSans, sans-serif',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none'
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm' && formData) {
    console.log('Confirmation screen debug:', {
      formData,
      accounts,
      accountIds: accounts.map(a => ({ id: a.id, name: a.displayName }))
    });
    
    const confirmFromAccount = accounts.find(acc => acc.id.toString() === formData.fromAccount);
    const confirmToAccount = accounts.find(acc => acc.id.toString() === formData.toAccount);
    
    console.log('Account lookup results:', {
      confirmFromAccount,
      confirmToAccount,
      fromAccountId: formData.fromAccount,
      toAccountId: formData.toAccount
    });
    
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-white page-slide-in-right">
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('form')} className="flex items-center text-white">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>Confirm Transfer</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>From:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {confirmFromAccount?.displayName || 'Unknown Account'}
                  </p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {confirmFromAccount?.accountNumber}
                  </p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Balance: {(() => {
                      if (!confirmFromAccount) return formatCurrency(0, userCurrency);
                      const balance = typeof confirmFromAccount.balance === 'string' ? parseFloat(confirmFromAccount.balance) : confirmFromAccount.balance;
                      return formatCurrency(balance, userCurrency);
                    })()}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {confirmToAccount?.displayName || 'Unknown Account'}
                  </p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {confirmToAccount?.accountNumber}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <span className="font-bold text-xl text-[#126987]" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {formatCurrency(parseFloat(formData?.amount || '0'), userCurrency)}
                </span>
              </div>
              
              {formData?.reference && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {formData.reference}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Instant Transfer
                </p>
                <p className="text-sm text-blue-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  This transfer between your Bank of Ireland accounts will be processed immediately.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              console.log('Button clicked, calling confirmTransfer');
              confirmTransfer();
            }}
            className="w-full bg-[#126987] text-white py-4 rounded-2xl font-semibold active:scale-98 transition-transform android-no-highlight"
            style={{ 
              fontFamily: 'OpenSans, sans-serif',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none'
            }}
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    );
  }

  if (step === 'cancelled') {
    return (
      <div className="h-screen flex flex-col bg-white page-fade-in">
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

  return (
    <div className="h-screen flex flex-col bg-white page-slide-in-right">
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/payments')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>Between BOI Accounts</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#126987] to-[#5a7b85] rounded-xl flex items-center justify-center mr-4">
              <ArrowUpDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Between BOI Accounts
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Transfer money between your own accounts
              </p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                From Account
              </label>
              <select
                {...form.register('fromAccount')}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Select source account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} - {formatCurrency(account.balance, userCurrency)}
                  </option>
                ))}
              </select>
              {form.formState.errors.fromAccount && (
                <p className="mt-2 text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {form.formState.errors.fromAccount.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                To Account
              </label>
              <select
                {...form.register('toAccount')}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Select destination account</option>
                {accounts.filter(acc => acc.id !== form.watch('fromAccount')).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} - {account.accountNumber}
                  </option>
                ))}
              </select>
              {form.formState.errors.toAccount && (
                <p className="mt-2 text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {form.formState.errors.toAccount.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Amount ({getUserCurrency()})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="50000"
                placeholder="0.00"
                {...form.register('amount')}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.amount && (
                <p className="mt-2 text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter a reference for this transfer"
                {...form.register('reference')}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.reference && (
                <p className="mt-2 text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {form.formState.errors.reference.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#126987] text-white py-4 rounded-2xl font-semibold active:scale-98 transition-transform"
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