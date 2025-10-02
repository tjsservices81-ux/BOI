import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ArrowUpRight, CreditCard, Building2, Zap, Check, Clock, MapPin, Globe, X } from "lucide-react";
import MiniSpendingChart from "../components/MiniSpendingChart";
import { UserDataManager } from "../utils/userDataManager.ts";
import { StateManager } from "../utils/stateManager";
import { formatCurrency, getUserCurrency, getCurrencySymbol, type Currency } from "../utils/currencyUtils";

export default function TransactionHistoryWorking() {
  const locationHook = useLocation();
  const [, setLocation] = locationHook || [null, () => {}];
  const routeHook = useRoute("/transactions/:accountId");
  const [match, params] = routeHook || [false, {}];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Pay Bills state
  const [showPayBillsForm, setShowPayBillsForm] = useState(false);
  const [payBillsForm, setPayBillsForm] = useState({
    payee: '',
    amount: '',
    datetime: ''
  });
  
  const accountId = params?.accountId ? parseInt(params.accountId) : 1;

  // Enhanced navigation with smooth animations
  const navigateWithAnimation = (path: string, animationType: 'slide-right' | 'slide-left' | 'slide-up' = 'slide-right') => {
    setIsNavigating(true);
    
    // Add page transition classes
    const currentPage = document.querySelector('.page-container') || document.body;
    document.body.classList.add('page-transitioning');
    
    // Add exit animation based on type
    if (animationType === 'slide-right') {
      currentPage.classList.add('page-slide-out-left');
    } else if (animationType === 'slide-left') {
      currentPage.classList.add('page-slide-out-right');
    }
    
    // Navigate after animation starts
    setTimeout(() => {
      setLocation(path);
      setIsNavigating(false);
      document.body.classList.remove('page-transitioning');
      currentPage.classList.remove('page-slide-out-left', 'page-slide-out-right');
    }, 200);
  };

  const handlePayBillsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(payBillsForm.amount);
    if (!amount || amount <= 0 || !payBillsForm.payee || !payBillsForm.datetime) {
      alert('Please fill in all fields with valid values');
      return;
    }
    
    const currentBalance = parseFloat(balance);
    if (amount > currentBalance) {
      alert('Insufficient funds for this payment');
      return;
    }

    // Create new transaction
    const newBalance = currentBalance - amount;
    const transactionDate = new Date(payBillsForm.datetime);
    
    const newTransaction = {
      id: Date.now(),
      accountId: accountId,
      amount: `-${amount.toFixed(2)}`,
      description: payBillsForm.payee,
      category: 'bill_payment',
      type: 'debit',
      paymentMethod: 'Bill Payment',
      reference: `BP${Date.now()}`,
      timestamp: transactionDate.toISOString(),
      payee: payBillsForm.payee
    };

    // Update transactions
    const currentTransactions = UserDataManager.getUserData('bankTransactions', []);
    const updatedTransactions = [...currentTransactions, newTransaction];
    
    // Sort all transactions by timestamp (newest first)
    updatedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    UserDataManager.setUserData('bankTransactions', updatedTransactions);
    
    // Update balance
    const newBalanceString = newBalance.toFixed(2);
    setBalance(newBalanceString);
    
    // Update account balance in accounts list
    const accounts = UserDataManager.getUserAccounts();
    const updatedAccounts = accounts.map(acc => 
      acc.id === accountId ? { ...acc, balance: newBalanceString } : acc
    );
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    // Refresh transactions display with sorted transactions for this account
    const accountTransactions = updatedTransactions.filter(t => t.accountId === accountId);
    setTransactions(accountTransactions);
    
    // Reset form and close modal
    setPayBillsForm({ payee: '', amount: '', datetime: '' });
    setShowPayBillsForm(false);
    
    alert(`Payment of €${amount.toFixed(2)} to ${payBillsForm.payee} has been processed successfully.`);
  };

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
      // Clear cache to ensure we get fresh data
      UserDataManager.clearCache('bankTransactions');
      UserDataManager.clearCache('bankAccounts');
      
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
      console.log('Loaded transactions for account', accountId, ':', accountTransactions);
      
      // Don't set transactions here - wait for sorting
      
      // Load user's currency preference
      setUserCurrency(getUserCurrency());
      
      // Get account info and balance using UserDataManager
      const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
      
      // Ensure storedAccounts is an array and not null
      if (Array.isArray(storedAccounts) && storedAccounts.length > 0) {
        const currentAccount = storedAccounts.find((acc: any) => acc.id === accountId);
        
        if (currentAccount) {
          setBalance(currentAccount.balance);
          setAccountInfo(currentAccount);
        }
      } else {
        // Set default values if no accounts found
        setBalance('0.00');
        setAccountInfo({
          id: accountId,
          displayName: accountId === 1 ? "Current Account" : accountId === 2 ? "Credit Card" : "Savings Account",
          accountNumber: accountId === 1 ? "****2091" : accountId === 2 ? "****1820" : "****0978",
          balance: "0.00",
          accountType: accountId === 1 ? "current" : accountId === 2 ? "credit" : "savings"
        });
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
    
    return () => {
      window.removeEventListener('transactionUpdate', handleTransactionUpdate);
      window.removeEventListener('transactionDeleted', handleTransactionUpdate);
      window.removeEventListener('transactionAdded', handleTransactionUpdate);
      window.removeEventListener('balanceUpdate', handleTransactionUpdate);
    };
  }, []);

  // Handle scroll position persistence
  useEffect(() => {
    const currentRoute = `/transactions/${accountId}`;
    
    // Restore scroll position after component mounts
    StateManager.restoreScrollPosition(currentRoute, '.transaction-scroll-container');
    
    // Save scroll position on scroll
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        StateManager.saveScrollPosition(currentRoute, scrollContainerRef.current.scrollTop);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [accountId]);

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
    <div className="page-container h-screen bg-gray-50 flex flex-col overflow-hidden page-slide-in-right"
      style={{ backgroundColor: '#f9fafb', height: '100vh', maxHeight: '100vh' }}>
      <div className="bg-[#126987] text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigateWithAnimation('/dashboard', 'slide-left')} className="flex items-center text-white">
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {accountInfo?.displayName || 'Account'}
            </span>
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Account ending {accountInfo?.accountNumber?.replace('****', '-') || '-0000'}
            </p>
            <p className="text-xs opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>Available Balance</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {formatCurrency(balance, userCurrency)}
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="transaction-scroll-container flex-1 overflow-y-auto p-4"
        style={{ 
          minHeight: 0,
          maxHeight: 'calc(100vh - 200px)',
          paddingBottom: '100px'
        }}
        data-scroll-container
        data-scroll-route={`/transactions/${accountId}`}
      >
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
                    {formatCurrency(transaction.amount.replace('-', ''), userCurrency)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex space-x-4 mt-8">
          <button 
            onClick={() => navigateWithAnimation('/uk-transfer', 'slide-right')}
            className="flex-1 bg-[#126987] text-white py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Transfer
          </button>
          <button 
            onClick={() => setShowPayBillsForm(true)}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold text-sm"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Pay Bills
          </button>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div 
          onClick={() => setSelectedTransaction(null)}
          style={{ 
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
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] shadow-xl flex flex-col">
            {/* Fixed header with close button */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
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

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="p-6 pt-4 pb-24">
                <div className="space-y-6">
              {/* Transaction Status */}
              <div className="flex items-center justify-center py-4 bg-green-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {selectedTransaction.paymentMethod ? 'Transfer Complete' : 'Transaction Complete'}
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
                  {formatCurrency(selectedTransaction.amount.replace('-', ''), userCurrency)}
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
                    {selectedTransaction.id}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Category:</span>
                  <span className="font-semibold text-gray-900 capitalize" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {selectedTransaction.category}
                  </span>
                </div>

                {/* Recipient Information for all transfer types */}
                {(selectedTransaction.paymentMethod === 'UK Transfer' || selectedTransaction.paymentMethod === 'IBAN Transfer' || selectedTransaction.iban || selectedTransaction.recipientAccountNumber) && (
                  <>
                    {/* Recipient Name */}
                    {selectedTransaction.recipientName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Recipient:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.recipientName}
                        </span>
                      </div>
                    )}

                    {/* IBAN for SEPA Transfers */}
                    {selectedTransaction.iban && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>IBAN:</span>
                        <span className="font-semibold text-gray-900 font-mono text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.iban}
                        </span>
                      </div>
                    )}

                    {/* BIC Code for SEPA Transfers */}
                    {selectedTransaction.bicCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>BIC Code:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.bicCode}
                        </span>
                      </div>
                    )}

                    {/* Reference for IBAN Transfers */}
                    {selectedTransaction.paymentMethod === 'SEPA Transfer' && selectedTransaction.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.reference}
                        </span>
                      </div>
                    )}

                    {/* UK Transfer Details */}
                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.recipientSortCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Sort Code:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.recipientSortCode.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3')}
                        </span>
                      </div>
                    )}
                    
                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.recipientAccountNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Account Number:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.recipientAccountNumber}
                        </span>
                      </div>
                    )}

                    {/* Payment Reference for UK Transfers only */}
                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Reference:</span>
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {selectedTransaction.reference}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Conversion Rate for UK Transfers - Only show when user currency is EUR */}
                {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.exchangeRate && userCurrency === 'EUR' && (
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
                        {userCurrency === 'EUR' 
                          ? <><strong>International Transfer:</strong> UK transfers typically take 24 hours to reach the recipient.</>
                          : <>UK transfers typically take 24 hours to reach the recipient.</>}
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

                {/* Show processing time message for SEPA transfers */}
                {selectedTransaction.paymentMethod === 'SEPA Transfer' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>SEPA Transfer:</strong> Transfers within the SEPA zone typically take 24 hours to complete.
                      </p>
                    </div>
                  </div>
                )}
              </div>


                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Bills Modal */}
      {showPayBillsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>Pay Bills</h2>
              <button
                onClick={() => setShowPayBillsForm(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePayBillsSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Payee
                </label>
                <input
                  type="text"
                  value={payBillsForm.payee}
                  onChange={(e) => setPayBillsForm(prev => ({ ...prev, payee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="Enter payee name (e.g., Electric Ireland)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Amount (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(balance)}
                  value={payBillsForm.amount}
                  onChange={(e) => setPayBillsForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Available balance: €{balance}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={payBillsForm.datetime}
                  onChange={(e) => setPayBillsForm(prev => ({ ...prev, datetime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPayBillsForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5963] transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}