import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ArrowUpRight, CreditCard, Building2, Zap, Check, Clock, MapPin, Globe, Share } from "lucide-react";
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
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const accountId = params?.accountId ? parseInt(params.accountId) : 1;

  // Share receipt functionality - generates professional bank statement
  const shareReceipt = async () => {
    if (!selectedTransaction) return;
    
    try {
      // Create a professional bank statement style receipt
      const receiptHtml = generateBankStatementHtml(selectedTransaction);
      
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = receiptHtml;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.background = 'white';
      tempContainer.style.width = '400px';
      tempContainer.style.padding = '20px';
      document.body.appendChild(tempContainer);
      
      // Use html2canvas to capture the styled receipt
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 440,
        height: tempContainer.scrollHeight + 40
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      canvas.toBlob(async (blob: Blob | null) => {
        if (blob && navigator.share) {
          // Native share for mobile devices
          const file = new File([blob], 'bank-statement.png', { type: 'image/png' });
          
          try {
            await navigator.share({
              title: 'Bank Statement',
              text: `Bank statement for ${selectedTransaction.description}`,
              files: [file]
            });
          } catch (error) {
            // Fallback to download if share fails
            downloadImage(canvas, 'bank-statement');
          }
        } else {
          // Fallback to download for desktop
          downloadImage(canvas, 'bank-statement');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error generating bank statement:', error);
    }
  };

  const generateBankStatementHtml = (transaction: any) => {
    const formattedDate = new Date(transaction.timestamp).toLocaleDateString('en-IE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const formattedTime = new Date(transaction.timestamp).toLocaleTimeString('en-IE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return `
      <div style="
        font-family: 'Arial', sans-serif;
        background: white;
        padding: 30px;
        max-width: 400px;
        color: #333;
        line-height: 1.4;
      ">
        <!-- Bank Logo and Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0047ab; padding-bottom: 15px;">
          <div style="
            font-size: 24px;
            font-weight: bold;
            color: #0047ab;
            margin-bottom: 5px;
          ">Bank of Ireland</div>
          <div style="font-size: 12px; color: #666;">TRANSACTION STATEMENT</div>
        </div>

        <!-- Transaction Details -->
        <div style="margin-bottom: 25px;">
          <div style="
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Transaction Details</div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666; width: 35%;">Amount:</td>
              <td style="padding: 8px 0; font-size: 12px; font-weight: bold; color: #333;">${formatCurrency(transaction.amount.replace('-', ''), userCurrency)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Date:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${formattedDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Time:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${formattedTime}</td>
            </tr>
            ${transaction.recipientName ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Recipient:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${transaction.recipientName}</td>
            </tr>
            ` : ''}
            ${transaction.recipientSortCode ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Sort Code:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${transaction.recipientSortCode.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3')}</td>
            </tr>
            ` : ''}
            ${transaction.recipientAccountNumber ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Account No:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${transaction.recipientAccountNumber}</td>
            </tr>
            ` : ''}
            ${transaction.iban ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">IBAN:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333; font-family: monospace;">${transaction.iban}</td>
            </tr>
            ` : ''}
            ${transaction.reference ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Reference:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${transaction.reference}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Transaction ID:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333; font-family: monospace;">${transaction.id}</td>
            </tr>
            ${transaction.exchangeRate ? `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Exchange Rate:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${getCurrencySymbol(userCurrency)}1 = ${getCurrencySymbol(userCurrency === 'EUR' ? 'GBP' : 'EUR')}${transaction.exchangeRate.toFixed(4)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-size: 12px; color: #666;">Converted Amount:</td>
              <td style="padding: 8px 0; font-size: 12px; color: #333;">${getCurrencySymbol(userCurrency === 'EUR' ? 'GBP' : 'EUR')}${transaction.convertedAmount}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Footer -->
        <div style="
          text-align: center; 
          font-size: 10px; 
          color: #999; 
          border-top: 1px solid #eee; 
          padding-top: 15px;
          margin-top: 20px;
        ">
          <div>Bank of Ireland (UK) plc</div>
          <div style="margin-top: 5px;">Generated: ${new Date().toLocaleDateString('en-IE')} ${new Date().toLocaleTimeString('en-IE')}</div>
        </div>
      </div>
    `;
  };

  const downloadImage = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement('a');
    link.download = `${filename}-${selectedTransaction?.id || 'statement'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

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
            {/* Fixed header with share and close buttons */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Transaction Details
              </h2>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={shareReceipt}
                  className="w-8 h-8 bg-[#126987] rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  title="Share Receipt"
                >
                  <Share className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                >
                  <span className="text-gray-600 text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div ref={receiptRef} className="p-6 pt-4 pb-24">
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
                        {getCurrencySymbol(userCurrency)}1 = {getCurrencySymbol(userCurrency === 'EUR' ? 'GBP' : 'EUR')}{selectedTransaction.exchangeRate.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>GBP Equivalent:</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {getCurrencySymbol(userCurrency === 'EUR' ? 'GBP' : 'EUR')}{selectedTransaction.convertedAmount}
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

                {/* Show processing time message for SEPA transfers */}
                {selectedTransaction.paymentMethod === 'SEPA Transfer' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        <strong>SEPA Transfer:</strong> Transfers within the SEPA zone typically take 1 business day to complete.
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

    </div>
  );
}