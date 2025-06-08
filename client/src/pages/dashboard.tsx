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
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header with teal gradient matching real app */}
      <div className="text-white relative overflow-hidden" style={{ 
        background: 'linear-gradient(135deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
      }}>
        {/* Background scenic image at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-20">
          <img src="/background.jpg" alt="" className="w-full h-full object-cover object-bottom" />
        </div>
        
        <div className="relative z-10">
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
              <div className="h-32 relative" style={{
                backgroundImage: 'url(/website-hp-main-705x635-eye.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-sm opacity-90">Welcome</p>
                  <p className="text-xs opacity-75">Last login: 14.07 GMT 27/06/2021</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List - Matching real app layout */}
      <div className="flex-1 overflow-y-auto px-4 -mt-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="space-y-0">
            {/* Current Account */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--boi-text-gray)' }}>CURRENT ACCOUNT</p>
                <p className="text-sm" style={{ color: 'var(--boi-light-gray)' }}>-2091</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--boi-teal)' }}>€ 2,322.40</p>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Credit Card */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--boi-text-gray)' }}>CREDIT CARD</p>
                <p className="text-sm" style={{ color: 'var(--boi-light-gray)' }}>-1820</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--boi-teal)' }}>€2,000.00</p>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Savings Account */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--boi-text-gray)' }}>SAVINGS ACCOUNT</p>
                <p className="text-sm" style={{ color: 'var(--boi-light-gray)' }}>-0978</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--boi-teal)' }}>€7,500.00</p>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Personal Loan */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--boi-text-gray)' }}>PERSONAL LOAN</p>
                <p className="text-sm" style={{ color: 'var(--boi-light-gray)' }}>-8923</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--boi-teal)' }}>€2,500.00</p>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Deposit */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--boi-text-gray)' }}>DEPOSIT - 7908</p>
                <p className="text-sm" style={{ color: 'var(--boi-teal)' }}>365 MONTHLY SAVER</p>
                <p className="text-xs" style={{ color: 'var(--boi-teal)' }}>Withdraw funds</p>
              </div>
              <div className="flex items-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--boi-light-gray)' }}>€100.00</p>
                <ChevronRight className="h-5 w-5" style={{ color: 'var(--boi-light-gray)' }} />
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

      {/* Bottom Navigation - Using actual BOI assets */}
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto" style={{ color: 'var(--boi-teal)' }}>
              <img src="/icon-footer-accounts-highlight.svg" alt="Accounts" className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Accounts</span>
            </Button>
          </Link>
          <Link href="/bills">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-payments.svg" alt="Payments" className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Payments</span>
            </Button>
          </Link>
          <Link href="/statements">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/roi_debit_card_consumer-200px.png" alt="Cards" className="w-6 h-6 mb-1 object-contain" />
              <span className="text-xs font-medium">Cards</span>
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-services.svg" alt="Services" className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Services</span>
            </Button>
          </Link>
          <Button variant="ghost" className="flex flex-col items-center py-2 px-3 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
            <img src="/icon-footer-apply.svg" alt="Apply" className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Apply</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
