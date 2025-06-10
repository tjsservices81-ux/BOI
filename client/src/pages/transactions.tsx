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
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <button 
          onClick={() => setLocation('/')}
          className="mr-3 p-1 hover:bg-gray-100 rounded-full transition-colors haptic-feedback"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 boi-semibold-font">{getAccountTitle()}</h1>
          <p className="text-sm text-gray-500 boi-regular-font">{getAccountSubtitle()}</p>
        </div>
      </div>

      {/* Account Balance Summary */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 boi-regular-font">{getBalanceLabel()}</p>
          <p className="text-3xl font-semibold text-[#4a6b75] mt-1 boi-semibold-font">€{balance.toFixed(2)}</p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto bg-white ios-scroll">
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 boi-semibold-font">Recent Transactions</h2>
          
          <div className="space-y-0">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer haptic-feedback"
                onClick={() => alert(`Transaction details: ${transaction.description}\nAmount: €${Math.abs(transaction.amount).toFixed(2)}\nDate: ${transaction.date}\nBalance after: €${transaction.balance.toFixed(2)}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900 boi-regular-font">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">
                        {transaction.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm boi-semibold-font ${
                        transaction.type === 'credit' 
                          ? 'text-green-600' 
                          : 'text-gray-900'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">
                        Balance: €{transaction.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
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