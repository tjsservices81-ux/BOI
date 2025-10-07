import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, User, ArrowUpDown, Globe, MapPin, Clock, Users, X, Trash2 } from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";
import { getUserCurrency, getCurrencySymbol } from "../utils/currencyUtils";

export default function Payments() {
  const [, navigate] = useLocation() || ['/', () => {}];
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [showRecentPayees, setShowRecentPayees] = useState(false);
  const [recentPayees, setRecentPayees] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{name: string, accountInfo: string} | null>(null);
  const [showAddPayee, setShowAddPayee] = useState(false);
  const [newPayeeData, setNewPayeeData] = useState({
    name: '',
    transferType: 'SEPA Transfer',
    iban: '',
    bicCode: '',
    sortCode: '',
    accountNumber: ''
  });
  const [transferSettings, setTransferSettings] = useState(() => 
    UserDataManager.getUserData('transferSettings', null) || {
      showSepaTransfer: true,
      showUkTransfer: true,
      showInternalTransfer: true
    }
  );

  const allPaymentOptions = [
    {
      id: 'iban',
      title: 'SEPA Transfer',
      subtitle: 'Transfer within the SEPA zone',
      icon: <Globe className="w-6 h-6 text-[#126987]" />,
      description: 'Send money within the SEPA zone using IBAN',
      popular: true,
      visible: transferSettings.showSepaTransfer
    },
    {
      id: 'domestic',
      title: 'UK Bank Transfer',
      subtitle: 'Account number and sort code',
      icon: <MapPin className="w-6 h-6 text-[#126987]" />,
      description: 'Transfer to UK bank accounts',
      popular: false,
      visible: transferSettings.showUkTransfer
    },
    {
      id: 'internal',
      title: 'Between BOI Accounts',
      subtitle: 'Move money between your accounts',
      icon: <ArrowUpDown className="w-6 h-6 text-[#126987]" />,
      description: 'Instant transfer between your BOI accounts',
      popular: false,
      visible: transferSettings.showInternalTransfer
    }
  ];

  // Filter to only show visible payment options
  const paymentOptions = allPaymentOptions.filter(option => option.visible);

  // Load recent payments and payees using UserDataManager
  useEffect(() => {
    const loadRecentPayments = () => {
      const storedTransactions = UserDataManager.getUserData('bankTransactions', []);
      // Filter for transfer transactions and get the most recent 5
      const transferTransactions = storedTransactions
        .filter((tx: any) => tx.category === 'transfer')
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      setRecentPayments(transferTransactions);
    };

    const loadRecentPayees = () => {
      setRecentPayees(UserDataManager.getRecentPayees());
    };

    const loadTransferSettings = () => {
      UserDataManager.clearCache('transferSettings');
      const settings = UserDataManager.getUserData('transferSettings', null) || {
        showSepaTransfer: true,
        showUkTransfer: true,
        showInternalTransfer: true
      };
      setTransferSettings(settings);
    };

    loadRecentPayments();
    loadRecentPayees();
    
    // Listen for new transactions
    const handleTransactionUpdate = () => {
      loadRecentPayments();
      loadRecentPayees();
    };

    // Listen for transfer settings changes
    const handleTransferSettingsUpdate = () => {
      loadTransferSettings();
    };

    window.addEventListener('transactionUpdate', handleTransactionUpdate);
    window.addEventListener('transferSettingsUpdate', handleTransferSettingsUpdate);
    return () => {
      window.removeEventListener('transactionUpdate', handleTransactionUpdate);
      window.removeEventListener('transferSettingsUpdate', handleTransferSettingsUpdate);
    };
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

  // Recent payees helper functions
  const handlePayeeSelect = (payee: any) => {
    // Store selected payee data for pre-filling the form
    sessionStorage.setItem('selectedPayee', JSON.stringify(payee));
    
    if (payee.transferType === 'UK Transfer') {
      navigate('/uk-transfer');
    } else if (payee.transferType === 'SEPA Transfer') {
      navigate('/iban-transfer');
    }
    setShowRecentPayees(false);
  };

  const handleDeletePayee = (payee: any) => {
    setDeleteConfirm({ name: payee.name, accountInfo: payee.accountInfo });
  };

  const confirmDeletePayee = () => {
    if (deleteConfirm) {
      // Remove from UserDataManager and get updated list
      const updatedPayees = UserDataManager.removeRecentPayee(deleteConfirm.name, deleteConfirm.accountInfo);
      
      // Clear cache to ensure fresh data
      UserDataManager.clearCache('recentPayees');
      
      // Update local state immediately for instant UI refresh
      setRecentPayees(updatedPayees);
      
      // Close confirmation modal immediately
      setDeleteConfirm(null);
    }
  };

  const handleAddPayee = () => {
    if (!newPayeeData.name.trim()) {
      alert('Please enter payee name');
      return;
    }

    let accountInfo = '';
    if (newPayeeData.transferType === 'SEPA Transfer') {
      if (!newPayeeData.iban.trim()) {
        alert('Please enter IBAN');
        return;
      }
      accountInfo = newPayeeData.iban.trim();
    } else if (newPayeeData.transferType === 'UK Transfer') {
      const sortCode = newPayeeData.sortCode.trim();
      const accountNumber = newPayeeData.accountNumber.trim();
      
      // Validate sort code format: XX-XX-XX (6 digits)
      const sortCodeRegex = /^\d{2}-\d{2}-\d{2}$/;
      if (!sortCodeRegex.test(sortCode)) {
        alert('Sort code must be in format XX-XX-XX (e.g., 04-00-04)');
        return;
      }
      
      // Validate account number: exactly 8 digits
      const accountNumberRegex = /^\d{8}$/;
      if (!accountNumberRegex.test(accountNumber)) {
        alert('Account number must be exactly 8 digits');
        return;
      }
      
      accountInfo = `${sortCode} ${accountNumber}`;
    }

    const payee = {
      name: newPayeeData.name.trim(),
      accountInfo: accountInfo,
      transferType: newPayeeData.transferType,
      bicCode: newPayeeData.bicCode.trim() || undefined,
      timestamp: new Date().toISOString()
    };

    UserDataManager.addRecentPayee(payee);
    UserDataManager.clearCache('recentPayees');
    setRecentPayees(UserDataManager.getRecentPayees());

    // Reset form and close modal
    setNewPayeeData({
      name: '',
      transferType: 'SEPA Transfer',
      iban: '',
      bicCode: '',
      sortCode: '',
      accountNumber: ''
    });
    setShowAddPayee(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white ios-safe-top ios-safe-bottom page-container page-fade-in">
      {/* Header */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 mr-2" />
          <span className="font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Payments
          </span>
        </button>
        <button 
          onClick={() => navigate("/profile")}
          className="text-white active:scale-95 transition-transform"
        >
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
          {paymentOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => {
                if (option.id === 'iban') navigate('/iban-transfer');
                else if (option.id === 'domestic') navigate('/uk-transfer');
                else if (option.id === 'internal') navigate('/internal-transfer');
                else setSelectedPaymentType(option.id);
              }}
              className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-98 transition-all duration-200 border-2 border-transparent hover:border-[#126987]/20 stagger-item card-interactive"
              style={{ animationDelay: `${index * 0.1}s` }}
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
                        <span className="bg-[#126987] text-white text-xs px-2 py-0.5 rounded-full">
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
            <button 
              onClick={() => setShowRecentPayees(true)}
              className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recent Payees
              </span>
            </button>
            <button 
              onClick={() => setShowAddPayee(true)}
              className="bg-blue-50 rounded-xl p-4 text-center active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-4 h-4 text-white" />
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
                const recipientName = payment.description.replace(/^(UK Transfer to |SEPA Transfer to |International Transfer to |IBAN Transfer to )/, '');
                
                return (
                  <button key={payment.id || index} className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {payment.paymentMethod === 'UK Transfer' ? (
                          <MapPin className="w-5 h-5 text-[#126987]" />
                        ) : (
                          <Globe className="w-5 h-5 text-[#126987]" />
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
                        {(() => {
                          const userCurrency = getUserCurrency();
                          const currencySymbol = getCurrencySymbol(userCurrency);
                          return `${currencySymbol}${displayAmount.replace('-', '')}`;
                        })()}
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

      {/* Recent Payees Modal */}
      {showRecentPayees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Recent Payees
              </h3>
              <button
                onClick={() => setShowRecentPayees(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {recentPayees.length > 0 ? (
                <div className="p-4 space-y-3">
                  {recentPayees.map((payee, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <button
                        onClick={() => handlePayeeSelect(payee)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-gray-900 text-sm mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {payee.name}
                        </div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {payee.accountInfo} • {payee.transferType}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Instant delete without confirmation for better UX
                          const updatedPayees = UserDataManager.removeRecentPayee(payee.name, payee.accountInfo);
                          UserDataManager.clearCache('recentPayees');
                          setRecentPayees(updatedPayees);
                        }}
                        className="ml-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    No recent payees
                  </p>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Complete a transfer to see payees here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Payee Modal */}
      {showAddPayee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 text-xl" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Add Payee
              </h3>
              <button onClick={() => setShowAddPayee(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payee Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Payee Name
                </label>
                <input
                  type="text"
                  value={newPayeeData.name}
                  onChange={(e) => setNewPayeeData({ ...newPayeeData, name: e.target.value })}
                  placeholder="Enter payee name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Transfer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Type
                </label>
                <select
                  value={newPayeeData.transferType}
                  onChange={(e) => setNewPayeeData({ ...newPayeeData, transferType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  <option value="SEPA Transfer">SEPA Transfer</option>
                  <option value="UK Transfer">UK Transfer</option>
                </select>
              </div>

              {/* SEPA Fields */}
              {newPayeeData.transferType === 'SEPA Transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={newPayeeData.iban}
                      onChange={(e) => setNewPayeeData({ ...newPayeeData, iban: e.target.value })}
                      placeholder="IE29 AIBK 9311 5212 3456 78"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      BIC Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={newPayeeData.bicCode}
                      onChange={(e) => setNewPayeeData({ ...newPayeeData, bicCode: e.target.value })}
                      placeholder="AIBKIE2D"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    />
                  </div>
                </>
              )}

              {/* UK Fields */}
              {newPayeeData.transferType === 'UK Transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Sort Code
                    </label>
                    <input
                      type="text"
                      value={newPayeeData.sortCode}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d]/g, '');
                        if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
                        if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5);
                        value = value.slice(0, 8);
                        setNewPayeeData({ ...newPayeeData, sortCode: value });
                      }}
                      placeholder="04-00-04"
                      maxLength={8}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={newPayeeData.accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                        setNewPayeeData({ ...newPayeeData, accountNumber: value });
                      }}
                      placeholder="12345678"
                      maxLength={8}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#126987]"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddPayee(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayee}
                className="flex-1 px-4 py-3 bg-[#126987] text-white rounded-xl font-medium"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Add Payee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Remove Payee
            </h3>
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Are you sure you want to remove "{deleteConfirm.name}" from your recent payees?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePayee}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}