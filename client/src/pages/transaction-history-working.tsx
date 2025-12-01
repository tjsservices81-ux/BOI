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

  const styles = {
    colors: {
      headerGradientStart: '#1B6B7C',
      headerGradientEnd: '#164E5C',
      balanceGradientStart: '#164E5C',
      balanceGradientEnd: '#1B6B7C',
      tabActiveBg: '#1B6B7C',
      tabInactiveBorder: '#D1D5DB',
      tabBg: '#F3F4F6',
      filterBg: '#FFFFFF',
      completedText: '#1B6B7C',
      completedUnderline: '#1B6B7C',
      goldInfoIcon: '#B8860B',
      amountPositive: '#16A34A',
      amountNegative: '#1F2937',
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textWhite: '#FFFFFF',
      profileBorder: '#7DD3E8',
      profileBg: 'rgba(27, 107, 124, 0.35)',
      dividerLight: '#E5E7EB',
      bannerBg: '#1B6B7C',
    },
    fonts: {
      family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
    }
  };

  return (
    <div 
      className="page-container h-screen bg-white flex flex-col overflow-hidden page-slide-in-right" 
      style={{ fontFamily: styles.fonts.family, maxWidth: '430px', margin: '0 auto' }}
    >
      {/* Header - transparent to blend with status bar */}
      <div 
        className="flex items-center justify-between flex-shrink-0"
        style={{ 
          background: styles.colors.headerGradientStart,
          minHeight: '48px',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '8px'
        }}
      >
        <button 
          onClick={() => navigateWithAnimation('/dashboard', 'slide-left')}
          className="flex items-center justify-center"
          style={{ width: '40px', height: '40px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <h1 style={{ 
          fontSize: '17px', 
          fontWeight: 600, 
          color: styles.colors.textWhite, 
          letterSpacing: '-0.2px'
        }}>
          {accountInfo?.displayName || 'Current Account'} ~ {getAccountNumber()}
        </h1>
        
        <button className="flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
          <div 
            className="rounded-full flex items-center justify-center"
            style={{ 
              width: '34px', 
              height: '34px', 
              border: `2px solid ${styles.colors.profileBorder}`,
              backgroundColor: styles.colors.profileBg
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={styles.colors.profileBorder}>
              <circle cx="12" cy="8" r="4"/>
              <path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Balance Section - padding: 16px top, 24px bottom, 20px sides */}
      <div 
        style={{ 
          background: `linear-gradient(180deg, ${styles.colors.balanceGradientStart} 0%, ${styles.colors.balanceGradientEnd} 100%)`,
          padding: '16px 20px 24px 20px'
        }}
      >
        <div className="flex items-center" style={{ gap: '8px', marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: styles.colors.textWhite,
            letterSpacing: '-0.5px',
            lineHeight: 1.1
          }}>
            {formatCurrency(balance, userCurrency)}
          </span>
          <button className="flex items-center justify-center" style={{ marginTop: '4px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
        </div>
        
        <div style={{ 
          width: '36px', 
          height: '2px', 
          backgroundColor: 'rgba(255,255,255,0.5)', 
          marginBottom: '14px' 
        }} />
        
        <button className="flex items-center" style={{ gap: '4px' }}>
          <span style={{ fontSize: '15px', fontWeight: 400, color: styles.colors.textWhite }}>BIC / IBAN</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* Tabs - padding: 14px vertical, 16px horizontal */}
      <div style={{ 
        backgroundColor: styles.colors.tabBg, 
        padding: '14px 16px', 
        display: 'flex', 
        gap: '8px' 
      }}>
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: activeTab === 'transactions' ? styles.colors.tabActiveBg : 'white',
            color: activeTab === 'transactions' ? 'white' : styles.colors.textSecondary,
            border: activeTab === 'transactions' ? 'none' : `1px solid ${styles.colors.tabInactiveBorder}`,
            lineHeight: 1.2
          }}
        >
          Transactions
        </button>
        <button
          onClick={() => {
            setActiveTab('statements');
            setShowStatementModal(true);
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: activeTab === 'statements' ? styles.colors.tabActiveBg : 'white',
            color: activeTab === 'statements' ? 'white' : styles.colors.textSecondary,
            border: activeTab === 'statements' ? 'none' : `1px solid ${styles.colors.tabInactiveBorder}`,
            lineHeight: 1.2
          }}
        >
          Statements
        </button>
        <button
          onClick={() => setActiveTab('more')}
          style={{
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: activeTab === 'more' ? styles.colors.tabActiveBg : 'white',
            color: activeTab === 'more' ? 'white' : styles.colors.textSecondary,
            border: activeTab === 'more' ? 'none' : `1px solid ${styles.colors.tabInactiveBorder}`,
            lineHeight: 1.2
          }}
        >
          More options
        </button>
      </div>

      {/* Filter Section - height 48px */}
      <div style={{ 
        backgroundColor: styles.colors.filterBg, 
        padding: '14px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end' 
      }}>
        <div className="flex items-center" style={{ gap: '10px' }}>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: 400, 
            color: styles.colors.textMuted 
          }}>
            Filter completed transactions
          </span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={styles.colors.completedText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Status Heading and Amount Header */}
      <div style={{ 
        backgroundColor: styles.colors.filterBg, 
        padding: '16px 20px 12px 20px', 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between' 
      }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <div style={{ position: 'relative', display: 'inline-block', paddingBottom: '6px' }}>
            <span style={{ 
              fontSize: '17px', 
              fontWeight: 400, 
              color: styles.colors.completedText
            }}>Completed</span>
            <div style={{ 
              position: 'absolute',
              bottom: '0',
              left: 0,
              width: '100%',
              height: '3px',
              backgroundColor: styles.colors.completedUnderline,
              borderRadius: '1.5px'
            }} />
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={styles.colors.goldInfoIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <span style={{ 
          fontSize: '13px', 
          fontWeight: 400, 
          color: styles.colors.textMuted,
          marginTop: '4px'
        }}>
          Amount in {userCurrency === 'EUR' ? '€' : '£'}
        </span>
      </div>

      {/* Transaction List */}
      <div 
        ref={scrollContainerRef}
        className="transaction-scroll-container flex-1 overflow-y-auto"
        style={{ backgroundColor: styles.colors.filterBg }}
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
                className="active:bg-gray-100 transition-colors cursor-pointer flex items-start justify-between"
                style={{ 
                  padding: '18px 20px',
                  borderBottom: `1px solid ${styles.colors.dividerLight}`,
                  backgroundColor: 'white'
                }}
              >
                {/* Left side */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: styles.colors.textPrimary, 
                    marginBottom: '4px', 
                    lineHeight: 1.25
                  }}>
                    {transaction.description || transaction.reference || transaction.id}
                  </p>
                  <p style={{ 
                    fontSize: '14px', 
                    fontWeight: 400, 
                    color: styles.colors.textSecondary, 
                    marginBottom: '4px', 
                    lineHeight: 1.25
                  }}>
                    {transaction.iban || transaction.recipientAccountNumber || `4319401827062009`}
                  </p>
                  <p style={{ 
                    fontSize: '14px', 
                    fontWeight: 400, 
                    color: styles.colors.textMuted, 
                    lineHeight: 1.25
                  }}>
                    {formatDate(transaction.timestamp)}
                  </p>
                </div>

                {/* Right side */}
                <div className="flex items-center" style={{ gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: 500, 
                      marginBottom: '4px',
                      color: isDebit ? styles.colors.amountNegative : styles.colors.amountPositive,
                      lineHeight: 1.25
                    }}>
                      {isDebit ? '' : '+ '}{amount.toFixed(2)}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      fontWeight: 400, 
                      color: styles.colors.textMuted, 
                      fontStyle: 'italic', 
                      lineHeight: 1.25
                    }}>
                      View details
                    </p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={styles.colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            );
          })}
          
          {transactions.filter(t => !t.deleted).length === 0 && (
            <div className="px-4 py-12 text-center" style={{ color: styles.colors.textMuted }}>
              <p>No transactions found</p>
            </div>
          )}
        </div>
      </div>


      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center flex-shrink-0">
        <button 
          onClick={() => navigateWithAnimation('/dashboard', 'slide-left')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Home className="h-5 w-5 text-[#1a5276]" />
          <span className="text-xs text-[#1a5276] font-medium">Accounts</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/payments', 'slide-right')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRightLeft className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Payments</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/cards', 'slide-right')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <CreditCard className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Cards</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/more', 'slide-right')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Landmark className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Services</span>
        </button>
        <button 
          onClick={() => navigateWithAnimation('/apply', 'slide-right')}
          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="text-xs text-gray-500">Apply</span>
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
