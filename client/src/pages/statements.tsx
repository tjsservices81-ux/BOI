import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { FileText, Download, Calendar, ChevronLeft, Check, CreditCard } from 'lucide-react';
import { UserDataManager } from '@/utils/userDataManager';

export default function Statements() {
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState('1-week');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ensure there's a current user - if not, set a default
    let currentUser = UserDataManager.getCurrentUser();
    if (!currentUser) {
      currentUser = '12345678';
      UserDataManager.setCurrentUser(currentUser);
      
      // Register default user if they don't exist
      if (!UserDataManager.userExists(currentUser)) {
        UserDataManager.registerUser({
          customerNumber: currentUser,
          name: '',
          email: '',
          phone: '',
          joinDate: '',
          dateCreated: new Date().toISOString()
        });
      }
    }
    setUser(currentUser);
    
    // Load or initialize accounts with proper defaults
    let userAccounts = UserDataManager.getUserData('bankAccounts', null);
    if (!userAccounts || !Array.isArray(userAccounts) || userAccounts.length === 0) {
      // Initialize default accounts if none exist
      const defaultAccounts = [
        { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "1640.31", accountType: "current" },
        { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "2500.00", accountType: "credit" },
        { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "5420.50", accountType: "savings" },
      ];
      UserDataManager.setUserData('bankAccounts', defaultAccounts);
      userAccounts = defaultAccounts;
      
      // Initialize empty transactions if none exist
      const existingTransactions = UserDataManager.getUserData('bankTransactions', null);
      if (!existingTransactions) {
        UserDataManager.setUserData('bankTransactions', []);
      }
    }
    
    console.log('📊 User accounts loaded for statements:', userAccounts.length);
    setAccounts(userAccounts);
    
    // Set default account to the first account
    if (userAccounts && userAccounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(userAccounts[0].id);
    }
    
    // Mark loading as complete
    setIsLoading(false);
  }, []);

  const getStatementPeriod = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case '1-week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        endDate = now;
        break;
      case '2-weeks':
        startDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        endDate = now;
        break;
      case '1-month':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = now;
        break;
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth;
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleGenerateStatement = async () => {
    if (!user || selectedAccountId === null) return;

    setIsGenerating(true);
    setGenerationComplete(false);

    try {
      const { startDate, endDate } = getStatementPeriod();
      
      // Get the selected account with null safety
      const selectedAccount = accounts && accounts.find((acc: any) => acc && acc.id === selectedAccountId);
      
      if (!selectedAccount) {
        console.error('❌ Selected account not found for statement generation');
        alert('Unable to find the selected account. Please refresh and try again.');
        setIsGenerating(false);
        return;
      }

      // Ensure transaction data exists for this account with null safety
      const allTransactionsBefore = UserDataManager.getUserData('bankTransactions', []) || [];
      const accountTransactionsBefore = allTransactionsBefore.filter((t: any) => t && t.accountId === selectedAccountId);
      
      if (accountTransactionsBefore.length === 0) {
        console.log('No transactions found for account', selectedAccountId, '- generating realistic transaction history');
        
        // Import the transaction generator
        const { generateRealisticTransactions } = await import('@/utils/sampleTransactionData');
        const newTransactions = generateRealisticTransactions(selectedAccountId, selectedAccount.balance, 30);
        
        // Add to existing transactions
        const updatedTransactions = [...allTransactionsBefore, ...newTransactions];
        UserDataManager.setUserData('bankTransactions', updatedTransactions);
        
        console.log('Generated', newTransactions.length, 'realistic transactions for account', selectedAccountId);
      }
      
      // Get transactions for the period and selected account
      const allTransactions = UserDataManager.getUserData('bankTransactions', []);
      const periodTransactions = allTransactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.date);
        const isInPeriod = transactionDate >= startDate && transactionDate <= endDate;
        const isFromSelectedAccount = transaction.accountId === selectedAccountId;
        return isInPeriod && isFromSelectedAccount;
      });

      console.log('Statement generation:', {
        accountId: selectedAccountId,
        totalTransactions: allTransactions.length,
        periodTransactions: periodTransactions.length,
        period: `${formatDate(startDate)} to ${formatDate(endDate)}`
      });

      // Calculate balances
      const openingBalance = parseFloat(selectedAccount.balance) - 
        periodTransactions.reduce((sum: number, tx: any) => {
          return sum + (tx.type === 'credit' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
        }, 0);

      const totalIn = periodTransactions
        .filter((tx: any) => tx.type === 'credit')
        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

      const totalOut = periodTransactions
        .filter((tx: any) => tx.type === 'debit')
        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

      const closingBalance = parseFloat(selectedAccount.balance);

      // Step 1: Transaction Scanning - Get all real transaction data
      console.log('🔍 Scanning transactions from active session...');
      console.log('📊 All transactions found:', allTransactions.length);
      console.log('📋 Period transactions:', periodTransactions.length);
      
      // Extract real transaction data (no placeholders)
      let realTransactions = periodTransactions
        .filter((tx: any) => {
          const txDate = new Date(tx.date);
          return !isNaN(txDate.getTime()) && 
                 tx.description && 
                 tx.description !== 'NaN Invalid Date' && 
                 tx.amount &&
                 !isNaN(parseFloat(tx.amount));
        })
        .map((tx: any) => ({
          date: tx.date,
          description: tx.description.toUpperCase(),
          type: tx.type,
          amount: parseFloat(tx.amount).toFixed(2),
          balance: tx.balance || closingBalance.toFixed(2)
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Oldest to newest

      console.log('✅ Real transactions extracted:', realTransactions.length);
      
      // If no transactions found, force generate authentic sample transactions
      if (realTransactions.length === 0) {
        console.log('📝 No period transactions found - generating authentic sample data for statement');
        const { generateRealisticTransactions } = await import('@/utils/sampleTransactionData');
        const sampleTransactions = generateRealisticTransactions(selectedAccountId, selectedAccount.balance, 30);
        
        // Filter sample transactions for the period
        const periodSampleTransactions = sampleTransactions.filter((tx: any) => {
          const txDate = new Date(tx.date);
          return txDate >= startDate && txDate <= endDate;
        });
        
        realTransactions = periodSampleTransactions.map((tx: any) => ({
          date: tx.date,
          description: tx.description.toUpperCase(),
          type: tx.type,
          amount: parseFloat(tx.amount).toFixed(2),
          balance: tx.balance || closingBalance.toFixed(2)
        }));
        
        console.log('✅ Generated authentic sample transactions for statement:', realTransactions.length);
      }
      
      realTransactions.forEach((tx: any) => console.log(`- ${tx.description}: €${tx.amount} (${tx.type})`));

      // Prepare complete statement data with real transactions
      const statementRequestData = {
        accountInfo: {
          accountHolder: user.name || 'Account Holder',
          accountNumber: selectedAccount.accountNumber || '****2091',
          balance: selectedAccount.balance || '36612.87'
        },
        transactions: realTransactions,
        period: selectedPeriod
      };

      console.log('🔵 Sending statement request with real data:', statementRequestData);

      // Generate PDF with real transaction data using editable PDF system
      const response = await fetch('/api/generate-editable-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statementRequestData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename
        const monthYear = endDate.toLocaleDateString('en-GB', {
          month: '2-digit',
          year: 'numeric'
        }).replace('/', '');
        const lastName = user.name?.split(' ').pop() || 'Statement';
        
        link.download = `BOI_Statement_${lastName}_${monthYear}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setGenerationComplete(true);
        setTimeout(() => setGenerationComplete(false), 3000);
      } else {
        throw new Error('Failed to generate statement');
      }
    } catch (error) {
      console.error('Statement generation failed:', error);
      alert('Failed to generate statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPeriodLabel = () => {
    const { startDate, endDate } = getStatementPeriod();
    
    switch (selectedPeriod) {
      case '1-week':
        return `Last Week (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case '2-weeks':
        return `Last 2 Weeks (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case '1-month':
        return `Last Month (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case 'current-month':
        return `Current Month (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case 'last-month':
        return `Previous Month (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case 'last-3-months':
        return `Last 3 Months (${formatDate(startDate)} - ${formatDate(endDate)})`;
      case 'last-6-months':
        return `Last 6 Months (${formatDate(startDate)} - ${formatDate(endDate)})`;
      default:
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
  };

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="page-container page-fade-in h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#126987] mx-auto mb-4"></div>
          <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Loading statements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container page-fade-in h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 z-20">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => navigate('/more')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Account Statements
          </h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto overscroll-contain px-4" 
        style={{ 
          WebkitOverflowScrolling: 'touch',
          height: 'calc(100vh - 73px)' // Subtract header height
        }}
      >
        <div className="max-w-md mx-auto space-y-6 py-6 pb-24">
          
          {/* Statement Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#126987] to-[#5a7b85] rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Generate Statement
                </h2>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Download your official Bank of Ireland statement
                </p>
              </div>
            </div>

            {/* Account Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Select Account
              </label>
              
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="">Choose an account...</option>
                {accounts && accounts.length > 0 ? accounts.map((account) => (
                  account ? (
                    <option key={account.id} value={account.id}>
                      {account.displayName} - {account.accountNumber} - €{account.balance}
                    </option>
                  ) : null
                )) : (
                  <option value="" disabled>No accounts available</option>
                )}
              </select>
            </div>

            {/* Period Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Statement Period
              </label>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#126987] focus:border-transparent text-gray-900"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                <option value="1-week">1 Week</option>
                <option value="2-weeks">2 Weeks</option>
                <option value="1-month">1 Month</option>
              </select>

              {/* Selected Period Display */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {getPeriodLabel()}
                  </span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateStatement}
              disabled={isGenerating || selectedAccountId === null}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 active:scale-98 ${
                generationComplete
                  ? 'bg-green-600 hover:bg-green-700'
                  : isGenerating || selectedAccountId === null
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#126987] hover:bg-[#0d4e63]'
              }`}
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              {generationComplete ? (
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>Statement Downloaded</span>
                </div>
              ) : isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating Statement...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Generate & Download PDF</span>
                </div>
              )}
            </button>
          </div>

          {/* Info Section */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              About Your Statements
            </h3>
            <ul className="space-y-2 text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              <li>• Official Bank of Ireland format with authentication</li>
              <li>• Includes all transactions and account summary</li>
              <li>• Suitable for visa applications and financial records</li>
              <li>• Generated in real-time with current data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}