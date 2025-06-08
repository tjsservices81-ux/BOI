import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { User, ChevronRight } from "lucide-react";
import type { Account } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.id],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header with teal gradient */}
      <div className="text-white relative flex-shrink-0" style={{ 
        background: 'linear-gradient(135deg, var(--boi-teal) 0%, var(--boi-dark-teal) 100%)'
      }}>
        {/* Background scenic image */}
        <div className="absolute bottom-0 left-0 right-0 h-8 opacity-20">
          <img src="/background.jpg" alt="" className="w-full h-full object-cover object-bottom" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between p-3 pb-1">
            <div className="flex items-center">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-5 w-auto filter brightness-0 invert mr-2" />
            </div>
            <div className="flex items-center space-x-2">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20 h-6 w-6">
                <User className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="px-3 pb-3">
            <h1 className="text-base font-medium">Good evening John</h1>
            <p className="text-white/80 text-xs">Welcome to Bank of Ireland</p>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 px-4 -mt-2 overflow-hidden">
        <div className="bg-white rounded-lg shadow-sm mb-3">
          {/* Current Account */}
          <div className="flex items-center justify-between p-2 border-b border-gray-100">
            <div>
              <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>CURRENT ACCOUNT</p>
              <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-2091</p>
            </div>
            <div className="flex items-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€ 2,322.40</p>
              <ChevronRight className="h-3 w-3 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
            </div>
          </div>
          
          {/* Credit Card */}
          <div className="flex items-center justify-between p-2 border-b border-gray-100">
            <div>
              <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>CREDIT CARD</p>
              <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-1820</p>
            </div>
            <div className="flex items-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€2,000.00</p>
              <ChevronRight className="h-3 w-3 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
            </div>
          </div>
          
          {/* Savings Account */}
          <div className="flex items-center justify-between p-2">
            <div>
              <p className="font-semibold text-xs" style={{ color: 'var(--boi-text-gray)' }}>SAVINGS ACCOUNT</p>
              <p className="text-xs" style={{ color: 'var(--boi-light-gray)' }}>-0978</p>
            </div>
            <div className="flex items-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--boi-teal)' }}>€7,500.00</p>
              <ChevronRight className="h-3 w-3 ml-2" style={{ color: 'var(--boi-light-gray)' }} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/transfer">
            <button className="w-full bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
              <div className="text-base mb-1" style={{ color: 'var(--boi-teal)' }}>€</div>
              <span className="text-xs font-medium" style={{ color: 'var(--boi-text-gray)' }}>Transfer</span>
            </button>
          </Link>
          <Link href="/bill-pay">
            <button className="w-full bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
              <div className="text-base mb-1" style={{ color: 'var(--boi-teal)' }}>💳</div>
              <span className="text-xs font-medium" style={{ color: 'var(--boi-text-gray)' }}>Bill Pay</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          <Link href="/">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-1 h-auto" style={{ color: 'var(--boi-teal)' }}>
              <img src="/icon-footer-accounts-highlight.svg" alt="Accounts" className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium">Accounts</span>
            </Button>
          </Link>
          <Link href="/bills">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-1 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-payments.svg" alt="Payments" className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium">Payments</span>
            </Button>
          </Link>
          <Link href="/statements">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-1 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/roi_debit_card_consumer-200px.png" alt="Cards" className="w-4 h-4 mb-1 object-contain" />
              <span className="text-xs font-medium">Cards</span>
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="ghost" className="flex flex-col items-center py-1 px-1 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
              <img src="/icon-footer-services.svg" alt="Services" className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium">Services</span>
            </Button>
          </Link>
          <Button variant="ghost" className="flex flex-col items-center py-1 px-1 h-auto" style={{ color: 'var(--boi-light-gray)' }}>
            <img src="/icon-footer-apply.svg" alt="Apply" className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Apply</span>
          </Button>
        </div>
      </div>
    </div>
  );
}