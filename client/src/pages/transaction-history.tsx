import { useState, useEffect } from "react";
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

interface Transaction {
  id: number;
  accountId: number;
  amount: string;
  description: string;
  category: string;
  type: string;
  paymentMethod: string;
  reference: string;
  timestamp: string;
}

export default function TransactionHistory() {
  const [, navigate] = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Get account ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const accountId = urlParams.get('accountId') || '1';
  
  useEffect(() => {
    const loadTransactions = () => {
      // Load transactions from localStorage
      const storedTransactions = JSON.parse(localStorage.getItem('bankTransactions') || '[]');
      const accountTransactions = storedTransactions.filter((t: Transaction) => t.accountId.toString() === accountId);
      console.log('Loading transactions for account:', accountId, 'Found:', accountTransactions.length);
      console.log('All stored transactions:', storedTransactions);
      return accountTransactions;
    };

    const updateTransactions = () => {
      const accountTransactions = loadTransactions();
      
      // Add sample transactions if we don't have any real transfers yet
      const sampleTransactions = [
        {
          id: 1,
          accountId: 1,
          amount: "-47.82",
          description: "Tesco Ireland",
          category: "shopping",
          type: "debit",
          paymentMethod: "Debit Card",
          reference: "1234567890",
          timestamp: new Date("2024-12-30T14:34:00").toISOString()
        },
        {
          id: 2,
          accountId: 1,
          amount: "-68.50",
          description: "Applegreen",
          category: "fuel",
          type: "debit",
          paymentMethod: "Debit Card",
          reference: "9876543210",
          timestamp: new Date("2024-12-29T08:15:00").toISOString()
        },
        {
          id: 3,
          accountId: 1,
          amount: "+3200.00",
          description: "Salary Deposit",
          category: "salary",
          type: "credit",
          paymentMethod: "Direct Deposit",
          reference: "SAL202412",
          timestamp: new Date("2024-12-28T09:00:00").toISOString()
        }
      ];

      // Show all transactions for this account (including both sample and real transfers)
      if (accountId === '1') {
        const combinedTransactions = [...sampleTransactions, ...accountTransactions];
        setTransactions(combinedTransactions);
      } else {
        setTransactions(accountTransactions);
      }

      // Get current balance from localStorage accounts
      const storedAccounts = JSON.parse(localStorage.getItem('bankAccounts') || '[]');
      const account = storedAccounts.find((acc: any) => acc.id.toString() === accountId);
      if (account) {
        setCurrentBalance(parseFloat(account.balance));
      }
    };

    updateTransactions();

    // Listen for new transactions
    const handleTransactionUpdate = () => {
      console.log('Transaction update event received, refreshing...');
      updateTransactions();
    };

    window.addEventListener('transactionAdded', handleTransactionUpdate);
    window.addEventListener('storage', handleTransactionUpdate);

    return () => {
      window.removeEventListener('transactionAdded', handleTransactionUpdate);
      window.removeEventListener('storage', handleTransactionUpdate);
    };
  }, [accountId]);

  const getTransactionIcon = (category: string) => {
    switch (category) {
      case "shopping": return ShoppingCart;
      case "fuel": return Fuel;
      case "salary": return ArrowDown;
      case "dining": return Utensils;
      case "utilities": return Zap;
      case "transfer": return ArrowRightLeft;
      default: return ArrowRightLeft;
    }
  };

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
                            {new Date(transaction.timestamp).toLocaleDateString("en-IE", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
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
                          €{parseFloat(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-[var(--boi-light-gray)]">{transaction.paymentMethod}</p>
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
