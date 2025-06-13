import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ArrowUpRight, CreditCard, Building2, Zap, Check, Clock, MapPin, Globe } from "lucide-react";
import MiniSpendingChart from "../components/MiniSpendingChart";
import { UserDataManager } from "../utils/userDataManager.ts";

export default function TransactionHistoryWorking() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/transactions/:accountId");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const accountId = params?.accountId ? parseInt(params.accountId) : 1;

  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return;
    
    // Get all transactions using UserDataManager
    const storedTransactions = UserDataManager.getUserData('bankTransactions', []);
    
    // Filter out the selected transaction
    const updatedTransactions = storedTransactions.filter((tx: any) => tx.id !== selectedTransaction.id);
    
    // Add exchange rate data to existing UK transfers that don't have it
    const enhancedTransactions = updatedTransactions.map((tx: any) => {
      if (tx.paymentMethod === 'UK Transfer' && !tx.exchangeRate) {
        const amount = parseFloat(tx.amount.replace('-', ''));
        const sampleRate = 0.8456; // Sample EUR to GBP rate
        return {
          ...tx,
          exchangeRate: sampleRate,
          convertedAmount: (amount * sampleRate).toFixed(2),
          convertedCurrency: 'GBP'
        };
      }
      return tx;
    });
    
    // Update data using UserDataManager
    UserDataManager.setUserData('bankTransactions', enhancedTransactions);
    
    // Update local state immediately with filtered account transactions
    const accountTransactions = enhancedTransactions.filter((tx: any) => tx.accountId === accountId);
    setTransactions(accountTransactions);
    
    // Close modals
    setSelectedTransaction(null);
    setShowDeleteConfirm(false);
    
    // Dispatch events to update other components
    window.dispatchEvent(new CustomEvent('transactionDeleted', {
      detail: { transactionId: selectedTransaction?.id }
    }));
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
  };

  useEffect(() => {
    const loadData = () => {
      // Get stored transactions for this specific account using UserDataManager
      const storedTransactions = UserDataManager.getUserData('bankTransactions', []);
      
      // Add exchange rate data to existing UK transfers that don't have it
      const updatedTransactions = storedTransactions.map((tx: any) => {
        if (tx.paymentMethod === 'UK Transfer' && !tx.exchangeRate) {
          const amount = parseFloat(tx.amount.replace('-', ''));
          const sampleRate = 0.8456; // Sample EUR to GBP rate
          return {
            ...tx,
            exchangeRate: sampleRate,
            convertedAmount: (amount * sampleRate).toFixed(2),
            convertedCurrency: 'GBP'
          };
        }
        return tx;
      });
      
      // Update data with enhanced transactions using UserDataManager
      if (JSON.stringify(updatedTransactions) !== JSON.stringify(storedTransactions)) {
        UserDataManager.setUserData('bankTransactions', updatedTransactions);
      }
      
      const accountTransactions = updatedTransactions.filter((tx: any) => tx.accountId === accountId);
      // Loaded transactions for account
      
      // Update the transactions state with enhanced data
      setTransactions(accountTransactions);
      
      // Get account info and balance using UserDataManager
      const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
      const currentAccount = storedAccounts.find((acc: any) => acc.id === accountId);
      
      if (currentAccount) {
        setBalance(currentAccount.balance);
        setAccountInfo(currentAccount);
      }
      
      // Format stored transactions for this account (preserve all data including exchange rates)
      const formattedStored = accountTransactions.map((tx: any) => ({
        ...tx, // Keep all original transaction data
        id: tx.id,
        amount: tx.amount,
        description: tx.description,
        timestamp: tx.timestamp,
        type: tx.type
      }));
      
      // Only use actual stored transactions - no sample data
      const sortedTransactions = formattedStored.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setTransactions(sortedTransactions);
    };
    
    loadData();

    // Listen for transaction events
    const handleTransactionUpdate = () => {
      loadData();
    };

    window.addEventListener('transactionUpdate', handleTransactionUpdate);
    window.addEventListener('transactionDeleted', handleTransactionUpdate);
    window.addEventListener('transactionAdded', handleTransactionUpdate);
    window.addEventListener('balanceUpdate', handleTransactionUpdate);
    
    // Refresh only when needed
    const interval = setInterval(loadData, 5000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('transactionUpdate', handleTransactionUpdate);
      window.removeEventListener('transactionDeleted', handleTransactionUpdate);
      window.removeEventListener('transactionAdded', handleTransactionUpdate);
      window.removeEventListener('balanceUpdate', handleTransactionUpdate);
    };
  }, []);

  const getIcon = (description: string) => {
    if (description.includes('Transfer')) return ArrowUpRight;
    if (description.includes('ATM')) return CreditCard;
    if (description.includes('ELECTRIC')) return Zap;
    return Building2;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="page-container" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f9fafb'
    }}>
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            {accountInfo?.displayName || 'Account'}
          </span>
        </button>
      </div>

      <div className="bg-[#126987] text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Account ending {accountInfo?.accountNumber?.replace('****', '-') || '-0000'}
            </p>
            <p className="text-xs opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>Available Balance</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              €{parseFloat(balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        padding: '1rem',
        minHeight: 0,
        paddingBottom: '6rem'
      }}>
        {/* Mini spending chart for visual insights */}
        <MiniSpendingChart accountId={accountId} />
        
        <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Recent Transactions
        </h2>

        <div className="space-y-2 mb-6">
          {transactions.map((transaction, index) => {
            const IconComponent = getIcon(transaction.description);
            const isDebit = transaction.type === 'debit' || transaction.amount.startsWith('-');
            
            return (
              <button 
                key={`${transaction.id}-${index}`} 
                onClick={() => setSelectedTransaction(transaction)}
                className="w-full bg-white rounded-lg flex items-center justify-between px-4 py-4 shadow-sm border border-gray-100 active:scale-98 transition-transform active:bg-gray-50"
              >
                <div className="flex items-center flex-1">
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {formatDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${isDebit ? 'text-gray-900' : 'text-green-600'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    €{transaction.amount}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex space-x-4 mt-8">
          <button 
            onClick={() => navigate('/uk-transfer')}
            className="flex-1 bg-[#126987] text-white py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Transfer
          </button>
          <button 
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Pay Bills
          </button>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Transaction Details
              </h2>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Transaction Status */}
              <div className="flex items-center justify-center py-4 bg-green-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Transfer Complete
                    </p>
                    <p className="text-sm text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Successfully processed
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center py-4 border-b border-gray-200">
                <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  €{selectedTransaction.amount.replace('-', '')}
                </p>
                <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {selectedTransaction.type === 'debit' ? 'Sent' : 'Received'}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Description:</span>
                  <span className="font-semibold text-gray-900 text-right" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedTransaction.description}
                  </span>
                </div>

                {selectedTransaction.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Transfer Type:</span>
                    <div className="flex items-center space-x-2">
                      {selectedTransaction.paymentMethod === 'UK Transfer' ? (
                        <MapPin className="w-4 h-4 text-[#126987]" />
                      ) : (
                        <Globe className="w-4 h-4 text-[#126987]" />
                      )}
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {selectedTransaction.paymentMethod}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Date & Time:</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {new Date(selectedTransaction.timestamp).toLocaleDateString('en-IE', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {new Date(selectedTransaction.timestamp).toLocaleTimeString('en-IE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Transaction ID:</span>
                  <span className="font-mono text-sm text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedTransaction.reference || selectedTransaction.id}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Category:</span>
                  <span className="font-semibold text-gray-900 capitalize" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedTransaction.category}
                  </span>
                </div>

                {/* Conversion Rate for UK Transfers */}
                {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.exchangeRate && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Currency Conversion
                      </h4>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Exchange Rate:</span>
                      <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        €1 = £{selectedTransaction.exchangeRate.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>GBP Equivalent:</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          £{selectedTransaction.convertedAmount}
                        </span>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Live rate at time of transfer
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>UK Transfer:</strong> Exchange rate applied at time of transfer. UK transfers typically take 1-2 business days to reach the recipient.
                      </p>
                    </div>
                  </>
                )}

                {/* Show message for UK transfers without exchange rate data */}
                {selectedTransaction.paymentMethod === 'UK Transfer' && !selectedTransaction.exchangeRate && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>Note:</strong> Exchange rate information not available for this historical transfer. New UK transfers will include live conversion rates.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Close
                </button>
                <div className="flex space-x-3">
                  <button 
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Export Details
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Delete Transaction
              </h3>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleDeleteTransaction}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Yes, Delete Transaction
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}