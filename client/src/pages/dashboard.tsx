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
      <div className="text-white relative flex-shrink-0" style={{ 
        background: 'linear-gradient(135deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
      }}>
        {/* Background scenic image at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20">
          <img src="/background.jpg" alt="" className="w-full h-full object-cover object-bottom" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 w-auto filter brightness-0 invert mr-2" />
            </div>
            <div className="flex items-center space-x-3">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Compact welcome */}
          <div className="px-4 pb-4">
            <h1 className="text-lg font-medium">Good evening John</h1>
            <p className="text-white/80 text-sm">Welcome to Bank of Ireland</p>
          </div>
        </div>
      </div>

      {/* Main content area - fixed height */}
      <div className="flex-1 flex flex-col px-4 -mt-2">
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="space-y-0">
            {/* Current Account */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>CURRENT ACCOUNT</p>
                <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-2091</p>
              </div>
              <div className="flex items-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€ 2,322.40</p>
                <ChevronRight className="h-4 w-4 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Credit Card */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>CREDIT CARD</p>
                <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-1820</p>
              </div>
              <div className="flex items-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€2,000.00</p>
                <ChevronRight className="h-4 w-4 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
            
            {/* Savings Account */}
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>SAVINGS ACCOUNT</p>
                <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-0978</p>
              </div>
              <div className="flex items-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€7,500.00</p>
                <ChevronRight className="h-4 w-4 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/transfer">
            <button className="w-full bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
              <div className="text-lg mb-1" style={{ color: 'var(--boi-teal)' }}>€</div>
              <span className="text-xs font-medium" style={{ color: 'var(--boi-text-gray)' }}>Transfer</span>
            </button>
          </Link>
          <Link href="/bill-pay">
            <button className="w-full bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
              <div className="text-lg mb-1" style={{ color: 'var(--boi-teal)' }}>💳</div>
              <span className="text-xs font-medium" style={{ color: 'var(--boi-text-gray)' }}>Bill Pay</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation - Fixed position like iOS apps */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-3">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-2 h-auto" style={{ color: 'var(--boi-teal)' }}>
              <img src="/icon-footer-accounts-highlight.svg" alt="Accounts" className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Accounts</span>
            </Button>
          </Link>
          <Link href="/bills">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-2 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-payments.svg" alt="Payments" className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Payments</span>
            </Button>
          </Link>
          <Link href="/statements">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-2 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/roi_debit_card_consumer-200px.png" alt="Cards" className="w-5 h-5 mb-1 object-contain" />
              <span className="text-xs font-medium">Cards</span>
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-2 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-services.svg" alt="Services" className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Services</span>
            </Button>
          </Link>
          <Button variant="ghost" className="flex flex-col items-center py-1 px-2 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
            <img src="/icon-footer-apply.svg" alt="Apply" className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Apply</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
