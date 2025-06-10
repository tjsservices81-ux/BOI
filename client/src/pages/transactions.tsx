import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'debit' | 'credit';
}

export default function Transactions() {
  const [location, setLocation] = useLocation();
  
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
          { id: "3", date: "15 Apr 2021", description: "PAYMENT RECEIVED", amount: -200.00, balance: 2675.80, type: "credit" },
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
    <div className="h-full bg-[#f5f5f5] overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header - BOI Style */}
      <div className="bg-[#4a6b75] text-white px-4 py-6 status-bar-safe">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => setLocation('/')}
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
              <p className="text-white text-2xl font-semibold boi-semibold-font">€{balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List - BOI Style */}
      <div className="flex-1 overflow-y-auto bg-white ios-scroll -mt-2">
        <div className="bg-white rounded-t-2xl pt-6">
          <div className="px-4 pb-2">
            <h2 className="text-lg font-medium text-gray-800 mb-3 boi-regular-font">Recent Transactions</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {transactions.map((transaction, index) => (
              <div 
                key={transaction.id}
                className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer haptic-feedback"
                onClick={() => alert(`Transaction details: ${transaction.description}\nAmount: €${Math.abs(transaction.amount).toFixed(2)}\nDate: ${transaction.date}\nBalance after: €${transaction.balance.toFixed(2)}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      {/* Transaction Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'credit' 
                          ? 'bg-green-100' 
                          : 'bg-gray-100'
                      }`}>
                        {transaction.type === 'credit' ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Transaction Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate boi-regular-font">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">
                          {transaction.date}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount and Balance */}
                  <div className="text-right ml-4">
                    <p className={`text-sm font-semibold boi-semibold-font ${
                      transaction.type === 'credit' 
                        ? 'text-green-600' 
                        : 'text-gray-900'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">
                      €{transaction.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t border-gray-200 p-4 ios-safe-bottom">
        <div className="flex space-x-3">
          <button 
            className="flex-1 bg-[#4a6b75] text-white py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#3a5963] transition-colors haptic-feedback"
            onClick={() => alert('Transfer Money: Send money to another account')}
          >
            Transfer
          </button>
          <button 
            className="flex-1 border border-[#4a6b75] text-[#4a6b75] py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#4a6b75] hover:text-white transition-colors haptic-feedback"
            onClick={() => alert('Pay Bills: Pay utilities and services')}
          >
            Pay Bills
          </button>
        </div>
      </div>
    </div>
  );
}