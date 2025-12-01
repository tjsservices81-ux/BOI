import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ChevronRight, ArrowUpRight, CreditCard, Building2, Zap, Check, Clock, MapPin, Globe, X, FileText, Search, Info, Home, ArrowRightLeft, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserDataManager } from "../utils/userDataManager.ts";
import { StateManager } from "../utils/stateManager";
import { formatCurrency, getUserCurrency, getCurrencySymbol, type Currency } from "../utils/currencyUtils";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

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
  const [activeTab, setActiveTab] = useState('transactions');
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(() => {
    const saved = localStorage.getItem('showTransferConfirmation');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showPayBillsForm, setShowPayBillsForm] = useState(false);
  const [payBillsForm, setPayBillsForm] = useState({
    payee: '',
    amount: '',
    datetime: ''
  });
  
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementDateRange, setStatementDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string>('');
  const [statementSuccessState, setStatementSuccessState] = useState(false);
  const [statementPdfBlob, setStatementPdfBlob] = useState<Blob | null>(null);
  const [statementFileName, setStatementFileName] = useState<string>('');
  
  const accountId = params?.accountId ? parseInt(params.accountId) : 1;

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('showTransferConfirmation');
      setShowTransferConfirmation(saved !== null ? JSON.parse(saved) : true);
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const navigateWithAnimation = (path: string, animationType: 'slide-right' | 'slide-left' | 'slide-up' = 'slide-right') => {
    setIsNavigating(true);
    
    const currentPage = document.querySelector('.page-container') || document.body;
    document.body.classList.add('page-transitioning');
    
    if (animationType === 'slide-right') {
      currentPage.classList.add('page-slide-out-left');
    } else if (animationType === 'slide-left') {
      currentPage.classList.add('page-slide-out-right');
    }
    
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

    const currentTransactions = UserDataManager.getUserData('bankTransactions', []);
    const updatedTransactions = [...currentTransactions, newTransaction];
    
    updatedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    UserDataManager.setUserData('bankTransactions', updatedTransactions);
    
    const newBalanceString = newBalance.toFixed(2);
    setBalance(newBalanceString);
    
    const accounts = UserDataManager.getUserAccounts();
    const updatedAccounts = accounts.map((acc: Account) => 
      acc.id === accountId ? { ...acc, balance: newBalanceString } : acc
    );
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    const accountTransactions = updatedTransactions.filter(t => t.accountId === accountId);
    setTransactions(accountTransactions);
    
    setPayBillsForm({ payee: '', amount: '', datetime: '' });
    setShowPayBillsForm(false);
    
    const currencySymbol = getCurrencySymbol(userCurrency);
    alert(`Payment of ${currencySymbol} ${amount.toFixed(2)} to ${payBillsForm.payee} has been processed successfully.`);
  };

  const handleOpenStatement = () => {
    if (!statementPdfBlob) return;
    const url = window.URL.createObjectURL(statementPdfBlob);
    window.open(url, '_blank');
  };

  const handleOpenTransferConfirmation = async () => {
    if (!selectedTransaction) {
      console.log('No selected transaction');
      return;
    }

    console.log('Opening transfer confirmation for:', selectedTransaction);

    try {
      if (selectedTransaction.confirmationPdfData) {
        console.log('Using saved PDF data');
        const byteCharacters = atob(selectedTransaction.confirmationPdfData.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          alert('Please allow popups to view the transfer confirmation');
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        return;
      }

      console.log('Generating new PDF');
      const userProfile = UserDataManager.getUserProfile();
      const accounts = UserDataManager.getUserAccounts();
      const accountInfoData = accounts.find((acc: any) => acc.id === selectedTransaction.accountId);
      
      const response = await fetch('/api/generate-transfer-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: selectedTransaction,
          senderName: userProfile?.name || 'Customer',
          accountInfo: accountInfoData?.displayName || 'Account',
          userCurrency: userProfile?.currency || 'EUR'
        }),
      });

      if (response.ok) {
        console.log('PDF generated successfully');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          alert('Please allow popups to view the transfer confirmation');
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        console.error('Failed to generate PDF:', response.status);
        alert('Failed to generate transfer confirmation');
      }
    } catch (error) {
      console.error('Failed to open transfer confirmation:', error);
      alert('Error opening transfer confirmation: ' + error);
    }
  };

  const handleSaveStatement = () => {
    if (!statementPdfBlob || !statementFileName) return;
    const url = window.URL.createObjectURL(statementPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = statementFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleShareStatement = async () => {
    if (!statementPdfBlob || !statementFileName) return;
    
    if (navigator.share && navigator.canShare && navigator.canShare()) {
      try {
        const file = new File([statementPdfBlob], statementFileName, { type: 'application/pdf' });
        await navigator.share({
          title: 'Bank Statement',
          text: 'Your bank statement',
          files: [file]
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.log('Share failed, falling back to save');
          handleSaveStatement();
        } else {
          console.log('Share cancelled by user');
        }
      }
    } else {
      handleSaveStatement();
    }
  };

  const handleCloseStatementSuccess = () => {
    if (statementPdfBlob) {
      const blobUrl = window.URL.createObjectURL(statementPdfBlob);
      window.URL.revokeObjectURL(blobUrl);
    }
    
    setShowStatementModal(false);
    setStatementSuccessState(false);
    setStatementPdfBlob(null);
    setStatementFileName('');
    setStatementError('');
  };

  const handleGenerateStatement = async () => {
    const fromDate = new Date(statementDateRange.from);
    const toDate = new Date(statementDateRange.to);
    
    if (fromDate > toDate) {
      setStatementError('From date must be before or equal to To date');
      return;
    }
    
    setIsGeneratingStatement(true);
    setStatementError('');
    
    try {
      const userData = UserDataManager.getUserProfile();
      const allTransactions = UserDataManager.getUserData('bankTransactions', []);
      const allAccounts = UserDataManager.getUserAccounts();
      
      const emailsEnabled = localStorage.getItem('emailsEnabled');
      const sendEmail = emailsEnabled !== null ? JSON.parse(emailsEnabled) : true;

      const requestPayload = {
        accountId: String(accountId),
        startDate: statementDateRange.from,
        endDate: statementDateRange.to,
        dateRange: `${fromDate.toLocaleDateString('en-IE')} to ${toDate.toLocaleDateString('en-IE')}`,
        customerName: userData?.name || '',
        userAddress: userData?.address || '',
        userEmail: userData?.email || '',
        userCurrency: userCurrency,
        userTransactions: allTransactions,
        userAccounts: allAccounts,
        emailsEnabled: sendEmail
      };
      
      const response = await fetch('/api/generate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const blob = await response.blob();
        const fileName = `BOI_Statement_${statementDateRange.from}_to_${statementDateRange.to}.pdf`;
        
        setStatementPdfBlob(blob);
        setStatementFileName(fileName);
        setStatementSuccessState(true);
      } else {
        const errorData = await response.json();
        setStatementError(errorData.message || 'Failed to generate statement');
      }
    } catch (error) {
      console.error('Error generating statement:', error);
      setStatementError('An error occurred while generating the statement');
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return;
    
    const allTransactions = UserDataManager.getUserData('bankTransactions', []);
    
    const enhancedTransactions = allTransactions.map((tx: any) => {
      if (tx.id === selectedTransaction.id) {
        const amount = parseFloat(tx.amount.replace('-', ''));
        const currentBal = parseFloat(balance);
        const newBal = tx.type === 'debit' ? currentBal + amount : currentBal - amount;
        setBalance(newBal.toFixed(2));
        
        const accounts = UserDataManager.getUserAccounts();
        const updatedAccounts = accounts.map((acc: Account) => 
          acc.id === accountId ? { ...acc, balance: newBal.toFixed(2) } : acc
        );
        UserDataManager.setUserData('bankAccounts', updatedAccounts);
        
        return { ...tx, deleted: true };
      }
      return tx;
    });
    
    UserDataManager.setUserData('bankTransactions', enhancedTransactions);
    
    const accountTransactions = enhancedTransactions.filter((tx: any) => tx.accountId === accountId);
    setTransactions(accountTransactions);
    
    setSelectedTransaction(null);
    setShowDeleteConfirm(false);
    
    window.dispatchEvent(new CustomEvent('transactionDeleted', {
      detail: { transactionId: selectedTransaction?.id }
    }));
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
  };

  useEffect(() => {
    const loadData = () => {
      UserDataManager.clearCache('bankTransactions');
      UserDataManager.clearCache('bankAccounts');
      
      const storedTransactions = UserDataManager.getUserData('bankTransactions', []);
      
      const updatedTransactions = storedTransactions.map((tx: any) => {
        if (tx.paymentMethod === 'UK Transfer' && !tx.exchangeRate) {
          const amount = parseFloat(tx.amount.replace('-', ''));
          const sampleRate = 0.8456;
          return {
            ...tx,
            exchangeRate: sampleRate,
            convertedAmount: (amount * sampleRate).toFixed(2),
            convertedCurrency: 'GBP'
          };
        }
        return tx;
      });
      
      if (JSON.stringify(updatedTransactions) !== JSON.stringify(storedTransactions)) {
        UserDataManager.setUserData('bankTransactions', updatedTransactions);
      }
      
      const accountTransactions = updatedTransactions.filter((tx: any) => tx.accountId === accountId);
      console.log('Loaded transactions for account', accountId, ':', accountTransactions);
      
      setUserCurrency(getUserCurrency());
      
      const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
      
      if (Array.isArray(storedAccounts) && storedAccounts.length > 0) {
        const currentAccount = storedAccounts.find((acc: any) => acc.id === accountId);
        
        if (currentAccount) {
          setBalance(currentAccount.balance);
          setAccountInfo(currentAccount);
        }
      } else {
        setBalance('0.00');
        setAccountInfo({
          id: accountId,
          displayName: accountId === 1 ? "Current Account" : accountId === 2 ? "Credit Card" : "Savings Account",
          accountNumber: accountId === 1 ? "****2091" : accountId === 2 ? "****1820" : "****0978",
          balance: "0.00",
          accountType: accountId === 1 ? "current" : accountId === 2 ? "credit" : "savings"
        });
      }
      
      const formattedStored = accountTransactions.map((tx: any) => ({
        ...tx,
        id: tx.id,
        amount: tx.amount,
        description: tx.description,
        timestamp: tx.timestamp,
        type: tx.type
      }));
      
      const sortedTransactions = formattedStored.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setTransactions(sortedTransactions);
    };
    
    loadData();

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

  useEffect(() => {
    const currentRoute = `/transactions/${accountId}`;
    
    StateManager.restoreScrollPosition(currentRoute, '.transaction-scroll-container');
    
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getAccountNumber = () => {
    return accountInfo?.accountNumber?.replace('****', '') || '2091';
  };

  return (
    <div className="page-container h-screen bg-white flex flex-col overflow-hidden page-slide-in-right" style={{ fontFamily: "'Open Sans', sans-serif" }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between flex-shrink-0"
        style={{ 
          background: 'linear-gradient(180deg, #1B6B7C 0%, #195A6B 100%)',
          height: '56px',
          padding: '0 16px'
        }}
      >
        <button 
          onClick={() => navigateWithAnimation('/dashboard', 'slide-left')}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          style={{ marginLeft: '-8px' }}
        >
          <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h1 style={{ fontSize: '17px', fontWeight: 400, color: 'white', letterSpacing: 0 }}>
          {accountInfo?.displayName || 'Current Account'} ~ {getAccountNumber()}
        </h1>
        
        <button className="hover:bg-white/20 rounded-full transition-colors">
          <div 
            className="rounded-full flex items-center justify-center"
            style={{ 
              width: '32px', 
              height: '32px', 
              border: '2px solid #7EC8DB',
              backgroundColor: 'transparent'
            }}
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="#7EC8DB" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 19.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
            </svg>
          </div>
        </button>
      </div>

      {/* Balance Section */}
      <div 
        className="text-white"
        style={{ 
          background: 'linear-gradient(180deg, #195A6B 0%, #1B6B7C 100%)',
          padding: '14px 18px 22px 18px'
        }}
      >
        <div className="flex items-center" style={{ gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '28px', fontWeight: 400, letterSpacing: '-0.3px' }}>{formatCurrency(balance, userCurrency)}</span>
          <button className="hover:bg-white/20 rounded-full transition-colors" style={{ marginTop: '2px' }}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
              <circle cx="12" cy="8" r="1.2" fill="rgba(255,255,255,0.7)" />
              <rect x="11" y="11" width="2" height="5" rx="0.5" fill="rgba(255,255,255,0.7)" />
            </svg>
          </button>
        </div>
        
        <div style={{ width: '26px', height: '2px', backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: '10px' }} />
        
        <button className="flex items-center text-white hover:opacity-80 transition-opacity" style={{ gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 400 }}>BIC / IBAN</span>
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: '#F3F5F7', padding: '18px 14px 22px 14px', display: 'flex', gap: '8px' }}>
        <div className="relative">
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '9px 14px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'transactions' ? '#1B6B7C' : 'white',
              color: activeTab === 'transactions' ? 'white' : '#5F6368',
              border: activeTab === 'transactions' ? 'none' : '1px solid #DADCE0'
            }}
          >
            Transactions
          </button>
          {activeTab === 'transactions' && (
            <div 
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: '-12px',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #1B6B7C'
              }}
            />
          )}
        </div>
        <button
          onClick={() => {
            setActiveTab('statements');
            setShowStatementModal(true);
          }}
          style={{
            padding: '9px 14px',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: activeTab === 'statements' ? '#1B6B7C' : 'white',
            color: activeTab === 'statements' ? 'white' : '#5F6368',
            border: activeTab === 'statements' ? 'none' : '1px solid #DADCE0'
          }}
        >
          Statements
        </button>
        <button
          onClick={() => setActiveTab('more')}
          style={{
            padding: '9px 14px',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: activeTab === 'more' ? '#1B6B7C' : 'white',
            color: activeTab === 'more' ? 'white' : '#5F6368',
            border: activeTab === 'more' ? 'none' : '1px solid #DADCE0'
          }}
        >
          More options
        </button>
      </div>

      {/* Filter Section */}
      <div style={{ backgroundColor: 'white', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#5F6368' }}>Filter completed transactions</span>
          <svg style={{ width: '26px', height: '26px' }} viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" fill="none" stroke="#1B6B7C" strokeWidth="2.5" />
            <path d="M15 15l5 5" stroke="#1B6B7C" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Completed Heading Row */}
      <div style={{ backgroundColor: 'white', padding: '6px 18px 10px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="flex items-center" style={{ gap: '6px' }}>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 400, 
            color: '#1B6B7C',
            borderBottom: '2px solid #1B6B7C',
            paddingBottom: '2px'
          }}>Completed</span>
          <svg style={{ width: '18px', height: '18px', marginTop: '-2px' }} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#C4884A" />
            <circle cx="12" cy="7.5" r="1.3" fill="white" />
            <rect x="10.8" y="10.5" width="2.4" height="5.5" rx="0.8" fill="white" />
          </svg>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 400, color: '#9CA3AF' }}>Amount in {userCurrency === 'EUR' ? '€' : '£'}</span>
      </div>

      {/* Transaction List */}
      <div 
        ref={scrollContainerRef}
        className="transaction-scroll-container flex-1 overflow-y-auto bg-white"
        data-scroll-container
        data-scroll-route={`/transactions/${accountId}`}
      >
        <div>
          {transactions.filter(t => !t.deleted).map((transaction, index) => {
            const isDebit = transaction.type === 'debit' || transaction.amount.startsWith('-');
            const amount = Math.abs(parseFloat(transaction.amount.replace('-', '')));
            
            return (
              <div 
                key={`${transaction.id}-${index}`}
                onClick={() => setSelectedTransaction(transaction)}
                className="hover:bg-gray-50 transition-colors cursor-pointer flex items-start justify-between"
                style={{ 
                  padding: '14px 18px',
                  borderBottom: 'none'
                }}
              >
                {/* Left side */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#202124', marginBottom: '3px' }}>
                    {transaction.description || transaction.reference || transaction.id}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 400, color: '#5F6368', marginBottom: '3px' }}>
                    {transaction.iban || transaction.recipientAccountNumber || `4319401827062009`}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 400, color: '#80868B' }}>
                    {formatDate(transaction.timestamp)}
                  </p>
                </div>

                {/* Right side */}
                <div className="flex items-center" style={{ gap: '4px', minWidth: '90px', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      fontSize: '15px', 
                      fontWeight: 400, 
                      marginBottom: '2px',
                      color: isDebit ? '#202124' : '#0D9F6E'
                    }}>
                      {isDebit ? '' : '+ '}{amount.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: 400, color: '#9CA3AF', fontStyle: 'italic' }}>View details</p>
                  </div>
                  <ChevronRight style={{ width: '16px', height: '16px', color: '#9CA3AF' }} />
                </div>
              </div>
            );
          })}
          
          {transactions.filter(t => !t.deleted).length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500">
              <p>No transactions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Banner */}
      <div 
        className="flex items-center justify-between flex-shrink-0 text-white"
        style={{ 
          background: 'linear-gradient(180deg, #1B6B7C 0%, #195A6B 100%)',
          height: '48px',
          padding: '0 16px'
        }}
      >
        <div className="flex items-center" style={{ gap: '8px' }}>
          <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="white" />
            <circle cx="12" cy="7.5" r="1.3" fill="#1B6B7C" />
            <rect x="10.8" y="10.5" width="2.4" height="5.5" rx="0.8" fill="#1B6B7C" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 400 }}>See an unfamiliar transaction?</span>
        </div>
        <button className="flex items-center hover:opacity-80 transition-opacity" style={{ gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Find out more</span>
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Bottom Navigation */}
      <div 
        className="flex justify-around items-center flex-shrink-0"
        style={{ 
          backgroundColor: 'white', 
          borderTop: '1px solid #E5E7EB',
          padding: '8px 0 12px 0'
        }}
      >
        <button 
          onClick={() => navigateWithAnimation('/dashboard', 'slide-left')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
          style={{ gap: '4px', minWidth: '60px' }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="#0E5C75" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#0E5C75' }}>Accounts</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/payments', 'slide-right')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
          style={{ gap: '4px', minWidth: '60px' }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>Payments</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/cards', 'slide-right')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
          style={{ gap: '4px', minWidth: '60px' }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="#6B7280" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>Cards</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/more', 'slide-right')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
          style={{ gap: '4px', minWidth: '60px' }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="#6B7280" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>Services</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/apply', 'slide-right')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
          style={{ gap: '4px', minWidth: '60px' }}
        >
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="#6B7280" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M4 6h16M4 10h16M4 14h10M4 18h10" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>Apply</span>
        </button>
      </div>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div 
            onClick={() => setSelectedTransaction(null)}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
            style={{ zIndex: 1000 }}>
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl w-full h-[90vh] flex flex-col pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                Transaction Details
              </h2>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="p-6 pt-4 pb-24">
                <div className="space-y-6">
              <div className="flex items-center justify-center py-4 bg-green-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">
                      Transaction Complete
                    </p>
                    <p className="text-sm text-green-700">
                      Successfully processed
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-4 border-b border-gray-200">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(selectedTransaction.amount.replace('-', ''), userCurrency)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTransaction.type === 'debit' ? 'Sent' : 'Received'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {selectedTransaction.description}
                  </span>
                </div>

                {selectedTransaction.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {selectedTransaction.paymentMethod === 'Manual Entry' ? 'Payment Method:' : 'Transfer Type:'}
                    </span>
                    <div className="flex items-center space-x-2">
                      {selectedTransaction.paymentMethod === 'UK Transfer' ? (
                        <MapPin className="w-4 h-4 text-[#126987]" />
                      ) : (
                        <Globe className="w-4 h-4 text-[#126987]" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {selectedTransaction.paymentMethod === 'Manual Entry' ? 'Direct Transaction' : selectedTransaction.paymentMethod}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedTransaction.timestamp).toLocaleDateString('en-IE', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedTransaction.timestamp).toLocaleTimeString('en-IE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-sm text-gray-900">
                    {selectedTransaction.reference || `TXN${selectedTransaction.id}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {selectedTransaction.category}
                  </span>
                </div>

                {(selectedTransaction.paymentMethod === 'UK Transfer' || selectedTransaction.paymentMethod === 'IBAN Transfer' || selectedTransaction.iban || selectedTransaction.recipientAccountNumber) && (
                  <>
                    {selectedTransaction.recipientName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recipient:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.recipientName}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.iban && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">IBAN:</span>
                        <span className="font-semibold text-gray-900 font-mono text-sm">
                          {selectedTransaction.iban}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.bicCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">BIC Code:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.bicCode}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.paymentMethod === 'SEPA Transfer' && selectedTransaction.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.reference}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.recipientSortCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sort Code:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.recipientSortCode.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3')}
                        </span>
                      </div>
                    )}
                    
                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.recipientAccountNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Number:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.recipientAccountNumber}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.reference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedTransaction.reference}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {selectedTransaction.paymentMethod === 'UK Transfer' && selectedTransaction.exchangeRate && userCurrency === 'EUR' && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Currency Conversion
                      </h4>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="font-semibold text-gray-900">
                        €1 = £{selectedTransaction.exchangeRate.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">GBP Equivalent:</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700">
                          £{selectedTransaction.convertedAmount}
                        </span>
                        <p className="text-xs text-gray-500">
                          Live rate at time of transfer
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {selectedTransaction.paymentMethod === 'UK Transfer' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        {userCurrency === 'EUR' 
                          ? <><strong>International Transfer:</strong> UK transfers typically take 24 hours to reach the recipient.</>
                          : <>UK transfers typically take 24 hours to reach the recipient.</>}
                      </p>
                    </div>

                    <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-3">
                      <p className="text-sm text-red-700">
                        This payment cannot be cancelled
                      </p>
                    </div>
                  </div>
                )}

                {selectedTransaction.paymentMethod === 'SEPA Transfer' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>SEPA Transfer:</strong> Transfers within the SEPA zone typically take 24 hours to complete.
                      </p>
                    </div>

                    <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-3">
                      <p className="text-sm text-red-700">
                        This payment cannot be cancelled
                      </p>
                    </div>
                  </div>
                )}

                {selectedTransaction.paymentMethod && selectedTransaction.paymentMethod !== 'Manual Entry' && showTransferConfirmation && (
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <button
                      onClick={handleOpenTransferConfirmation}
                      className="w-full px-4 py-3 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5963] transition-colors flex items-center justify-center space-x-2"
                      data-testid="button-open-transfer-confirmation"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Open Transfer Confirmation</span>
                    </button>
                  </div>
                )}
              </div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Bills Modal */}
      {showPayBillsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
             style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pay Bills</h2>
              <button
                onClick={() => setShowPayBillsForm(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handlePayBillsSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payee
                </label>
                <input
                  type="text"
                  value={payBillsForm.payee}
                  onChange={(e) => setPayBillsForm(prev => ({ ...prev, payee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  placeholder="Enter payee name (e.g., Electric Ireland)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available balance: €{balance}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={payBillsForm.datetime}
                  onChange={(e) => setPayBillsForm(prev => ({ ...prev, datetime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                  required
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPayBillsForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5963] transition-colors"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Statement Modal */}
      <AnimatePresence>
        {showStatementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
               style={{ zIndex: 9999 }}>
            <motion.div 
              className="bg-white rounded-t-2xl w-full h-[75vh] flex flex-col pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Generate Statement
              </h2>
              <button
                onClick={handleCloseStatementSuccess}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-statement-modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!statementSuccessState ? (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Account</p>
                    <p className="font-semibold text-gray-900">
                      {accountInfo?.displayName || 'Current Account'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {accountInfo?.accountNumber || '****0000'} • Sort Code: 90-78-68
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={statementDateRange.from}
                      onChange={(e) => {
                        setStatementDateRange(prev => ({ ...prev, from: e.target.value }));
                        setStatementError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                      data-testid="input-statement-from-date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={statementDateRange.to}
                      onChange={(e) => {
                        setStatementDateRange(prev => ({ ...prev, to: e.target.value }));
                        setStatementError('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent"
                      data-testid="input-statement-to-date"
                    />
                  </div>

                  {statementError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        {statementError}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStatementModal(false);
                        setStatementError('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      disabled={isGeneratingStatement}
                      data-testid="button-cancel-statement"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateStatement}
                      className="flex-1 px-4 py-2 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5963] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      disabled={isGeneratingStatement}
                      data-testid="button-generate-statement"
                    >
                      {isGeneratingStatement ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Statement Generated Successfully
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Your statement for {accountInfo?.displayName || 'account'} is ready
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={handleOpenStatement}
                        className="w-full px-4 py-3 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5963] transition-colors flex items-center justify-center space-x-2"
                        data-testid="button-open-statement"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
