import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, User, ArrowUpDown, Globe, MapPin, Clock } from "lucide-react";

export default function Payments() {
  const [, navigate] = useLocation();
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  const paymentOptions = [
    {
      id: 'iban',
      title: 'European Transfer',
      subtitle: 'IBAN transfer to any European bank',
      icon: <Globe className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Send money to Europe using IBAN',
      popular: true
    },
    {
      id: 'domestic',
      title: 'UK Bank Transfer',
      subtitle: 'Account number and sort code',
      icon: <MapPin className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Transfer to UK bank accounts',
      popular: false
    },
    {
      id: 'internal',
      title: 'Between BOI Accounts',
      subtitle: 'Move money between your accounts',
      icon: <ArrowUpDown className="w-6 h-6 text-[#4a6b75]" />,
      description: 'Instant transfer between your BOI accounts',
      popular: false
    }
  ];

  // Load recent payments from localStorage
  useEffect(() => {
    const loadRecentPayments = () => {
      const storedTransactions = JSON.parse(localStorage.getItem('bankTransactions') || '[]');
      // Filter for transfer transactions and get the most recent 5
      const transferTransactions = storedTransactions
        .filter((tx: any) => tx.category === 'transfer')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      setRecentPayments(transferTransactions);
    };

    loadRecentPayments();
    
    // Listen for new transactions
    const handleTransactionUpdate = () => {
      loadRecentPayments();
    };

    window.addEventListener('transactionUpdate', handleTransactionUpdate);
    return () => window.removeEventListener('transactionUpdate', handleTransactionUpdate);
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#4a6b75] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 mr-2" />
          <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Payments
          </span>
        </button>
        <button className="text-white active:scale-95 transition-transform">
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 px-4 py-6 pb-32 ios-scroll overflow-y-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Send Money
          </h1>
          <p className="text-gray-600 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Choose how you'd like to send your payment
          </p>
        </div>

        {/* Payment Options */}
        <div className="space-y-4 mb-8">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                if (option.id === 'iban') navigate('/iban-transfer');
                else if (option.id === 'domestic') navigate('/uk-transfer');
                else setSelectedPaymentType(option.id);
              }}
              className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-98 transition-all duration-200 border-2 border-transparent hover:border-[#4a6b75]/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {option.title}
                      </h3>
                      {option.popular && (
                        <span className="bg-[#4a6b75] text-white text-xs px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {option.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-[#4a6b75] rounded-full flex items-center justify-center mx-auto mb-2">
                <img src="/icon-footer-payments.svg" alt="Recent" className="w-4 h-4 filter brightness-0 invert" />
              </div>
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recent Payees
              </span>
            </button>
            <button className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-[#4a6b75] rounded-full flex items-center justify-center mx-auto mb-2">
                <img src="/Add-payee.svg" alt="Add" className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Add Payee
              </span>
            </button>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Recent Payments
            </h2>
            {recentPayments.length > 0 && (
              <Clock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          
          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment, index) => {
                const isDebit = payment.type === 'debit' || payment.amount.startsWith('-');
                const displayAmount = isDebit ? payment.amount : `+${payment.amount}`;
                const recipientName = payment.description.replace(/^(UK Transfer to |IBAN Transfer to |International Transfer to )/, '');
                
                return (
                  <button key={payment.id || index} className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {payment.paymentMethod === 'UK Transfer' ? (
                          <MapPin className="w-5 h-5 text-[#4a6b75]" />
                        ) : (
                          <Globe className="w-5 h-5 text-[#4a6b75]" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {recipientName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {payment.paymentMethod} • {payment.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isDebit ? 'text-gray-900' : 'text-green-600'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        €{displayAmount.replace('-', '')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {formatDate(payment.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                No recent payments
              </p>
              <p className="text-xs text-gray-400" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Your recent transfers will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}