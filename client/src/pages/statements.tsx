import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { FileText, Download, Calendar, ChevronLeft, Check } from 'lucide-react';
import { UserDataManager } from '@/utils/userDataManager';

export default function Statements() {
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState('1-week');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = UserDataManager.getCurrentUser();
    setUser(currentUser);
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
    if (!user) return;

    setIsGenerating(true);
    setGenerationComplete(false);

    try {
      const { startDate, endDate } = getStatementPeriod();
      
      // Get user's account information
      const accounts = UserDataManager.getUserData('bankAccounts', []);
      const primaryAccount = accounts.find((acc: any) => acc.type === 'Current Account') || accounts[0];
      
      if (!primaryAccount) {
        alert('No account found for statement generation');
        return;
      }

      // Get transactions for the period
      const allTransactions = UserDataManager.getUserData('transactionHistory', []);
      const periodTransactions = allTransactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      // Calculate balances
      const openingBalance = parseFloat(primaryAccount.balance) - 
        periodTransactions.reduce((sum: number, tx: any) => {
          return sum + (tx.type === 'credit' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
        }, 0);

      const totalIn = periodTransactions
        .filter((tx: any) => tx.type === 'credit')
        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

      const totalOut = periodTransactions
        .filter((tx: any) => tx.type === 'debit')
        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

      const closingBalance = parseFloat(primaryAccount.balance);

      // Prepare statement data
      const statementData = {
        user: {
          fullName: user.name || 'Account Holder',
          accountNumber: primaryAccount.accountNumber || '12345678'
        },
        period: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        },
        summary: {
          openingBalance: openingBalance.toFixed(2),
          totalIn: totalIn.toFixed(2),
          totalOut: totalOut.toFixed(2),
          closingBalance: closingBalance.toFixed(2)
        },
        transactions: periodTransactions.map((tx: any) => ({
          date: new Date(tx.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          description: tx.description || tx.merchant || 'Transaction',
          withdrawal: tx.type === 'debit' ? parseFloat(tx.amount).toFixed(2) : '',
          deposit: tx.type === 'credit' ? parseFloat(tx.amount).toFixed(2) : '',
          balance: tx.balance ? parseFloat(tx.balance).toFixed(2) : closingBalance.toFixed(2)
        }))
      };

      // Generate PDF
      const response = await fetch('/api/generate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statementData),
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

  return (
    <div className="page-container page-fade-in">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-20">
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

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto space-y-6">
          
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

            {/* Period Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Statement Period
              </label>
              
              <div className="space-y-2">
                {[
                  { value: '1-week', label: '1 Week' },
                  { value: '2-weeks', label: '2 Weeks' },
                  { value: '1-month', label: '1 Month' },
                  { value: 'current-month', label: 'Current Month' },
                  { value: 'last-month', label: 'Previous Month' },
                  { value: 'last-3-months', label: 'Last 3 Months' },
                  { value: 'last-6-months', label: 'Last 6 Months' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="period"
                      value={option.value}
                      checked={selectedPeriod === option.value}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-4 h-4 text-[#126987] border-gray-300 focus:ring-[#126987]"
                    />
                    <span className="text-sm text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

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
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 active:scale-98 ${
                generationComplete
                  ? 'bg-green-600 hover:bg-green-700'
                  : isGenerating
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