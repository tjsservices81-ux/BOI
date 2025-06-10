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
  const [, setLocation] = useLocation();

  // Sample transaction data based on typical Bank of Ireland transactions
  const transactions: Transaction[] = [
    {
      id: "1",
      date: "27 Apr 2021",
      description: "ATM WITHDRAWAL DUBLIN",
      amount: -50.00,
      balance: 2322.40,
      type: "debit"
    },
    {
      id: "2", 
      date: "26 Apr 2021",
      description: "DIRECT DEBIT ELECTRIC IRELAND",
      amount: -89.50,
      balance: 2372.40,
      type: "debit"
    },
    {
      id: "3",
      date: "25 Apr 2021", 
      description: "ONLINE PURCHASE AMAZON.IE",
      amount: -45.99,
      balance: 2461.90,
      type: "debit"
    },
    {
      id: "4",
      date: "24 Apr 2021",
      description: "SALARY CREDIT",
      amount: 2800.00,
      balance: 2507.89,
      type: "credit"
    },
    {
      id: "5",
      date: "23 Apr 2021",
      description: "CONTACTLESS PAYMENT TESCO",
      amount: -32.45,
      balance: -292.11,
      type: "debit"
    },
    {
      id: "6",
      date: "22 Apr 2021",
      description: "STANDING ORDER RENT",
      amount: -1200.00,
      balance: -259.66,
      type: "debit"
    },
    {
      id: "7",
      date: "21 Apr 2021",
      description: "TRANSFER FROM SAVINGS",
      amount: 500.00,
      balance: 940.34,
      type: "credit"
    },
    {
      id: "8",
      date: "20 Apr 2021",
      description: "CARD PAYMENT SUPERVALU",
      amount: -28.75,
      balance: 440.34,
      type: "debit"
    }
  ];

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <button 
          onClick={() => setLocation('/')}
          className="mr-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 boi-semibold-font">Current Account</h1>
          <p className="text-sm text-gray-500 boi-regular-font">Account ending -2091</p>
        </div>
      </div>

      {/* Account Balance Summary */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 boi-regular-font">Available Balance</p>
          <p className="text-3xl font-semibold text-[#4a6b75] mt-1 boi-semibold-font">€2,322.40</p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 boi-semibold-font">Recent Transactions</h2>
          
          <div className="space-y-1">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
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
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <button 
            className="flex-1 bg-[#4a6b75] text-white py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#3a5963] transition-colors"
            onClick={() => alert('Transfer Money: Send money to another account')}
          >
            Transfer
          </button>
          <button 
            className="flex-1 border border-[#4a6b75] text-[#4a6b75] py-3 px-4 rounded-lg font-medium boi-semibold-font hover:bg-[#4a6b75] hover:text-white transition-colors"
            onClick={() => alert('Pay Bills: Pay utilities and services')}
          >
            Pay Bills
          </button>
        </div>
      </div>
    </div>
  );
}