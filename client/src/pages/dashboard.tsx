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
      {/* Header with scenic background matching screenshot */}
      <div className="text-white relative flex-shrink-0 h-32">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        {/* Teal overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a6b75] to-[#2d5a6b] opacity-75" />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between p-4 pt-12">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white/40 rounded-full" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="px-4 pb-4 mt-auto">
            <h1 className="text-lg font-medium">Welcome</h1>
            <p className="text-white/80 text-sm">Last login: 14.07 GMT 27/04/2021</p>
          </div>
        </div>
      </div>

      {/* Main content area - matching screenshot exactly */}
      <div className="flex-1 px-4 -mt-4 overflow-y-auto pb-20">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Current Account */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide">CURRENT ACCOUNT</p>
              <p className="text-xs text-gray-500 mt-0.5">-2091</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75]">€ 2,322.40</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </div>
          
          {/* Credit Card */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide">CREDIT CARD</p>
              <p className="text-xs text-gray-500 mt-0.5">-1820</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75]">€2,000.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </div>
          
          {/* Savings Account */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide">SAVINGS ACCOUNT</p>
              <p className="text-xs text-gray-500 mt-0.5">-0978</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75]">€7,500.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </div>

          {/* Personal Loan */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide">PERSONAL LOAN</p>
              <p className="text-xs text-gray-500 mt-0.5">-8923</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-[#4a6b75]">€2,500.00</p>
              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
            </div>
          </div>

          {/* Deposit */}
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-bold text-xs text-gray-700 uppercase tracking-wide">DEPOSIT - 7908</p>
              <p className="text-xs text-[#4a6b75] mt-0.5">365 MONTHLY SAVER</p>
            </div>
            <div className="flex items-center">
              <p className="text-base font-bold text-gray-400">€100.00</p>
              <p className="text-xs text-[#4a6b75] ml-2">Withdraw funds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - 5 tabs exactly like screenshot */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button className="flex-1 flex flex-col items-center py-3 text-[#4a6b75]">
            <div className="w-4 h-4 mb-1">🏠</div>
            <span className="text-xs font-medium">Accounts</span>
          </button>
          
          <Link href="/transfer" className="flex-1">
            <button className="w-full flex flex-col items-center py-3 text-gray-400">
              <div className="w-4 h-4 mb-1">↔️</div>
              <span className="text-xs font-medium">Payments</span>
            </button>
          </Link>
          
          <button className="flex-1 flex flex-col items-center py-3 text-gray-400">
            <div className="w-4 h-4 mb-1">💳</div>
            <span className="text-xs font-medium">Cards</span>
          </button>
          
          <button className="flex-1 flex flex-col items-center py-3 text-gray-400">
            <div className="w-4 h-4 mb-1">⚙️</div>
            <span className="text-xs font-medium">Services</span>
          </button>
          
          <button className="flex-1 flex flex-col items-center py-3 text-gray-400">
            <div className="w-4 h-4 mb-1">➕</div>
            <span className="text-xs font-medium">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}