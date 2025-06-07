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
  User,
  ChevronRight,
  Home,
  Receipt,
  Building,
  Plus
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
      {/* Header with teal gradient matching real app */}
      <div className="boi-header text-white relative">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 w-auto filter brightness-0 invert mr-2" />
          </div>
          <div className="flex items-center space-x-4">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Welcome section */}
        <div className="px-4 pb-6">
          <div className="bg-black bg-opacity-20 rounded-lg overflow-hidden mb-4">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-teal-500 relative">
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-sm opacity-90">Welcome</p>
                <p className="text-xs opacity-75">Last login: 14.07 GMT 27/06/2021</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List - Matching real app layout */}
      <div className="px-4 -mt-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="space-y-0">
            {/* Current Account */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">CURRENT ACCOUNT</p>
                <p className="text-sm text-gray-500">-2091</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-teal-600">€ 2,322.40</p>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
              </div>
            </div>
            
            {/* Credit Card */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">CREDIT CARD</p>
                <p className="text-sm text-gray-500">-1820</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-teal-600">€2,000.00</p>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
              </div>
            </div>
            
            {/* Savings Account */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">SAVINGS ACCOUNT</p>
                <p className="text-sm text-gray-500">-0978</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-teal-600">€7,500.00</p>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
              </div>
            </div>
            
            {/* Personal Loan */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">PERSONAL LOAN</p>
                <p className="text-sm text-gray-500">-8923</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-teal-600">€2,500.00</p>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
              </div>
            </div>
            
            {/* Deposit */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">DEPOSIT - 7908</p>
                <p className="text-sm text-teal-600">365 MONTHLY SAVER</p>
                <p className="text-xs text-teal-500">Withdraw funds</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold text-gray-400">€100.00</p>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
              </div>
            </div>
          </div>
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

      {/* Bottom Navigation - Matching real Bank of Ireland app */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto text-teal-600">
              <Home className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Accounts</span>
            </Button>
          </Link>
          <Link href="/bills">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto text-gray-500">
              <Receipt className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Payments</span>
            </Button>
          </Link>
          <Link href="/statements">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto text-gray-500">
              <CreditCard className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Cards</span>
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto text-gray-500">
              <Building className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Services</span>
            </Button>
          </Link>
          <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto text-gray-500">
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Apply</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
