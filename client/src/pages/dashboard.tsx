import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { 
  ArrowRightLeft, 
  FileText, 
  FileImage, 
  CreditCard, 
  PiggyBank, 
  TrendingUp,
  Bell,
  Settings,
  Eye,
  ArrowUp,
  ShoppingCart,
  Fuel,
  ArrowDown,
  Utensils,
  User
} from "lucide-react";
import type { Account, Transaction } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.id],
    enabled: !!user,
  });

  const primaryAccount = accounts.find(acc => acc.accountType === "current");
  
  const { data: recentTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", primaryAccount?.id],
    enabled: !!primaryAccount,
  });

  const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);

  const getTransactionIcon = (category: string) => {
    switch (category) {
      case "shopping": return ShoppingCart;
      case "fuel": return Fuel;
      case "salary": return ArrowDown;
      case "dining": return Utensils;
      default: return ArrowRightLeft;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="gradient-green text-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
              <User className="text-white text-lg" />
            </div>
            <div>
              <p className="text-sm opacity-90">Good morning</p>
              <p className="font-semibold">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button size="icon" variant="ghost" className="bg-white bg-opacity-20 hover:bg-opacity-30">
              <Bell className="text-white" />
            </Button>
            <Link href="/profile">
              <Button size="icon" variant="ghost" className="bg-white bg-opacity-20 hover:bg-opacity-30">
                <Settings className="text-white" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Balance Card */}
        <div className="bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Total Balance</p>
              <p className="text-2xl font-bold">€{totalBalance.toFixed(2)}</p>
              <p className="text-xs opacity-80 flex items-center mt-1">
                <ArrowUp className="w-3 h-3 text-green-300 mr-1" />
                +2.3% this month
              </p>
            </div>
            <Button size="icon" variant="ghost" className="bg-white bg-opacity-20 hover:bg-opacity-30">
              <Eye className="text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 -mt-6 mb-6 relative z-10">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <Link href="/transfer">
                <Button variant="ghost" className="flex flex-col items-center p-3 h-auto hover:bg-gray-50">
                  <div className="w-12 h-12 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mb-2">
                    <img src="/ArrowRightLeft.svg" alt="Transfer" className="w-6 h-6" style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(70%) saturate(7496%) hue-rotate(133deg) brightness(95%) contrast(101%)' }} />
                  </div>
                  <span className="text-xs text-[var(--boi-gray)] font-medium">Transfer</span>
                </Button>
              </Link>
              
              <Link href="/bills">
                <Button variant="ghost" className="flex flex-col items-center p-3 h-auto hover:bg-gray-50">
                  <div className="w-12 h-12 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mb-2">
                    <img src="/payee.svg" alt="Bills" className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-[var(--boi-gray)] font-medium">Bills</span>
                </Button>
              </Link>
              
              <Link href="/statements">
                <Button variant="ghost" className="flex flex-col items-center p-3 h-auto hover:bg-gray-50">
                  <div className="w-12 h-12 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mb-2">
                    <img src="/statement.svg" alt="Statements" className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-[var(--boi-gray)] font-medium">Statements</span>
                </Button>
              </Link>
              
              <Button variant="ghost" className="flex flex-col items-center p-3 h-auto hover:bg-gray-50">
                <div className="w-12 h-12 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mb-2">
                  <img src="/roi_debit_card_consumer-200px.png" alt="Cards" className="w-6 h-6 object-contain" />
                </div>
                <span className="text-xs text-[var(--boi-gray)] font-medium">Cards</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--boi-gray)] mb-4">My Accounts</h2>
        
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mr-3">
                      {account.accountType === "current" ? (
                        <PiggyBank className="text-[var(--boi-green)]" />
                      ) : (
                        <TrendingUp className="text-[var(--boi-green)]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--boi-gray)]">{account.displayName}</p>
                      <p className="text-sm text-[var(--boi-light-gray)]">{account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--boi-gray)]">€{parseFloat(account.balance).toFixed(2)}</p>
                    <p className="text-xs text-green-600">
                      {account.accountType === "current" ? "Available" : "2.1% APY"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-6 mb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--boi-gray)]">Recent Transactions</h2>
          <Link href="/transactions">
            <Button variant="ghost" className="text-[var(--boi-green)] text-sm font-medium hover:text-[var(--boi-dark-green)]">
              View All
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentTransactions.slice(0, 3).map((transaction) => {
                const IconComponent = getTransactionIcon(transaction.category);
                const isCredit = transaction.type === "credit";
                
                return (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          <IconComponent className={`w-4 h-4 ${isCredit ? "text-green-600" : "text-[var(--boi-light-gray)]"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--boi-gray)]">{transaction.description}</p>
                          <p className="text-sm text-[var(--boi-light-gray)]">
                            {new Date(transaction.timestamp).toLocaleDateString("en-IE", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
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
      </div>

      <BottomNavigation />
    </div>
  );
}
