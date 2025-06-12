import { ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import SpendingVisualization from "../components/SpendingVisualization";
import SpendingInsights from "../components/SpendingInsights";
import { UserDataManager } from "../utils/userDataManager";

interface Account {
  id: number;
  displayName: string;
  accountNumber: string;
  balance: string;
  accountType: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Local state for account balances that can be updated by transfers
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Load accounts using UserDataManager on mount
  useEffect(() => {
    const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
    setAccounts(storedAccounts);
  }, []);

  // Listen for balance updates from transfers
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { accountId, newBalance } = event.detail;
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, balance: newBalance } : acc
      ));
    };

    window.addEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
    return () => window.removeEventListener('balanceUpdate', handleBalanceUpdate as EventListener);
  }, []);

  // Store accounts in localStorage for transfer forms to access
  useEffect(() => {
    localStorage.setItem('bankAccounts', JSON.stringify(accounts));
  }, [accounts]);

  // Get color for account type
  const getAccountColor = (accountType: string) => {
    switch (accountType) {
      case 'current': return 'bg-blue-500';
      case 'credit': return 'bg-red-500';
      case 'savings': return 'bg-green-500';
      case 'loan': return 'bg-orange-500';
      case 'deposit': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col ios-safe-top ios-safe-bottom relative">
      {/* Ambient spending visualization background */}
      <SpendingVisualization />
      {/* Header with scenic background */}
      <div className="text-white relative flex-shrink-0 h-44">
        {/* Full scenic background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background.jpg')`
          }}
        />
        
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between px-4 pt-16 pb-4">
            <div className="flex items-center">
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-6 filter brightness-0 invert" />
            </div>
            <div className="flex items-center">
              <button 
                className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-95"
                onClick={() => setLocation('/profile')}
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="px-4 pb-8 mt-auto">
            <h1 className="text-2xl font-light" style={{ fontFamily: 'OpenSans, sans-serif' }}>Welcome</h1>
            <p className="text-white/90 text-sm font-light mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Last login: {UserDataManager.getLastLoginTime()}
            </p>
          </div>
        </div>
      </div>

      {/* Main content area - white card with rounded top corners */}
      <div className="flex-1 px-0 -mt-8 overflow-y-auto ios-scroll">
        <div className="bg-white rounded-t-3xl shadow-lg min-h-full">
          <div className="pt-6 pb-32">
            {accounts.map((account) => (
              <button 
                key={account.id}
                className="w-full flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 touch-manipulation transform-gpu transition-all duration-150 ease-out active:scale-98 haptic-feedback relative"
                onClick={() => setLocation(`/transactions/${account.id}`)}
              >
                {/* Colored side bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccountColor(account.accountType)}`}></div>
                
                <div className="flex items-center justify-between w-full px-6 py-4">
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-800 boi-regular-font">{account.displayName.toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-0.5 boi-regular-font">{account.accountNumber}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-lg font-semibold text-[#126987] boi-semibold-font">€{parseFloat(account.balance).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <ChevronRight className="h-4 w-4 ml-3 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}