import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { 
  ArrowLeft, 
  Search,
  ShoppingCart,
  Fuel,
  ArrowDown,
  Utensils,
  Zap,
  ArrowRightLeft
} from "lucide-react";
import { getAccounts, getTransactions } from "../utils/transactionStore";
import { useState, useEffect } from "react";

export default function TransactionHistory() {
  const [, navigate] = useLocation();
  const [accounts, setAccounts] = useState(getAccounts());
  const [transactions, setTransactions] = useState(getTransactions());

  // Refresh data when component mounts
  useEffect(() => {
    const refreshData = () => {
      setAccounts(getAccounts());
      setTransactions(getTransactions());
    };
    
    refreshData();
    
    // Listen for storage changes (when transfers are made)
    const handleStorageChange = () => {
      refreshData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', refreshData);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', refreshData);
    };
  }, []);

  const primaryAccount = accounts.find(acc => acc.id === "current-2091");

  const getTransactionIcon = (category: string) => {
    switch (category) {
      case "shopping": return ShoppingCart;
      case "fuel": return Fuel;
      case "salary": return ArrowDown;
      case "dining": return Utensils;
      case "utilities": return Zap;
      case "cash": return ArrowRightLeft;
      case "transfer": return ArrowRightLeft;
      default: return ArrowRightLeft;
    }
  };

  const currentBalance = primaryAccount ? primaryAccount.balance : 0;
  const thisMonthChange = 234.12; // This would be calculated from transactions

  return (
    <div className="h-full bg-white flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#4a6b75] text-white px-4 py-4 flex-shrink-0">
        <div className="flex items-center space-x-3 pt-12">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/20 rounded-full touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-medium boi-regular-font">Transaction History</h1>
            <p className="text-white/75 text-sm boi-regular-font">{primaryAccount?.name || 'Current Account'} {primaryAccount?.number}</p>
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
              {transactions.map((transaction) => {
                const IconComponent = getTransactionIcon(transaction.category);
                const isCredit = transaction.type === "credit";
                
                return (
                  <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          isCredit ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`h-4 w-4 ${
                            isCredit ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 boi-regular-font">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500 boi-regular-font">
                            {new Date(transaction.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                            {transaction.reference && ` • ${transaction.reference}`}
                          </p>
                          {transaction.recipientName && (
                            <p className="text-xs text-gray-500 boi-regular-font">
                              To: {transaction.recipientName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold boi-semibold-font ${
                          isCredit ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isCredit ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 boi-regular-font">
                          Balance: €{transaction.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}