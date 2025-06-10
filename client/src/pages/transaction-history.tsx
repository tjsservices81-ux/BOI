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
      default: return ArrowRightLeft;
    }
  };

  const currentBalance = primaryAccount ? primaryAccount.balance : 0;
  const thisMonthChange = 234.12; // This would be calculated from transactions

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="text-[var(--boi-gray)]" />
            </Button>
            <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Transaction History</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Search className="text-[var(--boi-gray)]" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Balance Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--boi-light-gray)]">Account Balance</p>
                <p className="text-2xl font-bold text-[var(--boi-gray)]">€{currentBalance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--boi-light-gray)]">This Month</p>
                <p className="text-lg font-semibold text-green-600">+€{thisMonthChange.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-medium text-[var(--boi-gray)]">Filter by Date</h3>
              <Button variant="ghost" className="text-[var(--boi-green)] text-sm font-medium">
                This Month
              </Button>
            </div>

            {/* Transactions List */}
            <div className="divide-y divide-gray-100 -mx-4">
              {transactions.map((transaction) => {
                const IconComponent = getTransactionIcon(transaction.category);
                const isCredit = transaction.type === "credit";
                
                return (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                          isCredit ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            isCredit ? "text-green-600" : "text-[var(--boi-light-gray)]"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--boi-gray)]">{transaction.description}</p>
                          <p className="text-sm text-[var(--boi-light-gray)]">
                            {new Date(transaction.date).toLocaleDateString("en-IE", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </p>
                          {transaction.reference && (
                            <p className="text-xs text-[var(--boi-light-gray)]">
                              Ref: {transaction.reference}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                          €{Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-[var(--boi-light-gray)]">{transaction.category}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" className="text-[var(--boi-green)] hover:text-[var(--boi-dark-green)] font-medium">
            Load More Transactions
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
