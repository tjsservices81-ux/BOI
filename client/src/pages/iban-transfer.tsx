import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAccounts, processTransfer, getAccountById } from "../utils/transactionStore";

const ibanTransferSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  iban: z.string().min(15, "Valid IBAN required").regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/, "Invalid IBAN format"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().min(1, "Reference is required"),
  fromAccount: z.string().min(1, "Please select an account")
});

type IbanTransferData = z.infer<typeof ibanTransferSchema>;

export default function IbanTransfer() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [transferReference, setTransferReference] = useState<string>('');

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

  const accounts = getAccounts().map(account => ({
    id: account.id,
    name: account.name,
    number: account.number,
    balance: account.displayBalance
  }));

  const onSubmit = (data: IbanTransferData) => {
    const ref = `BOI${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setTransferReference(ref);
    setStep('confirm');
  };

  const executeTransfer = () => {
    setTimeout(() => {
      // Process the transfer and update balances
      const formData = form.getValues();
      const transferAmount = parseFloat(formData.amount);
      
      const result = processTransfer(
        formData.fromAccount,
        transferAmount,
        `International transfer to ${formData.recipientName}`,
        transferReference,
        formData.recipientName,
        undefined, // No sort code for IBAN
        formData.iban
      );
      
      if (result.success) {
        setStep('success');
      } else {
        alert('Transfer failed: Insufficient funds or invalid account');
      }
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div>
        <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Transfer Complete
          </span>
        </div>

        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Transfer Successful
            </h1>
            
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Your international transfer has been processed successfully
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{transferReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{form.getValues('amount')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{form.getValues('recipientName')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Status:</span>
                  <span className="font-semibold text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Processing</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#4a6b75] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    const formData = form.getValues();
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);

    return (
      <div>
        <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('form')} className="flex items-center text-white">
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
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{selectedAccount?.name}</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>{selectedAccount?.number}</p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>To:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData.recipientName}</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>{formData.iban}</p>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Amount:</span>
                <span className="font-semibold text-[#4a6b75] text-xl" style={{ fontFamily: 'OpenSans, sans-serif' }}>€{formData.amount}</span>
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
                International Transfer
              </p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                This transfer will be processed within 1-3 business days. Fees may apply.
              </p>
            </div>
          </div>

          <button
            onClick={executeTransfer}
            className="w-full bg-[#4a6b75] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    );
  }

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
      <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a6b75] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Select account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.number} - {account.balance}
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a6b75] focus:border-transparent text-sm bg-white shadow-sm"
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
                placeholder="IE29 AIBK 9311 5212 3456 78"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a6b75] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
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
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a6b75] focus:border-transparent text-sm bg-white shadow-sm"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4a6b75] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              />
              {form.formState.errors.reference && (
                <p className="text-red-500 text-xs mt-2 font-medium">{form.formState.errors.reference.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-bold active:scale-98 transition-transform text-sm shadow-md"
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