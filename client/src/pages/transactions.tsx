import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTransactions, getAccountById, getTransactionsForAccount } from "../utils/transactionStore";

export default function Transactions() {
  const [, setLocation] = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [account, setAccount] = useState(null);
  
  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accountId = urlParams.get('account');
    
    if (accountId) {
      const accountData = getAccountById(accountId);
      setAccount(accountData);
      
      // Get transactions for this specific account
      const accountTransactions = getTransactionsForAccount(accountId);
      setTransactions(accountTransactions);
    } else {
      // Show all transactions if no specific account
      setTransactions(getTransactions());
    }
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    const absAmount = Math.abs(amount);
    return `€${absAmount.toLocaleString('en-IE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="h-full bg-white flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#4a6b75] text-white px-4 py-4 flex-shrink-0">
        <div className="flex items-center space-x-3 pt-12">
          <button 
            onClick={() => setLocation('/dashboard')}
            className="p-2 hover:bg-white/20 rounded-full touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-medium boi-regular-font">
              {account ? account.name : 'All Transactions'}
            </h1>
            {account && (
              <p className="text-white/75 text-sm boi-regular-font">
                {account.number} • {account.displayBalance}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto ios-scroll">
        <div className="pb-32">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 boi-regular-font">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'credit' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {transaction.type === 'credit' ? (
                          <ArrowDownLeft className={`h-4 w-4 ${
                            transaction.type === 'credit' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`} />
                        ) : (
                          <ArrowUpRight className={`h-4 w-4 ${
                            transaction.type === 'credit' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 boi-regular-font">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 boi-regular-font">
                          {formatDate(transaction.date)}
                          {transaction.reference && ` • ${transaction.reference}`}
                        </p>
                        {transaction.recipientName && (
                          <p className="text-xs text-gray-500 boi-regular-font">
                            To: {transaction.recipientName}
                          </p>
                        )}
                        {transaction.sortCode && transaction.accountNumber && (
                          <p className="text-xs text-gray-500 boi-regular-font">
                            {transaction.sortCode} • {transaction.accountNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold boi-semibold-font ${
                        transaction.type === 'credit' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500 boi-regular-font">
                        Balance: {formatAmount(transaction.balance)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}