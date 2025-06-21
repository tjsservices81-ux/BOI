import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { CurrencyManager } from "../utils/currencyManager";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'debit' | 'credit';
}

export default function Transactions() {
  const locationHook = useLocation();
  const [location, setLocation] = locationHook || ['/', () => {}];
  const [currentCurrency, setCurrentCurrency] = useState(CurrencyManager.getCurrentCurrency());
  
  // Listen for real-time currency changes
  useEffect(() => {
    const handleCurrencyChange = (event: any) => {
      const { currency } = event.detail;
      console.log(`Transactions: Currency changed to ${currency}`);
      setCurrentCurrency(currency);
    };

    window.addEventListener('currencyChanged', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
    };
  }, []);
  
  // Parse URL parameters from window.location to get actual query params
  const urlParams = new URLSearchParams(window.location.search);
  const accountType = urlParams.get('account') || 'current';
  const balance = parseFloat(urlParams.get('balance') || '2322.40');
  const accountNumber = urlParams.get('number') || '2091';

  const getAccountTitle = () => {
    switch (accountType) {
      case 'current': return 'Current Account';
      case 'credit': return 'Credit Card';
      case 'savings': return 'Savings Account';
      case 'loan': return 'Personal Loan';
      case 'deposit': return '365 Monthly Saver';
      default: return 'Current Account';
    }
  };

  const getAccountSubtitle = () => {
    switch (accountType) {
      case 'current': return `Account ending -${accountNumber}`;
      case 'credit': return `Card ending -${accountNumber}`;
      case 'savings': return `Account ending -${accountNumber}`;
      case 'loan': return `Loan account -${accountNumber}`;
      case 'deposit': return `Deposit account -${accountNumber}`;
      default: return `Account ending -${accountNumber}`;
    }
  };

  const getBalanceLabel = () => {
    switch (accountType) {
      case 'current': case 'savings': return 'Available Balance';
      case 'credit': return 'Available Credit';
      case 'loan': return 'Outstanding Balance';
      case 'deposit': return 'Current Balance';
      default: return 'Available Balance';
    }
  };

  const getTransactions = (): Transaction[] => {
    switch (accountType) {
      case 'current':
        return [
          { id: "1", date: "27 Apr 2021", description: "ATM WITHDRAWAL DUBLIN", amount: -50.00, balance: 2322.40, type: "debit" },
          { id: "2", date: "26 Apr 2021", description: "DIRECT DEBIT ELECTRIC IRELAND", amount: -89.50, balance: 2372.40, type: "debit" },
          { id: "3", date: "25 Apr 2021", description: "ONLINE PURCHASE AMAZON.IE", amount: -45.99, balance: 2461.90, type: "debit" },
          { id: "4", date: "24 Apr 2021", description: "SALARY CREDIT", amount: 2800.00, balance: 2507.89, type: "credit" },
          { id: "5", date: "23 Apr 2021", description: "CONTACTLESS PAYMENT TESCO", amount: -32.45, balance: -292.11, type: "debit" },
          { id: "6", date: "22 Apr 2021", description: "STANDING ORDER RENT", amount: -1200.00, balance: -259.66, type: "debit" },
          { id: "7", date: "21 Apr 2021", description: "TRANSFER FROM SAVINGS", amount: 500.00, balance: 940.34, type: "credit" },
          { id: "8", date: "20 Apr 2021", description: "CARD PAYMENT SUPERVALU", amount: -28.75, balance: 440.34, type: "debit" }
        ];
      case 'credit':
        return [
          { id: "1", date: "27 Apr 2021", description: "PAYMENT RECEIVED", amount: 500.00, balance: 2000.00, type: "credit" },
          { id: "2", date: "26 Apr 2021", description: "ONLINE PURCHASE BOOKING.COM", amount: -245.80, balance: 1500.00, type: "debit" },
          { id: "3", date: "25 Apr 2021", description: "CONTACTLESS PAYMENT CENTRA", amount: -12.50, balance: 1745.80, type: "debit" },
          { id: "4", date: "24 Apr 2021", description: "ONLINE PURCHASE ZARA.COM", amount: -89.99, balance: 1758.30, type: "debit" },
          { id: "5", date: "23 Apr 2021", description: "RESTAURANT PAYMENT", amount: -67.45, balance: 1848.29, type: "debit" },
          { id: "6", date: "22 Apr 2021", description: "FUEL PURCHASE APPLEGREEN", amount: -55.20, balance: 1915.74, type: "debit" },
          { id: "7", date: "21 Apr 2021", description: "CASHBACK REWARD", amount: 15.50, balance: 1970.94, type: "credit" }
        ];
      case 'savings':
        return [
          { id: "1", date: "27 Apr 2021", description: "INTEREST CREDIT", amount: 12.50, balance: 7500.00, type: "credit" },
          { id: "2", date: "20 Apr 2021", description: "TRANSFER TO CURRENT", amount: -500.00, balance: 7487.50, type: "debit" },
          { id: "3", date: "15 Apr 2021", description: "DEPOSIT", amount: 1000.00, balance: 7987.50, type: "credit" },
          { id: "4", date: "10 Apr 2021", description: "INTEREST CREDIT", amount: 11.80, balance: 6987.50, type: "credit" },
          { id: "5", date: "05 Apr 2021", description: "MONTHLY SAVINGS", amount: 200.00, balance: 6975.70, type: "credit" }
        ];
      case 'loan':
        return [
          { id: "1", date: "27 Apr 2021", description: "MONTHLY PAYMENT", amount: -150.00, balance: 2500.00, type: "debit" },
          { id: "2", date: "20 Apr 2021", description: "INTEREST CHARGE", amount: -25.80, balance: 2650.00, type: "debit" },
          { id: "3", date: "15 Apr 2021", description: "PAYMENT RECEIVED", amount: -200.00, balance: 2675.80, type: "debit" },
          { id: "4", date: "01 Apr 2021", description: "MONTHLY PAYMENT", amount: -150.00, balance: 2875.80, type: "debit" }
        ];
      case 'deposit':
        return [
          { id: "1", date: "27 Apr 2021", description: "MONTHLY DEPOSIT", amount: 100.00, balance: 100.00, type: "credit" },
          { id: "2", date: "20 Apr 2021", description: "ACCOUNT OPENED", amount: 0.00, balance: 0.00, type: "credit" }
        ];
      default:
        return [];
    }
  };

  const transactions = getTransactions();

  return (
    <div className="h-screen bg-[#f5f5f5] overflow-hidden flex flex-col ios-safe-top ios-safe-bottom page-fade-in" style={{ maxHeight: '100vh' }}>
      {/* Header - BOI Style */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => setLocation('/dashboard')}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors haptic-feedback"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-white boi-regular-font">{getAccountTitle()}</h1>
          </div>
        </div>
        
        {/* Account Details */}
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/80 text-sm boi-regular-font">{getAccountSubtitle()}</p>
              <p className="text-white/60 text-xs mt-1 boi-regular-font">{getBalanceLabel()}</p>
            </div>
            <div className="text-right">
              <p className="text-white text-2xl font-semibold boi-semibold-font">{CurrencyManager.formatAmount(balance.toFixed(2), currentCurrency)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List - BOI Style */}
      <div className="flex-1 overflow-y-auto bg-white ios-scroll -mt-2" style={{ maxHeight: 'calc(100vh - 200px)', overscrollBehavior: 'contain' }}>
        <div className="bg-white rounded-t-2xl pt-6">
          <div className="px-4 pb-2">
            <h2 className="text-lg font-medium text-gray-800 mb-3 boi-regular-font">Recent Transactions</h2>
          </div>
          
          <div className="space-y-0">
            {transactions.map((transaction, index) => (
              <div 
                key={transaction.id}
                className="px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer haptic-feedback stagger-item"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => alert(`Transaction details: ${transaction.description}\nAmount: ${CurrencyManager.formatAmount(Math.abs(transaction.amount).toFixed(2), currentCurrency)}\nDate: ${transaction.date}\nBalance after: ${CurrencyManager.formatAmount(transaction.balance.toFixed(2), currentCurrency)}`)}
              >
                <div className="flex justify-between items-start">
                  {/* Left side - Transaction info */}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 boi-regular-font leading-tight">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 boi-regular-font">
                      {transaction.date}
                    </p>
                  </div>
                  
                  {/* Right side - Amount */}
                  <div className="text-right ml-4">
                    <p className={`text-sm font-semibold boi-semibold-font ${
                      transaction.type === 'credit' 
                        ? 'text-green-600' 
                        : 'text-gray-900'
                    }`}>
                      {transaction.type === 'credit' ? '+' : ''}{CurrencyManager.formatAmount(transaction.amount.toFixed(2), currentCurrency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions - Enhanced Options */}
      <div className="bg-white border-t border-gray-200 ios-safe-bottom">
        {/* Quick Actions */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="bg-[#126987] text-white py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#3a5963] transition-colors haptic-feedback"
              onClick={() => alert('Transfer Money: Send money to another account or external bank')}
            >
              Transfer
            </button>
            <button 
              className="border border-[#126987] text-[#126987] py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#126987] hover:text-white transition-colors haptic-feedback"
              onClick={() => alert('Pay Bills: Utilities, credit cards, and other bill payments')}
            >
              Pay Bills
            </button>
          </div>
        </div>

        {/* Additional Options */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <button 
              className="flex flex-col items-center py-3 px-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors haptic-feedback"
              onClick={() => {
                const startDate = "01/01/2021";
                const endDate = "31/12/2021";
                alert(`Downloading ${getAccountTitle()} statement\nPeriod: ${startDate} - ${endDate}\nFormat: PDF\n\nStatement will be available in your downloads.`);
              }}
            >
              <svg className="w-5 h-5 text-[#126987] mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-gray-700 boi-regular-font">Statements</span>
            </button>
            
            <button 
              className="flex flex-col items-center py-3 px-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors haptic-feedback"
              onClick={() => alert('Export Transactions:\n• PDF Format\n• CSV Format\n• Excel Format\n\nSelect date range and format to export your transaction history.')}
            >
              <svg className="w-5 h-5 text-[#126987] mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-gray-700 boi-regular-font">Export</span>
            </button>
            
            <button 
              className="flex flex-col items-center py-3 px-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors haptic-feedback"
              onClick={() => alert('Search & Filter:\n• Search by description\n• Filter by amount range\n• Filter by date range\n• Filter by transaction type\n\nFind specific transactions quickly.')}
            >
              <svg className="w-5 h-5 text-[#126987] mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-gray-700 boi-regular-font">Search</span>
            </button>
          </div>
        </div>

        {/* Secondary Options */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="flex items-center justify-center py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors haptic-feedback"
              onClick={() => alert(`${getAccountTitle()} Settings:\n• Account notifications\n• Transaction limits\n• Security settings\n• Account preferences\n\nManage your account settings and preferences.`)}
            >
              <svg className="w-4 h-4 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-700 boi-regular-font">Settings</span>
            </button>
            
            <button 
              className="flex items-center justify-center py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors haptic-feedback"
              onClick={() => alert('Account Support:\n• Contact customer service\n• Report transaction issues\n• Account inquiries\n• Technical support\n\n24/7 support available for account assistance.')}
            >
              <svg className="w-4 h-4 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-700 boi-regular-font">Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}